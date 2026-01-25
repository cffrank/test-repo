/**
 * Cloudflare Queue Consumer Worker
 *
 * Processes file chunks from the file-processing queue. Each message contains
 * information about a chunk that needs to be validated and inserted into the database.
 *
 * Architecture:
 * 1. Download chunk from R2 storage
 * 2. Extract header from first chunk (store in job metadata)
 * 3. Validate chunk via Railway validator service
 * 4. Parse CSV rows and batch insert to Neon database
 * 5. Update job progress in KV store
 * 6. Handle errors and retries via Cloudflare's built-in retry mechanism
 *
 * Error Handling:
 * - Validation failures: Mark job as failed immediately
 * - Database errors: Retry via message.retry() (up to max_retries)
 * - After max retries: Message goes to dead letter queue
 */

import type { MessageBatch, Env } from "./types";
import type { ChunkMessage } from "../lib/queue/types";
import type { R2Bucket } from "../lib/queue/r2";
import { getChunk } from "../lib/queue/r2";
import {
  getJobStatus,
  updateJobStatus,
  incrementJobCounter,
  addJobError,
} from "../lib/queue/kv";
import { parseChunkCSV, extractHeader, batchRows } from "../lib/queue/csv";
import { BATCH_SIZE } from "../lib/queue/constants";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { expenses } from "../db/schema";

/**
 * Validation response from Railway validator service.
 */
interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  rowCount?: number;
}

/**
 * Parsed expense row from CSV.
 * Maps FOCUS columns to expense schema.
 */
interface ExpenseRow {
  amount: string | number;
  currency: string;
  date: string | Date;
  category: string;
  description?: string;
  service?: string;
  accountId?: string;
  region?: string;
}

/**
 * Map a CSV row (FOCUS format) to expense row format.
 * FOCUS columns: BilledCost, BillingCurrency, ChargePeriodStart, ServiceCategory, etc.
 */
function mapCsvRowToExpense(row: Record<string, unknown>): ExpenseRow {
  const getVal = (keys: string[]): unknown => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
    return undefined;
  };

  const amountVal = getVal(["BilledCost", "billedcost", "amount", "Amount"]);
  const currencyVal = getVal(["BillingCurrency", "billingcurrency", "currency", "Currency"]);
  const dateVal = getVal(["ChargePeriodStart", "chargeperiodstart", "date", "Date"]);
  const categoryVal = getVal(["ServiceCategory", "servicecategory", "category", "Category"]);
  const descVal = getVal(["ChargeDescription", "chargedescription", "description", "Description"]);
  const serviceVal = getVal(["ServiceName", "servicename", "service", "Service"]);
  const accountVal = getVal(["SubAccountId", "subaccountid", "accountId", "AccountId"]);
  const regionVal = getVal(["Region", "region", "RegionId", "regionid"]);

  return {
    amount: amountVal !== undefined ? (typeof amountVal === "number" ? amountVal : String(amountVal)) : 0,
    currency: currencyVal !== undefined ? String(currencyVal) : "USD",
    date: dateVal !== undefined ? String(dateVal) : new Date().toISOString(),
    category: categoryVal !== undefined ? String(categoryVal) : "Other",
    description: descVal !== undefined ? String(descVal) : undefined,
    service: serviceVal !== undefined ? String(serviceVal) : undefined,
    accountId: accountVal !== undefined ? String(accountVal) : undefined,
    region: regionVal !== undefined ? String(regionVal) : undefined,
  };
}

/**
 * Worker configuration and exports.
 */
export default {
  async queue(batch: MessageBatch<ChunkMessage>, env: Env): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages`);

    // Process each message in the batch sequentially to avoid race conditions
    // on job status updates. Cloudflare handles parallel batches automatically.
    for (const message of batch.messages) {
      try {
        await processChunkMessage(message.body, env);
        message.ack(); // Acknowledge successful processing
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error);

        // Determine if error is retryable
        const isRetryable = isRetryableError(error);

        if (isRetryable) {
          // Let Cloudflare retry the message (up to max_retries)
          message.retry();
        } else {
          // Non-retryable error (e.g., validation failure)
          // Acknowledge to prevent retries and move on
          message.ack();
        }
      }
    }
  },
};

/**
 * Process a single chunk message.
 * Downloads chunk, validates it, parses CSV, and inserts to database.
 */
async function processChunkMessage(
  message: ChunkMessage,
  env: Env
): Promise<void> {
  const { jobId, chunkIndex, totalChunks, userId, projectId } = message;

  console.log(
    `Processing chunk ${chunkIndex + 1}/${totalChunks} for job ${jobId}`
  );

  // Get current job status
  const job = await getJobStatus(env.JOB_STATUS, jobId);
  if (!job) {
    throw new NonRetryableError(`Job not found: ${jobId}`);
  }

  // Skip if job already failed
  if (job.status === "failed") {
    console.log(`Job ${jobId} already failed, skipping chunk ${chunkIndex}`);
    return;
  }

  // Skip if job already completed
  if (job.status === "complete") {
    console.log(`Job ${jobId} already completed, skipping chunk ${chunkIndex}`);
    return;
  }

  try {
    // Step 1: Download chunk from R2
    const chunkObject = await getChunk(
      env.UPLOADS_BUCKET,
      jobId,
      chunkIndex
    );
    const chunkText = await chunkObject.text();

    console.log(`Downloaded chunk ${chunkIndex}, size: ${chunkText.length} bytes`);

    // Step 2: Extract and store header from first chunk
    let header: string[] | undefined;
    const isFirstChunk = chunkIndex === 0;

    if (isFirstChunk) {
      header = extractHeader(chunkText);
      console.log(`Extracted header from first chunk: ${header.join(", ")}`);

      // Store header in job metadata for subsequent chunks
      // We'll use a separate KV key for this
      await env.JOB_STATUS.put(
        `job:${jobId}:header`,
        JSON.stringify(header)
      );
    } else {
      // Retrieve stored header for non-first chunks
      const headerData = await env.JOB_STATUS.get(`job:${jobId}:header`);
      if (!headerData) {
        throw new NonRetryableError(
          `Header not found for job ${jobId}. First chunk may not have been processed.`
        );
      }
      header = JSON.parse(headerData) as string[];
    }

    // Step 3: Validate chunk via Railway validator
    const validatorUrl = env.VALIDATOR_URL || "https://validator-production.railway.app";
    const validationResult = await validateChunk(chunkText, validatorUrl);

    if (!validationResult.valid) {
      const errorMsg = `Chunk ${chunkIndex} validation failed: ${validationResult.errors?.join(", ") || "Unknown error"}`;
      console.error(errorMsg);

      // Mark job as failed
      await updateJobStatus(env.JOB_STATUS, jobId, {
        status: "failed",
        errors: [...job.errors, errorMsg],
      });

      throw new NonRetryableError(errorMsg);
    }

    console.log(`Chunk ${chunkIndex} validated successfully`);

    // Update validation counter
    await incrementJobCounter(env.JOB_STATUS, jobId, "chunksValidated");

    // Step 4: Parse CSV rows
    const csvRows = parseChunkCSV(chunkText, isFirstChunk, header);
    console.log(`Parsed ${csvRows.length} rows from chunk ${chunkIndex}`);

    if (csvRows.length === 0) {
      console.log(`Chunk ${chunkIndex} has no rows, skipping database insertion`);
      await incrementJobCounter(env.JOB_STATUS, jobId, "chunksProcessed");
      return;
    }

    // Map CSV rows to expense format
    const expenseRows = csvRows.map((row) => mapCsvRowToExpense(row as Record<string, unknown>));

    // Step 5: Batch insert rows to database
    const rowsInserted = await insertExpensesToDatabase(
      expenseRows,
      projectId,
      env.DATABASE_URL
    );

    console.log(`Inserted ${rowsInserted} rows from chunk ${chunkIndex}`);

    // Update progress counters
    await incrementJobCounter(env.JOB_STATUS, jobId, "chunksProcessed");
    await incrementJobCounter(env.JOB_STATUS, jobId, "rowsInserted", rowsInserted);

    // Step 6: Check if all chunks are processed
    const updatedJob = await getJobStatus(env.JOB_STATUS, jobId);
    if (
      updatedJob &&
      updatedJob.chunksProcessed === updatedJob.totalChunks
    ) {
      console.log(`All chunks processed for job ${jobId}, marking as complete`);

      await updateJobStatus(env.JOB_STATUS, jobId, {
        status: "complete",
      });

      // Optional: Clean up R2 chunks
      // await cleanupChunks(env.UPLOADS_BUCKET, jobId, totalChunks);
    }
  } catch (error) {
    // Log error and add to job error list
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";

    console.error(`Error processing chunk ${chunkIndex} for job ${jobId}:`, error);

    await addJobError(
      env.JOB_STATUS,
      jobId,
      `Chunk ${chunkIndex}: ${errorMsg}`
    );

    // Re-throw to trigger retry logic
    throw error;
  }
}

/**
 * Validate chunk via Railway validator service.
 * Sends CSV text to the validator and returns validation result.
 */
async function validateChunk(
  csvText: string,
  validatorUrl: string
): Promise<ValidationResponse> {
  try {
    const response = await fetch(`${validatorUrl}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "text/csv",
      },
      body: csvText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Validator returned ${response.status}: ${errorText}`
      );
    }

    const result = (await response.json()) as ValidationResponse;
    return result;
  } catch (error) {
    console.error("Validation request failed:", error);

    // Network errors are retryable
    throw new RetryableError(
      `Validation service unavailable: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Insert expense rows to Neon database in batches.
 * Uses batch inserts for optimal performance (500 rows per batch).
 */
async function insertExpensesToDatabase(
  rows: ExpenseRow[],
  projectId: string,
  databaseUrl: string
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  // Initialize Neon connection
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  // Split rows into batches
  const batches = batchRows(rows, BATCH_SIZE);
  let totalInserted = 0;

  console.log(`Inserting ${rows.length} rows in ${batches.length} batches`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      // Transform CSV rows to match database schema
      const expenseValues = batch.map((row) => ({
        projectId,
        amount: String(row.amount),
        currency: row.currency || "USD",
        date: row.date instanceof Date ? row.date : new Date(row.date),
        category: row.category,
        description: row.description || null,
        service: row.service || null,
        accountId: row.accountId || null,
        region: row.region || null,
      }));

      // Batch insert
      await db.insert(expenses).values(expenseValues);

      totalInserted += batch.length;

      console.log(
        `Batch ${i + 1}/${batches.length}: Inserted ${batch.length} rows`
      );
    } catch (error) {
      console.error(`Database insert failed for batch ${i + 1}:`, error);

      // Database errors are retryable (might be temporary connection issues)
      throw new RetryableError(
        `Database insert failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return totalInserted;
}

/**
 * Determine if an error is retryable.
 * Retryable errors: network issues, database connection failures
 * Non-retryable errors: validation failures, missing data
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof NonRetryableError) {
    return false;
  }

  if (error instanceof RetryableError) {
    return true;
  }

  // Default to retryable for unknown errors (safer approach)
  return true;
}

/**
 * Optional: Clean up R2 chunks after successful processing.
 * Can be disabled to keep chunks for debugging.
 */
async function cleanupChunks(
  bucket: R2Bucket,
  jobId: string,
  totalChunks: number
): Promise<void> {
  console.log(`Cleaning up ${totalChunks} chunks for job ${jobId}`);

  const keys = Array.from(
    { length: totalChunks },
    (_, i) => `${jobId}/chunk-${i}`
  );

  try {
    await bucket.delete(keys);
    console.log(`Deleted ${totalChunks} chunks for job ${jobId}`);
  } catch (error) {
    console.error(`Failed to cleanup chunks for job ${jobId}:`, error);
    // Don't fail the job if cleanup fails
  }
}

/**
 * Custom error class for non-retryable errors.
 * These errors indicate validation failures or missing data
 * that won't be fixed by retrying.
 */
class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

/**
 * Custom error class for retryable errors.
 * These errors indicate temporary issues like network failures
 * or database connection problems that may be resolved on retry.
 */
class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}
