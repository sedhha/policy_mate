"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { VibrantLoader } from "@/components/PDFAnnotator/hoc/LazyLoader/VibrantLoader";
import { usePDFStore } from "@/components/PDFAnnotator/stores/pdfStore";

// ✅ Dynamically import Annotator so it never loads on the server
const SimplePDFAnnotator = dynamic(
    () => import("@/components/PDFAnnotator/Annotator").then(m => m.SimplePDFAnnotator),
    { ssr: false }
);

// Optional helper
const b64UrlDecode = (input: string) => {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
    const bin = atob(normalized);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
};

const title = "Compliance CoPilot";
const description = "Advanced Compliance Analysis & Annotation Platform";

export default function PDFAnnotatorScreen() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { sessionId, setSessionId, setNumPages } = usePDFStore();

    useEffect(() => {
        const payload = searchParams.get("payload");
        if (payload && !sessionId) {
            try {
                const decodedJson = JSON.parse(b64UrlDecode(payload));
                const decodedSessionId: string | undefined = decodedJson?.sessionId;
                const totalPagesRaw = decodedJson?.totalPages;
                const totalPages = Number.isFinite(+totalPagesRaw) ? +totalPagesRaw : undefined;

                if (!decodedSessionId) throw new Error("Missing sessionId in payload");
                setSessionId(decodedSessionId);
                if (typeof totalPages === "number") setNumPages(totalPages);
            } catch (err) {
                console.error("Failed to parse payload:", err);
            }
        }
    }, [searchParams, sessionId, setSessionId, setNumPages]);

    const goBack = () => router.push("/login");

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl border-b-4 border-blue-600 p-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={goBack}
                            className="mr-6 p-3 cursor-pointer text-blue-100 hover:text-white hover:bg-blue-700 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex items-center space-x-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 shadow-lg">
                                <svg className="h-8 w-8 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent tracking-tight">
                                    {title}
                                </h1>
                                <p className="text-blue-200 text-sm font-medium opacity-90 tracking-wide">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (sessionId) alert(`Navigate to /view-results?sessionId=${sessionId}`);
                                else alert("No active session found");
                            }}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 cursor-pointer hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>View Results</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4">
                {sessionId ? (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-120px)]">
                        <SimplePDFAnnotator />
                    </div>
                ) : (
                    <VibrantLoader variant="pulse" size="lg" message={description} className="py-16" />
                )}
            </main>
        </div>
    );
}
