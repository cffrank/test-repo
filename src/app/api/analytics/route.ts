import { neonAuth } from "@/lib/auth/server";
import { getExpenses, getOptimizationTasks } from "@/lib/db/queries";
import { NextResponse } from "next/server";

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
    const tasks = await getOptimizationTasks(projectId);

    const totalSpend = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const totalSavings = tasks
      .filter((t) => t.status === "completed")
      .reduce((sum, task) => sum + Number(task.savings || 0), 0);
    const pendingSavings = tasks
      .filter((t) => t.status === "pending")
      .reduce((sum, task) => sum + Number(task.savings || 0), 0);

    const monthlyData = expenses.reduce((acc: Record<string, number>, exp) => {
      const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
      const month = date.toISOString().slice(0, 7);
      if (!acc[month]) acc[month] = 0;
      acc[month] += Number(exp.amount);
      return acc;
    }, {});

    // Sort by month and format for chart
    const sortedMonthly = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        name: new Date(month + "-01").toLocaleDateString("en-US", { month: "short" }),
        cost: Number(amount.toFixed(2)),
      }));

    return NextResponse.json({
      totalSpend: Number(totalSpend.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
      pendingSavings: Number(pendingSavings.toFixed(2)),
      monthlyData: sortedMonthly,
      expenseCount: expenses.length,
    });
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
