import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const validatorUrl = process.env.VALIDATOR_URL || process.env.NEXT_PUBLIC_VALIDATOR_URL || "http://localhost:8000";

  try {
    const formData = await req.formData();
    const version = req.nextUrl.searchParams.get("version") || "1.2";

    const response = await fetch(`${validatorUrl}/validate?version=${version}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = "Validation service unavailable";
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorDetail;
      } catch {
        // Use default error message
      }
      return NextResponse.json({ error: errorDetail }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error("Validation proxy error:", error);
    return NextResponse.json(
      { error: "Validation service is currently unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
