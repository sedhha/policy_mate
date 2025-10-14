'use client';
import ReactMarkdown from 'react-markdown';
import { FileText, Info } from 'lucide-react';

interface MarkdownRendererProps {
    markdown: string;
    showIcon?: boolean;
    className?: string;
}

export const MarkdownRenderer = ({
    markdown,
    showIcon = true,
    className = ''
}: MarkdownRendererProps) => {
    return (
        <div className={`bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-lg border border-blue-100 p-8 ${className}`}>
            {showIcon && (
                <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <Info className="w-8 h-8 text-white" />
                    </div>
                </div>
            )}

            <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
                <ReactMarkdown
                    components={{
                        // Headings
                        h1: ({ node, ...props }) => (
                            <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-6 first:mt-0" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                            <h2 className="text-2xl font-bold text-gray-800 mb-3 mt-5 first:mt-0" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4 first:mt-0" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                            <h4 className="text-lg font-semibold text-gray-700 mb-2 mt-3 first:mt-0" {...props} />
                        ),

                        // Paragraphs
                        p: ({ node, ...props }) => (
                            <p className="text-gray-700 leading-relaxed mb-4 last:mb-0" {...props} />
                        ),

                        // Lists
                        ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 ml-4" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700 ml-4" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="leading-relaxed" {...props} />
                        ),

                        // Links
                        a: ({ node, ...props }) => (
                            <a
                                className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                            />
                        ),

                        // Code
                        code: ({ node, inline, ...props }: any) =>
                            inline ? (
                                <code
                                    className="bg-gray-900 text-pink-400 px-2 py-0.5 rounded text-sm font-mono"
                                    {...props}
                                />
                            ) : (
                                <code
                                    className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4"
                                    {...props}
                                />
                            ),

                        // Pre (code blocks)
                        pre: ({ node, ...props }) => (
                            <pre className="bg-gray-900 rounded-lg overflow-hidden mb-4 shadow-md" {...props} />
                        ),

                        // Blockquotes
                        blockquote: ({ node, ...props }) => (
                            <blockquote
                                className="border-l-4 border-blue-500 bg-white/50 pl-4 py-2 mb-4 italic text-gray-700 rounded-r-lg"
                                {...props}
                            />
                        ),

                        // Horizontal Rule
                        hr: ({ node, ...props }) => (
                            <hr className="my-6 border-t-2 border-gray-200" {...props} />
                        ),

                        // Tables
                        table: ({ node, ...props }) => (
                            <div className="overflow-x-auto mb-4">
                                <table className="min-w-full border-collapse border border-gray-200 rounded-lg overflow-hidden" {...props} />
                            </div>
                        ),
                        thead: ({ node, ...props }) => (
                            <thead className="bg-gray-100" {...props} />
                        ),
                        tbody: ({ node, ...props }) => (
                            <tbody className="bg-white" {...props} />
                        ),
                        tr: ({ node, ...props }) => (
                            <tr className="border-b border-gray-200 last:border-b-0" {...props} />
                        ),
                        th: ({ node, ...props }) => (
                            <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200 last:border-r-0" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                            <td className="px-4 py-3 text-gray-700 border-r border-gray-200 last:border-r-0" {...props} />
                        ),

                        // Strong/Bold
                        strong: ({ node, ...props }) => (
                            <strong className="font-bold text-gray-900" {...props} />
                        ),

                        // Emphasis/Italic
                        em: ({ node, ...props }) => (
                            <em className="italic text-gray-800" {...props} />
                        ),
                    }}
                >
                    {markdown}
                </ReactMarkdown>
            </div>
        </div>
    );
};
