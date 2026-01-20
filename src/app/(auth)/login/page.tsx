"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");
        try {
            await signInWithGoogle();
            router.push("/dashboard");
        } catch (err) {
            console.error(err);
            setError("Failed to sign in with Google.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement email/password sign in
        setError("Email/Password sign in is not yet implemented for MVP. Please use Google.");
    };

    return (
        <Card>
            <form onSubmit={handleEmailSignIn} className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">Sign in</h2>
                    <p className="text-sm text-slate-400">
                        Welcome back! Please enter your details.
                    </p>
                </div>

                <div className="space-y-4">
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        label="Email"
                        disabled={loading}
                    />
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        label="Password"
                        disabled={loading}
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                    Sign in
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-900 px-2 text-slate-400">
                            Or continue with
                        </span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                    </svg>
                    Google
                </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-semibold text-green-500 hover:text-green-400">
                    Sign up
                </Link>
            </p>
        </Card>
    );
}
