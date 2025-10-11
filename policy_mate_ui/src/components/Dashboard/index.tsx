import { FileHandler } from "@/components/Dashboard/FileHandler";
import { ExistingFiles } from "@/components/Dashboard/ExistingFileViewer";

const Dashboard = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                    <p className="text-gray-600">Manage your policy documents efficiently</p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ExistingFiles />
                    <FileHandler />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;