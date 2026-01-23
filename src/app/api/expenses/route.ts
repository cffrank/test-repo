import { neonAuth } from "@/lib/auth/server";
import { getExpenses, createExpenses } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(request: Request) {
  const auth = neonAuth(request);
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || user.id;

    const expenses = await getExpenses(projectId);
    return NextResponse.json({ expenses });
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = neonAuth(request);
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, expenses } = body;

    if (!expenses || !Array.isArray(expenses)) {
      return NextResponse.json({ error: "Expenses array is required" }, { status: 400 });
    }

    const createdExpenses = await createExpenses(projectId || user.id, user.id, expenses);

    return NextResponse.json({ expenses: createdExpenses }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating expenses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
