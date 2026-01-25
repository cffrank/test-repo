import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getRequiredCloudflareEnv } from "@/lib/queue/bindings";
import { getJobStatus } from "@/lib/queue/kv";
import type { JobStatus } from "@/lib/queue/types";

export const runtime = "edge";

/**
 * GET /api/upload/status/[jobId]
 *
 * Get the current status of an upload job.
 *
 * This endpoint:
 * 1. Authenticates the user
 * 2. Retrieves job status from KV
 * 3. Verifies job ownership
 * 4. Returns the complete JobStatus object
 *
 * The response includes:
 * - Upload progress (chunks uploaded/validated/processed)
 * - Database insertion progress (rows inserted)
 * - Current status (uploading/validating/processing/complete/failed)
 * - Any errors encountered during processing
 *
 * Security considerations:
 * - Requires authentication
 * - Verifies job ownership (userId matches)
 * - Does not expose sensitive system information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Authenticate user
    const auth = neonAuth();
    const user = await auth.user();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view job status." },
        { status: 401 }
      );
    }

    // Extract jobId from route parameters (Next.js 15+ async params)
    const { jobId } = await params;

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "Invalid jobId in URL path" },
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
            "Status service not available. This feature requires Cloudflare deployment.",
        },
        { status: 503 }
      );
    }

    // Get job status from KV
    let job: JobStatus | null;
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
        { error: "Job not found. Invalid jobId or job may have expired." },
        { status: 404 }
      );
    }

    // Verify job ownership - user can only view their own jobs
    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. You do not have access to this job." },
        { status: 403 }
      );
    }

    // Return the complete job status
    // The JobStatus type already includes all necessary information
    return NextResponse.json(job, { status: 200 });
  } catch (error) {
    // Log unexpected errors for debugging
    console.error("Unexpected error in upload status:", error);

    // Return generic error to client (don't leak internal details)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
