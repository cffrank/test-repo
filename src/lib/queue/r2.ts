/**
 * R2 utilities for managing file uploads and chunk storage.
 * These functions are designed to work in Cloudflare Workers or Next.js API routes.
 */

export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value:
      | ReadableStream
      | ArrayBuffer
      | ArrayBufferView
      | string
      | null
      | Blob,
  ): Promise<R2Object>;
  delete(key: string | string[]): Promise<void>;
}

export interface R2Object {
  body: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

/**
 * Generate a presigned upload URL for a chunk.
 * In production, you'd use R2's presigned URLs. For MVP, this returns the key.
 */
export async function getUploadUrl(bucket: R2Bucket, key: string) {
  // For Cloudflare Workers, you can use bucket.createMultipartUpload()
  // For now, return the key that the client will use
  return {
    key,
    url: `/api/upload/chunk?key=${encodeURIComponent(key)}`,
  };
}

/**
 * Download a chunk from R2 storage.
 */
export async function getChunk(
  bucket: R2Bucket,
  jobId: string,
  chunkIndex: number,
) {
  const key = `${jobId}/chunk-${chunkIndex}`;
  const object = await bucket.get(key);

  if (!object) {
    throw new Error(`Chunk not found: ${key}`);
  }

  return object;
}

/**
 * Delete all chunks for a completed or failed job.
 */
export async function deleteJob(bucket: R2Bucket, jobId: string) {
  // R2 doesn't have a native list operation with prefix,
  // so we'll delete known chunks based on totalChunks from job status
  // In practice, you might want to list all keys with the jobId prefix

  // For now, we'll return a function that takes totalChunks
  return async (totalChunks: number) => {
    const keys = Array.from({ length: totalChunks }, (_, i) => `${jobId}/chunk-${i}`);
    await bucket.delete(keys);
  };
}

/**
 * Store a chunk in R2.
 */
export async function putChunk(
  bucket: R2Bucket,
  jobId: string,
  chunkIndex: number,
  data: ArrayBuffer | string,
) {
  const key = `${jobId}/chunk-${chunkIndex}`;
  return bucket.put(key, data);
}
