/**
 * Cloudflare bindings helper for Next.js on Cloudflare Pages.
 * Provides typed access to R2, KV, and Queue bindings.
 */

import type { KVNamespace } from "./kv";
import type { R2Bucket } from "./r2";
import type { ChunkMessage } from "./types";

/**
 * Cloudflare Queue interface for sending messages.
 */
export interface Queue<T = unknown> {
  send(message: T): Promise<void>;
  sendBatch(messages: T[]): Promise<void>;
}

/**
 * Environment bindings available in Cloudflare Pages.
 * These are configured in wrangler.toml.
 */
export interface CloudflareEnv {
  UPLOADS_BUCKET: R2Bucket;
  JOB_STATUS: KVNamespace;
  FILE_QUEUE: Queue<ChunkMessage>;
}

/**
 * Extract Cloudflare environment bindings from Next.js request.
 * In Cloudflare Pages, bindings are available via the platform context.
 */
export function getCloudflareEnv(request: Request): CloudflareEnv | null {
  // In Cloudflare Pages with Next.js, bindings are attached to the request
  // via the cf property or process.env depending on the runtime
  const cfRequest = request as Request & {
    cf?: unknown;
    env?: CloudflareEnv;
  };

  // Try to get from request.env (Cloudflare Workers style)
  if (cfRequest.env) {
    return cfRequest.env;
  }

  // For Cloudflare Pages, bindings might be in globalThis or process
  if (typeof globalThis !== "undefined") {
    const globalWithEnv = globalThis as typeof globalThis & {
      __env?: CloudflareEnv;
    };
    if (globalWithEnv.__env) {
      return globalWithEnv.__env;
    }
  }

  // If we can't find bindings, return null and let the route handle the error
  return null;
}

/**
 * Validate that required Cloudflare bindings are available.
 * Throws descriptive error if bindings are missing.
 */
export function requireCloudflareEnv(env: CloudflareEnv | null): asserts env is CloudflareEnv {
  if (!env) {
    throw new Error(
      "Cloudflare bindings not available. This API must run on Cloudflare Pages with configured R2, KV, and Queue bindings."
    );
  }

  if (!env.UPLOADS_BUCKET) {
    throw new Error("R2 bucket binding (UPLOADS_BUCKET) not configured.");
  }

  if (!env.JOB_STATUS) {
    throw new Error("KV namespace binding (JOB_STATUS) not configured.");
  }

  if (!env.FILE_QUEUE) {
    throw new Error("Queue binding (FILE_QUEUE) not configured.");
  }
}

/**
 * Get Cloudflare bindings or throw error with helpful message.
 * Use this in API routes that require Cloudflare infrastructure.
 */
export function getRequiredCloudflareEnv(request: Request): CloudflareEnv {
  const env = getCloudflareEnv(request);
  requireCloudflareEnv(env);
  return env;
}
