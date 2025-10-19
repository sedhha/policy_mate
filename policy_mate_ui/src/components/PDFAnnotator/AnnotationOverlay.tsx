import React from 'react';
import type { SimpleAnnotation, AnnotationOverlayProps, DragRect } from '@/components/PDFAnnotator/types';
import { CreationPopover } from '@/components/PDFAnnotator/CreationPopover';

export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
    annotations,
    currentPage,
    scale,
    openCreationForId,
    openCommentForId,
    openBookmarkForId,
    expandedChipForId,
    isLoading,
    setOpenCreationForId,
    setOpenCommentForId,
    setOpenBookmarkForId,
    setExpandedChipForId,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    highlightStyle,
    pageRef,
}) => {
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [startPoint, setStartPoint] = React.useState<{ x: number; y: number } | null>(null);
    const [dragRect, setDragRect] = React.useState<DragRect | null>(null);
    const [overlayWidth, setOverlayWidth] = React.useState(0);

    // 🎛️ Configurable offset for action button positioning (in pixels)
    // Adjust this value to fine-tune the button placement
    const ACTION_BUTTON_OFFSET_RIGHT = 10; // Default: 20px to the right of annotation

    // Ensure overlay dimensions are measured before rendering
    React.useLayoutEffect(() => {
        if (overlayRef.current) {
            setOverlayWidth(overlayRef.current.clientWidth);
        }
    }, [currentPage, scale]);

    // Function to get highlight style classes (unchanged)
    const getHighlightClasses = React.useCallback(
        (annotation: SimpleAnnotation) => {
            const baseClasses = (() => {
                switch (highlightStyle) {
                    case 'classic':
                        return 'bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,165,0,0.15)] border-[1.5px] border-dashed border-[rgba(255,215,0,0.8)] shadow-[0_0_10px_rgba(255,215,0,0.3)]';
                    case 'gradient':
                        return 'border border-amber-400/50 bg-[linear-gradient(to_bottom_right,rgba(254,240,138,0.8),rgba(254,215,170,0.6))] shadow-[0_2px_12px_rgba(255,193,7,0.4),inset_0_0_0_1px_rgba(255,193,7,0.3)]';
                    case 'neon':
                        return 'bg-cyan-200/70 border border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3),0_0_40px_rgba(0,255,255,0.1),inset_0_0_20px_rgba(0,255,255,0.05)]';
                    case 'glass':
                        return 'bg-blue-200/60 border border-blue-500/40 backdrop-blur-sm shadow-[0_4px_20px_rgba(59,130,246,0.3),inset_0_0_0_1px_rgba(59,130,246,0.2)]';
                    case 'academic':
                        return 'border border-amber-400/50 bg-[linear-gradient(to_bottom_right,rgba(251,243,219,0.9),rgba(254,249,195,0.7))] shadow-[0_2px_12px_rgba(255,193,7,0.4),inset_0_0_0_1px_rgba(255,193,7,0.4)]';
                    default:
                        return 'bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,165,0,0.15)] border-[1.5px] border-dashed border-[rgba(255,215,0,0.8)] shadow-[0_0_10px_rgba(255,215,0,0.3)]';
                }
            })();

            if (annotation.resolved) {
                switch (highlightStyle) {
                    case 'classic':
                        return 'bg-gradient-to-br from-green-200/70 to-emerald-300/60 border-[1.5px] border-dashed border-green-500/80 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
                    case 'gradient':
                        return 'border border-green-400/60 bg-[linear-gradient(to_bottom_right,rgba(134,239,172,0.15),rgba(74,222,128,0.1))] shadow-[0_2px_12px_rgba(34,197,94,0.5),inset_0_0_0_1px_rgba(34,197,94,0.4)]';
                    case 'neon':
                        return 'bg-emerald-200/15 border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4),0_0_40px_rgba(16,185,129,0.2),inset_0_0_20px_rgba(16,185,129,0.1)]';
                    case 'glass':
                        return 'bg-emerald-200/15 border border-emerald-500/50 backdrop-blur-sm shadow-[0_4px_20px_rgba(16,185,129,0.4),inset_0_0_0_1px_rgba(16,185,129,0.3)]';
                    case 'academic':
                        return 'border border-green-400/60 bg-[linear-gradient(to_bottom_right,rgba(220,252,231,0.15),rgba(187,247,208,0.1))] shadow-[0_2px_12px_rgba(34,197,94,0.5),inset_0_0_0_1px_rgba(34,197,94,0.5)]';
                    default:
                        return 'bg-gradient-to-br from-green-200/70 to-emerald-300/60 border-[1.5px] border-dashed border-green-500/80 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
                }
            }
            return baseClasses;
        },
        [highlightStyle]
    );

    // Function to get drag rectangle classes (unchanged)
    const getDragClasses = React.useCallback(() => {
        switch (highlightStyle) {
            case 'classic':
                return 'bg-yellow-300/40 border-2 border-dashed border-yellow-600/70';
            case 'gradient':
                return 'bg-[linear-gradient(135deg,rgba(255,215,0,0.2),rgba(255,165,0,0.15))] border border-yellow-400/80 shadow-[0_0_10px_rgba(255,215,0,0.3)]';
            case 'neon':
                return 'bg-cyan-200/25 border-2 border-dashed border-cyan-400/70 shadow-[0_0_15px_rgba(0,255,255,0.3)]';
            case 'glass':
                return 'bg-blue-200/25 border-2 border-dashed border-blue-400/70 backdrop-blur-sm shadow-[0_0_12px_rgba(59,130,246,0.2)]';
            case 'academic':
                return 'bg-[linear-gradient(45deg,rgba(255,193,7,0.2),rgba(255,235,59,0.15))] border border-amber-500/80 shadow-[0_0_10px_rgba(255,193,7,0.3)]';
            default:
                return 'bg-yellow-300/40 border-2 border-dashed border-yellow-600/70';
        }
    }, [highlightStyle]);

    // Other functions (getRelativePosition, extractTextFromRegion, handleMouseDown, handleMouseMove, handleMouseUp, pageAnnotations) remain unchanged
    const getRelativePosition = React.useCallback(
        (event: React.MouseEvent) => {
            if (!pageRef.current) return null;
            const rect = pageRef.current.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) / scale,
                y: (event.clientY - rect.top) / scale,
            };
        },
        [pageRef, scale]
    );

    const extractTextFromRegion = React.useCallback(
        (x: number, y: number, width: number, height: number): string => {
            if (!pageRef.current) return '';
            try {
                const textLayer = pageRef.current.querySelector('.react-pdf__Page__textContent');
                if (!textLayer) return '';
                const textSpans = textLayer.querySelectorAll('span');
                let extractedText = '';
                const annotationRect = {
                    left: x * scale,
                    top: y * scale,
                    right: (x + width) * scale,
                    bottom: (y + height) * scale,
                };
                textSpans.forEach(span => {
                    const spanRect = span.getBoundingClientRect();
                    const pageRect = pageRef.current!.getBoundingClientRect();
                    const relativeSpanRect = {
                        left: spanRect.left - pageRect.left,
                        top: spanRect.top - pageRect.top,
                        right: spanRect.right - pageRect.left,
                        bottom: spanRect.bottom - pageRect.top,
                    };
                    const intersects = !(
                        relativeSpanRect.right < annotationRect.left ||
                        relativeSpanRect.left > annotationRect.right ||
                        relativeSpanRect.bottom < annotationRect.top ||
                        relativeSpanRect.top > annotationRect.bottom
                    );
                    if (intersects && span.textContent) {
                        extractedText += span.textContent;
                    }
                });
                return extractedText.trim().replace(/\s+/g, ' ');
            } catch (error) {
                console.warn('Error extracting text from region:', error);
                return '';
            }
        },
        [pageRef, scale]
    );

    const handleMouseDown = React.useCallback(
        (event: React.MouseEvent) => {
            if (isLoading || openCreationForId || openCommentForId || openBookmarkForId) return;
            const pos = getRelativePosition(event);
            if (!pos) return;
            setStartPoint(pos);
            setDragRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
            setIsDrawing(true);
        },
        [isLoading, openCreationForId, openCommentForId, openBookmarkForId, getRelativePosition]
    );

    const handleMouseMove = React.useCallback(
        (event: React.MouseEvent) => {
            if (!isDrawing || !startPoint) return;
            const pos = getRelativePosition(event);
            if (!pos) return;
            const w = Math.abs(pos.x - startPoint.x);
            const h = Math.abs(pos.y - startPoint.y);
            const x = Math.min(startPoint.x, pos.x);
            const y = Math.min(startPoint.y, pos.y);
            setDragRect({ x, y, w, h });
        },
        [isDrawing, startPoint, getRelativePosition]
    );

    const handleMouseUp = React.useCallback(
        async (event: React.MouseEvent) => {
            if (!isDrawing || !startPoint) {
                setIsDrawing(false);
                setDragRect(null);
                return;
            }
            const end = getRelativePosition(event);
            setIsDrawing(false);
            if (!end) {
                setDragRect(null);
                return;
            }
            const width = Math.abs(end.x - startPoint.x);
            const height = Math.abs(end.y - startPoint.y);
            const x = Math.min(startPoint.x, end.x);
            const y = Math.min(startPoint.y, end.y);
            setStartPoint(null);
            setDragRect(null);
            if (width > 5 && height > 5) {
                const highlightedText = extractTextFromRegion(x, y, width, height);
                addAnnotation({
                    page: currentPage,
                    x,
                    y,
                    width,
                    height,
                    resolved: false,
                    highlightedText,
                })
                    .then(id => setOpenCreationForId(id))
                    .catch(error =>
                        alert(`Failed to create annotation: ${error.message || error.detail}`)
                    );
            }
        },
        [isDrawing, startPoint, getRelativePosition, currentPage, addAnnotation, setOpenCreationForId, extractTextFromRegion]
    );

    const pageAnnotations = React.useMemo(
        () => annotations.filter(a => a.page === currentPage),
        [annotations, currentPage]
    );

    return (
        <div
            ref={overlayRef}
            className={`annotation-overlay z-[200] absolute top-0 left-0 w-full h-full ${isLoading ? 'cursor-wait pointer-events-none' : 'cursor-crosshair'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={e => {
                if (e.target === overlayRef.current) {
                    if (openCreationForId) setOpenCreationForId();
                    if (openCommentForId) setOpenCommentForId();
                    if (openBookmarkForId) setOpenBookmarkForId();
                    if (expandedChipForId) setExpandedChipForId();
                }
            }}
        >
            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                </div>
            )}

            {/* Live drag rectangle */}
            {dragRect && (
                <div
                    className={`absolute pointer-events-none rounded-lg ${getDragClasses()}`}
                    style={{
                        left: dragRect.x * scale,
                        top: dragRect.y * scale,
                        width: dragRect.w * scale,
                        height: dragRect.h * scale,
                    }}
                />
            )}

            {/* Render annotations */}
            {pageAnnotations.map(annotation => {
                const highlightClasses = getHighlightClasses(annotation);
                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: annotation.x * scale,
                    top: annotation.y * scale,
                    width: annotation.width * scale,
                    height: annotation.height * scale,
                    pointerEvents: isLoading ? 'none' : 'auto',
                    cursor: isLoading ? 'wait' : 'pointer',
                    borderRadius: 6,
                };

                // Decide whether to place the action chip to the left of the annotation
                // to avoid being clipped by the pdf-viewer's horizontal overflow.
                const anchorX = (annotation.x + annotation.width) * scale;
                // If less than 180px remains to the right edge, flip the chip to the left
                const flipLeft = overlayWidth > 0 && overlayWidth - anchorX < 180;

                return (
                    <div
                        key={annotation.id}
                        style={style}
                        title="Double-click to remove"
                        className={highlightClasses}
                    >
                        {(highlightStyle === 'classic' || highlightStyle === 'gradient') &&
                            !annotation.resolved && (
                                <div
                                    className="absolute inset-0 rounded-lg pointer-events-none"
                                    style={{ border: `1px solid rgba(0,0,0,0.14)` }}
                                />
                            )}
                        <div
                            className="absolute"
                            style={{
                                top: -2,
                                left: `calc(100% + 40px)`,
                                zIndex: 5,
                                // Push right normally; if near right edge, move entirely to the left of the annotation
                                transform: flipLeft
                                    ? 'translateX(calc(-100% - 8px))'
                                    : `translateX(${ACTION_BUTTON_OFFSET_RIGHT}px)`,
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {expandedChipForId === annotation.id ? (
                                <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-300 animate-in slide-in-from-right-5">
                                    <button
                                        className="w-7 h-7 cursor-pointer flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200 group annotation-button"
                                        title="Collapse"
                                        onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setExpandedChipForId();
                                        }}
                                    >
                                        <svg
                                            className="w-4 h-4 text-gray-600 group-hover:text-gray-800 transition-colors"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                    <div className="w-px h-4 bg-gray-200"></div>
                                    <button
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 transition-all duration-200 group annotation-button cursor-pointer"
                                        title="Ask Question"
                                        onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setExpandedChipForId();
                                            setOpenCreationForId();
                                            setOpenBookmarkForId();
                                            setOpenCommentForId(annotation.id);
                                        }}
                                    >
                                        <svg
                                            className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-amber-50 transition-all duration-200 group annotation-button"
                                        title="Add Bookmark"
                                        onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setExpandedChipForId();
                                            setOpenCreationForId();
                                            setOpenCommentForId();
                                            setOpenBookmarkForId(annotation.id);
                                            if (!annotation.bookmarkType) {
                                                updateAnnotation(annotation.id, { bookmarkType: 'review-later' });
                                            }
                                        }}
                                    >
                                        <svg
                                            className="w-4 h-4 text-amber-600 group-hover:text-amber-700 transition-colors"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                            />
                                        </svg>
                                    </button>
                                    <div className="w-px h-4 bg-gray-200"></div>
                                    <button
                                        className="w-7 h-7 cursor-pointer flex items-center justify-center rounded-lg hover:bg-red-50 transition-all duration-200 group annotation-button"
                                        title="Delete Annotation"
                                        onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removeAnnotation(annotation.id);
                                        }}
                                    >
                                        <svg
                                            className="w-4 h-4 text-red-500 group-hover:text-red-600 transition-colors"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="w-8 cursor-pointer h-8 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-md hover:shadow-lg hover:bg-white transition-all duration-200 group annotation-button animate-scale-in"
                                    title="Show Actions"
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setExpandedChipForId(annotation.id);
                                    }}
                                >
                                    <svg
                                        className="w-4 h-4 text-gray-600 group-hover:text-gray-800 transition-colors"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                        {openCreationForId === annotation.id && (
                            <CreationPopover
                                ann={annotation}
                                pageRef={pageRef}
                                scale={scale}
                                updateAnnotation={updateAnnotation}
                                onChooseComment={() => {
                                    setOpenCreationForId();
                                    setOpenBookmarkForId();
                                    setOpenCommentForId(annotation.id);
                                }}
                                onChooseBookmark={() => {
                                    setOpenCreationForId();
                                    setOpenCommentForId();
                                    setOpenBookmarkForId(annotation.id);
                                }}
                                onClose={() => setOpenCreationForId()}
                            />
                        )}
                        <div
                            className="absolute inset-0"
                            onDoubleClick={() => removeAnnotation(annotation.id)}
                        />
                    </div>
                );
            })}
        </div>
    );
};
