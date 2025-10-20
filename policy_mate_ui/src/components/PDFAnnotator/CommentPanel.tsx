// components/PDFAnnotator/CommentPanel.tsx
import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CommentComposer } from '@/components/PDFAnnotator/CommentComposer';
import type { CommentPannelProps } from '@/components/PDFAnnotator/types';
import { usePDFStore } from '@/components/PDFAnnotator/stores/pdfStore';

export const CommentPanel: React.FC<CommentPannelProps> = ({
    ann,
    onClose,
    updateAnnotation,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isMinimized, setIsMinimized] = React.useState(false);

    const {
        commentConversation,
        chatLoading,
        chatError,
        loadAnnotationChat,
        sendAnnotationMessage,
    } = usePDFStore();

    const [id] = useState(ann.session_id);

    useEffect(() => {
        // Load transcript (creates/attaches ADK session if needed)
        loadAnnotationChat(ann).catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ann.session_id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [commentConversation?.length, chatLoading]);

    // Additional effect to scroll when conversation loads for the first time
    useEffect(() => {
        if (!chatLoading && commentConversation && commentConversation.length > 0) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [chatLoading, commentConversation]);

    if (isMinimized) {
        return (
            <div
                className="fixed bottom-4 right-4 z-[60] bg-white shadow-lg rounded-full p-3 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
                onClick={() => setIsMinimized(false)}
            >
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed bottom-4 right-4 z-[60] bg-white shadow-2xl rounded-2xl overflow-hidden w-[450px] h-[585px] flex flex-col border border-gray-200"
            onClick={e => e.stopPropagation()}
            onMouseDownCapture={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="font-semibold text-sm">Compliance Console</div>
                    <span className="text-xs text-blue-100">#{id.slice(-6)}</span>
                    {chatLoading && <span className="ml-2 text-[10px] text-blue-100">syncing…</span>}
                    {chatError && <span className="ml-2 text-[10px] text-red-200" title={chatError}>err</span>}
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
                        onClick={() => setIsMinimized(true)}
                        title="Minimize"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                    <button
                        className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
                        onClick={onClose}
                        title="Close"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-3 chat-scroll">
                {(commentConversation ?? []).length === 0 && !chatLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-xs">Start a conversation</p>
                        <p className="text-gray-400 text-xs mt-1">Ask questions about this annotation</p>

                        {ann.highlightedText && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-full">
                                <div className="flex items-start space-x-2">
                                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <div className="text-left">
                                        <p className="text-xs font-medium text-blue-800 mb-1">Reference:</p>
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            Page {ann.page}: "{ann.highlightedText}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {ann.highlightedText && (
                            <div className="mb-3">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-start space-x-2">
                                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <div className="text-left">
                                            <p className="text-xs font-medium text-blue-800 mb-1">Reference:</p>
                                            <p className="text-xs text-blue-700 leading-relaxed">
                                                Page {ann.page}: "{ann.highlightedText}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(commentConversation ?? []).map((c, index) => (
                            <div key={c.id} className={`flex ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-lg p-2 text-sm cursor-text ${index % 2 === 0
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                        }`}
                                >
                                    <div className={`prose-chat prose-sm ${index % 2 === 0 ? 'prose-chat-dark' : ''}`}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                            {c.text}
                                        </ReactMarkdown>
                                    </div>
                                    <div className={`text-xs mt-1 ${index % 2 === 0 ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-3">
                {!ann.resolved && (
                    <>
                        {chatLoading && (
                            <div className="mb-2 flex items-center justify-center text-xs text-blue-600">
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span>Hang on! Getting best answers to your solid question!</span>
                            </div>
                        )}
                        <CommentComposer
                            disabled={chatLoading}
                            onSubmit={async (text) => {
                                await sendAnnotationMessage(ann, text, { includeReference: true });
                            }}
                            placeholder={
                                (!commentConversation || commentConversation.length === 0) && ann.highlightedText
                                    ? `Ask about: "${ann.highlightedText.length > 50
                                        ? ann.highlightedText.slice(0, 50) + '...'
                                        : ann.highlightedText
                                    }"`
                                    : 'Type your message... (Press Enter to send, Shift+Enter for new line)'
                            }
                        />
                    </>
                )}

                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${ann.resolved ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                        <span className={`text-xs font-medium ${ann.resolved ? 'text-green-600' : 'text-amber-600'}`}>
                            {ann.resolved ? 'Resolved' : 'Open'}
                        </span>
                    </div>

                    <button
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${ann.resolved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        onClick={() => updateAnnotation(ann.session_id, { resolved: !ann.resolved })}
                    >
                        {ann.resolved ? '↻ Reopen' : '✓ Resolve'}
                    </button>
                </div>
            </div>
        </div>
    );
};
