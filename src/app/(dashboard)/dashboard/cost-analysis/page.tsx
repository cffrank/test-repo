"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { Download, Calendar, Filter, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Expense {
  id: string;
  amount: string;
  date: string | Date;
  category: string;
  service: string;
  description?: string;
  region?: string;
}

const COLORS = ["#EA994A", "#1E3B46", "#4A90E2", "#7B68EE", "#2ECC71", "#E74C3C", "#F39C12", "#9B59B6"];

const DATE_RANGES = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "12m": "Last 12 Months",
  "all": "All Time"
};

const COMPARISON_PERIODS = {
  "none": "No Comparison",
  "mom": "Month over Month",
  "yoy": "Year over Year",
  "previous": "vs Previous Period"
};

export default function CostAnalysisPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [comparisonPeriod, setComparisonPeriod] = useState("none");

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  async function fetchExpenses() {
    if (!user) return;
    try {
      const res = await fetch(`/api/expenses?projectId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterExpensesByDateRange(expenses: Expense[], range: string) {
    const now = new Date();
    const filtered = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      const diffTime = now.getTime() - expDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      switch (range) {
        case "7d":
          return diffDays <= 7;
        case "30d":
          return diffDays <= 30;
        case "90d":
          return diffDays <= 90;
        case "12m":
          return diffDays <= 365;
        case "all":
        default:
          return true;
      }
    });
    return filtered;
  }

  const filteredExpenses = useMemo(() => {
    let filtered = filterExpensesByDateRange(expenses, dateRange);

    if (selectedService !== "all") {
      filtered = filtered.filter((exp) => exp.service === selectedService);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((exp) => exp.category === selectedCategory);
    }

    return filtered;
  }, [expenses, dateRange, selectedService, selectedCategory]);

  const serviceBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach((exp) => {
      const service = exp.service || "Other";
      breakdown[service] = (breakdown[service] || 0) + Number(exp.amount);
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach((exp) => {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + Number(exp.amount);
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const timeSeriesData = useMemo(() => {
    const timeSeries: Record<string, number> = {};

    filteredExpenses.forEach((exp) => {
      const date = new Date(exp.date);
      let key: string;

      if (dateRange === "7d") {
        key = date.toISOString().split('T')[0];
      } else if (dateRange === "30d" || dateRange === "90d") {
        key = date.toISOString().split('T')[0];
      } else {
        key = date.toISOString().slice(0, 7);
      }

      timeSeries[key] = (timeSeries[key] || 0) + Number(exp.amount);
    });

    return Object.entries(timeSeries)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2)),
        formattedDate: formatDateLabel(date)
      }));
  }, [filteredExpenses, dateRange]);

  function formatDateLabel(dateStr: string) {
    const date = new Date(dateStr);
    if (dateRange === "7d" || dateRange === "30d" || dateRange === "90d") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const comparisonData = useMemo(() => {
    if (comparisonPeriod === "none") return null;

    const currentTotal = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    let previousExpenses: Expense[] = [];

    if (comparisonPeriod === "mom") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      previousExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= twoMonthsAgo && expDate < oneMonthAgo;
      });
    } else if (comparisonPeriod === "yoy") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      previousExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === oneYearAgo.getFullYear();
      });
    } else if (comparisonPeriod === "previous") {
      const sortedExpenses = [...filteredExpenses].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (sortedExpenses.length > 0) {
        const midPoint = Math.floor(sortedExpenses.length / 2);
        previousExpenses = sortedExpenses.slice(0, midPoint);
      }
    }

    const previousTotal = previousExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return {
      current: currentTotal,
      previous: previousTotal,
      change: Number(change.toFixed(2)),
      isIncrease: change > 0
    };
  }, [filteredExpenses, expenses, comparisonPeriod]);

  const totalCost = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }, [filteredExpenses]);

  const services = useMemo(() => {
    const uniqueServices = new Set(expenses.map(exp => exp.service || "Other"));
    return ["all", ...Array.from(uniqueServices)].filter(Boolean);
  }, [expenses]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(expenses.map(exp => exp.category));
    return ["all", ...Array.from(uniqueCategories)].filter(Boolean);
  }, [expenses]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function exportToCSV() {
    const headers = ["Date", "Service", "Category", "Amount", "Description", "Region"];
    const rows = filteredExpenses.map((exp) => [
      new Date(exp.date).toISOString().split('T')[0],
      exp.service || "",
      exp.category || "",
      exp.amount,
      exp.description || "",
      exp.region || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cost-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-slate-400">Loading cost analysis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cost Analysis</h1>
          <p className="text-slate-400">Detailed breakdown and comparison of your cloud costs.</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATE_RANGES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
                Service
              </label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service === "all" ? "All Services" : service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
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

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Comparison
              </label>
              <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COMPARISON_PERIODS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-400">Total Cost</p>
              <p className="text-3xl font-bold text-accent">{formatCurrency(totalCost)}</p>
              {comparisonData && comparisonData.change !== 0 && (
                <div className="flex items-center gap-2 text-sm">
                  {comparisonData.isIncrease ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                  <span className={comparisonData.isIncrease ? "text-red-500" : "text-green-500"}>
                    {Math.abs(comparisonData.change)}%
                  </span>
                  <span className="text-slate-400">vs comparison period</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-400">Number of Expenses</p>
              <p className="text-3xl font-bold text-white">{filteredExpenses.length}</p>
              <p className="text-sm text-slate-500">transactions in selected period</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-400">Average Cost</p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(filteredExpenses.length > 0 ? totalCost / filteredExpenses.length : 0)}
              </p>
              <p className="text-sm text-slate-500">per transaction</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {comparisonData && comparisonData.previous > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Period Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Current Period</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(comparisonData.current)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Previous Period</p>
                <p className="text-2xl font-bold text-slate-500">{formatCurrency(comparisonData.previous)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Change</p>
                <p className={`text-2xl font-bold ${comparisonData.isIncrease ? "text-red-500" : "text-green-500"}`}>
                  {comparisonData.isIncrease ? "+" : ""}{comparisonData.change}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Cost Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="formattedDate"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "8px"
                  }}
                  labelStyle={{ color: "#f1f5f9" }}
                  formatter={(value: number) => [formatCurrency(value), "Cost"]}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#EA994A"
                  strokeWidth={2}
                  dot={{ fill: "#EA994A", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              No data available for the selected filters
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Cost by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No service data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Cost by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      borderRadius: "8px"
                    }}
                    labelStyle={{ color: "#f1f5f9" }}
                    formatter={(value: number) => [formatCurrency(value), "Cost"]}
                  />
                  <Bar dataKey="value" fill="#1E3B46" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Top Services by Cost</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceBreakdown.length > 0 ? (
            <div className="space-y-4">
              {serviceBreakdown.slice(0, 10).map((service, index) => {
                const percentage = (service.value / totalCost) * 100;
                return (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-white">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">{percentage.toFixed(1)}%</span>
                        <span className="text-sm font-bold text-accent">{formatCurrency(service.value)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              No service data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
