import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@/lib/auth/server";
import { getExpenses, createOptimizationTask } from "@/lib/db/queries";
import { analyzeCostDataWithCerebras } from "@/lib/ai/cerebras";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    const auth = neonAuth(req);
    const user = await auth.user();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const projectId = body.projectId || user.id;

        // Fetch expenses from database
        const expenses = await getExpenses(projectId);

        if (!expenses.length) {
            return NextResponse.json({ error: "No expense data to analyze" }, { status: 400 });
        }

        // Analyze with Cerebras AI
        const recommendations = await analyzeCostDataWithCerebras(expenses);

        // Save recommendations as optimization tasks
        const savedTasks = [];
        for (const rec of recommendations) {
            const task = await createOptimizationTask({
                projectId,
                title: rec.title,
                description: rec.description,
                savings: rec.savings || "0",
                effort: rec.effort,
                priority: rec.priority,
                status: "pending",
            });
            savedTasks.push(task);
        }

        return NextResponse.json({
            tasks: savedTasks,
            message: `Generated ${savedTasks.length} optimization recommendations`
        });
    } catch (error) {
        console.error("Analysis API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
