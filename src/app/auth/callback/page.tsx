"use client";

import { NeonAuthUIProvider, AuthCallback } from "@neondatabase/auth-ui";
import "@neondatabase/auth-ui/css";
import { authClient } from "@/lib/auth/client";

export default function CallbackPage() {
  return (
    <NeonAuthUIProvider authClient={authClient}>
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <AuthCallback />
      </div>
    </NeonAuthUIProvider>
  );
}
