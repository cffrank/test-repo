import { neonAuth } from "@/lib/auth/server";
import { updateTaskStatus, deleteTask } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    await updateTaskStatus(id, status);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error updating task:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteTask(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting task:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete task";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
