"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CostChart } from "@/components/dashboard/CostChart";
import { TaskList } from "@/components/dashboard/TaskList";
import { useAuth } from "@/context/AuthContext";

interface Analytics {
  totalSpend: number;
  totalSavings: number;
  pendingSavings: number;
  monthlyData: { name: string; cost: number }[];
  expenseCount: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
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
    }
    fetchAnalytics();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Overview of your cloud infrastructure costs.</p>
        </div>
        <Button>Analyze Costs</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <h3 className="text-sm font-medium text-slate-400">Total Spend</h3>
          <p className="mt-2 text-3xl font-bold text-white">
            {loading ? "..." : formatCurrency(analytics?.totalSpend || 0)}
          </p>
          <span className="mt-1 inline-block text-xs text-slate-500">
            {analytics?.expenseCount || 0} expense records
          </span>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-400">Savings Achieved</h3>
          <p className="mt-2 text-3xl font-bold text-green-500">
            {loading ? "..." : formatCurrency(analytics?.totalSavings || 0)}
          </p>
          <span className="mt-1 inline-block text-xs text-slate-500">From completed optimizations</span>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-400">Potential Savings</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-500">
            {loading ? "..." : formatCurrency(analytics?.pendingSavings || 0)}
          </p>
          <span className="mt-1 inline-block text-xs text-slate-500">
            From pending optimizations
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="h-96">
          <h3 className="mb-4 text-sm font-medium text-slate-400">Cost Trend</h3>
          <div className="h-[calc(100%-2rem)] w-full">
            <CostChart data={analytics?.monthlyData} />
          </div>
        </Card>
        <Card className="h-96 overflow-y-auto">
          <TaskList />
        </Card>
      </div>
    </div>
  );
}
