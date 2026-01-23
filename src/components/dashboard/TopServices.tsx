"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Service {
  name: string;
  amount: number;
  percentage: number;
}

interface TopServicesProps {
  services: Service[];
  loading?: boolean;
}

export function TopServices({ services, loading }: TopServicesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Services by Cost</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-2 bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!services || services.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Services by Cost</h3>
        <p className="text-slate-400 text-sm">No service data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Top Services by Cost</h3>
      <div className="space-y-4">
        {services.slice(0, 5).map((service, index) => (
          <div key={service.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                <span className="font-medium text-white">{service.name}</span>
              </div>
              <span className="font-medium text-white">{formatCurrency(service.amount)}</span>
            </div>
            <Progress value={service.percentage} className="h-2" />
            <span className="text-xs text-slate-400">{service.percentage.toFixed(1)}% of total</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
