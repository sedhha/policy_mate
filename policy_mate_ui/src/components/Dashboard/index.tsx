// filePath: policy_mate_ui/src/app/dashboard/page.tsx
import { FileHandler } from "@/components/Dashboard/FileHandler";
import { ExistingFiles } from "@/components/Dashboard/ExistingFileViewer";
import { Router as DashboardRouter } from "@/components/Dashboard/Router";

const Dashboard = () => {
    return (
        <>
            <DashboardRouter />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Page Title */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h2>
                        <p className="text-slate-600">Manage your policy documents efficiently</p>
                    </div>

                    {/* Main Content Grid - Documents take 2/3, Upload takes 1/3 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
                        {/* Documents Section - Takes 2 columns */}
                        <div className="lg:col-span-2">
                            <ExistingFiles />
                        </div>

                        {/* Upload Section - Takes 1 column, sticky and centered */}
                        <div className="lg:col-span-1">
                            <div className="lg:sticky lg:top-6">
                                <FileHandler />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;