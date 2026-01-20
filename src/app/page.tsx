import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-950">
      <h1 className="text-5xl font-bold tracking-tight text-white mb-6">
        FinOps <span className="text-green-500">Control Panel</span>
      </h1>
      <p className="text-xl text-slate-400 max-w-2xl mb-10">
        AI-driven insights to optimize your cloud spend.
        Automate tasks, reduce waste, and gain full visibility into your AWS costs.
      </p>

      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg" className="bg-green-600 hover:bg-green-700">
            Get Started
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button size="lg" variant="outline">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
