/**
 * Helper utilities for common queue operations.
 */

import type { JobStatus } from "./types";

/**
 * Generate a unique job ID.
 */
export function generateJobId(): string {
  return crypto.randomUUID();
}

/**
 * Calculate total chunks needed for a file.
 */
export function calculateTotalChunks(fileSize: number, chunkSize: number): number {
  return Math.ceil(fileSize / chunkSize);
}

/**
 * Check if a job is complete (all chunks processed).
 */
export function isJobComplete(job: JobStatus): boolean {
  return job.chunksProcessed === job.totalChunks;
}

/**
 * Check if a job is in progress.
 */
export function isJobInProgress(job: JobStatus): boolean {
  return (
    job.status === "uploading" ||
    job.status === "validating" ||
    job.status === "processing"
  );
}

/**
 * Check if a job has failed.
 */
export function isJobFailed(job: JobStatus): boolean {
  return job.status === "failed";
}

/**
 * Calculate upload progress percentage.
 */
export function calculateUploadProgress(job: JobStatus): number {
  if (job.totalChunks === 0) return 0;
  return Math.round((job.chunksUploaded / job.totalChunks) * 100);
}

/**
 * Calculate processing progress percentage.
 */
export function calculateProcessingProgress(job: JobStatus): number {
  if (job.totalChunks === 0) return 0;
  return Math.round((job.chunksProcessed / job.totalChunks) * 100);
}

/**
 * Calculate overall progress percentage.
 * This considers both upload and processing stages.
 */
export function calculateOverallProgress(job: JobStatus): number {
  if (job.totalChunks === 0) return 0;

  // Upload is 50% of progress, processing is the other 50%
  const uploadProgress = (job.chunksUploaded / job.totalChunks) * 50;
  const processingProgress = (job.chunksProcessed / job.totalChunks) * 50;

  return Math.round(uploadProgress + processingProgress);
}

/**
 * Get human-readable status message.
 */
export function getStatusMessage(job: JobStatus): string {
  switch (job.status) {
    case "uploading":
      return `Uploading ${job.chunksUploaded} of ${job.totalChunks} chunks`;
    case "validating":
      return `Validating chunks (${job.chunksValidated}/${job.totalChunks})`;
    case "processing":
      return `Processing data (${job.rowsInserted} rows inserted)`;
    case "complete":
      return `Complete (${job.rowsInserted} rows imported)`;
    case "failed":
      return `Failed: ${job.errors[0] || "Unknown error"}`;
    default:
      return "Unknown status";
  }
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format duration for display.
 */
export function formatDuration(startTime: string, endTime?: string): string {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const duration = end - start;

  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Estimate time remaining based on current progress.
 */
export function estimateTimeRemaining(job: JobStatus): string | null {
  if (job.chunksProcessed === 0) return null;

  const start = new Date(job.createdAt).getTime();
  const now = Date.now();
  const elapsed = now - start;

  const processedRatio = job.chunksProcessed / job.totalChunks;
  const totalEstimated = elapsed / processedRatio;
  const remaining = totalEstimated - elapsed;

  const seconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `~${minutes}m remaining`;
  } else {
    return `~${seconds}s remaining`;
  }
}

/**
 * Create a summary object for job status.
 */
export function createJobSummary(job: JobStatus) {
  return {
    id: job.id,
    fileName: job.fileName,
    fileSize: formatFileSize(job.fileSize),
    status: job.status,
    statusMessage: getStatusMessage(job),
    progress: {
      upload: calculateUploadProgress(job),
      processing: calculateProcessingProgress(job),
      overall: calculateOverallProgress(job),
    },
    chunks: {
      uploaded: job.chunksUploaded,
      validated: job.chunksValidated,
      processed: job.chunksProcessed,
      total: job.totalChunks,
    },
    rows: {
      inserted: job.rowsInserted,
      total: job.totalRows,
    },
    duration: formatDuration(job.createdAt, job.updatedAt),
    timeRemaining: estimateTimeRemaining(job),
    errors: job.errors,
    isComplete: isJobComplete(job),
    isInProgress: isJobInProgress(job),
    isFailed: isJobFailed(job),
  };
}
