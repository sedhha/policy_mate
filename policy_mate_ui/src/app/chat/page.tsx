'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAgentStore } from '@/stores/agentStore';
import { stripBackendInstructions } from '@/utils/apis';
import { ArrowLeft, FileText, MessageSquare, Send, Loader2 } from 'lucide-react';

export default function ChatPage() {
    const router = useRouter();
    const { selectedDocument, sendChatMessage, agentStates } = useAgentStore();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; isLoading?: boolean }>>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!selectedDocument) {
            router.push('/');
        }
    }, [selectedDocument, router]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !selectedDocument || agentStates.chat.loading) return;

        const userMessage = message.trim();

        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setMessage('');

        // Add a loading placeholder for assistant response
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '',
            isLoading: true
        }]);

        // Send message to agent with document context
        const response = await sendChatMessage(
            userMessage,
            selectedDocument.document_id
        );

        // Remove loading placeholder and add actual response
        setMessages(prev => {
            const messagesWithoutLoading = prev.filter(msg => !msg.isLoading);

            if (response) {
                // Extract and display the response, stripping all backend instructions
                const assistantMessage = stripBackendInstructions(
                    response.summarised_markdown || 'No response from agent'
                );

                return [...messagesWithoutLoading, {
                    role: 'assistant',
                    content: assistantMessage
                }];
            } else {
                // Handle error case
                return [...messagesWithoutLoading, {
                    role: 'assistant',
                    content: agentStates.chat.error || '❌ Failed to get response from agent. Please try again.'
                }];
            }
        });
    };

    if (!selectedDocument) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-800">
                                    {selectedDocument.file_name}
                                </h1>
                                <p className="text-sm text-gray-600">
                                    Chat about this document
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Container */}
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                    Start a conversation
                                </h3>
                                <p className="text-gray-600 max-w-md">
                                    Ask questions about <span className="font-semibold">{selectedDocument.file_name}</span> to get insights and analysis
                                </p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {msg.isLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                    <span className="text-sm text-gray-600">Thinking...</span>
                                                </div>
                                            ) : (
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-gray-200 p-4">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Ask a question about this document..."
                                disabled={agentStates.chat.loading}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                type="submit"
                                disabled={!message.trim() || agentStates.chat.loading}
                                className="px-6 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                                {agentStates.chat.loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="font-medium">Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span className="font-medium">Send</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
