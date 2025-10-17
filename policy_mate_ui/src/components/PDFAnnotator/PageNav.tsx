// components/PDFAnnotator/PageNav.tsx
import React from 'react';

interface Props {
    numPages: number;
    currentPage: number;
    jumpToPage: (n: number) => void;
}

export const PageNav: React.FC<Props> = ({ numPages, currentPage, jumpToPage }) => {
    if (numPages <= 0) return null;

    return (
        <div className="flex items-center gap-3">
            {/* Previous Button */}
            <button
                className={`
                    group flex cursor-pointer items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all duration-200
                    ${currentPage <= 1
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                    }
                `}
                disabled={currentPage <= 1}
                onClick={() => jumpToPage(currentPage - 1)}
            >
                <svg
                    className="w-4 h-4 cursor-pointer transition-transform duration-200 group-hover:-translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
                Previous
            </button>

            {/* Page Input Section */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm">
                <span className="text-sm font-medium text-gray-600">Page</span>
                <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={currentPage}
                    onChange={(e) => jumpToPage(Number(e.target.value))}
                    className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
                <span className="text-sm text-gray-500">of {numPages}</span>
            </div>

            {/* Next Button */}
            <button
                className={`
                    group cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all duration-200
                    ${currentPage >= numPages
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                    }
                `}
                disabled={currentPage >= numPages}
                onClick={() => jumpToPage(currentPage + 1)}
            >
                Next
                <svg
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </button>
        </div>
    );
};
