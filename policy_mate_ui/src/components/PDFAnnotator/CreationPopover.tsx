// components/PDFAnnotator/CreationPopover.tsx
import React from 'react';
import type { SimpleAnnotation } from '@/components/PDFAnnotator/types';
import { getPopoverPlacement, POPOVER_MARGIN, POPOVER_W } from '@/components/PDFAnnotator/popoverUtils';

interface Props {
    ann: SimpleAnnotation;
    pageRef: React.RefObject<HTMLDivElement>;
    scale: number;
    updateAnnotation: (id: string, patch: Partial<SimpleAnnotation>) => void;
    onChooseComment: () => void;
    onChooseBookmark: () => void;
    onClose: () => void;
}

export const CreationPopover: React.FC<Props> = ({
    ann,
    pageRef,
    scale,
    updateAnnotation,
    onChooseComment,
    onChooseBookmark,
    onClose
}) => {
    const { side, translateY } = getPopoverPlacement(ann, pageRef, scale);

    const handleCommentClick = () => {
        updateAnnotation(ann.id, { action: 'comment' });
        onChooseComment();
    };

    const handleBookmarkClick = () => {
        updateAnnotation(ann.id, { action: 'bookmark', bookmarkType: 'review-later' });
        onChooseBookmark();
    };

    return (
        <div
            className="absolute z-50 bg-white/98 backdrop-blur-sm border border-gray-200/60 shadow-2xl rounded-2xl p-4 min-w-0 transition-all duration-200 ease-out"
            style={{
                width: POPOVER_W,
                top: 0,
                transform: `translateY(${translateY}px)`,
                ...(side === 'right'
                    ? { left: `calc(100% + ${POPOVER_MARGIN}px)` }
                    : { right: `calc(100% + ${POPOVER_MARGIN}px)` }),
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDownCapture={(e) => e.stopPropagation()}
        >
            <div className="text-sm font-medium text-gray-900 mb-3 tracking-tight">
                Add annotation
            </div>

            <div className="space-y-2">
                <button
                    className="group w-full text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200
                             hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm
                             active:scale-[0.98] transition-all duration-150 ease-out
                             flex items-center gap-2.5 cursor-pointer"
                    onClick={handleCommentClick}
                >
                    <span className="text-base">💬</span>
                    <span className="font-medium text-gray-800 group-hover:text-blue-900">
                        Comment / discuss
                    </span>
                </button>

                <button
                    className="group w-full text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200
                             hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-sm
                             active:scale-[0.98] transition-all duration-150 ease-out
                             flex items-center gap-2.5 cursor-pointer"
                    onClick={handleBookmarkClick}
                    title="Open bookmark options"
                >
                    <span className="text-base">🔖</span>
                    <span className="font-medium text-gray-800 group-hover:text-amber-900">
                        Bookmark (Review / Verify)
                    </span>
                </button>
            </div>

            <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
                <button
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200
                             text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300
                             active:scale-95 cursor-pointer transition-all duration-150 ease-out"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </div>
    );
};
