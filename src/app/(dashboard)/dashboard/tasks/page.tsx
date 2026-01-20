import { TaskList } from "@/components/dashboard/TaskList";

export default function TasksPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-100">Optimization Tasks</h1>
                <p className="text-slate-400">AI-generated recommendations to reduce your cloud spend.</p>
            </div>
            <TaskList />
        </div>
    );
}
