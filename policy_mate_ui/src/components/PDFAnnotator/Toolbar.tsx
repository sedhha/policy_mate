// components/PDFAnnotator/Toolbar.tsx
import React from 'react';
import type { HighlightStyle } from './types';
import { PageNav } from '@/components/PDFAnnotator/PageNav';

interface Props {
    scale: number;
    numPages: number;
    currentPage: number;
    jumpToPage: (n: number) => void;
    setScale: (fn: (n: number) => number) => void;
    minZoom: number;
    maxZoom: number;
    clearAnnotations: () => void;
    hasAnnotations: boolean;
    highlightStyle: HighlightStyle;
    setHighlightStyle: (style: HighlightStyle) => void;
}

export const Toolbar: React.FC<Props> = ({
    numPages,
    currentPage,
    jumpToPage,
    scale,
    setScale,
    minZoom,
    maxZoom,
    // clearAnnotations,
    highlightStyle,
    setHighlightStyle,
}) => {
    const [showStyleDropdown, setShowStyleDropdown] = React.useState(false);

    const highlightStyles = [
        {
            key: 'classic' as HighlightStyle,
            name: 'Classic',
            icon: '🖍️',
            description: 'Traditional highlight',
            preview: 'bg-yellow-200 border-yellow-400',
        },
        {
            key: 'gradient' as HighlightStyle,
            name: 'Gradient',
            icon: '🌈',
            description: 'Golden gradient effect',
            preview:
                'bg-gradient-to-br from-yellow-200 to-orange-200 border-yellow-400',
        },
        {
            key: 'neon' as HighlightStyle,
            name: 'Neon',
            icon: '⚡',
            description: 'Bright neon glow',
            preview: 'bg-cyan-200 border-cyan-400 shadow-cyan-200/50',
        },
        {
            key: 'glass' as HighlightStyle,
            name: 'Glass',
            icon: '💎',
            description: 'Modern glass effect',
            preview: 'bg-blue-100 border-blue-300 backdrop-blur',
        },
        {
            key: 'academic' as HighlightStyle,
            name: 'Academic',
            icon: '📚',
            description: 'Warm academic style',
            preview: 'bg-amber-100 border-amber-400',
        },
    ];

    const currentStyle =
        highlightStyles.find(s => s.key === highlightStyle) || highlightStyles[0];

    return (
        <div className="toolbar bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200/60 p-4">
            <div className="controls-group flex items-center justify-between max-w-7xl mx-auto">

                {/* Left Section - Highlight Style */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 relative">
                        <span className="text-sm font-medium text-gray-700">Highlight Style</span>
                        <button
                            className="flex cursor-pointer items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-sm font-medium shadow-sm"
                            onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                        >
                            <span className="text-lg">{currentStyle.icon}</span>
                            <span className="text-gray-900">{currentStyle.name}</span>
                            <svg
                                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showStyleDropdown ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>

                        {showStyleDropdown && (
                            <div className="absolute top-full left-16 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2 backdrop-blur-sm">
                                <div className="grid gap-1">
                                    {highlightStyles.map(style => (
                                        <button
                                            key={style.key}
                                            className={`flex cursor-pointer items-center gap-4 w-full px-4 py-3 rounded-xl text-left hover:bg-gray-50 transition-all duration-200 ${highlightStyle === style.key
                                                ? 'bg-blue-50 border border-blue-200 shadow-sm'
                                                : 'hover:shadow-sm'
                                                }`}
                                            onClick={() => {
                                                setHighlightStyle(style.key);
                                                setShowStyleDropdown(false);
                                            }}
                                        >
                                            <span className="text-xl">{style.icon}</span>
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900">{style.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {style.description}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-8 h-8 rounded-lg border-2 ${style.preview} shadow-sm`}
                                            ></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center Section - Zoom Controls */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1.5 border border-gray-200">
                    <button
                        className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                        onClick={() => setScale(prev => Math.max(minZoom, prev - 0.25))}
                        disabled={scale <= minZoom}
                    >
                        −
                    </button>
                    <div className="flex items-center justify-center min-w-[4rem] px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold text-gray-900">
                        {Math.round(scale * 100)}%
                    </div>
                    <button
                        className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                        onClick={() => setScale(prev => Math.min(maxZoom, prev + 0.25))}
                        disabled={scale >= maxZoom}
                    >
                        +
                    </button>
                </div>

                {/* Right Section - Navigation & Actions */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <PageNav
                            numPages={numPages}
                            currentPage={currentPage}
                            jumpToPage={jumpToPage}
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-200"></div>

                    {/* <button
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium text-sm hover:from-red-600 hover:to-red-700 hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 shadow-md"
                        onClick={clearAnnotations}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear All
                    </button> */}
                </div>
            </div>

            {/* Click outside to close dropdown */}
            {showStyleDropdown && (
                <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setShowStyleDropdown(false)}
                />
            )}
        </div>
    );
};
