export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-slate-100 selection:bg-green-500/30">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        FinOps Data
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Control your cloud spend with AI-driven insights
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
