"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CostChart } from "@/components/dashboard/CostChart";
import { TaskList } from "@/components/dashboard/TaskList";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { TrendIndicator } from "@/components/dashboard/TrendIndicator";
import { TopServices } from "@/components/dashboard/TopServices";
import { useAuth } from "@/context/AuthContext";
import { DollarSign, TrendingDown, Target, Wallet } from "lucide-react";

interface Analytics {
  totalSpend: number;
  totalSavings: number;
  pendingSavings: number;
  monthlyData: { name: string; cost: number }[];
  expenseCount: number;
  spendTrend: number;
  savingsTrend: number;
  sparklineData: number[];
  topServices: { name: string; amount: number; percentage: number }[];
  budget: {
    total: number;
    used: number;
    percentage: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [taskListKey, setTaskListKey] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/analytics?projectId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleAnalyzeCosts = async () => {
    if (!user || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Analysis complete:", data.message);
        // Refresh analytics and task list
        await fetchAnalytics();
        setTaskListKey((k) => k + 1);
      } else {
        const error = await res.json();
        console.error("Analysis failed:", error);
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getBudgetColor = () => {
    if (!analytics?.budget) return "text-green-500";
    const { percentage } = analytics.budget;
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 75) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Real-time overview of your cloud infrastructure costs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent/10 p-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                </div>
                <h3 className="text-sm font-medium text-slate-400">Total Spend</h3>
              </div>
              <p className="mt-3 text-3xl font-bold text-white">
                {loading ? "..." : formatCurrency(analytics?.totalSpend || 0)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {!loading && analytics?.spendTrend !== undefined && (
                  <TrendIndicator value={analytics.spendTrend} inverse />
                )}
                <span className="text-xs text-slate-500">vs previous period</span>
              </div>
            </div>
          </div>
          {!loading && analytics?.sparklineData && (
            <div className="mt-4">
              <Sparkline data={analytics.sparklineData} width={200} height={40} />
            </div>
          )}
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-500/10 p-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="text-sm font-medium text-slate-400">Savings Achieved</h3>
              </div>
              <p className="mt-3 text-3xl font-bold text-green-500">
                {loading ? "..." : formatCurrency(analytics?.totalSavings || 0)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {!loading && analytics?.savingsTrend !== undefined && (
                  <TrendIndicator value={analytics.savingsTrend} />
                )}
                <span className="text-xs text-slate-500">from optimizations</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-yellow-500/10 p-2">
                  <Wallet className="h-4 w-4 text-yellow-500" />
                </div>
                <h3 className="text-sm font-medium text-slate-400">Potential Savings</h3>
              </div>
              <p className="mt-3 text-3xl font-bold text-yellow-500">
                {loading ? "..." : formatCurrency(analytics?.pendingSavings || 0)}
              </p>
              <div className="mt-2">
                <Badge variant="warning" className="text-xs">
                  {analytics?.expenseCount || 0} opportunities
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent/10 p-2">
                  <Target className="h-4 w-4 text-accent" />
                </div>
                <h3 className="text-sm font-medium text-slate-400">Budget Status</h3>
              </div>
              <p className={`mt-3 text-3xl font-bold ${getBudgetColor()}`}>
                {loading ? "..." : `${analytics?.budget?.percentage?.toFixed(1) || 0}%`}
              </p>
              <div className="mt-3 space-y-1">
                <Progress
                  value={analytics?.budget?.percentage || 0}
                  className="h-2"
                />
                <p className="text-xs text-slate-500">
                  {loading ? "..." : `${formatCurrency(analytics?.budget?.used || 0)} / ${formatCurrency(analytics?.budget?.total || 0)}`}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-96">
            <h3 className="mb-4 text-sm font-medium text-slate-400">Cost Trend</h3>
            <div className="h-[calc(100%-2rem)] w-full">
              <CostChart data={analytics?.monthlyData} />
            </div>
          </Card>

          <TopServices services={analytics?.topServices || []} loading={loading} />
        </div>

        <div className="space-y-6">
          <Card className="max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Optimization Tasks</h3>
              <button
                onClick={handleAnalyzeCosts}
                disabled={analyzing}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent/90 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Costs"
                )}
              </button>
            </div>
            <TaskList key={taskListKey} />
          </Card>
        </div>
      </div>
    </div>
  );
}
