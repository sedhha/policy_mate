// filePath: policy_mate_ui/src/app/dashboard/page.tsx
import { FileHandler } from "@/components/Dashboard/FileHandler";
import { ExistingFiles } from "@/components/Dashboard/ExistingFileViewer";
import { Router as DashboardRouter } from "@/components/Dashboard/Router";

const Dashboard = () => {
    return (
        <>
            <DashboardRouter />
            <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Main Content */}
                <div className="max-w-[1600px] mx-auto px-6 py-8">

                    {/* Upload Panel - Compact at top */}
                    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500" style={{ animationDelay: '100ms' }}>
                        <FileHandler />
                    </div>

                    {/* Documents Section - Full width */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                        <ExistingFiles />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;