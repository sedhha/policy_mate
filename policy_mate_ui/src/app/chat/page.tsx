'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAgentStore } from '@/stores/agentStore';
import {
    FileText,
    Send,
    Copy,
    Check,
    FileCode,
    Hash,
    ChevronRight,
    Quote,
    Zap,
    ArrowRight,
    Loader2,
    Shield,
    ShieldCheck,
    ChevronDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

// Types
interface SuggestedAction {
    action: string;
    description: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isLoading?: boolean;
    suggestedActions?: SuggestedAction[];
}

// Elegant Loading Animation Component with Compliance Scanning
const LoadingMessage = () => (
    <div className='flex items-start gap-3 animate-fade-in'>
        <div className='relative'>
            <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center'>
                <ShieldCheck className='w-4 h-4 text-white' />
            </div>
            {/* Multiple scanning rings */}
            <div className='absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-20' />
            <div className='absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-30' style={{ animationDelay: '0.3s' }} />
            <div className='absolute inset-0 rounded-full border-2 border-purple-500 animate-ping opacity-20' style={{ animationDelay: '0.6s' }} />
        </div>
        <div className='flex-1 space-y-3 py-1'>
            <div className='flex items-center gap-2'>
                <div className='relative flex items-center gap-1'>
                    <Shield className='w-4 h-4 text-blue-600' />
                    <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                </div>
                <span className='text-sm font-medium text-blue-600'>Scanning for compliance...</span>
            </div>
            <div className='space-y-2'>
                <div className='h-2 bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200 rounded-full w-3/4 animate-pulse' />
                <div className='h-2 bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200 rounded-full w-5/6 animate-pulse' style={{ animationDelay: '75ms' }} />
                <div className='h-2 bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200 rounded-full w-2/3 animate-pulse' style={{ animationDelay: '150ms' }} />
            </div>
        </div>
    </div>
);

// Action Suggestions Component
const ActionSuggestions = ({
    actions,
    onActionClick
}: {
    actions: SuggestedAction[];
    onActionClick: (action: string) => void;
}) => {
    if (!actions || actions.length === 0) return null;

    return (
        <div className='mt-6 space-y-3 animate-fade-in'>
            <div className='flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                <Zap className='w-3.5 h-3.5 text-amber-500' />
                Suggested Next Actions
            </div>
            <div className='grid gap-2'>
                {actions.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onActionClick(item.action)}
                        className='group relative overflow-hidden text-left p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                        style={{
                            animationDelay: `${idx * 100}ms`,
                            animation: 'fade-in 0.5s ease-out both'
                        }}
                    >
                        {/* Shimmer effect on hover */}
                        <div className='absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent' />

                        <div className='relative flex items-start gap-3'>
                            <div className='mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md'>
                                <ArrowRight className='w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform' />
                            </div>
                            <div className='flex-1 min-w-0'>
                                <div className='font-semibold text-sm text-gray-900 mb-1 group-hover:text-blue-700 transition-colors'>
                                    {item.action}
                                </div>
                                <div className='text-xs text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors'>
                                    {item.description}
                                </div>
                            </div>
                            <ChevronRight className='w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1' />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Custom markdown components
const MarkdownComponents = {
    h1: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h1 className='text-2xl md:text-3xl font-bold text-gray-900 mb-4 mt-6 pb-2 border-b border-gray-200 first:mt-0' {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h2 className='text-xl md:text-2xl font-semibold text-gray-800 mb-3 mt-5 flex items-center gap-2 first:mt-0' {...props}>
            <Hash className='w-4 h-4 md:w-5 md:h-5 text-blue-500 opacity-50' />
            {children}
        </h2>
    ),
    h3: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h3 className='text-lg md:text-xl font-semibold text-gray-700 mb-2 mt-4 first:mt-0' {...props}>
            {children}
        </h3>
    ),
    h4: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h4 className='text-base md:text-lg font-semibold text-gray-700 mb-2 mt-3 first:mt-0' {...props}>
            {children}
        </h4>
    ),
    p: ({ children, ...props }: React.HTMLProps<HTMLParagraphElement>) => (
        <p className='text-sm md:text-base text-gray-700 leading-relaxed mb-4 last:mb-0' {...props}>
            {children}
        </p>
    ),
    ul: ({ children, ...props }: React.HTMLProps<HTMLUListElement>) => (
        <ul className='space-y-2 mb-4 ml-2 md:ml-4' {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
        <ol className='space-y-2 mb-4 ml-2 md:ml-4 list-decimal list-inside' {...props}>
            {children}
        </ol>
    ),
    li: ({ children, ...props }: React.HTMLProps<HTMLLIElement>) => (
        <li className='flex items-start gap-2 text-sm md:text-base text-gray-700' {...props}>
            <ChevronRight className='w-3 h-3 md:w-4 md:h-4 text-blue-500 mt-0.5 flex-shrink-0' />
            <span className='flex-1'>{children}</span>
        </li>
    ),
    blockquote: ({ children, ...props }: React.HTMLProps<HTMLQuoteElement>) => (
        <blockquote className='border-l-4 border-blue-500 bg-blue-50 pl-3 md:pl-4 py-2 md:py-3 pr-3 md:pr-4 mb-4 rounded-r-lg' {...props}>
            <div className='flex gap-2'>
                <Quote className='w-4 h-4 md:w-5 md:h-5 text-blue-600 opacity-50 flex-shrink-0 mt-1' />
                <div className='text-sm md:text-base text-gray-700 italic flex-1'>{children}</div>
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
                <code className='px-1.5 py-0.5 bg-gray-100 text-purple-600 rounded text-xs md:text-sm font-mono' {...props}>
                    {children}
                </code>
            );
        }

        return (
            <>
                <div className='relative group mb-4 not-prose'>
                    <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10'>
                        <button
                            onClick={handleCopy}
                            className='p-1.5 md:p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors'>
                            {copied ? (
                                <Check className='w-3 h-3 md:w-4 md:h-4 text-green-400' />
                            ) : (
                                <Copy className='w-3 h-3 md:w-4 md:h-4 text-gray-400' />
                            )}
                        </button>
                    </div>
                    <div className='bg-gray-900 rounded-lg overflow-hidden'>
                        <div className='flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gray-800 border-b border-gray-700'>
                            <FileCode className='w-3 h-3 md:w-4 md:h-4 text-gray-400' />
                            <span className='text-xs text-gray-400 font-mono'>
                                {className?.replace('language-', '') || 'code'}
                            </span>
                        </div>
                        <pre className='p-3 md:p-4 overflow-x-auto'>
                            <code className='text-xs md:text-sm font-mono text-gray-300' {...props}>
                                {children}
                            </code>
                        </pre>
                    </div>
                </div>
            </>
        );
    },
    pre: ({ children }: React.HTMLProps<HTMLPreElement>) => <>{children}</>,
    a: ({ children, href, ...props }: React.HTMLProps<HTMLAnchorElement>) => (
        <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors break-words'
            {...props}>
            {children}
        </a>
    ),
    table: ({ children, ...props }: React.HTMLProps<HTMLTableElement>) => (
        <div className='overflow-x-auto mb-4 -mx-2 md:mx-0'>
            <table className='min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg' {...props}>
                {children}
            </table>
        </div>
    ),
    thead: ({ children, ...props }: React.HTMLProps<HTMLTableSectionElement>) => (
        <thead className='bg-gray-50' {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <th className='px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider' {...props}>
            {children}
        </th>
    ),
    td: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <td className='px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-700 border-t border-gray-100' {...props}>
            {children}
        </td>
    ),
    hr: () => <hr className='my-4 md:my-6 border-gray-200' />,
    strong: ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
        <strong className='font-semibold text-gray-900' {...props}>{children}</strong>
    ),
    em: ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
        <em className='italic text-gray-700' {...props}>{children}</em>
    ),
};

export default function ChatPage() {
    const router = useRouter();
    const { selectedDocument, sendChatMessage, agentStates } = useAgentStore();
    const [message, setMessage] = useState('');
    const [frameworkId, setFrameworkId] = useState<'GDPR' | 'SOC2' | 'HIPAA'>('GDPR');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isFrameworkDropdownOpen, setIsFrameworkDropdownOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const frameworkDropdownRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [message]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (frameworkDropdownRef.current && !frameworkDropdownRef.current.contains(event.target as Node)) {
                setIsFrameworkDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleActionClick = (action: string) => {
        setMessage(action);
        textareaRef.current?.focus();
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!message.trim() || !selectedDocument || agentStates.chat.loading) return;

        const userMessage = message.trim();
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setMessage('');

        setMessages((prev) => [...prev, { role: 'assistant', content: '', isLoading: true }]);

        const response = await sendChatMessage(userMessage, {
            document_id: selectedDocument.document_id,
            framework_id: frameworkId,
        });

        setMessages((prev) => {
            const messagesWithoutLoading = prev.filter((msg) => !msg.isLoading);

            if (response) {
                const assistantMessage = response.summarised_markdown || 'No response from agent';
                return [
                    ...messagesWithoutLoading,
                    {
                        role: 'assistant' as const,
                        content: assistantMessage,
                        suggestedActions: response.suggested_next_actions || [],
                    },
                ];
            } else {
                return [
                    ...messagesWithoutLoading,
                    {
                        role: 'assistant' as const,
                        content: agentStates.chat.error || '❌ Failed to get response. Please try again.',
                    },
                ];
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!selectedDocument) {
        return null;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Messages */}
            <div className="flex flex-col flex-1 min-h-0">
                {/* Document Info & Framework Selector Bar */}
                <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
                    <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
                            </div>
                            <div className="truncate flex-1">
                                <h2 className="text-base md:text-lg font-bold text-gray-900 truncate flex items-center gap-2">
                                    {selectedDocument.file_name}
                                    <div className="relative">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                                    </div>
                                </h2>
                                <p className="text-xs text-gray-500">Document under analysis</p>
                            </div>
                        </div>

                        {/* Framework Selector */}
                        <div className="relative" ref={frameworkDropdownRef}>
                            <button
                                onClick={() => setIsFrameworkDropdownOpen(!isFrameworkDropdownOpen)}
                                className="relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-xl opacity-75 blur group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-3 px-5 py-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20">
                                    <Shield className="w-4 h-4 text-purple-200 flex-shrink-0" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-white/90 whitespace-nowrap">Framework:</span>
                                        <span className="text-sm font-bold text-white">{frameworkId}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-white/90 transition-transform duration-300 ${isFrameworkDropdownOpen ? 'rotate-180' : ''}`} />
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0"></div>
                                </div>
                            </button>

                            {/* Custom Dropdown Menu */}
                            {isFrameworkDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fade-in">
                                    {(['GDPR', 'SOC2', 'HIPAA'] as const).map((framework) => (
                                        <button
                                            key={framework}
                                            onClick={() => {
                                                setFrameworkId(framework);
                                                setIsFrameworkDropdownOpen(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-3 group ${frameworkId === framework
                                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                                                    : 'hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 text-gray-700'
                                                }`}
                                        >
                                            <Shield className={`w-4 h-4 flex-shrink-0 ${frameworkId === framework ? 'text-white' : 'text-purple-600'
                                                }`} />
                                            <div className="flex-1">
                                                <div className={`font-semibold text-sm ${frameworkId === framework ? 'text-white' : 'text-gray-900'
                                                    }`}>
                                                    {framework}
                                                </div>
                                                <div className={`text-xs ${frameworkId === framework ? 'text-purple-100' : 'text-gray-500'
                                                    }`}>
                                                    {framework === 'GDPR' && 'General Data Protection'}
                                                    {framework === 'SOC2' && 'Security & Compliance'}
                                                    {framework === 'HIPAA' && 'Healthcare Privacy'}
                                                </div>
                                            </div>
                                            {frameworkId === framework && (
                                                <Check className="w-5 h-5 text-white flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-6"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 transparent',
                    }}
                >
                    <div className="max-w-4xl mx-auto space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                                        <ShieldCheck className="w-10 h-10 text-white" />
                                    </div>
                                    {/* Scanning rings animation */}
                                    <div className="absolute inset-0 rounded-3xl border-4 border-blue-400 animate-ping opacity-30" />
                                    <div className="absolute inset-0 rounded-3xl border-4 border-indigo-400 animate-ping opacity-20" style={{ animationDelay: '0.5s' }} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    Start Your Analysis
                                </h2>
                                <p className="text-gray-600 max-w-md">
                                    Ask questions about <span className="font-semibold text-blue-600">{selectedDocument.file_name}</span> to get AI-powered compliance insights
                                </p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                        {msg.role === 'user' ? (
                                            <div className="max-w-[80%] sm:max-w-[70%]">
                                                <div className="inline-block px-5 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-full">
                                                {msg.isLoading ? (
                                                    <LoadingMessage />
                                                ) : (
                                                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                                                        <div className="prose prose-slate max-w-none">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                                                components={MarkdownComponents}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                                            <ActionSuggestions
                                                                actions={msg.suggestedActions}
                                                                onActionClick={handleActionClick}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 border-t border-gray-200 bg-white/90 backdrop-blur-xl p-4 shadow-lg">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-end gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={textareaRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask a question about compliance..."
                                    rows={1}
                                    disabled={agentStates.chat.loading}
                                    className="w-full resize-none border-2 border-gray-200 rounded-2xl px-4 py-3 pr-12 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                                    style={{ maxHeight: '150px' }}
                                />
                                {message.trim() && (
                                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                                        {message.length}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!message.trim() || agentStates.chat.loading}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                            >
                                {agentStates.chat.loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                                <span className="hidden sm:inline">Send</span>
                            </button>
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-[10px]">Enter</kbd>
                                to send
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-[10px]">Shift</kbd>
                                +
                                <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-[10px]">Enter</kbd>
                                for new line
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}