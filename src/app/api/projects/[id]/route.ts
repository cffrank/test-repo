import { neonAuth } from "@/lib/auth/server";
import { getProjectById, updateProject, deleteProject } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: unknown) {
    console.error("Error fetching project:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch project";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    await updateProject(id, {
      name,
      description,
    });
    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: unknown) {
    console.error("Error updating project:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteProject(id);
    const success = true;

    if (!success) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting project:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete project";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
