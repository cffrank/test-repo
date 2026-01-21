import { db, projects, expenses, optimizationTasks } from "@/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export async function getProjects(userId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function createProject(data: {
  userId: string;
  name: string;
  description?: string;
  currency?: string;
}) {
  const [project] = await db
    .insert(projects)
    .values({
      userId: data.userId,
      name: data.name,
      description: data.description,
      currency: data.currency || "USD",
    })
    .returning();
  return project;
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; description: string }>
) {
  await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getExpenses(projectId: string) {
  return db
    .select()
    .from(expenses)
    .where(eq(expenses.projectId, projectId))
    .orderBy(desc(expenses.date));
}

export async function createExpense(data: Omit<typeof expenses.$inferInsert, "id" | "createdAt">) {
  const [expense] = await db.insert(expenses).values(data).returning();
  return expense;
}

export async function createExpenses(
  projectId: string,
  userId: string,
  expensesData: Array<Omit<typeof expenses.$inferInsert, "id" | "createdAt" | "projectId">>
) {
  const values = expensesData.map((e) => ({
    ...e,
    projectId,
    date: e.date instanceof Date ? e.date : new Date(e.date as string),
  }));
  return db.insert(expenses).values(values).returning();
}

export async function deleteExpense(id: string) {
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function getDashboardMetrics(projectId: string) {
  const projectExpenses = await db.select().from(expenses).where(eq(expenses.projectId, projectId));

  const totalSpend = projectExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const spendByCategory = projectExpenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  const monthlySpend = projectExpenses.reduce(
    (acc, e) => {
      const date = e.date instanceof Date ? e.date : new Date(e.date);
      const monthKey = date.toISOString().slice(0, 7);
      acc[monthKey] = (acc[monthKey] || 0) + Number(e.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalSpend,
    spendByCategory,
    monthlySpend,
    expenseCount: projectExpenses.length,
  };
}

export async function getOptimizationTasks(projectId: string) {
  return db
    .select()
    .from(optimizationTasks)
    .where(eq(optimizationTasks.projectId, projectId))
    .orderBy(desc(optimizationTasks.createdAt));
}

export async function createOptimizationTask(
  data: Omit<typeof optimizationTasks.$inferInsert, "id" | "createdAt">
) {
  const [task] = await db.insert(optimizationTasks).values(data).returning();
  return task;
}

export async function updateTaskStatus(id: string, status: "pending" | "completed" | "dismissed") {
  await db.update(optimizationTasks).set({ status }).where(eq(optimizationTasks.id, id));
}

export async function deleteTask(id: string) {
  await db.delete(optimizationTasks).where(eq(optimizationTasks.id, id));
}
