"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Upload,
    TrendingDown,
    Ticket,
    Users,
    Settings,
    DollarSign,
    BarChart3,
    CloudCog,
    LineChart,
} from "lucide-react";

const navItems = [
    {
        category: "Overview",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Cost Analysis", href: "/dashboard/cost-analysis", icon: DollarSign },
        ],
    },
    {
        category: "Insights",
        items: [
            { name: "Cloud Services", href: "/dashboard/cloud-services", icon: CloudCog },
            { name: "Usage Patterns", href: "/dashboard/usage-patterns", icon: LineChart },
            { name: "Optimization", href: "/dashboard/optimization", icon: TrendingDown },
        ],
    },
    {
        category: "Management",
        items: [
            { name: "Team Allocation", href: "/dashboard/team-allocation", icon: Users },
            { name: "Commitments", href: "/dashboard/commitments", icon: Ticket },
            { name: "Data Ingestion", href: "/dashboard/upload", icon: Upload },
        ],
    },
    {
        category: "System",
        items: [
            { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
            { name: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(href);
    };

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-primary text-white flex flex-col">
            {/* Logo */}
            <div className="flex h-14 items-center border-b border-white/10 px-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                        <span className="text-white font-bold text-lg">F</span>
                    </div>
                    <span className="text-lg font-semibold">FOCUS Dashboard</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-auto py-4 px-2">
                <div className="space-y-6">
                    {navItems.map((section) => (
                        <div key={section.category}>
                            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/50">
                                {section.category}
                            </h3>
                            <ul className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.href);
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                    active
                                                        ? "bg-white/10 text-white"
                                                        : "text-white/70 hover:bg-white/5 hover:text-white"
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-3 text-white/70">
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="text-xs">FOCUS v1.2 Compliant</span>
                </div>
            </div>
        </aside>
    );
}
