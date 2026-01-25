import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getRequiredCloudflareEnv } from "@/lib/queue/bindings";
import { getJobStatus, incrementJobCounter } from "@/lib/queue/kv";

export const runtime = "edge";

/**
 * PUT /api/upload/chunk?jobId={jobId}&chunkIndex={index}
 *
 * Upload a single chunk to R2 storage.
 *
 * This endpoint:
 * 1. Authenticates the user
 * 2. Validates the job exists and user has access
 * 3. Stores the chunk data in R2
 * 4. Increments the chunksUploaded counter in KV
 *
 * Query parameters:
 * - jobId: The upload job ID
 * - chunkIndex: The zero-based index of this chunk
 *
 * Security considerations:
 * - Requires authentication
 * - Verifies job ownership
 * - Validates chunk index is within bounds
 * - Prevents duplicate uploads (idempotent)
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const auth = neonAuth();
    const user = await auth.user();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to upload chunks." },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const chunkIndexStr = searchParams.get("chunkIndex");

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "jobId query parameter is required" },
        { status: 400 }
      );
    }

    if (!chunkIndexStr) {
      return NextResponse.json(
        { error: "chunkIndex query parameter is required" },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    if (isNaN(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json(
        { error: "chunkIndex must be a non-negative integer" },
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

    // Verify job ownership
    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You do not have access to this job." },
        { status: 403 }
      );
    }

    // Verify job is in uploading status
    if (job.status !== "uploading") {
      return NextResponse.json(
        {
          error: `Cannot upload chunks. Job is in '${job.status}' status.`,
        },
        { status: 400 }
      );
    }

    // Verify chunk index is within bounds
    if (chunkIndex >= job.totalChunks) {
      return NextResponse.json(
        {
          error: `Invalid chunk index. Expected 0-${job.totalChunks - 1}, got ${chunkIndex}.`,
        },
        { status: 400 }
      );
    }

    // Read chunk data from request body
    let chunkData: ArrayBuffer;
    try {
      chunkData = await request.arrayBuffer();
    } catch (error) {
      console.error("Failed to read chunk data:", error);
      return NextResponse.json(
        { error: "Failed to read chunk data from request body." },
        { status: 400 }
      );
    }

    // Validate chunk data is not empty
    if (chunkData.byteLength === 0) {
      return NextResponse.json(
        { error: "Chunk data is empty. Cannot upload empty chunks." },
        { status: 400 }
      );
    }

    // Store chunk in R2
    const chunkKey = `${jobId}/chunk-${chunkIndex}`;
    try {
      // Check if chunk already exists (idempotent upload)
      const existing = await env.UPLOADS_BUCKET.get(chunkKey);
      const isNewUpload = !existing;

      // Upload chunk to R2
      await env.UPLOADS_BUCKET.put(chunkKey, chunkData);

      // Increment counter only if this is a new upload
      if (isNewUpload) {
        await incrementJobCounter(env.JOB_STATUS, jobId, "chunksUploaded");
      }
    } catch (error) {
      console.error("Failed to store chunk in R2:", error);
      return NextResponse.json(
        { error: "Failed to store chunk. Please try again." },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Chunk uploaded successfully",
        chunkIndex,
      },
      { status: 200 }
    );
  } catch (error) {
    // Log unexpected errors for debugging
    console.error("Unexpected error in chunk upload:", error);

    // Return generic error to client (don't leak internal details)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
