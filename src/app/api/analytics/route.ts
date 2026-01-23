import { neonAuth } from "@/lib/auth/server";
import { getExpenses, getOptimizationTasks } from "@/lib/db/queries";
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

    // Calculate trends (comparing current period to previous period)
    const currentPeriodTotal = sortedMonthly.slice(-3).reduce((sum, m) => sum + m.cost, 0);
    const previousPeriodTotal = sortedMonthly.slice(-6, -3).reduce((sum, m) => sum + m.cost, 0);
    const spendTrend = previousPeriodTotal > 0
      ? ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100
      : 0;

    const currentSavings = totalSavings;
    const previousSavings = tasks
      .filter((t) => t.status === "completed" && t.createdAt)
      .slice(0, Math.floor(tasks.length / 2))
      .reduce((sum, task) => sum + Number(task.savings || 0), 0);
    const savingsTrend = previousSavings > 0
      ? ((currentSavings - previousSavings) / previousSavings) * 100
      : 0;

    // Calculate sparkline data (last 12 months)
    const sparklineData = sortedMonthly.slice(-12).map(m => m.cost);

    // Group expenses by service
    const serviceData = expenses.reduce((acc: Record<string, number>, exp) => {
      const service = exp.service || "Other";
      if (!acc[service]) acc[service] = 0;
      acc[service] += Number(exp.amount);
      return acc;
    }, {});

    // Calculate top services with percentages
    const topServices = Object.entries(serviceData)
      .map(([name, amount]) => ({
        name,
        amount: Number(amount.toFixed(2)),
        percentage: (amount / totalSpend) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate budget data (example: 30k budget)
    const budgetTotal = 30000;
    const budgetUsed = totalSpend;
    const budgetPercentage = Math.min((budgetUsed / budgetTotal) * 100, 100);

    return NextResponse.json({
      totalSpend: Number(totalSpend.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
      pendingSavings: Number(pendingSavings.toFixed(2)),
      monthlyData: sortedMonthly,
      expenseCount: expenses.length,
      spendTrend,
      savingsTrend,
      sparklineData,
      topServices,
      budget: {
        total: budgetTotal,
        used: Number(budgetUsed.toFixed(2)),
        percentage: Number(budgetPercentage.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
