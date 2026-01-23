import { neonAuth } from "@/lib/auth/server";
import { getOptimizationTasks, createOptimizationTask } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(request: Request) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || user.id;

    const tasks = await getOptimizationTasks(projectId);
    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    console.error("Error fetching tasks:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, title, description, savings, effort, priority } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await createOptimizationTask({
      projectId: projectId || user.id,
      title,
      description,
      savings,
      effort,
      priority,
      status: "pending",
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating task:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
