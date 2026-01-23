"use client";

import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = "#EA994A",
  fillColor = "rgba(234, 153, 74, 0.1)",
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const fillPathD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="sparkline">
      <path d={fillPathD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
