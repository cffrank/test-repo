import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface font-montserrat">
                <Sidebar />
                <Header />
                <main className="ml-64 pt-14">
                    <div className="p-4 md:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
