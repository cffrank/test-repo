/**
 * Cloudflare Worker environment bindings.
 * These are configured in wrangler.toml and injected at runtime.
 */

import type { R2Bucket } from "@/lib/queue/r2";
import type { KVNamespace } from "@/lib/queue/kv";
import type { ChunkMessage } from "@/lib/queue/types";

/**
 * Queue interface for Cloudflare Queues.
 * Supports sending messages to the queue.
 */
export interface Queue<T = unknown> {
  send(message: T): Promise<void>;
  sendBatch(messages: T[]): Promise<void>;
}

/**
 * Message interface for queue consumers.
 * Wraps the actual message body with metadata.
 */
export interface Message<T = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: T;
  retry(): void;
  ack(): void;
}

/**
 * Batch of messages delivered to queue consumer.
 * The consumer processes messages in batches for efficiency.
 */
export interface MessageBatch<T = unknown> {
  readonly queue: string;
  readonly messages: Message<T>[];
  retryAll(): void;
  ackAll(): void;
}

/**
 * Cloudflare Worker environment bindings.
 * All bindings are injected by the Cloudflare Workers runtime.
 */
export interface Env {
  // R2 bucket for storing uploaded file chunks
  UPLOADS_BUCKET: R2Bucket;

  // KV namespace for tracking job status and metadata
  JOB_STATUS: KVNamespace;

  // Queue for sending file processing messages
  FILE_QUEUE: Queue<ChunkMessage>;

  // Database connection string (Neon Postgres)
  DATABASE_URL: string;

  // Railway validator service URL for CSV validation
  VALIDATOR_URL: string;

  // Environment (development, staging, production)
  ENVIRONMENT?: string;
}

/**
 * Queue consumer handler interface.
 * Workers must export a default object with this structure.
 */
export interface QueueHandler<T = unknown> {
  queue(batch: MessageBatch<T>, env: Env, ctx: ExecutionContext): Promise<void>;
}

/**
 * Execution context for Cloudflare Workers.
 * Provides methods for managing the worker lifecycle.
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
