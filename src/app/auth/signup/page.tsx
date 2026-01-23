"use client";

import { NeonAuthUIProvider, SignUpForm } from "@neondatabase/auth-ui";
import "@neondatabase/auth-ui/css";
import { authClient } from "@/lib/auth/client";

export default function SignUpPage() {
  return (
    <NeonAuthUIProvider authClient={authClient}>
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-full max-w-md p-8">
          <SignUpForm
            redirectTo="/dashboard"
            localization={{}}
          />
        </div>
      </div>
    </NeonAuthUIProvider>
  );
}
