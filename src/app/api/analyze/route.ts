import { NextRequest, NextResponse } from "next/server";
import { analyzeCostData } from "@/lib/ai/gemini";

// In a real app, this would read from Firestore or receive a large payload.
// For MVP, we'll accept a small set of records in the body.

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { records } = body;

        if (!records || !Array.isArray(records)) {
            return NextResponse.json({ error: "Invalid records provided" }, { status: 400 });
        }

        const tasks = await analyzeCostData(records);

        // In real app: Store tasks in Firestore here

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error("Analysis API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
