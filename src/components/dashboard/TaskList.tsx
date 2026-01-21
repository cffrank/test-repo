"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  savings: string;
  effort: "Low" | "Medium" | "High";
  priority: "High" | "Medium" | "Low";
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Delete unattached EBS volumes",
    savings: "$120.00/mo",
    effort: "Low",
    priority: "High",
  },
  {
    id: "2",
    title: "Right-size RDS instance (db-postgres-01)",
    savings: "$340.00/mo",
    effort: "Medium",
    priority: "Medium",
  },
  {
    id: "3",
    title: "Release unallocated Elastic IPs",
    savings: "$15.00/mo",
    effort: "Low",
    priority: "Low",
  },
];

export function TaskList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Recommended Actions</h3>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {mockTasks.map((task) => (
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
                <span className="text-green-500 font-semibold">Save {task.savings}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 hover:bg-green-900/20 hover:text-green-500 hover:border-green-800"
            >
              Fix
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
