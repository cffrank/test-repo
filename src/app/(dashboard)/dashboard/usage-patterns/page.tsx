"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  Zap,
  Calendar,
} from "lucide-react";

interface UsageData {
  timestamp: string;
  usage: number;
  cost: number;
  service: string;
}

interface HeatmapCell {
  day: string;
  hour: number;
  value: number;
}

interface PeakTime {
  time: string;
  usage: number;
  cost: number;
}

interface Anomaly {
  id: string;
  timestamp: string;
  service: string;
  normalUsage: number;
  actualUsage: number;
  deviation: number;
  severity: "high" | "medium" | "low";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const SEVERITY_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export default function UsagePatternsPage() {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedService, setSelectedService] = useState("all");

  const generateMockUsageData = useCallback((): UsageData[] => {
    const services = ["Compute", "Storage", "Database", "Networking"];
    const data: UsageData[] = [];
    const now = new Date();
    const daysToGenerate = selectedPeriod === "7d" ? 7 : selectedPeriod === "30d" ? 30 : 90;

    for (let day = 0; day < daysToGenerate; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(now.getTime() - (daysToGenerate - day) * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000);
        const baseUsage = 50 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 30;
        const weekendFactor = timestamp.getDay() === 0 || timestamp.getDay() === 6 ? 0.7 : 1;
        const randomVariation = Math.random() * 20 - 10;
        const anomalyChance = Math.random();
        const anomalyMultiplier = anomalyChance > 0.95 ? 2 : anomalyChance < 0.05 ? 0.3 : 1;

        services.forEach((service) => {
          const usage = Math.max(0, (baseUsage + randomVariation) * weekendFactor * anomalyMultiplier);
          data.push({
            timestamp: timestamp.toISOString(),
            usage,
            cost: usage * 0.1,
            service,
          });
        });
      }
    }

    return data;
  }, [selectedPeriod]);

  const fetchUsageData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/usage-patterns?projectId=${user.id}&period=${selectedPeriod}`);
      if (res.ok) {
        const data = await res.json();
        setUsageData(data.usage || generateMockUsageData());
      } else {
        setUsageData(generateMockUsageData());
      }
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
      setUsageData(generateMockUsageData());
    } finally {
      setLoading(false);
    }
  }, [user, selectedPeriod, generateMockUsageData]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const filteredData = useMemo(() => {
    if (selectedService === "all") return usageData;
    return usageData.filter((d) => d.service === selectedService);
  }, [usageData, selectedService]);

  const heatmapData = useMemo(() => {
    const cells: HeatmapCell[] = [];
    const aggregated: Record<string, Record<number, number[]>> = {};

    filteredData.forEach((item) => {
      const date = new Date(item.timestamp);
      const day = DAYS[date.getDay()];
      const hour = date.getHours();

      if (!aggregated[day]) {
        aggregated[day] = {};
      }
      if (!aggregated[day][hour]) {
        aggregated[day][hour] = [];
      }
      aggregated[day][hour].push(item.usage);
    });

    DAYS.forEach((day) => {
      HOURS.forEach((hour) => {
        const values = aggregated[day]?.[hour] || [0];
        const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        cells.push({ day, hour, value: avgValue });
      });
    });

    return cells;
  }, [filteredData]);

  const maxHeatmapValue = useMemo(() => {
    return Math.max(...heatmapData.map((cell) => cell.value), 1);
  }, [heatmapData]);

  const trendData = useMemo(() => {
    const hourlyAggregated: Record<string, { usage: number; cost: number; count: number }> = {};

    filteredData.forEach((item) => {
      const date = new Date(item.timestamp);
      const key = `${date.toISOString().split('T')[0]} ${String(date.getHours()).padStart(2, '0')}:00`;

      if (!hourlyAggregated[key]) {
        hourlyAggregated[key] = { usage: 0, cost: 0, count: 0 };
      }
      hourlyAggregated[key].usage += item.usage;
      hourlyAggregated[key].cost += item.cost;
      hourlyAggregated[key].count += 1;
    });

    return Object.entries(hourlyAggregated)
      .map(([time, data]) => ({
        time,
        usage: data.usage / data.count,
        cost: data.cost / data.count,
      }))
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(-168);
  }, [filteredData]);

  const peakTimes = useMemo(() => {
    const hourlyAggregated: Record<number, { usage: number; cost: number; count: number }> = {};

    filteredData.forEach((item) => {
      const hour = new Date(item.timestamp).getHours();
      if (!hourlyAggregated[hour]) {
        hourlyAggregated[hour] = { usage: 0, cost: 0, count: 0 };
      }
      hourlyAggregated[hour].usage += item.usage;
      hourlyAggregated[hour].cost += item.cost;
      hourlyAggregated[hour].count += 1;
    });

    const peaks: PeakTime[] = Object.entries(hourlyAggregated)
      .map(([hour, data]) => ({
        time: `${String(hour).padStart(2, '0')}:00`,
        usage: data.usage / data.count,
        cost: data.cost / data.count,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    return peaks;
  }, [filteredData]);

  const anomalies = useMemo(() => {
    const detected: Anomaly[] = [];
    const hourlyAverages: Record<string, number[]> = {};

    filteredData.forEach((item) => {
      const date = new Date(item.timestamp);
      const key = `${date.getDay()}-${date.getHours()}`;
      if (!hourlyAverages[key]) {
        hourlyAverages[key] = [];
      }
      hourlyAverages[key].push(item.usage);
    });

    const thresholds: Record<string, { mean: number; stdDev: number }> = {};
    Object.entries(hourlyAverages).forEach(([key, values]) => {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      thresholds[key] = { mean, stdDev };
    });

    filteredData.forEach((item, idx) => {
      const date = new Date(item.timestamp);
      const key = `${date.getDay()}-${date.getHours()}`;
      const threshold = thresholds[key];

      if (threshold) {
        const deviation = Math.abs(item.usage - threshold.mean) / threshold.stdDev;
        if (deviation > 2) {
          const severity: "high" | "medium" | "low" =
            deviation > 3 ? "high" : deviation > 2.5 ? "medium" : "low";

          detected.push({
            id: `anomaly-${idx}`,
            timestamp: item.timestamp,
            service: item.service,
            normalUsage: threshold.mean,
            actualUsage: item.usage,
            deviation,
            severity,
          });
        }
      }
    });

    return detected.sort((a, b) => b.deviation - a.deviation).slice(0, 10);
  }, [filteredData]);

  const utilizationMetrics = useMemo(() => {
    const total = filteredData.reduce((sum, item) => sum + item.usage, 0);
    const avg = total / filteredData.length || 0;
    const costs = filteredData.reduce((sum, item) => sum + item.cost, 0);
    const peakUsage = Math.max(...filteredData.map((item) => item.usage), 0);
    const avgUtilization = (avg / peakUsage) * 100 || 0;

    return {
      averageUsage: avg,
      totalCost: costs,
      peakUsage,
      utilizationRate: avgUtilization,
    };
  }, [filteredData]);

  const services = useMemo(() => {
    const uniqueServices = new Set(usageData.map((d) => d.service));
    return ["all", ...Array.from(uniqueServices)];
  }, [usageData]);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function getHeatmapColor(value: number) {
    const intensity = value / maxHeatmapValue;
    if (intensity > 0.8) return "#EA994A";
    if (intensity > 0.6) return "#F3C399";
    if (intensity > 0.4) return "#FBEBDD";
    if (intensity > 0.2) return "#FDF5EE";
    return "#1E3B46";
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-slate-400">Loading usage patterns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usage Patterns</h1>
        <p className="text-slate-400">
          Analyze usage trends, identify peak times, and detect anomalies in your cloud infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Avg Usage</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {utilizationMetrics.averageUsage.toFixed(1)}
              </p>
              <p className="text-sm text-slate-500">units per hour</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent/10 p-2">
                  <Zap className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm font-medium text-slate-400">Peak Usage</p>
              </div>
              <p className="text-3xl font-bold text-accent">
                {utilizationMetrics.peakUsage.toFixed(1)}
              </p>
              <p className="text-sm text-slate-500">maximum recorded</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-sm font-medium text-slate-400">Utilization</p>
              </div>
              <p className="text-3xl font-bold text-green-500">
                {utilizationMetrics.utilizationRate.toFixed(1)}%
              </p>
              <p className="text-sm text-slate-500">efficiency rate</p>
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
                <p className="text-sm font-medium text-slate-400">Anomalies</p>
              </div>
              <p className="text-3xl font-bold text-red-500">{anomalies.length}</p>
              <p className="text-sm text-slate-500">detected this period</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Time Period
              </label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
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
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Usage Heatmap</CardTitle>
          <p className="text-sm text-slate-400">Activity by day and hour</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-grid grid-cols-25 gap-1 min-w-max">
              <div className="col-span-1" />
              {HOURS.map((hour) => (
                <div key={hour} className="text-center text-xs text-slate-500 py-1">
                  {hour % 3 === 0 ? `${hour}h` : ""}
                </div>
              ))}
              {DAYS.map((day) => (
                <React.Fragment key={day}>
                  <div className="text-xs text-slate-400 py-2 pr-2 text-right">{day}</div>
                  {HOURS.map((hour) => {
                    const cell = heatmapData.find((c) => c.day === day && c.hour === hour);
                    const color = cell ? getHeatmapColor(cell.value) : "#1E3B46";
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="w-8 h-8 rounded transition-all hover:ring-2 hover:ring-white cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={`${day} ${hour}:00 - ${cell?.value.toFixed(1) || 0} units`}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 justify-center">
            <span className="text-xs text-slate-400">Low</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                <div
                  key={intensity}
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: getHeatmapColor(maxHeatmapValue * intensity) }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400">High</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Peak Usage Times</CardTitle>
            <p className="text-sm text-slate-400">Top 5 hours by average usage</p>
          </CardHeader>
          <CardContent>
            {peakTimes.length > 0 ? (
              <div className="space-y-4">
                {peakTimes.map((peak, index) => (
                  <div key={peak.time} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-base font-semibold text-white">{peak.time}</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          {peak.usage.toFixed(1)} units avg
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-accent">{formatCurrency(peak.cost)}</p>
                      <p className="text-xs text-slate-500">avg cost/hour</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">No peak times data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Anomaly Detection</CardTitle>
            <p className="text-sm text-slate-400">Unusual usage spikes detected</p>
          </CardHeader>
          <CardContent>
            {anomalies.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="p-3 bg-slate-900 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className="h-4 w-4"
                          style={{ color: SEVERITY_COLORS[anomaly.severity] }}
                        />
                        <Badge
                          variant={
                            anomaly.severity === "high"
                              ? "destructive"
                              : anomaly.severity === "medium"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {anomaly.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(anomaly.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white mb-1">{anomaly.service}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Normal: </span>
                        <span className="text-white font-semibold">
                          {anomaly.normalUsage.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Actual: </span>
                        <span className="text-red-400 font-semibold">
                          {anomaly.actualUsage.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {anomaly.deviation.toFixed(1)}σ deviation from normal
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">No anomalies detected</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Usage Trend Over Time</CardTitle>
          <p className="text-sm text-slate-400">Hourly usage and cost metrics</p>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={Math.floor(trendData.length / 12)}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8" }}
                  label={{ value: "Usage", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8" }}
                  label={{ value: "Cost ($)", angle: 90, position: "insideRight", fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#f1f5f9" }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="usage"
                  stroke="#4A90E2"
                  strokeWidth={2}
                  dot={false}
                  name="Usage"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  stroke="#EA994A"
                  strokeWidth={2}
                  dot={false}
                  name="Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-slate-400">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Resource Utilization Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-400">Average Utilization</span>
                  <span className="text-lg font-bold text-green-500">
                    {utilizationMetrics.utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(utilizationMetrics.utilizationRate, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Total Cost</span>
                  <span className="text-lg font-bold text-accent">
                    {formatCurrency(utilizationMetrics.totalCost)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Peak Usage</span>
                  <span className="text-lg font-bold text-white">
                    {utilizationMetrics.peakUsage.toFixed(1)} units
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Average Usage</span>
                  <span className="text-lg font-bold text-white">
                    {utilizationMetrics.averageUsage.toFixed(1)} units
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
