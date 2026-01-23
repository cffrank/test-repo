import { neonAuth } from "@/lib/auth/server";
import { getProjects, createProject } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(request: Request) {
  const auth = neonAuth();
  const user = await auth.user();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await getProjects(user.id);
    return NextResponse.json({ projects });
  } catch (error: unknown) {
    console.error("Error fetching projects:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch projects";
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
    const { name, description, currency } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await createProject({
      userId: user.id,
      name,
      description,
      currency: currency || "USD",
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating project:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
