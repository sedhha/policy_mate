"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
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

function PDFAnnotatorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { sessionId, setSessionId, setNumPages } = usePDFStore();

    useEffect(() => {
        const payload = searchParams.get("payload");
        if (payload && !sessionId) {
            try {
                const decodedJson = JSON.parse(b64UrlDecode(payload));
                const decodedDocumentId: string | undefined = decodedJson?.document_id;
                const totalPagesRaw = decodedJson?.totalPages;
                const totalPages = Number.isFinite(+totalPagesRaw) ? +totalPagesRaw : undefined;
                const s3Key = decodedJson?.s3_key;
                const s3Bucket = decodedJson?.s3_bucket;

                if (!decodedDocumentId || !s3Key || !s3Bucket) throw new Error("Missing documentId or s3Key or s3Bucket in payload");
                setSessionId(decodedDocumentId);
                if (typeof totalPages === "number") setNumPages(totalPages);
                if (s3Key) usePDFStore.getState().setS3Key(s3Key);
                if (s3Bucket) usePDFStore.getState().setS3Bucket(s3Bucket);

                // Clear search parameters after processing
                router.replace("/analyse", { scroll: false });
            } catch (err) {
                console.error("Failed to parse payload:", err);
            }
        }
    }, [searchParams, sessionId, setSessionId, setNumPages, router]);

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

export default function PDFAnnotatorScreen() {
    return (
        <Suspense fallback={<VibrantLoader variant="pulse" size="lg" message={description} className="py-16" />}>
            <PDFAnnotatorContent />
        </Suspense>
    );
}
