import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-6">
                <Link href="/" className="text-xl font-bold tracking-tight text-primary">
                    FinOps<span className="text-gray-500 font-light">MVP</span>
                </Link>
                <div className="flex gap-4 text-sm font-medium">
                    <Link href="/dashboard" className="hover:text-blue-600 transition">Dashboard</Link>
                    <Link href="/projects" className="hover:text-blue-600 transition">Projects</Link>
                </div>
            </div>
            <div>
                <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
                    {/* User Avatar Placeholder */}
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">U</div>
                </div>
            </div>
        </nav>
    );
}
