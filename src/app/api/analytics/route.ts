import { neonAuth } from "@/lib/auth/server";
import { getExpenses, getTasks } from "@/lib/db/queries";
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

    const expenses = await getExpenses(projectId, user.id);
    const tasks = await getTasks(projectId, user.id);

    const totalSpend = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalSavings = tasks
      .filter((t) => t.status === "completed")
      .reduce((sum, task) => sum + (task.savings || 0), 0);
    const pendingSavings = tasks
      .filter((t) => t.status === "pending")
      .reduce((sum, task) => sum + (task.savings || 0), 0);

    const monthlyData = expenses.reduce((acc: any, exp) => {
      const month = exp.date.slice(0, 7);
      if (!acc[month]) acc[month] = 0;
      acc[month] += exp.amount;
      return acc;
    }, {});

    return NextResponse.json({
      totalSpend,
      totalSavings,
      pendingSavings,
      monthlyData: Object.entries(monthlyData).map(([month, amount]) => ({
        month,
        amount,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
