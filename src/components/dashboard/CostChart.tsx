"use client";

import React from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const data = [
    { name: "Jan", cost: 4000 },
    { name: "Feb", cost: 3000 },
    { name: "Mar", cost: 2000 },
    { name: "Apr", cost: 2780 },
    { name: "May", cost: 1890 },
    { name: "Jun", cost: 2390 },
    { name: "Jul", cost: 3490 },
];

export function CostChart() {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f1f5f9" }}
                        itemStyle={{ color: "#22c55e" }}
                    />
                    <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="#22c55e"
                        fillOpacity={1}
                        fill="url(#colorCost)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
