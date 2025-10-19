"use client";

// Import base styles first
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "./PDFAnnotator.css";


// ✅ dynamically import react-pdf in browser only
import { useState, useEffect, useRef } from "react";

// Lazy-load Toolbar, Panels, etc.
import { withLazyLoader } from "@/components/PDFAnnotator/hoc/LazyLoader/Loader";
import { VibrantLoader } from "@/components/PDFAnnotator/hoc/LazyLoader/VibrantLoader";
import { usePDFStore } from "@/components/PDFAnnotator/stores/pdfStore";
import type { CommentPannelProps, BookmarkPopoverProps } from "@/components/PDFAnnotator/types";
import { setupPdfWorker } from "@/components/PDFAnnotator/setupPdfWorker";
import { Toolbar } from "./Toolbar";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { useSearchParams } from "next/navigation";

const CommentPanel = withLazyLoader<CommentPannelProps>(
    () => import("@/components/PDFAnnotator/CommentPanel"),
    { exportName: "CommentPanel" }
);
const BookmarkPopover = withLazyLoader<BookmarkPopoverProps>(
    () => import("@/components/PDFAnnotator/BookmarkPopover"),
    { exportName: "BookmarkPopover" }
);


const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

const b64UrlDecode = (input: string) => {
    const normalized = input
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(input.length / 4) * 4, '=');
    const bin = atob(normalized);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
};

export const SimplePDFAnnotator: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [pages, setPages] = useState(0);
    const searchParams = useSearchParams();

    const {
        pdfLoadErrror: error,
        isLoading,
        sessionId,
        currentPage,
        scale,
        highlightStyle,
        numPages,
        annotations,
        openBookmarkForId,
        openCommentForId,
        openCreationForId,
        expandedChipForId,
        setExpandedChipForId,
        setOpenCreationForId,
        setOpenCommentForId,
        setOpenBookmarkForId,
        setPdfLoadError,
        fetchPdf,
        setScale,
        setCurrentPage,
        setHighlightStyle,
        addAnnotation,
        loadAnnotations,
        updateAnnotation,
        removeAnnotation,
    } = usePDFStore();

    const pageRef = useRef<HTMLDivElement>(null!);

    useEffect(() => {
        setupPdfWorker(); // run once on mount
    }, []);

    // ✅ lazy-load Document/Page only in browser
    const [Document, setDocument] = useState<any>(null);
    const [Page, setPage] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const mod = await import("react-pdf");
            setDocument(() => mod.Document);
            setPage(() => mod.Page);
        })();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const params = searchParams.get("payload");
                const parsed = JSON.parse(b64UrlDecode(params ?? '{}'));
                const documentId = parsed?.document_id;
                const numPages = parsed?.totalPages;
                if (typeof numPages === "number") setPages(numPages);
                const file = await fetchPdf(parsed);
                if (!cancelled && sessionId) await loadAnnotations(documentId ?? sessionId);
                if (!cancelled) {
                    setPages(0);
                    setSelectedFile(file);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setPdfLoadError(msg);
                    console.error("Error loading PDF:", err);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [sessionId, fetchPdf, setPdfLoadError, loadAnnotations]);

    const onDocSuccess = ({ numPages }: { numPages: number }) => setPages(numPages);
    const onDocumentLoadError = (e: Error) => {
        setPdfLoadError(e.message);
        console.error("Document load error:", e);
    };

    const setPageScale = (fn: (scale: number) => number) => {
        const newScale = fn(scale);
        if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) return;
        setScale(newScale);
    };
    const clearAnnotations = () => alert("Clear Annotations - To be implemented");
    const jumpToPage = (page: number) => {
        if (page < 1 || page > pages) return;
        setCurrentPage(page);
        pageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // ⬇ Everything below this line is unchanged from your original render
    return (
        <div className="simple-pdf-annotator w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">

            {/* Toolbar */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
                {/* Keep your Toolbar exactly as before */}
                {/* For brevity omitted: import Toolbar and pass props */}
                <Toolbar
                    scale={scale}
                    setScale={setPageScale}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    clearAnnotations={clearAnnotations}
                    hasAnnotations={false}
                    highlightStyle={highlightStyle}
                    setHighlightStyle={setHighlightStyle}
                    numPages={numPages}
                    currentPage={currentPage}
                    jumpToPage={jumpToPage}
                />
            </div>

            {/* PDF Viewer */}
            <div className="pdf-viewer flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-blue-100/20 p-6">
                {error ? (
                    // same error UI...
                    <div className="flex flex-col items-center justify-center py-24">Failed to load PDF: {error}</div>
                ) : isLoading || !selectedFile || !Document || !Page ? (
                    <div className="flex flex-col items-center justify-center py-24 relative min-h-[500px]">
                        <VibrantLoader variant="pulse" size="xl" message="Loading PDF Document" />
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-visible">
                            <Document
                                file={selectedFile}
                                onLoadSuccess={onDocSuccess}
                                onLoadError={onDocumentLoadError}
                                loading={<VibrantLoader variant="bars" size="lg" message="Preparing PDF Viewer" />}
                            >
                                {pages > 0 && (
                                    <div ref={pageRef} className="relative">
                                        <Page
                                            pageNumber={Math.min(currentPage || 1, pages)}
                                            scale={scale}
                                            renderTextLayer={true}
                                            renderAnnotationLayer={false}
                                            loading={
                                                <div className="flex flex-col items-center justify-center py-12">
                                                    <VibrantLoader
                                                        variant="dots"
                                                        size="md"
                                                        message="Rendering Page"
                                                    />
                                                </div>
                                            }
                                        />
                                        <AnnotationOverlay
                                            annotations={annotations}
                                            isLoading={isLoading}
                                            currentPage={currentPage}
                                            scale={scale}
                                            openCreationForId={openCreationForId}
                                            openCommentForId={openCommentForId}
                                            openBookmarkForId={openBookmarkForId}
                                            expandedChipForId={expandedChipForId}
                                            setOpenCreationForId={setOpenCreationForId}
                                            setOpenCommentForId={setOpenCommentForId}
                                            setOpenBookmarkForId={setOpenBookmarkForId}
                                            setExpandedChipForId={setExpandedChipForId}
                                            addAnnotation={addAnnotation}
                                            updateAnnotation={updateAnnotation}
                                            removeAnnotation={removeAnnotation}
                                            selectedColor={'#ffe066'}
                                            strokeWidth={2}
                                            highlightStyle={highlightStyle}
                                            pageRef={pageRef}
                                        />
                                    </div>
                                )}
                            </Document>
                        </div>
                    </div>
                )}
            </div>

            {/* Keep all your annotation panels, summary, etc. below unchanged */}
            {annotations.length > 0 && (
                <div className="annotations-summary bg-white/95 backdrop-blur-sm border-t border-gray-200/50 shadow-lg">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">
                                        {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
                                    </span>
                                    <div className="flex items-center mt-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                                        <span className="text-xs text-gray-500">Active session</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg px-3 py-2 border border-gray-200/50">
                                    <span className="text-xs text-gray-600 font-medium">
                                        Double-click highlight to remove
                                    </span>
                                    <div className="flex items-center justify-end space-x-2 mt-1">
                                        <span className="text-xs text-gray-500">💬 Comments</span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-500">🔖 Bookmarks</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {openCommentForId && (
                <CommentPanel
                    ann={annotations.find(a => a.id === openCommentForId)!}
                    onClose={() => setOpenCommentForId()}
                    updateAnnotation={updateAnnotation}
                />
            )}

            {openBookmarkForId && (
                <BookmarkPopover
                    ann={annotations.find(a => a.id === openBookmarkForId)!}
                    onClose={() => setOpenBookmarkForId()}
                    updateAnnotation={updateAnnotation}
                    hasCommentPanelOpen={!!openCommentForId}
                />
            )}
        </div>
    );
};
