import { neonAuth } from "@/lib/auth/server";
import { deleteExpense } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export const runtime = 'edge';

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
    await deleteExpense(id);
    const success = true;

    if (!success) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting expense:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete expense";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
