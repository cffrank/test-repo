/**
 * Cloudflare Workers exports.
 * Central export point for all worker-related types and utilities.
 */

export type {
  Env,
  Queue,
  Message,
  MessageBatch,
  QueueHandler,
  ExecutionContext,
} from "./types";

// The queue consumer worker is the default export
// Import it in wrangler.toml as the main worker script
export { default as queueConsumer } from "./queue-consumer";
