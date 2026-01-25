import type { JobStatus } from "./types";

/**
 * KV utilities for managing job status.
 * Works with Cloudflare KV or any compatible key-value store.
 */

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

function getJobKey(jobId: string) {
  return `job:${jobId}`;
}

/**
 * Get job status from KV store.
 */
export async function getJobStatus(kv: KVNamespace, jobId: string) {
  const key = getJobKey(jobId);
  const data = await kv.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as JobStatus;
  } catch (error) {
    console.error("Failed to parse job status:", error);
    return null;
  }
}

/**
 * Create a new job in KV store.
 */
export async function createJob(kv: KVNamespace, job: JobStatus) {
  const key = getJobKey(job.id);
  await kv.put(key, JSON.stringify(job));
  return job;
}

/**
 * Update job status with partial updates.
 * This fetches the current status, merges updates, and saves back.
 */
export async function updateJobStatus(
  kv: KVNamespace,
  jobId: string,
  updates: Partial<JobStatus>,
) {
  const current = await getJobStatus(kv, jobId);

  if (!current) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updated: JobStatus = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const key = getJobKey(jobId);
  await kv.put(key, JSON.stringify(updated));
  return updated;
}

/**
 * Delete a job from KV store.
 */
export async function deleteJob(kv: KVNamespace, jobId: string) {
  const key = getJobKey(jobId);
  await kv.delete(key);
}

/**
 * Increment a counter in job status.
 * Useful for tracking chunksUploaded, chunksValidated, etc.
 */
export async function incrementJobCounter(
  kv: KVNamespace,
  jobId: string,
  field: keyof Pick<
    JobStatus,
    | "chunksUploaded"
    | "chunksValidated"
    | "chunksProcessed"
    | "rowsInserted"
  >,
  amount = 1,
) {
  const current = await getJobStatus(kv, jobId);

  if (!current) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updated = {
    ...current,
    [field]: (current[field] as number) + amount,
    updatedAt: new Date().toISOString(),
  };

  const key = getJobKey(jobId);
  await kv.put(key, JSON.stringify(updated));
  return updated;
}

/**
 * Add an error to the job's error list.
 */
export async function addJobError(
  kv: KVNamespace,
  jobId: string,
  error: string,
) {
  const current = await getJobStatus(kv, jobId);

  if (!current) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updated = {
    ...current,
    errors: [...current.errors, error],
    updatedAt: new Date().toISOString(),
  };

  const key = getJobKey(jobId);
  await kv.put(key, JSON.stringify(updated));
  return updated;
}
