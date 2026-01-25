/**
 * Queue-based file upload system.
 *
 * This module provides utilities for handling large file uploads through a
 * chunked, queue-based system using Cloudflare R2, KV, and Queues.
 *
 * Usage:
 *   import { createJob, updateJobStatus, parseChunkCSV } from '@/lib/queue';
 */

// Types
export type { JobStatus, ChunkMessage, ChunkValidationResult, JobStatusType } from "./types";

// Constants
export {
  CHUNK_SIZE,
  BATCH_SIZE,
  MAX_CONCURRENT_UPLOADS,
  VALIDATOR_URL,
} from "./constants";

// R2 utilities
export {
  getUploadUrl,
  getChunk,
  deleteJob as deleteJobFromR2,
  putChunk,
} from "./r2";
export type { R2Bucket, R2Object } from "./r2";

// KV utilities
export {
  getJobStatus,
  createJob,
  updateJobStatus,
  deleteJob as deleteJobFromKV,
  incrementJobCounter,
  addJobError,
} from "./kv";
export type { KVNamespace } from "./kv";

// CSV utilities
export {
  extractHeader,
  parseChunkCSV,
  validateChunk,
  batchRows,
} from "./csv";
export type { CSVRow } from "./csv";

// Helper utilities
export {
  generateJobId,
  calculateTotalChunks,
  isJobComplete,
  isJobInProgress,
  isJobFailed,
  calculateUploadProgress,
  calculateProcessingProgress,
  calculateOverallProgress,
  getStatusMessage,
  formatFileSize,
  formatDuration,
  estimateTimeRemaining,
  createJobSummary,
} from "./helpers";
