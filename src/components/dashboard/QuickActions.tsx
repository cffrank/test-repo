"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Settings,
  TrendingDown,
  RefreshCw,
  Download,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
  onAnalyzeCosts?: () => void;
  analyzing?: boolean;
}

export function QuickActions({ onAnalyzeCosts, analyzing }: QuickActionsProps) {
  const router = useRouter();

  const actions = [
    {
      icon: RefreshCw,
      label: "Analyze Costs",
      description: "Run AI analysis on expenses",
      onClick: onAnalyzeCosts,
      disabled: analyzing,
      variant: "primary" as const,
    },
    {
      icon: Upload,
      label: "Upload Data",
      description: "Import expense data",
      onClick: () => router.push("/expenses"),
      variant: "outline" as const,
    },
    {
      icon: TrendingDown,
      label: "View Optimizations",
      description: "See cost reduction opportunities",
      onClick: () => router.push("/tasks"),
      variant: "outline" as const,
    },
    {
      icon: FileText,
      label: "Generate Report",
      description: "Export cost analysis",
      onClick: () => alert("Report generation coming soon!"),
      variant: "outline" as const,
    },
    {
      icon: Download,
      label: "Export Data",
      description: "Download expense data",
      onClick: () => alert("Data export coming soon!"),
      variant: "outline" as const,
    },
    {
      icon: Settings,
      label: "Configure",
      description: "Manage settings",
      onClick: () => router.push("/settings"),
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant}
              className="h-auto flex-col items-start gap-1 p-4"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-4 w-4" />
                <span className="font-medium text-sm">{action.label}</span>
              </div>
              <span className="text-xs text-slate-400 text-left w-full">
                {action.description}
              </span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
