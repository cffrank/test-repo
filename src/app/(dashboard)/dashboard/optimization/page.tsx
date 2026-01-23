"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import {
  DollarSign,
  CheckCircle,
  Clock,
  Filter,
  AlertCircle,
  TrendingDown,
  Zap,
  Server,
  Database,
  Cloud,
  Shield,
  X,
  Check
} from "lucide-react";

interface OptimizationTask {
  id: string;
  title: string;
  description: string;
  savings: string;
  effort: "easy" | "moderate" | "complex";
  priority: "high" | "medium" | "low";
  status: "pending" | "completed" | "dismissed";
  category?: string;
}

const CATEGORY_ICONS = {
  Rightsizing: Server,
  "Reserved Instances": DollarSign,
  "Unused Resources": Database,
  Storage: Cloud,
  Security: Shield,
  Other: AlertCircle,
};

const CATEGORY_COLORS = {
  Rightsizing: "bg-blue-500/10 text-blue-500",
  "Reserved Instances": "bg-accent/10 text-accent",
  "Unused Resources": "bg-red-500/10 text-red-500",
  Storage: "bg-purple-500/10 text-purple-500",
  Security: "bg-green-500/10 text-green-500",
  Other: "bg-slate-500/10 text-slate-500",
};

export default function OptimizationPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<OptimizationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedEffort, setSelectedEffort] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const fetchTasks = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function updateTaskStatus(taskId: string, status: "pending" | "completed" | "dismissed") {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, status } : task
          )
        );
      }
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  }

  function categorizeTask(task: OptimizationTask): string {
    if (task.category) return task.category;

    const title = task.title.toLowerCase();
    const description = task.description.toLowerCase();

    if (title.includes("rightsize") || title.includes("resize") || description.includes("instance size")) {
      return "Rightsizing";
    }
    if (title.includes("reserved") || title.includes("savings plan") || description.includes("commitment")) {
      return "Reserved Instances";
    }
    if (title.includes("unused") || title.includes("idle") || title.includes("delete")) {
      return "Unused Resources";
    }
    if (title.includes("storage") || title.includes("snapshot") || title.includes("volume")) {
      return "Storage";
    }
    if (title.includes("security") || title.includes("encryption") || description.includes("compliance")) {
      return "Security";
    }
    return "Other";
  }

  const categorizedTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      category: categorizeTask(task)
    }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return categorizedTasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (selectedPriority !== "all" && task.priority !== selectedPriority) return false;
      if (selectedEffort !== "all" && task.effort !== selectedEffort) return false;
      if (selectedCategory !== "all" && task.category !== selectedCategory) return false;
      return true;
    });
  }, [categorizedTasks, statusFilter, selectedPriority, selectedEffort, selectedCategory]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, OptimizationTask[]> = {};
    filteredTasks.forEach((task) => {
      const category = task.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(task);
    });
    return groups;
  }, [filteredTasks]);

  const totalPotentialSavings = useMemo(() => {
    return categorizedTasks
      .filter((task) => task.status === "pending")
      .reduce((sum, task) => {
        const savings = parseSavings(task.savings);
        return sum + savings;
      }, 0);
  }, [categorizedTasks]);

  const implementedSavings = useMemo(() => {
    return categorizedTasks
      .filter((task) => task.status === "completed")
      .reduce((sum, task) => {
        const savings = parseSavings(task.savings);
        return sum + savings;
      }, 0);
  }, [categorizedTasks]);

  const pendingCount = useMemo(() => {
    return categorizedTasks.filter((task) => task.status === "pending").length;
  }, [categorizedTasks]);

  function parseSavings(savings: string): number {
    const match = savings.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ""), 10);
    }
    return 0;
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getPriorityBadgeVariant(priority: string) {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  }

  function getEffortBadgeVariant(effort: string) {
    switch (effort) {
      case "easy":
        return "success";
      case "moderate":
        return "warning";
      case "complex":
        return "destructive";
      default:
        return "default";
    }
  }

  const categories = useMemo(() => {
    const uniqueCategories = new Set(categorizedTasks.map(task => task.category));
    return ["all", ...Array.from(uniqueCategories)];
  }, [categorizedTasks]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-slate-400">Loading optimization recommendations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Optimization Recommendations</h1>
        <p className="text-slate-400">
          AI-powered recommendations to reduce your cloud spend and improve efficiency.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent/10 p-2">
                  <TrendingDown className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm font-medium text-slate-400">Total Potential Savings</p>
              </div>
              <p className="text-3xl font-bold text-accent">
                {formatCurrency(totalPotentialSavings)}
              </p>
              <p className="text-sm text-slate-500">per month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-500/10 p-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Implemented Savings</p>
              </div>
              <p className="text-3xl font-bold text-green-500">
                {formatCurrency(implementedSavings)}
              </p>
              <p className="text-sm text-slate-500">per month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Pending Items</p>
              </div>
              <p className="text-3xl font-bold text-white">{pendingCount}</p>
              <p className="text-sm text-slate-500">recommendations awaiting action</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
                Priority
              </label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Zap className="inline h-4 w-4 mr-1" />
                Effort
              </label>
              <Select value={selectedEffort} onValueChange={setSelectedEffort}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Effort Levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("pending");
                  setSelectedPriority("all");
                  setSelectedEffort("all");
                  setSelectedCategory("all");
                }}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedTasks).length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12">
            <div className="text-center text-slate-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No recommendations found matching your filters</p>
              <p className="text-sm mt-2">Try adjusting your filter settings</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
            const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || AlertCircle;
            const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || "bg-slate-500/10 text-slate-500";
            const categorySavings = categoryTasks.reduce((sum, task) => sum + parseSavings(task.savings), 0);

            return (
              <Card key={category} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${colorClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-white">{category}</CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          {categoryTasks.length} recommendation{categoryTasks.length !== 1 ? "s" : ""} ·
                          Potential savings: {formatCurrency(categorySavings)}/mo
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-base font-semibold text-white">
                                {task.title}
                              </h4>
                              <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-xs">
                                {task.priority.toUpperCase()}
                              </Badge>
                              <Badge variant={getEffortBadgeVariant(task.effort)} className="text-xs">
                                {task.effort.charAt(0).toUpperCase() + task.effort.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400 mb-3">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-accent" />
                                <span className="text-sm font-semibold text-accent">
                                  {task.savings}
                                </span>
                              </div>
                              {task.status === "pending" && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  <span className="text-sm text-slate-400">Awaiting action</span>
                                </div>
                              )}
                              {task.status === "completed" && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-500">Implemented</span>
                                </div>
                              )}
                              {task.status === "dismissed" && (
                                <div className="flex items-center gap-2">
                                  <X className="h-4 w-4 text-slate-500" />
                                  <span className="text-sm text-slate-500">Dismissed</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {task.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => updateTaskStatus(task.id, "completed")}
                                className="flex items-center gap-1"
                              >
                                <Check className="h-4 w-4" />
                                Implement
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTaskStatus(task.id, "dismissed")}
                                className="flex items-center gap-1"
                              >
                                <X className="h-4 w-4" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                          {(task.status === "completed" || task.status === "dismissed") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTaskStatus(task.id, "pending")}
                              className="flex items-center gap-1"
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
