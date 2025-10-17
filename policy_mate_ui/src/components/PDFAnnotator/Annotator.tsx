import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PDFAnnotator.css';
import { Document, Page } from 'react-pdf';
import { useState, useEffect, useRef } from 'react';
import { usePDFStore } from '@/components/PDFAnnotator/stores/pdfStore';
import { setupPdfWorker } from '@/components/PDFAnnotator/pdfWorker';
import { Toolbar } from '@/components/PDFAnnotator/Toolbar';
import { AnnotationOverlay } from '@/components/PDFAnnotator/AnnotationOverlay';
import { withLazyLoader } from '@/components/PDFAnnotator/hoc/LazyLoader/Loader';
import { VibrantLoader } from '@/components/PDFAnnotator/hoc/LazyLoader/VibrantLoader';
import type { CommentPannelProps, BookmarkPopoverProps } from '@/components/PDFAnnotator/types';

setupPdfWorker();

const CommentPanel = withLazyLoader<CommentPannelProps>(() => import('@/components/PDFAnnotator/CommentPanel'), { exportName: 'CommentPanel' });
const BookmarkPopover = withLazyLoader<BookmarkPopoverProps>(() => import('@/components/PDFAnnotator/BookmarkPopover'), { exportName: 'BookmarkPopover' });

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

export const SimplePDFAnnotator: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [pages, setPages] = useState(0); // local, from onLoadSuccess
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
        let cancelled = false;
        (async () => {
            try {
                const file = await fetchPdf(sessionId);
                if (!cancelled && sessionId) {
                    await loadAnnotations(sessionId);
                }
                if (!cancelled) {
                    setPages(0); // reset pages to prevent early <Page> render
                    setSelectedFile(file);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setPdfLoadError(msg);
                    console.error('Error loading PDF:', err);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sessionId, fetchPdf, setPdfLoadError, loadAnnotations]);

    const onDocSuccess = ({ numPages }: { numPages: number }) => {
        setPages(numPages);
    };

    const onDocumentLoadError = (e: Error) => {
        setPdfLoadError(e.message);
        console.error('Document load error:', e);
    };

    // Toolbar actions
    const setPageScale = (fn: (scale: number) => number) => {
        const newScale = fn(scale);
        if (newScale < MIN_ZOOM || newScale > MAX_ZOOM) return;
        setScale(newScale);
    };
    const clearAnnotations = () => alert('Clear Annotations - To be implemented');
    const jumpToPage = (page: number) => {
        if (page < 1 || page > pages) return;
        setCurrentPage(page);
        // Scroll to top of page
        if (pageRef.current) {
            pageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="simple-pdf-annotator w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">

            {/* Enhanced Toolbar */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
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

            {/* PDF Viewer Section */}
            <div className="pdf-viewer flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-blue-100/20 p-6">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-6">
                        <div className="relative">
                            {/* Error Icon with Gradient Background */}
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-2xl">
                                <svg
                                    className="w-10 h-10 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            {/* Animated rings around error icon */}
                            <div className="absolute inset-0 rounded-2xl border-4 border-red-300 animate-ping opacity-30"></div>
                            <div className="absolute inset-2 rounded-xl border-2 border-red-400 animate-pulse opacity-50"></div>
                        </div>
                        <div className="text-center max-w-md">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
                                Failed to Load PDF
                            </h3>
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-red-200 p-4 shadow-lg">
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    </div>
                ) : isLoading || !selectedFile ? (
                    <div className="flex flex-col items-center justify-center py-24 relative min-h-[500px]">
                        {/* Dramatic Pulsing Canvas Background Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/40 to-indigo-300/40 rounded-3xl pulse-canvas"></div>
                        <div className="absolute inset-8 bg-gradient-to-br from-white/60 to-blue-100/60 rounded-2xl pulse-canvas-delayed-1"></div>
                        <div className="absolute inset-16 bg-gradient-to-br from-blue-100/70 to-indigo-200/70 rounded-xl pulse-canvas-delayed-2"></div>

                        {/* Enhanced floating particles with custom animations */}
                        <div className="absolute top-16 left-16 w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full float-particle"></div>
                        <div className="absolute top-32 right-20 w-3 h-3 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full float-particle-delayed-1"></div>
                        <div className="absolute bottom-24 left-24 w-5 h-5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full float-particle-delayed-2"></div>
                        <div className="absolute bottom-16 right-16 w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full float-particle-delayed-3"></div>
                        <div className="absolute top-1/2 left-8 w-2 h-2 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full float-particle"></div>
                        <div className="absolute top-1/3 right-8 w-4 h-4 bg-gradient-to-r from-violet-400 to-violet-600 rounded-full float-particle-delayed-1"></div>

                        {/* Enhanced glow effects */}
                        <div className="absolute inset-0 bg-gradient-radial from-blue-300/20 via-transparent to-transparent rounded-3xl animate-pulse"></div>

                        {/* Main loader with enhanced backdrop */}
                        <div className="relative z-10">
                            <VibrantLoader
                                variant="pulse"
                                size="xl"
                                message="Loading PDF Document"
                                className="bg-white/90 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/60"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="relative">
                            {/* PDF Container with Enhanced Styling (allow overlay to overflow) */}
                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-visible">
                                <Document
                                    file={selectedFile}
                                    onLoadSuccess={onDocSuccess}
                                    onLoadError={onDocumentLoadError}
                                    loading={
                                        <div className="flex flex-col items-center justify-center py-16">
                                            <VibrantLoader
                                                variant="bars"
                                                size="lg"
                                                message="Preparing PDF Viewer"
                                            />
                                        </div>
                                    }
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

                            {/* Floating decorative elements */}
                            <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full opacity-20 animate-pulse"></div>
                            <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced Annotations Summary */}
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

            {/* Fixed positioned panels - rendered outside PDF viewer for proper viewport positioning */}
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
