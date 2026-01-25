import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getRequiredCloudflareEnv } from "@/lib/queue/bindings";
import { createJob } from "@/lib/queue/kv";
import type { JobStatus } from "@/lib/queue/types";

export const runtime = "edge";

/**
 * Request body schema for upload initialization.
 */
interface InitUploadRequest {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  userId?: string; // Optional override, defaults to authenticated user
}

/**
 * Response schema for upload initialization.
 */
interface InitUploadResponse {
  jobId: string;
  presignedUrls: string[];
}

/**
 * POST /api/upload/init
 *
 * Initialize a chunked file upload job.
 *
 * This endpoint:
 * 1. Authenticates the user
 * 2. Validates the upload request
 * 3. Creates a job record in KV with status 'uploading'
 * 4. Generates presigned URLs for each chunk upload to R2
 * 5. Returns the job ID and upload URLs
 *
 * Security considerations:
 * - Requires authentication
 * - Validates file size and chunk count to prevent abuse
 * - Generates unique job IDs to prevent collisions
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = neonAuth();
    const user = await auth.user();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to upload files." },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: InitUploadRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const { fileName, fileSize, totalChunks, userId } = body;

    // Validate required fields
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "fileName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json(
        { error: "fileSize is required and must be a positive number" },
        { status: 400 }
      );
    }

    if (!totalChunks || typeof totalChunks !== "number" || totalChunks <= 0) {
      return NextResponse.json(
        { error: "totalChunks is required and must be a positive number" },
        { status: 400 }
      );
    }

    // Prevent excessively large uploads (e.g., > 1000 chunks = ~5GB with 5MB chunks)
    const MAX_CHUNKS = 1000;
    if (totalChunks > MAX_CHUNKS) {
      return NextResponse.json(
        {
          error: `Too many chunks. Maximum allowed is ${MAX_CHUNKS}. Please use larger chunk sizes.`,
        },
        { status: 400 }
      );
    }

    // Get Cloudflare bindings
    let env;
    try {
      env = getRequiredCloudflareEnv(request);
    } catch (error) {
      console.error("Failed to get Cloudflare bindings:", error);
      return NextResponse.json(
        {
          error:
            "Upload infrastructure not available. This feature requires Cloudflare deployment.",
        },
        { status: 503 }
      );
    }

    // Generate unique job ID using timestamp and random suffix
    const jobId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Create job record in KV
    const now = new Date().toISOString();
    const job: JobStatus = {
      id: jobId,
      userId: userId || user.id,
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
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createJob(env.JOB_STATUS, job);
    } catch (error) {
      console.error("Failed to create job in KV:", error);
      return NextResponse.json(
        { error: "Failed to initialize upload job. Please try again." },
        { status: 500 }
      );
    }

    // Generate presigned URLs for each chunk
    // In Cloudflare R2, we'll use direct PUT URLs with signed tokens
    // For MVP, we're using a simpler approach with chunk keys
    const presignedUrls: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
      // Generate chunk key: {jobId}/chunk-{index}
      const chunkKey = `${jobId}/chunk-${i}`;

      // For Cloudflare Pages, we'll create URLs that the client can use
      // The client will upload chunks to a separate endpoint that accepts the chunk data
      // In production, you'd use R2's presigned URLs with expiration
      const presignedUrl = `/api/upload/chunk?jobId=${encodeURIComponent(jobId)}&chunkIndex=${i}`;
      presignedUrls.push(presignedUrl);
    }

    // Return success response
    const response: InitUploadResponse = {
      jobId,
      presignedUrls,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Log unexpected errors for debugging
    console.error("Unexpected error in upload init:", error);

    // Return generic error to client (don't leak internal details)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
