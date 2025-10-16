'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAgentStore } from '@/stores/agentStore';
import { stripBackendInstructions } from '@/utils/apis';
import {
    ArrowLeft,
    FileText,
    MessageSquare,
    Send,
    Loader2,
    Sparkles,
    Bot,
    User,
    Copy,
    Check,
    Code2,
    FileCode,
    Hash,
    List,
    Quote,
    CheckCircle2,
    Circle,
    ChevronRight,
    Info,
    AlertTriangle,
    XCircle,
    Lightbulb,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

// Custom components for markdown rendering
const MarkdownComponents = {
    h1: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h1
            className='text-3xl font-bold text-gray-900 mb-4 mt-6 pb-2 border-b border-gray-200 first:mt-0'
            {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h2
            className='text-2xl font-semibold text-gray-800 mb-3 mt-5 flex items-center gap-2 first:mt-0'
            {...props}>
            <Hash className='w-5 h-5 text-blue-500 opacity-50' />
            {children}
        </h2>
    ),
    h3: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h3
            className='text-xl font-semibold text-gray-700 mb-2 mt-4 first:mt-0'
            {...props}>
            {children}
        </h3>
    ),
    p: ({ children, ...props }: React.HTMLProps<HTMLParagraphElement>) => (
        <p className='text-gray-700 leading-relaxed mb-4 last:mb-0' {...props}>
            {children}
        </p>
    ),
    ul: ({ children, ...props }: React.HTMLProps<HTMLUListElement>) => (
        <ul className='space-y-2 mb-4 ml-4' {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
        <ol className='space-y-2 mb-4 ml-4 list-decimal list-inside' {...props}>
            {children}
        </ol>
    ),
    li: ({ children, ...props }: React.HTMLProps<HTMLLIElement>) => (
        <li className='flex items-start gap-2 text-gray-700' {...props}>
            <ChevronRight className='w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0' />
            <span>{children}</span>
        </li>
    ),
    blockquote: ({ children, ...props }: React.HTMLProps<HTMLQuoteElement>) => (
        <blockquote
            className='border-l-4 border-blue-500 bg-blue-50 pl-4 py-3 pr-4 mb-4 rounded-r-lg'
            {...props}>
            <div className='flex gap-2'>
                <Quote className='w-5 h-5 text-blue-600 opacity-50 flex-shrink-0 mt-1' />
                <div className='text-gray-700 italic'>{children}</div>
            </div>
        </blockquote>
    ),
    code: ({
        inline,
        className,
        children,
        ...props
    }: React.HTMLProps<HTMLElement> & { inline?: boolean }) => {
        const [copied, setCopied] = useState(false);

        const handleCopy = () => {
            navigator.clipboard.writeText(String(children));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        if (inline) {
            return (
                <code
                    className='px-1.5 py-0.5 bg-gray-100 text-purple-600 rounded text-sm font-mono'
                    {...props}>
                    {children}
                </code>
            );
        }

        return (
            <div className='relative group mb-4'>
                <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <button
                        onClick={handleCopy}
                        className='p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors'>
                        {copied ? (
                            <Check className='w-4 h-4 text-green-400' />
                        ) : (
                            <Copy className='w-4 h-4 text-gray-400' />
                        )}
                    </button>
                </div>
                <div className='bg-gray-900 rounded-lg overflow-hidden'>
                    <div className='flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700'>
                        <FileCode className='w-4 h-4 text-gray-400' />
                        <span className='text-xs text-gray-400 font-mono'>
                            {className?.replace('language-', '') || 'code'}
                        </span>
                    </div>
                    <pre className='p-4 overflow-x-auto'>
                        <code className='text-sm font-mono text-gray-300' {...props}>
                            {children}
                        </code>
                    </pre>
                </div>
            </div>
        );
    },
    a: ({ children, href, ...props }: React.HTMLProps<HTMLAnchorElement>) => (
        <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors'
            {...props}>
            {children}
        </a>
    ),
    table: ({ children, ...props }: React.HTMLProps<HTMLTableElement>) => (
        <div className='overflow-x-auto mb-4'>
            <table
                className='min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden'
                {...props}>
                {children}
            </table>
        </div>
    ),
    thead: ({ children, ...props }: React.HTMLProps<HTMLTableSectionElement>) => (
        <thead className='bg-gray-50' {...props}>
            {children}
        </thead>
    ),
    th: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <th
            className='px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
            {...props}>
            {children}
        </th>
    ),
    td: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <td
            className='px-4 py-3 text-sm text-gray-700 border-t border-gray-100'
            {...props}>
            {children}
        </td>
    ),
    hr: () => <hr className='my-6 border-gray-200' />,
    strong: ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
        <strong className='font-semibold text-gray-900' {...props}>
            {children}
        </strong>
    ),
    em: ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
        <em className='italic text-gray-700' {...props}>
            {children}
        </em>
    ),
};

export default function ChatPage() {
    const router = useRouter();
    const { selectedDocument, sendChatMessage, agentStates } = useAgentStore();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<
        Array<{ role: 'user' | 'assistant'; content: string; isLoading?: boolean }>
    >([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(
                textareaRef.current.scrollHeight,
                120
            )}px`;
        }
    }, [message]);

    const handleSendMessage = async (e: React.FormEvent | null) => {
        if (e) e.preventDefault();
        if (!message.trim() || !selectedDocument || agentStates.chat.loading)
            return;

        const userMessage = message.trim();

        // Add user message to chat
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setMessage('');
        setIsTyping(true);

        // Add a loading placeholder for assistant response
        setMessages((prev) => [
            ...prev,
            {
                role: 'assistant',
                content: '',
                isLoading: true,
            },
        ]);

        // Send message to agent with document context
        const response = await sendChatMessage(
            userMessage,
            selectedDocument.document_id
        );

        setIsTyping(false);

        // Remove loading placeholder and add actual response
        setMessages((prev) => {
            const messagesWithoutLoading = prev.filter((msg) => !msg.isLoading);

            if (response) {
                // Extract and display the response, stripping all backend instructions
                const assistantMessage = (
                    response.summarised_markdown || 'No response from agent'
                ).replace(/\\n/g, '\n');
                console.log('Raw assistant message:', assistantMessage);
                return [
                    ...messagesWithoutLoading,
                    {
                        role: 'assistant',
                        content: assistantMessage,
                    },
                ];
            } else {
                // Handle error case
                return [
                    ...messagesWithoutLoading,
                    {
                        role: 'assistant',
                        content:
                            agentStates.chat.error ||
                            '❌ Failed to get response from agent. Please try again.',
                    },
                ];
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(null);
        }
    };

    if (!selectedDocument) {
        return null;
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'>
            {/* Animated background elements */}
            <div className='fixed inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob'></div>
                <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000'></div>
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000'></div>
            </div>

            {/* Header */}
            <div className='relative bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-lg'>
                <div className='max-w-6xl mx-auto px-6 py-4'>
                    <div className='flex items-center gap-4'>
                        <button
                            onClick={() => router.push('/')}
                            className='p-2.5 hover:bg-gray-100/80 rounded-xl transition-all hover:scale-105 active:scale-95'
                            title='Back to Dashboard'>
                            <ArrowLeft className='w-5 h-5 text-gray-700' />
                        </button>
                        <div className='flex items-center gap-3 flex-1'>
                            <div className='relative'>
                                <div className='w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg'>
                                    <FileText className='w-6 h-6 text-white' />
                                </div>
                                <div className='absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white'></div>
                            </div>
                            <div>
                                <h1 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
                                    {selectedDocument.file_name}
                                    <Sparkles className='w-4 h-4 text-yellow-500' />
                                </h1>
                                <p className='text-sm text-gray-600'>
                                    AI-Powered Document Analysis
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Container */}
            <div className='relative max-w-5xl mx-auto p-6'>
                <div className='bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100/50 flex flex-col overflow-hidden chat-container'>
                    {/* Messages Area */}
                    <div className='flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar'>
                        {messages.length === 0 ? (
                            <div className='flex flex-col items-center justify-center h-full text-center'>
                                <div className='relative mb-6'>
                                    <div className='w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center animate-pulse'>
                                        <MessageSquare className='w-10 h-10 text-blue-600' />
                                    </div>
                                    <div className='absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center'>
                                        <Sparkles className='w-3 h-3 text-white' />
                                    </div>
                                </div>
                                <h3 className='text-2xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                                    Start Your Intelligent Conversation
                                </h3>
                                <p className='text-gray-600 max-w-md leading-relaxed'>
                                    Ask questions about{' '}
                                    <span className='font-semibold text-gray-900'>
                                        {selectedDocument.file_name}
                                    </span>{' '}
                                    to unlock deep insights and comprehensive analysis
                                </p>
                                <div className='mt-6 flex flex-wrap gap-2 justify-center'>
                                    {[
                                        'Summarize this document',
                                        'What are the key points?',
                                        'Explain the main concepts',
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setMessage(suggestion)}
                                            className='px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-all hover:scale-105'>
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                                            } animate-fade-in`}>
                                        {msg.role === 'assistant' && (
                                            <div className='mr-3 flex-shrink-0'>
                                                <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg'>
                                                    <Bot className='w-5 h-5 text-white' />
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[75%] ${msg.role === 'user'
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg'
                                                : 'bg-white rounded-2xl rounded-tl-sm shadow-lg border border-gray-100'
                                                }`}>
                                            {msg.isLoading ? (
                                                <div className='flex items-center gap-3 px-5 py-4'>
                                                    <div className='flex gap-1'>
                                                        <div className='w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-0'></div>
                                                        <div className='w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-150'></div>
                                                        <div className='w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-300'></div>
                                                    </div>
                                                    <span className='text-sm text-gray-500'>
                                                        Crafting intelligent response...
                                                    </span>
                                                </div>
                                            ) : msg.role === 'user' ? (
                                                <p className='text-sm leading-relaxed whitespace-pre-wrap'>
                                                    {msg.content}
                                                </p>
                                            ) : (
                                                <div className='prose prose-slate max-w-none px-5 py-4 leading-relaxed whitespace-pre-wrap'>
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                        rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className='ml-3 flex-shrink-0'>
                                                <div className='w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg'>
                                                    <User className='w-5 h-5 text-white' />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className='border-t border-gray-200/50 bg-gray-50/50 backdrop-blur-sm p-5'>
                        <div className='flex gap-3'>
                            <div className='flex-1 relative'>
                                <textarea
                                    ref={textareaRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder='Ask a question about this document...'
                                    disabled={agentStates.chat.loading}
                                    className='w-full px-5 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all'
                                    rows={1}
                                />
                                {isTyping && (
                                    <div className='absolute bottom-3 right-14 text-xs text-gray-400'>
                                        AI is typing...
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || agentStates.chat.loading}
                                className='px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'>
                                {agentStates.chat.loading ? (
                                    <>
                                        <Loader2 className='w-5 h-5 animate-spin' />
                                        <span className='font-semibold'>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className='w-5 h-5' />
                                        <span className='font-semibold'>Send</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className='text-xs text-gray-500 mt-2 text-center'>
                            Press{' '}
                            <kbd className='px-2 py-0.5 bg-gray-200 rounded text-xs'>
                                Enter
                            </kbd>{' '}
                            to send,{' '}
                            <kbd className='px-2 py-0.5 bg-gray-200 rounded text-xs'>
                                Shift+Enter
                            </kbd>{' '}
                            for new line
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
