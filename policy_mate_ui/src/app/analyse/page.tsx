"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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

const description = "Advanced Compliance Analysis & Annotation Platform";

export default function PDFAnnotatorScreen() {
    const searchParams = useSearchParams();
    const { sessionId, setSessionId, setNumPages } = usePDFStore();

    useEffect(() => {
        const payload = searchParams.get("payload");
        if (payload && !sessionId) {
            try {
                const decodedJson = JSON.parse(b64UrlDecode(payload));
                const decodedDocumentId: string | undefined = decodedJson?.document_id;
                const totalPagesRaw = decodedJson?.totalPages;
                const totalPages = Number.isFinite(+totalPagesRaw) ? +totalPagesRaw : undefined;

                if (!decodedDocumentId) throw new Error("Missing documentId in payload");
                setSessionId(decodedDocumentId);
                if (typeof totalPages === "number") setNumPages(totalPages);
            } catch (err) {
                console.error("Failed to parse payload:", err);
            }
        }
    }, [searchParams, sessionId, setSessionId, setNumPages]);

    return (
        <div className="h-full bg-gray-100">
            <main className="max-w-7xl mx-auto p-4 h-full">
                {sessionId ? (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-180px)]">
                        <SimplePDFAnnotator />
                    </div>
                ) : (
                    <VibrantLoader variant="pulse" size="lg" message={description} className="py-16" />
                )}
            </main>
        </div>
    );
}
