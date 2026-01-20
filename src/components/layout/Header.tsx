"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function Header() {
    const { user } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <header className="fixed right-0 top-0 z-30 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-slate-800 bg-slate-950/80 px-8 backdrop-blur-md">
            <div>
                {/* Breadcrumbs or Page Title could go here */}
                <h2 className="text-sm font-medium text-slate-400">
                    Organization / <span className="text-slate-100">Default Project</span>
                </h2>
            </div>

            <div className="flex items-center gap-4">
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-200">
                                {user.displayName || "User"}
                            </p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                        {user.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.photoURL}
                                alt="Profile"
                                className="h-9 w-9 rounded-full border border-slate-700"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-full bg-green-900 border border-green-700" />
                        )}
                    </div>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    Sign out
                </Button>
            </div>
        </header>
    );
}
