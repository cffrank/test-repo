// Chunk size: 5MB for efficient upload and processing
export const CHUNK_SIZE = 5 * 1024 * 1024;

// Batch size for database inserts
export const BATCH_SIZE = 500;

// Maximum concurrent uploads to prevent overwhelming the server
export const MAX_CONCURRENT_UPLOADS = 3;

// Validator service URL - defaults to Railway deployment
export const VALIDATOR_URL =
  process.env.VALIDATOR_URL || "https://validator-production.railway.app";
