"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth/sign-up");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-400">Redirecting to sign up...</p>
    </div>
  );
}
