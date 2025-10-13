// filePath: policy_mate_ui/src/components/Dashboard/index.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, AlertCircle, CheckCircle, BarChart3, ListTodo } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Types
interface AgentResponse {
    response_type: 'conversation' | 'document_list' | 'action_items' | 'comprehensive_analysis' | 'dashboard_data';
    content: {
        markdown: string;
        metadata?: {
            session_id: string;
            timestamp?: string;
        };
    };
    actions?: ActionItem[];
    data?: any;
    ui_hints?: any;
}

interface ActionItem {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed';
    due_date?: string;
    link?: string;
    category: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    response?: AgentResponse;
    timestamp: Date;
}

interface Document {
    file_id: string;
    file_name: string;
    formatted_size: string;
    formatted_date: string;
    status_label: string;
    status_color: string;
    status_emoji: string;
}

const ChatComponent = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Mock API call - replace with actual endpoint
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer YOUR_TOKEN_HERE`
                },
                body: JSON.stringify({
                    prompt: input,
                    session_id: sessionId || undefined,
                    new_conversation: !sessionId
                })
            });

            const data = await response.json();

            if (data.session_id) {
                setSessionId(data.session_id);
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response?.content?.markdown || 'Sorry, I encountered an error.',
                response: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Policy Mate Assistant</h1>
                            <p className="text-sm text-gray-600">Your compliance copilot</p>
                        </div>
                    </div>
                    {sessionId && (
                        <button
                            onClick={() => {
                                setSessionId('');
                                setMessages([]);
                            }}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            New Conversation
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-10 h-10 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Policy Mate</h2>
                            <p className="text-gray-600 mb-6">Ask me anything about your compliance documents</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                                {[
                                    'Show my documents',
                                    'Check GDPR compliance',
                                    'What are my action items?'
                                ].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setInput(suggestion)}
                                        className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
                                    >
                                        <p className="text-sm text-gray-700">{suggestion}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(message => (
                        <MessageBubble key={message.id} message={message} />
                    ))}

                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span className="text-sm text-gray-600">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
                <div className="max-w-5xl mx-auto">
                    <div className="flex gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask about compliance, documents, or action items..."
                            rows={1}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            style={{ minHeight: '50px', maxHeight: '150px' }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Send className="w-5 h-5" />
                            <span className="font-medium">Send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MessageBubble = ({ message }: { message: Message }) => {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-4 py-3 max-w-2xl shadow-md">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 space-y-4">
                <ResponseRenderer response={message.response} />
            </div>
        </div>
    );
};

const ResponseRenderer = ({ response }: { response?: AgentResponse }) => {
    if (!response) return null;

    return (
        <div className="space-y-4">
            {/* Main Content */}
            <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-200">
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{response.content.markdown}</ReactMarkdown>
                </div>
            </div>

            {/* Response Type Specific Rendering */}
            {response.response_type === 'document_list' && response.data?.documents && (
                <DocumentListView documents={response.data.documents} />
            )}

            {response.response_type === 'action_items' && response.actions && (
                <ActionItemsView actions={response.actions} />
            )}

            {response.response_type === 'comprehensive_analysis' && response.data && (
                <ComprehensiveAnalysisView data={response.data} />
            )}

            {response.response_type === 'dashboard_data' && response.data && (
                <DashboardView data={response.data} />
            )}

            {/* Action Items (if present in any response) */}
            {response.actions && response.response_type !== 'action_items' && (
                <ActionItemsView actions={response.actions} />
            )}
        </div>
    );
};

const DocumentListView = ({ documents }: { documents: Document[] }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Your Documents ({documents.length})
                </h3>
            </div>
            <div className="divide-y divide-gray-200">
                {documents.map(doc => (
                    <div key={doc.file_id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-800 truncate">{doc.file_name}</h4>
                                    <p className="text-sm text-gray-600">
                                        {doc.formatted_size} • {doc.formatted_date}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${doc.status_color === 'green' ? 'bg-green-100 text-green-700' :
                                    doc.status_color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                        doc.status_color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {doc.status_emoji} {doc.status_label}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ActionItemsView = ({ actions }: { actions: ActionItem[] }) => {
    const priorityConfig = {
        high: { color: 'red', icon: AlertCircle },
        medium: { color: 'yellow', icon: AlertCircle },
        low: { color: 'blue', icon: CheckCircle }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-orange-600" />
                    Action Items ({actions.length})
                </h3>
            </div>
            <div className="divide-y divide-gray-200">
                {actions.map(action => {
                    const config = priorityConfig[action.priority];
                    const Icon = config.icon;

                    return (
                        <div key={action.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color === 'red' ? 'bg-red-100' :
                                    config.color === 'yellow' ? 'bg-yellow-100' :
                                        'bg-blue-100'
                                    }`}>
                                    <Icon className={`w-5 h-5 ${config.color === 'red' ? 'text-red-600' :
                                        config.color === 'yellow' ? 'text-yellow-600' :
                                            'text-blue-600'
                                        }`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-medium text-gray-800">{action.title}</h4>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${config.color === 'red' ? 'bg-red-100 text-red-700' :
                                            config.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {action.priority}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                                    {action.link && (
                                        <a
                                            href={action.link}
                                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
                                        >
                                            View Details →
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ComprehensiveAnalysisView = ({ data }: { data: any }) => {
    const stats = data.statistics || {};

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Analysis Statistics
                </h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                        <div className="text-3xl font-bold text-green-600">{stats.compliant || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Compliant</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                        <div className="text-3xl font-bold text-yellow-600">{stats.partial || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Partial</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-xl">
                        <div className="text-3xl font-bold text-red-600">{stats.non_compliant || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Non-Compliant</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <div className="text-3xl font-bold text-gray-600">{stats.not_addressed || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Not Addressed</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DashboardView = ({ data }: { data: any }) => {
    const metrics = data.metrics || {};

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Pipeline Overview
                </h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <div className="text-3xl font-bold text-blue-600">{metrics.total_documents || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Total Documents</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                        <div className="text-3xl font-bold text-green-600">{metrics.completed || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                        <div className="text-3xl font-bold text-yellow-600">{metrics.in_progress || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">In Progress</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-xl">
                        <div className="text-3xl font-bold text-red-600">{metrics.failed || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">Failed</div>
                    </div>
                </div>
                {metrics.success_rate && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Success Rate</span>
                            <span className="text-2xl font-bold text-green-600">{metrics.success_rate.toFixed(1)}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatComponent;