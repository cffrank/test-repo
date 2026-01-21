import { pgTable, text, timestamp, uuid, numeric } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  date: timestamp("date").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  service: text("service"),
  accountId: text("account_id"),
  region: text("region"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const optimizationTasks = pgTable("optimization_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  savings: text("savings").notNull(),
  effort: text("effort").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type OptimizationTask = typeof optimizationTasks.$inferSelect;
export type NewTask = typeof optimizationTasks.$inferInsert;
