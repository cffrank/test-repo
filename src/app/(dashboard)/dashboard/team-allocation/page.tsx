"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TeamData {
  id: string;
  name: string;
  budget: number;
  spent: number;
  trend: number;
  monthlySpend: { month: string; amount: number }[];
  members: number;
  topServices: { service: string; cost: number }[];
}

const MOCK_TEAMS: TeamData[] = [
  {
    id: "engineering",
    name: "Engineering",
    budget: 50000,
    spent: 42500,
    trend: 8.5,
    members: 45,
    monthlySpend: [
      { month: "Sep", amount: 38000 },
      { month: "Oct", amount: 40000 },
      { month: "Nov", amount: 39500 },
      { month: "Dec", amount: 42500 },
    ],
    topServices: [
      { service: "EC2", cost: 18000 },
      { service: "RDS", cost: 12000 },
      { service: "S3", cost: 7500 },
      { service: "Lambda", cost: 5000 },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    budget: 15000,
    spent: 13200,
    trend: -3.2,
    members: 12,
    monthlySpend: [
      { month: "Sep", amount: 14000 },
      { month: "Oct", amount: 13800 },
      { month: "Nov", amount: 13500 },
      { month: "Dec", amount: 13200 },
    ],
    topServices: [
      { service: "CloudFront", cost: 6000 },
      { service: "S3", cost: 4200 },
      { service: "SES", cost: 2000 },
      { service: "Analytics", cost: 1000 },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    budget: 30000,
    spent: 31500,
    trend: 12.3,
    members: 18,
    monthlySpend: [
      { month: "Sep", amount: 26000 },
      { month: "Oct", amount: 28000 },
      { month: "Nov", amount: 29500 },
      { month: "Dec", amount: 31500 },
    ],
    topServices: [
      { service: "EKS", cost: 14000 },
      { service: "CloudWatch", cost: 8500 },
      { service: "VPC", cost: 5000 },
      { service: "Route53", cost: 4000 },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    budget: 8000,
    spent: 6400,
    trend: 5.1,
    members: 8,
    monthlySpend: [
      { month: "Sep", amount: 5800 },
      { month: "Oct", amount: 6000 },
      { month: "Nov", amount: 6200 },
      { month: "Dec", amount: 6400 },
    ],
    topServices: [
      { service: "Salesforce", cost: 3000 },
      { service: "S3", cost: 2000 },
      { service: "Lambda", cost: 1000 },
      { service: "DynamoDB", cost: 400 },
    ],
  },
  {
    id: "support",
    name: "Support",
    budget: 12000,
    spent: 10800,
    trend: -1.8,
    members: 15,
    monthlySpend: [
      { month: "Sep", amount: 11500 },
      { month: "Oct", amount: 11200 },
      { month: "Nov", amount: 11000 },
      { month: "Dec", amount: 10800 },
    ],
    topServices: [
      { service: "Zendesk", cost: 4500 },
      { service: "Lambda", cost: 3000 },
      { service: "SQS", cost: 2000 },
      { service: "SNS", cost: 1300 },
    ],
  },
];

const COLORS = ["#EA994A", "#1E3B46", "#4A90E2", "#7B68EE", "#2ECC71"];

export default function TeamAllocationPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  const totalBudget = useMemo(() => {
    return MOCK_TEAMS.reduce((sum, team) => sum + team.budget, 0);
  }, []);

  const totalSpent = useMemo(() => {
    return MOCK_TEAMS.reduce((sum, team) => sum + team.spent, 0);
  }, []);

  const overBudgetTeams = useMemo(() => {
    return MOCK_TEAMS.filter((team) => team.spent > team.budget);
  }, []);

  const teamCostData = useMemo(() => {
    return MOCK_TEAMS.map((team) => ({
      name: team.name,
      spent: team.spent,
      budget: team.budget,
    }));
  }, []);

  const combinedTrendData = useMemo(() => {
    const months = ["Sep", "Oct", "Nov", "Dec"];
    return months.map((month) => {
      const dataPoint: { month: string; [key: string]: number | string } = { month };
      MOCK_TEAMS.forEach((team) => {
        const monthData = team.monthlySpend.find((m) => m.month === month);
        dataPoint[team.name] = monthData?.amount || 0;
      });
      return dataPoint;
    });
  }, []);

  function getBudgetStatus(team: TeamData) {
    const percentage = (team.spent / team.budget) * 100;
    if (percentage >= 100) return "destructive";
    if (percentage >= 90) return "warning";
    return "success";
  }

  function getBudgetColor(team: TeamData) {
    const percentage = (team.spent / team.budget) * 100;
    if (percentage >= 100) return "text-red-500";
    if (percentage >= 90) return "text-yellow-500";
    return "text-green-500";
  }

  function toggleTeamExpand(teamId: string) {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  }

  const filteredTeams = selectedTeam
    ? MOCK_TEAMS.filter((team) => team.id === selectedTeam)
    : MOCK_TEAMS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Allocation</h1>
          <p className="text-slate-400">
            Track and manage cloud cost allocation across teams and departments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent/10 p-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm font-medium text-slate-400">Total Budget</p>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalBudget)}</p>
              <p className="text-sm text-slate-500">across {MOCK_TEAMS.length} teams</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Total Spent</p>
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalSpent)}</p>
              <p className="text-sm text-slate-500">
                {((totalSpent / totalBudget) * 100).toFixed(1)}% of budget used
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-red-500/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Budget Status</p>
              </div>
              {overBudgetTeams.length > 0 ? (
                <>
                  <p className="text-3xl font-bold text-red-500">{overBudgetTeams.length}</p>
                  <p className="text-sm text-slate-500">team{overBudgetTeams.length !== 1 ? "s" : ""} over budget</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-green-500">On Track</p>
                  <p className="text-sm text-slate-500">all teams within budget</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Team Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#f1f5f9" }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="spent" fill="#EA994A" name="Spent" radius={[8, 8, 0, 0]} />
              <Bar dataKey="budget" fill="#1E3B46" name="Budget" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Cost Trend by Team</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={combinedTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#f1f5f9" }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              {MOCK_TEAMS.map((team, index) => (
                <Line
                  key={team.id}
                  type="monotone"
                  dataKey={team.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Budget vs Actual by Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredTeams.map((team) => {
              const percentage = (team.spent / team.budget) * 100;
              const isExpanded = expandedTeams.has(team.id);
              const remaining = team.budget - team.spent;

              return (
                <div key={team.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-white">{team.name}</h4>
                        <Badge
                          variant={getBudgetStatus(team)}
                          className="text-xs"
                        >
                          {percentage.toFixed(1)}% used
                        </Badge>
                        {team.trend > 0 ? (
                          <div className="flex items-center gap-1 text-red-500 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            <span>{team.trend}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-500 text-sm">
                            <TrendingDown className="h-4 w-4" />
                            <span>{Math.abs(team.trend)}%</span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <p className="text-slate-400">Budget</p>
                          <p className="font-semibold text-white">{formatCurrency(team.budget)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Spent</p>
                          <p className={`font-semibold ${getBudgetColor(team)}`}>
                            {formatCurrency(team.spent)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Remaining</p>
                          <p className={`font-semibold ${remaining >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {formatCurrency(remaining)}
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={Math.min(percentage, 100)}
                        className="h-3"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {team.members} team members
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTeamExpand(team.id)}
                      className="ml-4"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                      <h5 className="text-sm font-semibold text-white mb-3">Top Services</h5>
                      <div className="space-y-3">
                        {team.topServices.map((service, index) => {
                          const servicePercent = (service.cost / team.spent) * 100;
                          return (
                            <div key={service.service} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{service.service}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">{servicePercent.toFixed(1)}%</span>
                                  <span className="font-semibold text-accent">
                                    {formatCurrency(service.cost)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent rounded-full transition-all duration-300"
                                  style={{ width: `${servicePercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <h5 className="text-sm font-semibold text-white mb-3">
                          Monthly Trend
                        </h5>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={team.monthlySpend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis
                              dataKey="month"
                              stroke="#94a3b8"
                              tick={{ fill: "#94a3b8", fontSize: 12 }}
                            />
                            <YAxis
                              stroke="#94a3b8"
                              tick={{ fill: "#94a3b8", fontSize: 12 }}
                              tickFormatter={(value) => `$${value / 1000}k`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1e293b",
                                borderColor: "#334155",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [formatCurrency(value), "Spend"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="amount"
                              stroke="#EA994A"
                              strokeWidth={2}
                              dot={{ fill: "#EA994A", r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
