"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CostChart } from "@/components/dashboard/CostChart";
import { TaskList } from "@/components/dashboard/TaskList";

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400">Overview of your cloud infrastructure costs.</p>
                </div>
                <Button>
                    Analyze Costs
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card>
                    <h3 className="text-sm font-medium text-slate-400">Total Spend (MTD)</h3>
                    <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
                    <span className="mt-1 inline-block text-xs text-green-500">
                        +0% from last month
                    </span>
                </Card>
                <Card>
                    <h3 className="text-sm font-medium text-slate-400">Forecasted Spend</h3>
                    <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
                    <span className="mt-1 inline-block text-xs text-slate-500">
                        Based on current usage
                    </span>
                </Card>
                <Card>
                    <h3 className="text-sm font-medium text-slate-400">Potential Savings</h3>
                    <p className="mt-2 text-3xl font-bold text-green-500">$0.00</p>
                    <span className="mt-1 inline-block text-xs text-slate-500">
                        0 optimizations available
                    </span>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="h-96">
                    <h3 className="mb-4 text-sm font-medium text-slate-400">Cost Trend</h3>
                    <div className="h-[calc(100%-2rem)] w-full">
                        <CostChart />
                    </div>
                </Card>
                <Card className="h-96 overflow-y-auto">
                    <TaskList />
                </Card>
            </div>
        </div>
    );
}
