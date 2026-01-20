"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";

const navItems = [
    {
        category: "Inform",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: "ChartPie" },
            { name: "Data Ingestion", href: "/dashboard/upload", icon: "Upload" },
        ],
    },
    {
        category: "Optimize",
        items: [
            { name: "Recommendations", href: "/dashboard/tasks", icon: "Sparkles" },
            { name: "Commitments", href: "/dashboard/commitments", icon: "Ticket" },
        ],
    },
    {
        category: "Operate",
        items: [
            { name: "Team Reports", href: "/dashboard/reports", icon: "Users" },
            { name: "Settings", href: "/dashboard/settings", icon: "Cog" },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-800 bg-slate-950 px-4 py-6">
            <div className="mb-8 flex items-center gap-2 px-2">
                <div className="h-8 w-8 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center font-bold">
                    F
                </div>
                <span className="text-xl font-bold text-slate-100">FinOps</span>
            </div>

            <nav className="space-y-6">
                {navItems.map((section) => (
                    <div key={section.category}>
                        <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {section.category}
                        </h3>
                        <ul className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className={twMerge(
                                                "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-green-500/10 text-green-500"
                                                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                                            )}
                                        >
                                            {/* Placeholder Icons */}
                                            <span className="h-5 w-5 rounded bg-current opacity-20" />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
