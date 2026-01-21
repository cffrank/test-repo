"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface Task {
  id: string;
  title: string;
  description: string;
  savings: number;
  effort: "Low" | "Medium" | "High";
  priority: "High" | "Medium" | "Low";
  status: "pending" | "completed" | "dismissed";
}

export function TaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      if (!user) return;
      try {
        const res = await fetch(`/api/tasks?projectId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [user]);

  const handleUpdateStatus = async (taskId: string, status: "completed" | "dismissed") => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const formatSavings = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount) + "/mo";
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Recommended Actions</h3>
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Recommended Actions</h3>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </div>

      {pendingTasks.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p>No optimization tasks yet.</p>
          <p className="text-sm mt-1">Click &quot;Analyze Costs&quot; to generate recommendations.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:bg-slate-800/80"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-200">{task.title}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${
                        task.priority === "High"
                          ? "bg-red-500/10 text-red-500"
                          : task.priority === "Medium"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-slate-500/10 text-slate-500"
                      }`}
                  >
                    {task.priority}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                  <span>Est. Effort: {task.effort}</span>
                  <span>•</span>
                  <span className="text-green-500 font-semibold">Save {formatSavings(task.savings)}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 hover:bg-green-900/20 hover:text-green-500 hover:border-green-800"
                onClick={() => handleUpdateStatus(task.id, "completed")}
              >
                Fix
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
