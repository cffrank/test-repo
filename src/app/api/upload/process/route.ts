import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getRequiredCloudflareEnv } from "@/lib/queue/bindings";
import { getJobStatus, updateJobStatus } from "@/lib/queue/kv";
import type { ChunkMessage } from "@/lib/queue/types";

export const runtime = "edge";

/**
 * Request body schema for upload processing.
 */
interface ProcessUploadRequest {
  jobId: string;
  projectId: string; // Project ID for database insertion
}

/**
 * Response schema for upload processing.
 */
interface ProcessUploadResponse {
  success: boolean;
  message: string;
  chunksQueued?: number;
}

/**
 * POST /api/upload/process
 *
 * Start processing uploaded chunks.
 *
 * This endpoint:
 * 1. Authenticates the user
 * 2. Verifies all chunks have been uploaded to R2
 * 3. Updates job status to 'validating'
 * 4. Sends messages to the processing queue (one per chunk)
 * 5. Returns success confirmation
 *
 * The queue consumer will then:
 * - Validate each chunk's CSV format
 * - Parse and insert data into the database
 * - Update job progress in KV
 *
 * Security considerations:
 * - Requires authentication
 * - Verifies job ownership (userId matches)
 * - Validates all chunks exist before queuing
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = neonAuth();
    const user = await auth.user();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to process uploads." },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: ProcessUploadRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const { jobId, projectId } = body;

    // Validate required fields
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "jobId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required and must be a string" },
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
            "Processing infrastructure not available. This feature requires Cloudflare deployment.",
        },
        { status: 503 }
      );
    }

    // Get job status from KV
    let job;
    try {
      job = await getJobStatus(env.JOB_STATUS, jobId);
    } catch (error) {
      console.error("Failed to get job status:", error);
      return NextResponse.json(
        { error: "Failed to retrieve job status. Please try again." },
        { status: 500 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: "Job not found. Invalid jobId." },
        { status: 404 }
      );
    }

    // Verify job ownership - user can only process their own jobs
    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You do not have access to this job." },
        { status: 403 }
      );
    }

    // Verify job is in correct status
    if (job.status !== "uploading") {
      return NextResponse.json(
        {
          error: `Cannot process job. Job is in '${job.status}' status. Expected 'uploading'.`,
        },
        { status: 400 }
      );
    }

    // Verify all chunks have been uploaded
    // We'll check that chunksUploaded matches totalChunks
    if (job.chunksUploaded < job.totalChunks) {
      return NextResponse.json(
        {
          error: `Not all chunks uploaded. Expected ${job.totalChunks}, got ${job.chunksUploaded}.`,
        },
        { status: 400 }
      );
    }

    // Verify chunks exist in R2
    // This is a critical security check to prevent processing incomplete uploads
    const missingChunks: number[] = [];
    for (let i = 0; i < job.totalChunks; i++) {
      const chunkKey = `${jobId}/chunk-${i}`;
      try {
        const object = await env.UPLOADS_BUCKET.get(chunkKey);
        if (!object) {
          missingChunks.push(i);
        }
      } catch (error) {
        console.error(`Failed to check chunk ${i}:`, error);
        missingChunks.push(i);
      }
    }

    if (missingChunks.length > 0) {
      return NextResponse.json(
        {
          error: `Missing chunks in storage: ${missingChunks.join(", ")}. Please re-upload these chunks.`,
        },
        { status: 400 }
      );
    }

    // Update job status to 'validating'
    try {
      await updateJobStatus(env.JOB_STATUS, jobId, {
        status: "validating",
      });
    } catch (error) {
      console.error("Failed to update job status:", error);
      return NextResponse.json(
        { error: "Failed to update job status. Please try again." },
        { status: 500 }
      );
    }

    // Send messages to queue (one per chunk)
    // The queue consumer will process each chunk independently
    const messages: ChunkMessage[] = [];
    for (let i = 0; i < job.totalChunks; i++) {
      const message: ChunkMessage = {
        jobId,
        chunkIndex: i,
        totalChunks: job.totalChunks,
        userId: job.userId,
        projectId,
      };
      messages.push(message);
    }

    try {
      // Send all messages in a single batch for efficiency
      await env.FILE_QUEUE.sendBatch(messages);
    } catch (error) {
      console.error("Failed to send messages to queue:", error);

      // Revert job status back to 'uploading' since processing failed
      try {
        await updateJobStatus(env.JOB_STATUS, jobId, {
          status: "uploading",
        });
      } catch (revertError) {
        console.error("Failed to revert job status:", revertError);
      }

      return NextResponse.json(
        {
          error:
            "Failed to queue chunks for processing. Please try again.",
        },
        { status: 500 }
      );
    }

    // Return success response
    const response: ProcessUploadResponse = {
      success: true,
      message: "Processing started",
      chunksQueued: messages.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Log unexpected errors for debugging
    console.error("Unexpected error in upload process:", error);

    // Return generic error to client (don't leak internal details)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
