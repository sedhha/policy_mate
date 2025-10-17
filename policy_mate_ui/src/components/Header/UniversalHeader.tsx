"use client";

import { useRouter, usePathname } from "next/navigation";
import { usePDFStore } from "@/components/PDFAnnotator/stores/pdfStore";

interface HeaderConfig {
    title: string;
    description: string;
    showBackButton: boolean;
    showViewResultsButton: boolean;
    backRoute: string;
}

const routeConfigs: Record<string, HeaderConfig> = {
    "/": {
        title: "PolicyMate",
        description: "Enterprise Compliance Management Dashboard",
        showBackButton: false,
        showViewResultsButton: false,
        backRoute: "/",
    },
    "/analyse": {
        title: "Compliance CoPilot",
        description: "Advanced Compliance Analysis & Annotation Platform",
        showBackButton: true,
        showViewResultsButton: true,
        backRoute: "/",
    },
    "/chat": {
        title: "Compliance CoPilot",
        description: "AI-Powered Compliance Analysis",
        showBackButton: true,
        showViewResultsButton: false,
        backRoute: "/",
    },
    "/login": {
        title: "Compliance CoPilot",
        description: "Secure Access Portal",
        showBackButton: false,
        showViewResultsButton: false,
        backRoute: "/",
    },
};

export function UniversalHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { sessionId } = usePDFStore();

    // Get config for current route or use default
    const config = routeConfigs[pathname] || {
        title: "Compliance Co-Pilot",
        description: "Enterprise Compliance Management",
        showBackButton: false,
        showViewResultsButton: false,
        backRoute: "/",
    };

    const handleBackClick = () => {
        router.push(config.backRoute);
    };

    const handleViewResults = () => {
        if (sessionId) {
            router.push(`/view-results?sessionId=${sessionId}`);
        } else {
            alert("No active session found");
        }
    };

    return (
        <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl border-b-4 border-blue-600 p-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center">
                    {config.showBackButton && (
                        <button
                            onClick={handleBackClick}
                            className="mr-6 p-3 cursor-pointer text-blue-100 hover:text-white hover:bg-blue-700 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105"
                            aria-label="Go back"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <svg className="h-8 w-8 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent tracking-tight">
                                {config.title}
                            </h1>
                            <p className="text-blue-200 text-sm font-medium opacity-90 tracking-wide">
                                {config.description}
                            </p>
                        </div>
                    </div>
                </div>

                {config.showViewResultsButton && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleViewResults}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 cursor-pointer hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                            aria-label="View Results"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>View Results</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
