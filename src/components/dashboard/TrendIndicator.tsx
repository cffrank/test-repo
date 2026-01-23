"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TrendIndicatorProps {
  value: number;
  inverse?: boolean;
}

export function TrendIndicator({ value, inverse = false }: TrendIndicatorProps) {
  const isPositive = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-green-500" : "text-red-500";
  const sign = value > 0 ? "+" : "";

  return (
    <span className={`flex items-center text-xs ${colorClass}`}>
      <Icon className="mr-1 h-3 w-3" />
      {sign}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
