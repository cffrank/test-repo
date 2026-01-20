import type { Metadata } from "next";
import { Inter } from "next/font/google"; // or just use system fonts
import "./globals.css";
import AuthProviderWrapper from "@/components/auth/AuthProviderWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinOps SaaS Control Panel",
  description: "Manage your cloud costs with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProviderWrapper>
          <main className="min-h-screen bg-slate-950 text-slate-100">
            {children}
          </main>
        </AuthProviderWrapper>
      </body>
    </html>
  );
}
