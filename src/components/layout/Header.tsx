"use client";

import React, { useState } from "react";
import { useAuth, authClient } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Filter,
  Download,
  Bell,
  Menu,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/cost-analysis": "Cost Analysis",
  "/dashboard/cloud-services": "Cloud Services",
  "/dashboard/usage-patterns": "Usage Patterns",
  "/dashboard/optimization": "Optimization",
  "/dashboard/team-allocation": "Team Allocation",
  "/dashboard/commitments": "Commitments",
  "/dashboard/upload": "Data Ingestion",
  "/dashboard/reports": "Reports",
  "/dashboard/settings": "Settings",
  "/dashboard/tasks": "Recommendations",
};

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [timeRange, setTimeRange] = useState("30d");

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const pageTitle = pageTitles[pathname] || "Dashboard";
  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "U";

  return (
    <header className="fixed right-0 top-0 z-30 flex h-14 w-[calc(100%-16rem)] items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      {/* Mobile menu button */}
      <Button variant="ghost" size="sm" className="md:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-primary">{pageTitle}</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Date Range Button */}
        <Button variant="outline" size="sm" className="hidden md:flex text-primary border-gray-200 hover:bg-primary-50">
          <Calendar className="mr-2 h-4 w-4" />
          <span>Date Range</span>
        </Button>

        {/* Time Range Select */}
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px] bg-white border-gray-200">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter */}
        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-primary-50">
          <Filter className="h-4 w-4 text-primary" />
          <span className="sr-only">Filter</span>
        </Button>

        {/* Download */}
        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-primary-50">
          <Download className="h-4 w-4 text-primary" />
          <span className="sr-only">Download</span>
        </Button>

        {/* Notifications */}
        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-primary-50 relative">
          <Bell className="h-4 w-4 text-primary" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] text-white flex items-center justify-center">
            3
          </span>
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-primary-50">
              <Avatar size="sm">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-primary/60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground border-b mb-1">
                {user.email}
              </div>
            )}
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
