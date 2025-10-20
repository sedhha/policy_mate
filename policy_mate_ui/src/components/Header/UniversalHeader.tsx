"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePDFStore } from "@/components/PDFAnnotator/stores/pdfStore";
import { useAgentStore } from "@/stores/agentStore";

interface HeaderConfig {
    title: string;
    description: string;
    showBackButton: boolean;
    showViewResultsButton: boolean;
    showInteractiveModeButton: boolean;
    backRoute: string;
}

const routeConfigs: Record<string, HeaderConfig> = {
    "/": {
        title: "Policy Mate",
        description: "Enterprise Compliance Management Dashboard",
        showBackButton: false,
        showViewResultsButton: false,
        showInteractiveModeButton: false,
        backRoute: "/",
    },
    "/analyse": {
        title: "Compliance Copilot",
        description: "Advanced Compliance Analysis & Annotation Platform",
        showBackButton: true,
        showViewResultsButton: true,
        showInteractiveModeButton: false,
        backRoute: "/",
    },
    "/chat": {
        title: "Compliance Copilot",
        description: "AI-Powered Compliance Analysis",
        showBackButton: true,
        showViewResultsButton: false,
        showInteractiveModeButton: true,
        backRoute: "/",
    },
    "/login": {
        title: "Compliance Copilot",
        description: "Secure Access Portal",
        showBackButton: false,
        showViewResultsButton: false,
        showInteractiveModeButton: false,
        backRoute: "/",
    },
};

export function UniversalHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { sessionId, setS3Bucket, setS3Key, setSessionId, setNumPages } = usePDFStore();
    const { selectedDocument } = useAgentStore();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState("");
    const [notificationType, setNotificationType] = useState<"error" | "info">("info");

    // Get config for current route or use default
    const config = routeConfigs[pathname] || {
        title: "Compliance Copilot",
        description: "Enterprise Compliance Management",
        showBackButton: false,
        showViewResultsButton: false,
        showInteractiveModeButton: false,
        backRoute: "/",
    };

    const showNotificationPopup = (message: string, type: "error" | "info" = "info") => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 4000);
    };

    const handleBackClick = () => {
        router.push(config.backRoute);
    };

    const handleViewResults = () => {
        if (sessionId) {
            router.push(`/chat`);
        } else {
            showNotificationPopup("No active session found", "error");
        }
    };

    const handleInteractiveMode = () => {
        if (selectedDocument) {
            const payload = {
                document_id: selectedDocument.document_id,
                totalPages: selectedDocument.pages || 0,
                s3_key: selectedDocument.s3_key,
                s3_bucket: selectedDocument.s3_bucket,
            };
            const base64Payload = btoa(JSON.stringify(payload));
            setS3Bucket(selectedDocument.s3_bucket);
            setS3Key(selectedDocument.s3_key);
            setSessionId(selectedDocument.document_id);
            setNumPages(selectedDocument.pages || 0);
            router.push(`/analyse?payload=${base64Payload}`);
        }
        else {
            showNotificationPopup("No document selected. Please go back to dashboard and select a document first.", "error");
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
                            <span>Switch to Chat</span>
                        </button>
                    </div>
                )}

                {config.showInteractiveModeButton && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleInteractiveMode}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 cursor-pointer hover:from-purple-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                            aria-label="Switch to Interactive Mode"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            <span>Switch to Interactive Mode</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Notification Popup */}
            {showNotification && (
                <div className="fixed top-24 right-6 z-50 animate-slide-in-right">
                    <div className={`flex items-start space-x-4 p-4 rounded-lg shadow-2xl backdrop-blur-sm border-2 max-w-md ${notificationType === "error"
                            ? "bg-red-50/95 border-red-300 text-red-800"
                            : "bg-blue-50/95 border-blue-300 text-blue-800"
                        }`}>
                        <div className="flex-shrink-0">
                            {notificationType === "error" ? (
                                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold mb-1">
                                {notificationType === "error" ? "Oops!" : "Notice"}
                            </h3>
                            <p className="text-sm">{notificationMessage}</p>
                        </div>
                        <button
                            onClick={() => setShowNotification(false)}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close notification"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
