/**
 * Example usage patterns for the queue-based upload system.
 * These examples show common patterns you'll use in API routes and workers.
 */

import type { KVNamespace, R2Bucket } from "./index";
import {
  createJob,
  getJobStatus,
  updateJobStatus,
  incrementJobCounter,
  putChunk,
  getChunk,
  parseChunkCSV,
  extractHeader,
  validateChunk,
  batchRows,
  CHUNK_SIZE,
  BATCH_SIZE,
} from "./index";

/**
 * Example: Initialize a new upload job
 */
export async function initializeUpload(
  kv: KVNamespace,
  userId: string,
  fileName: string,
  fileSize: number,
) {
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  const job = await createJob(kv, {
    id: crypto.randomUUID(),
    userId,
    fileName,
    fileSize,
    totalChunks,
    chunksUploaded: 0,
    chunksValidated: 0,
    chunksProcessed: 0,
    rowsInserted: 0,
    totalRows: 0,
    status: "uploading",
    errors: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    jobId: job.id,
    totalChunks,
    chunkSize: CHUNK_SIZE,
  };
}

/**
 * Example: Handle chunk upload
 */
export async function uploadChunk(
  r2: R2Bucket,
  kv: KVNamespace,
  jobId: string,
  chunkIndex: number,
  data: ArrayBuffer,
) {
  // Store chunk in R2
  await putChunk(r2, jobId, chunkIndex, data);

  // Update progress
  const updated = await incrementJobCounter(kv, jobId, "chunksUploaded");

  // Check if all chunks uploaded
  if (updated.chunksUploaded === updated.totalChunks) {
    await updateJobStatus(kv, jobId, { status: "validating" });
  }

  return updated;
}

/**
 * Example: Process a chunk (validation + parsing)
 */
export async function processChunk(
  r2: R2Bucket,
  kv: KVNamespace,
  jobId: string,
  chunkIndex: number,
  header?: string[],
) {
  // Get chunk from R2
  const chunk = await getChunk(r2, jobId, chunkIndex);
  const text = await chunk.text();

  // Parse CSV
  const isFirstChunk = chunkIndex === 0;
  let csvHeader = header;

  if (isFirstChunk) {
    csvHeader = extractHeader(text);
  }

  const rows = parseChunkCSV(text, isFirstChunk, csvHeader);

  // Validate
  const validation = validateChunk(rows, ["service", "amount", "date"]);

  if (!validation.valid) {
    await updateJobStatus(kv, jobId, {
      status: "failed",
      errors: validation.errors,
    });
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  await incrementJobCounter(kv, jobId, "chunksValidated");

  return {
    rows,
    header: csvHeader,
    rowCount: validation.rowCount,
  };
}

/**
 * Example: Insert rows into database in batches
 */
export async function insertRows(
  kv: KVNamespace,
  jobId: string,
  rows: Array<Record<string, string | number>>,
  insertFn: (batch: Array<Record<string, string | number>>) => Promise<void>,
) {
  const batches = batchRows(rows, BATCH_SIZE);

  for (const batch of batches) {
    await insertFn(batch);
    await incrementJobCounter(kv, jobId, "rowsInserted", batch.length);
  }

  await incrementJobCounter(kv, jobId, "chunksProcessed");
}

/**
 * Example: Get upload progress
 */
export async function getUploadProgress(kv: KVNamespace, jobId: string) {
  const job = await getJobStatus(kv, jobId);

  if (!job) {
    return null;
  }

  return {
    status: job.status,
    progress: {
      uploaded: job.chunksUploaded,
      validated: job.chunksValidated,
      processed: job.chunksProcessed,
      total: job.totalChunks,
    },
    rows: {
      inserted: job.rowsInserted,
      total: job.totalRows,
    },
    errors: job.errors,
    percentComplete: Math.round((job.chunksProcessed / job.totalChunks) * 100),
  };
}

/**
 * Example: Complete a job
 */
export async function completeJob(kv: KVNamespace, jobId: string) {
  return updateJobStatus(kv, jobId, {
    status: "complete",
  });
}

/**
 * Example: Fail a job with error
 */
export async function failJob(
  kv: KVNamespace,
  jobId: string,
  error: string,
) {
  return updateJobStatus(kv, jobId, {
    status: "failed",
    errors: [error],
  });
}
