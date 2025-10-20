'use client';
import React, { JSX, useState, useEffect } from 'react';

type LayerType = 'overview' | 'user' | 'security' | 'ai' | 'data' | 'flow';

interface ComponentBoxProps {
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    details?: string;
    connections?: string[];
    id?: string;
    isHighlighted?: boolean;
}

interface AWSBoxProps {
    title: string;
    subtitle: string;
    icon: string;
    onClick?: () => void;
    details?: string;
    id?: string;
    isHighlighted?: boolean;
}

interface ArrowProps {
    from: { x: number; y: number };
    to: { x: number; y: number };
    label?: string;
    dashed?: boolean;
    animated?: boolean;
}

interface LayerInfo {
    [key: string]: string;
}

interface DetailPanel {
    title: string;
    description: string;
    technical: string[];
    connections: string[];
}

const ArchitectureDiagram: React.FC = () => {
    const [selectedLayer, setSelectedLayer] = useState<LayerType>('overview');
    const [zoom, setZoom] = useState<number>(1);
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
    const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);
    const [showConnections, setShowConnections] = useState<boolean>(false);

    const layers: LayerInfo = {
        overview: 'Full Architecture Overview',
        user: 'User Experience Layer',
        security: 'Security & API Gateway Layer',
        ai: 'AI Processing & Orchestration Layer',
        data: 'Data & Storage Architecture',
        flow: 'End-to-End User Flow Diagram'
    };

    // Component details database
    const componentDetails: { [key: string]: DetailPanel } = {
        'supervisor-agent': {
            title: 'Supervisor Agent',
            description: 'Routes queries to specialized child agents using the tool-agent pattern',
            technical: [
                'Uses Strands framework',
                'Returns JSON strings',
                'Handles parse_child_agent_response()',
                'Sanitizes smart quotes and Python syntax'
            ],
            connections: ['compliance-agent', 'annotations-agent', 'bedrock']
        },
        'compliance-agent': {
            title: 'Compliance Agent',
            description: 'Analyzes documents against compliance frameworks (GDPR, SOC2, HIPAA)',
            technical: [
                'Tools: compliance_check, comprehensive_check',
                'Uses Claude Haiku for speed',
                'Returns standardized JSON response',
                'Caches results in DynamoDB'
            ],
            connections: ['supervisor-agent', 'dynamodb', 'opensearch']
        },
        'annotations-agent': {
            title: 'Annotations Agent',
            description: 'Manages document annotations, bookmarks, and conversation threads',
            technical: [
                'Tools: CRUD operations on annotations',
                'Manages conversation sessions',
                'Updates bookmark types and comments',
                'Integrates with DynamoDB'
            ],
            connections: ['supervisor-agent', 'dynamodb']
        },
        'cognito': {
            title: 'AWS Cognito',
            description: 'Manages user authentication and authorization with JWT tokens',
            technical: [
                'Issues JWT tokens on login',
                'Tokens stored in sessionStorage',
                'Auto-refresh before expiry',
                'Provides user claims (email, sub, roles)'
            ],
            connections: ['frontend', 'lambda-auth']
        },
        'opensearch': {
            title: 'OpenSearch',
            description: 'Vector and text search with environment-based configuration',
            technical: [
                'Indices: policy-mate-docs, policy-mate-embeddings',
                'KnnVectorQuery for semantic search',
                'TermQuery for exact match',
                'Env: local (Docker), aws, serverless'
            ],
            connections: ['compliance-agent', 'lambda']
        },
        'dynamodb': {
            title: 'DynamoDB',
            description: 'NoSQL database for documents, annotations, and caching',
            technical: [
                'Tables: Documents (PK: file_id)',
                'Annotations (PK: annotation_id)',
                'Analysis Cache (doc_id#framework_id)',
                'Helper: replace_decimals() for JSON'
            ],
            connections: ['lambda', 'compliance-agent', 'annotations-agent']
        },
        's3': {
            title: 'Amazon S3',
            description: 'Document storage with presigned URLs for secure upload',
            technical: [
                'standard-docs/: GDPR, SOC2, HIPAA reference',
                'manual-docs/: Organization documents',
                'Presigned URLs: 15 min expiry',
                'Triggers processing pipeline on upload'
            ],
            connections: ['lambda', 'frontend']
        }
    };

    const handleComponentClick = (id: string) => {
        setSelectedComponent(id);
        setDetailPanel(componentDetails[id] || null);
        setShowConnections(true);
    };

    const handleClosePanel = () => {
        setSelectedComponent(null);
        setDetailPanel(null);
        setShowConnections(false);
    };

    // Animated Arrow component
    const Arrow: React.FC<ArrowProps> = ({ from, to, label, dashed = false, animated = false }) => {
        const [dashOffset, setDashOffset] = useState(0);

        useEffect(() => {
            if (!animated) return;
            const interval = setInterval(() => {
                setDashOffset((prev) => (prev + 1) % 20);
            }, 50);
            return () => clearInterval(interval);
        }, [animated]);

        return (
            <div className="absolute pointer-events-none z-10">
                <svg className="absolute" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" fill={animated ? "#f97316" : "#546e7a"} />
                        </marker>
                        <marker id="arrowhead-highlighted" markerWidth="12" markerHeight="12" refX="10" refY="3" orient="auto">
                            <polygon points="0 0, 12 3, 0 6" fill="#f97316" />
                        </marker>
                    </defs>
                    <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={animated ? "#f97316" : "#546e7a"}
                        strokeWidth={animated ? "3" : "2"}
                        strokeDasharray={dashed ? "5,5" : animated ? "10,5" : "0"}
                        strokeDashoffset={animated ? -dashOffset : 0}
                        markerEnd={animated ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                        className={animated ? "animate-pulse" : ""}
                    />
                </svg>
                {label && (
                    <div
                        className={`absolute px-3 py-1.5 text-xs rounded-lg border shadow-md transition-all ${animated
                            ? "bg-orange-100 border-orange-400 text-orange-900 font-bold"
                            : "bg-white border-gray-300 text-gray-700"
                            }`}
                        style={{
                            left: (from.x + to.x) / 2,
                            top: (from.y + to.y) / 2 - 15,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        {label}
                    </div>
                )}
            </div>
        );
    };

    // Component box with AWS styling
    const ComponentBox: React.FC<ComponentBoxProps> = ({
        title,
        subtitle,
        icon,
        color,
        onClick,
        size = 'md'
    }) => {
        const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
            sm: 'p-3 min-w-32',
            md: 'p-4 min-w-40',
            lg: 'p-5 min-w-48'
        };

        return (
            <div
                onClick={onClick}
                className={`${sizeClasses[size]} bg-white rounded-lg border-2 shadow-md hover:shadow-xl transition-all cursor-pointer ${color}`}
            >
                <div className="flex flex-col items-center text-center">
                    <div className="text-3xl mb-2">{icon}</div>
                    <div className="font-bold text-sm mb-1">{title}</div>
                    <div className="text-xs text-gray-600 italic">{subtitle}</div>
                </div>
            </div>
        );
    };

    // AWS Service box
    const AWSBox: React.FC<AWSBoxProps> = ({ title, subtitle, icon, onClick }) => (
        <div
            onClick={onClick}
            className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg border-2 border-orange-700 shadow-lg hover:shadow-2xl transition-all cursor-pointer min-w-40"
        >
            <div className="flex flex-col items-center text-center">
                <div className="text-3xl mb-2">{icon}</div>
                <div className="font-bold text-sm text-white mb-1">{title}</div>
                <div className="text-xs text-orange-100 italic">{subtitle}</div>
            </div>
        </div>
    );

    const renderUserLayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8">
            <div className="absolute top-4 left-4 bg-orange-100 px-4 py-2 rounded border-2 border-orange-400">
                <span className="text-orange-800 font-bold">👤 User Experience Layer</span>
            </div>

            <div className="flex items-center justify-between h-full pt-16">
                {/* User */}
                <div className="flex flex-col items-center">
                    <ComponentBox
                        title="End User"
                        subtitle="Compliance Officer"
                        icon="🧑‍💼"
                        color="border-blue-400"
                    />
                </div>

                {/* Frontend */}
                <div className="flex flex-col gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                        <div className="text-purple-900 font-bold mb-3 text-sm">💻 Next.js 15 App</div>
                        <div className="space-y-2">
                            <ComponentBox
                                title="App Router"
                                subtitle="Server Components"
                                icon="⚛️"
                                color="border-purple-400"
                                size="sm"
                            />
                            <ComponentBox
                                title="Dashboard"
                                subtitle="Document Manager"
                                icon="📊"
                                color="border-purple-400"
                                size="sm"
                            />
                            <ComponentBox
                                title="PDF Annotator"
                                subtitle="Review Interface"
                                icon="📝"
                                color="border-purple-400"
                                size="sm"
                            />
                            <ComponentBox
                                title="Chat Interface"
                                subtitle="AI Assistant"
                                icon="💬"
                                color="border-purple-400"
                                size="sm"
                            />
                        </div>
                    </div>
                </div>

                {/* State Management */}
                <div className="flex flex-col gap-3">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                        <div className="text-green-900 font-bold mb-3 text-sm">🔄 Zustand State</div>
                        <div className="space-y-2">
                            <ComponentBox title="authStore" subtitle="sessionStorage" icon="🔐" color="border-green-400" size="sm" />
                            <ComponentBox title="JWT Tokens" subtitle="Cognito Auth" icon="🎫" color="border-green-400" size="sm" />
                            <ComponentBox title="agentStore" subtitle="Ephemeral" icon="🧠" color="border-green-400" size="sm" />
                            <ComponentBox title="Conversations" subtitle="Agent Chat" icon="💬" color="border-green-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Tools & Libraries */}
                <div className="flex flex-col gap-3">
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                        <div className="text-blue-900 font-bold mb-3 text-sm">🛠️ Tools & Libraries</div>
                        <div className="space-y-2">
                            <ComponentBox title="Biome" subtitle="Lint & Format" icon="🔧" color="border-blue-400" size="sm" />
                            <ComponentBox title="Tailwind CSS v4" subtitle="Styling" icon="🎨" color="border-blue-400" size="sm" />
                            <ComponentBox title="react-markdown" subtitle="MD Renderer" icon="📄" color="border-blue-400" size="sm" />
                            <ComponentBox title="pnpm 10.18+" subtitle="Package Mgr" icon="📦" color="border-blue-400" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-yellow-50 p-3 rounded border-2 border-yellow-400 text-xs">
                    <div className="font-bold text-yellow-900">Routes without header:</div>
                    <div className="text-yellow-800 font-mono mt-1">
                        /login | /register | /architecture
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSecurityLayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8">
            <div className="absolute top-4 left-4 bg-orange-100 px-4 py-2 rounded border-2 border-orange-400">
                <span className="text-orange-800 font-bold">🔐 Security & API Gateway Layer</span>
            </div>

            <div className="grid grid-cols-4 gap-6 h-full pt-16">
                {/* Frontend Connection */}
                <div className="flex items-center justify-center">
                    <ComponentBox
                        title="Frontend Layer"
                        subtitle="HTTPS Requests"
                        icon="💻"
                        color="border-purple-400"
                    />
                </div>

                {/* Auth */}
                <div className="flex flex-col gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                        <div className="text-green-900 font-bold mb-3 text-sm">🛡️ AWS Cognito Auth</div>
                        <div className="space-y-2">
                            <AWSBox title="Amazon Cognito" subtitle="User Pool" icon="🔐" />
                            <ComponentBox title="User Login" subtitle="JWT Generation" icon="👤" color="border-green-400" size="sm" />
                            <ComponentBox title="Token Storage" subtitle="sessionStorage" icon="💾" color="border-green-400" size="sm" />
                            <ComponentBox title="Auto Refresh" subtitle="Before Expiry" icon="🔄" color="border-green-400" size="sm" />
                            <ComponentBox title="User Claims" subtitle="email, sub, roles" icon="📋" color="border-green-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* API Gateway */}
                <div className="flex flex-col gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                        <div className="text-blue-900 font-bold mb-3 text-sm">🌐 API Gateway</div>
                        <div className="space-y-2">
                            <AWSBox title="API Gateway" subtitle="REST Endpoints" icon="🚪" />
                            <ComponentBox title="CORS Config" subtitle="Allow Origins" icon="🌍" color="border-blue-400" size="sm" />
                            <ComponentBox title="Rate Limiting" subtitle="Throttling" icon="⚡" color="border-blue-400" size="sm" />
                            <ComponentBox title="Authorization" subtitle="Bearer Token" icon="🔒" color="border-blue-400" size="sm" />
                            <ComponentBox title="Request Validation" subtitle="Schema Check" icon="✅" color="border-blue-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Lambda Auth */}
                <div className="flex flex-col gap-4">
                    <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
                        <div className="text-red-900 font-bold mb-3 text-sm">🔒 Lambda Security</div>
                        <div className="space-y-2">
                            <ComponentBox title="@require_cognito_auth" subtitle="Decorator" icon="🎭" color="border-red-400" size="sm" />
                            <ComponentBox title="JWT Validation" subtitle="Verify Token" icon="✓" color="border-red-400" size="sm" />
                            <ComponentBox title="User Claims" subtitle="Extract Data" icon="📄" color="border-red-400" size="sm" />
                            <ComponentBox title="Reject Invalid" subtitle="401 Response" icon="❌" color="border-red-400" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-blue-50 p-3 rounded border-2 border-blue-400 text-xs">
                    <div className="font-bold text-blue-900">Auth Flow:</div>
                    <div className="text-blue-800 mt-1">
                        Login → JWT → sessionStorage → API Call<br />
                        → Bearer Token → Lambda Decorator → Validated
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4">
                <ComponentBox
                    title="Processing Layer"
                    subtitle="Authorized Requests"
                    icon="⚡"
                    color="border-purple-400"
                />
            </div>
        </div>
    );

    const renderAILayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8">
            <div className="absolute top-4 left-4 bg-orange-100 px-4 py-2 rounded border-2 border-orange-400">
                <span className="text-orange-800 font-bold">🧠 AI Processing & Orchestration Layer</span>
            </div>

            <div className="grid grid-cols-4 gap-6 h-full pt-16">
                {/* Lambda Handlers */}
                <div className="flex flex-col gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                        <div className="text-blue-900 font-bold mb-3 text-sm">⚡ Lambda Handlers</div>
                        <div className="space-y-2">
                            <AWSBox title="AWS Lambda" subtitle="Python 3.12" icon="⚡" />
                            <ComponentBox title="agent_v2_handler" subtitle="Main Entry" icon="🚪" color="border-blue-400" size="sm" />
                            <ComponentBox title="file_upload_handler" subtitle="S3 Upload" icon="📤" color="border-blue-400" size="sm" />
                            <ComponentBox title="Auth Decorator" subtitle="@require_cognito_auth" icon="🔒" color="border-blue-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Multi-Agent System */}
                <div className="flex flex-col gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                        <div className="text-green-900 font-bold mb-3 text-sm">🎯 Multi-Agent System</div>
                        <div className="space-y-2">
                            <ComponentBox title="Supervisor Agent" subtitle="Tool-Agent Pattern" icon="👔" color="border-green-400" size="sm" />
                            <div className="text-center text-xs text-gray-600 py-1">↓ Routes to ↓</div>
                            <ComponentBox title="Compliance Agent" subtitle="Doc Analysis" icon="📋" color="border-green-500" size="sm" />
                            <ComponentBox title="Annotations Agent" subtitle="Bookmark Mgmt" icon="📝" color="border-green-500" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Bedrock & Strands */}
                <div className="flex flex-col gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                        <div className="text-purple-900 font-bold mb-3 text-sm">🤖 AI Infrastructure</div>
                        <div className="space-y-2">
                            <AWSBox title="Amazon Bedrock" subtitle="Claude Models" icon="🤖" />
                            <ComponentBox title="Claude Haiku" subtitle="Fast & Cheap" icon="⚡" color="border-purple-400" size="sm" />
                            <ComponentBox title="Claude Sonnet" subtitle="Complex Analysis" icon="🧠" color="border-purple-400" size="sm" />
                            <ComponentBox title="Strands Framework" subtitle="@tool Decorator" icon="🔧" color="border-purple-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Agent Tools */}
                <div className="flex flex-col gap-4">
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-300">
                        <div className="text-pink-900 font-bold mb-3 text-sm">🔧 Agent Tools</div>
                        <div className="space-y-2">
                            <ComponentBox title="compliance_check" subtitle="Text Analysis" icon="✅" color="border-pink-400" size="sm" />
                            <ComponentBox title="comprehensive_check" subtitle="Full Doc Scan" icon="📄" color="border-pink-400" size="sm" />
                            <ComponentBox title="annotation_tools" subtitle="CRUD Ops" icon="📝" color="border-pink-400" size="sm" />
                            <ComponentBox title="doc_status" subtitle="Status Check" icon="📊" color="border-pink-400" size="sm" />
                            <ComponentBox title="show_doc" subtitle="List Docs" icon="📚" color="border-pink-400" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-yellow-50 p-3 rounded border-2 border-yellow-400 text-xs">
                    <div className="font-bold text-yellow-900">Response Format (JSON):</div>
                    <div className="text-yellow-800 font-mono mt-1">
                        session_id | error_message | tool_payload<br />
                        summarised_markdown | suggested_next_actions
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4">
                <ComponentBox
                    title="Data Storage"
                    subtitle="Results"
                    icon="💾"
                    color="border-purple-400"
                />
            </div>
        </div>
    );

    const renderDataLayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8">
            <div className="absolute top-4 left-4 bg-orange-100 px-4 py-2 rounded border-2 border-orange-400">
                <span className="text-orange-800 font-bold">💾 Data & Storage Architecture</span>
            </div>

            <div className="grid grid-cols-4 gap-6 h-full pt-16">
                {/* External Inputs */}
                <div className="flex flex-col gap-6 items-center justify-center">
                    <ComponentBox title="AI Processing" subtitle="Stores Data" icon="🧠" color="border-purple-400" />
                    <ComponentBox title="User Interface" subtitle="Queries Data" icon="💻" color="border-purple-400" />
                </div>

                {/* File Storage */}
                <div className="flex flex-col gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                        <div className="text-blue-900 font-bold mb-3 text-sm">📦 S3 File Storage</div>
                        <div className="space-y-2">
                            <AWSBox title="Amazon S3" subtitle="Document Repo" icon="📦" />
                            <ComponentBox title="standard-docs/" subtitle="GDPR/SOC2/HIPAA" icon="📋" color="border-blue-400" size="sm" />
                            <ComponentBox title="public/" subtitle="Reference Docs" icon="🌐" color="border-blue-400" size="sm" />
                            <ComponentBox title="manual-docs/" subtitle="Org Documents" icon="🗂️" color="border-blue-400" size="sm" />
                            <ComponentBox title="Presigned URLs" subtitle="15 min expiry" icon="🔗" color="border-blue-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Database */}
                <div className="flex flex-col gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                        <div className="text-green-900 font-bold mb-3 text-sm">🗄️ DynamoDB Tables</div>
                        <div className="space-y-2">
                            <AWSBox title="DynamoDB" subtitle="NoSQL Database" icon="🗄️" />
                            <ComponentBox title="Documents" subtitle="PK: file_id" icon="📄" color="border-green-400" size="sm" />
                            <ComponentBox title="Annotations" subtitle="PK: annotation_id" icon="🔖" color="border-green-400" size="sm" />
                            <ComponentBox title="Analysis Cache" subtitle="doc_id#framework_id" icon="💾" color="border-green-400" size="sm" />
                            <ComponentBox title="replace_decimals()" subtitle="JSON Helper" icon="🔧" color="border-green-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-4">
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-300">
                        <div className="text-pink-900 font-bold mb-3 text-sm">🔍 OpenSearch</div>
                        <div className="space-y-2">
                            <AWSBox title="OpenSearch" subtitle="Env-Based Config" icon="🔍" />
                            <ComponentBox title="policy-mate-docs" subtitle="Standard Docs" icon="📚" color="border-pink-400" size="sm" />
                            <ComponentBox title="policy-mate-embeddings" subtitle="Vector Search" icon="🎯" color="border-pink-400" size="sm" />
                            <ComponentBox title="KnnVectorQuery" subtitle="Semantic" icon="🧠" color="border-pink-400" size="sm" />
                            <ComponentBox title="TermQuery" subtitle="Exact Match" icon="🎯" color="border-pink-400" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-blue-50 p-3 rounded border-2 border-blue-400 text-xs">
                    <div className="font-bold text-blue-900">Environment Switching:</div>
                    <div className="text-blue-800 font-mono mt-1">
                        OPEN_SEARCH_ENV=local (Docker)<br />
                        OPEN_SEARCH_ENV=aws (Production)<br />
                        OPEN_SEARCH_ENV=serverless (Serverless)
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFlowDiagram = (): JSX.Element => (
        <div className="relative w-full h-full p-8 overflow-y-auto">
            <div className="absolute top-4 left-4 bg-orange-100 px-4 py-2 rounded border-2 border-orange-400 z-20">
                <span className="text-orange-800 font-bold">🔄 End-to-End User Flow</span>
            </div>

            <div className="pt-16 pb-8 space-y-8 min-h-[2000px]">
                {/* Phase 1: Entry & Authentication */}
                <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
                    <h3 className="text-xl font-bold text-blue-900 mb-4">Phase 1: Entry & Authentication</h3>
                    <div className="grid grid-cols-5 gap-4 items-center">
                        <ComponentBox title="User" subtitle="Accesses App" icon="👤" color="border-blue-400" />
                        <div className="text-2xl text-center">→</div>
                        <ComponentBox title="Next.js App" subtitle="Vercel Hosted" icon="▲" color="border-purple-400" />
                        <div className="text-2xl text-center">→</div>
                        <AWSBox title="AWS Cognito" subtitle="Auth Service" icon="🔐" />
                    </div>
                    <div className="mt-4 text-sm text-blue-800 bg-blue-100 p-3 rounded">
                        User registers → Email verification → Dashboard access granted
                    </div>
                </div>

                {/* Arrow Down */}
                <div className="text-center text-4xl text-gray-400">↓</div>

                {/* Phase 2: Dashboard Options */}
                <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
                    <h3 className="text-xl font-bold text-green-900 mb-4">Phase 2: Dashboard - File Selection</h3>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <ComponentBox title="Dashboard" subtitle="Landing Page" icon="📊" color="border-green-400" />
                            <div className="text-center text-2xl">↓</div>
                            <div className="bg-green-100 p-4 rounded border border-green-400">
                                <div className="font-bold text-green-900 mb-2">User Choice:</div>
                                <div className="text-sm text-green-800">
                                    1. Upload New File<br />
                                    2. Pick Existing File
                                </div>
                            </div>
                        </div>

                        {/* Upload Path */}
                        <div className="space-y-3 border-l-2 border-green-300 pl-4">
                            <div className="font-bold text-green-900">Path A: Upload New</div>
                            <ComponentBox title="Request Upload" subtitle="File Metadata" icon="📤" color="border-green-500" size="sm" />
                            <div className="text-xs text-center text-gray-600">↓ metadata: type, size, hash</div>
                            <ComponentBox title="file_upload_handler" subtitle="Lambda Backend" icon="⚡" color="border-orange-400" size="sm" />
                        </div>

                        {/* Existing Path */}
                        <div className="space-y-3 border-l-2 border-green-300 pl-4">
                            <div className="font-bold text-green-900">Path B: Existing File</div>
                            <ComponentBox title="Query Files" subtitle="User's Documents" icon="📂" color="border-green-500" size="sm" />
                            <div className="text-xs text-center text-gray-600">↓ from DynamoDB</div>
                            <ComponentBox title="Files Table" subtitle="User Documents" icon="🗄️" color="border-green-600" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Arrow Down */}
                <div className="text-center text-4xl text-gray-400">↓</div>

                {/* Phase 3: Upload Workflow Detail */}
                <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-300">
                    <h3 className="text-xl font-bold text-purple-900 mb-4">Phase 3: File Upload Workflow (Path A Detail)</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-5 gap-3 items-center">
                            <ComponentBox title="Check Hash" subtitle="Deduplication" icon="🔍" color="border-purple-400" size="sm" />
                            <div className="text-2xl text-center">→</div>
                            <AWSBox title="DynamoDB" subtitle="Files Table" icon="🗄️" />
                            <div className="text-2xl text-center">?</div>
                            <div className="bg-purple-100 p-3 rounded text-xs border border-purple-400">
                                <div className="font-bold mb-1">If exists:</div>
                                Return file details<br />
                                <div className="font-bold mt-2 mb-1">If not:</div>
                                Generate presigned URL
                            </div>
                        </div>

                        <div className="text-center text-2xl text-gray-400">↓ if new file</div>

                        <div className="grid grid-cols-5 gap-3 items-center">
                            <ComponentBox title="Presigned URL" subtitle="15 min expiry" icon="🔗" color="border-purple-400" size="sm" />
                            <div className="text-2xl text-center">→</div>
                            <ComponentBox title="Frontend" subtitle="Direct Upload" icon="💻" color="border-purple-500" size="sm" />
                            <div className="text-2xl text-center">→</div>
                            <AWSBox title="S3 Bucket" subtitle="Binary Storage" icon="📦" />
                        </div>

                        <div className="text-center text-2xl text-gray-400">↓</div>

                        <div className="grid grid-cols-3 gap-4">
                            <ComponentBox title="Upload Confirm" subtitle="Handler" icon="✅" color="border-purple-400" size="sm" />
                            <ComponentBox title="Create Record" subtitle="DynamoDB" icon="📝" color="border-purple-500" size="sm" />
                            <ComponentBox title="Response" subtitle="Success" icon="🎉" color="border-purple-600" size="sm" />
                        </div>

                        <div className="bg-yellow-50 p-4 rounded border-2 border-yellow-400 opacity-60 mt-4">
                            <div className="font-bold text-yellow-900 mb-2">🚧 Future Implementation (Not in MVP)</div>
                            <div className="text-sm text-yellow-800">
                                SQS Job → Auto-analysis in background → Populate inferred table → Background processing pipeline
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrow Down */}
                <div className="text-center text-4xl text-gray-400">↓</div>

                {/* Phase 4: File Interaction */}
                <div className="bg-pink-50 p-6 rounded-lg border-2 border-pink-300">
                    <h3 className="text-xl font-bold text-pink-900 mb-4">Phase 4: File Interaction Modes</h3>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Live Editor */}
                        <div className="bg-pink-100 p-4 rounded border-2 border-pink-400">
                            <div className="font-bold text-pink-900 mb-3">📝 Live Editor Mode</div>
                            <div className="space-y-2">
                                <ComponentBox title="PDF Viewer" subtitle="react-pdf + pdfWorker" icon="📄" color="border-pink-400" size="sm" />
                                <ComponentBox title="Highlight Text" subtitle="User Selection" icon="🖍️" color="border-pink-500" size="sm" />
                                <ComponentBox title="AI Recommendations" subtitle="Contextual" icon="🤖" color="border-pink-600" size="sm" />
                                <div className="text-xs text-pink-800 mt-2">
                                    Note: Solved Next.js 16 pdfWorker SSR issues
                                </div>
                            </div>
                        </div>

                        {/* Chat Window */}
                        <div className="bg-pink-100 p-4 rounded border-2 border-pink-400">
                            <div className="font-bold text-pink-900 mb-3">💬 Chat Window Mode</div>
                            <div className="space-y-2">
                                <ComponentBox title="Chat Interface" subtitle="Document Q&A" icon="💭" color="border-pink-400" size="sm" />
                                <ComponentBox title="Query Document" subtitle="Ask Questions" icon="❓" color="border-pink-500" size="sm" />
                                <ComponentBox title="AI Response" subtitle="Context-Aware" icon="🧠" color="border-pink-600" size="sm" />
                                <div className="text-xs text-pink-800 mt-2">
                                    User can ask details about specific documents
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrow Down */}
                <div className="text-center text-4xl text-gray-400">↓</div>

                {/* Phase 5: Backend Agent Architecture */}
                <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-300">
                    <h3 className="text-xl font-bold text-indigo-900 mb-4">Phase 5: Backend - Agent Architecture</h3>

                    <div className="space-y-6">
                        {/* API Layer */}
                        <div className="bg-indigo-100 p-4 rounded border-2 border-indigo-400">
                            <div className="font-bold text-indigo-900 mb-3">API Gateway Layer (CORS Enabled)</div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <ComponentBox title="agent_v2_handler" subtitle="Compliance Agent" icon="⚡" color="border-indigo-400" size="sm" />
                                    <div className="text-xs text-indigo-800">Cognito ID Token Auth</div>
                                    <div className="text-xs text-indigo-700">Direct Frontend ↔ Lambda</div>
                                </div>
                                <div className="space-y-2">
                                    <ComponentBox title="annotations_handler" subtitle="Annotation Agent" icon="⚡" color="border-indigo-500" size="sm" />
                                    <div className="text-xs text-indigo-800">Cognito ID Token Auth</div>
                                    <div className="text-xs text-indigo-700">Frontend ↔ Next API ↔ Lambda</div>
                                </div>
                                <div className="space-y-2 opacity-50">
                                    <ComponentBox title="agent_handler" subtitle="V1 Agent (Deprecated)" icon="⚡" color="border-gray-400" size="sm" />
                                    <div className="text-xs text-gray-600">AWS Bedrock Agent UI</div>
                                    <div className="text-xs text-gray-500">Not in use - too verbose</div>
                                </div>
                            </div>
                        </div>

                        {/* Strands Agents */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Compliance Agent */}
                            <div className="bg-green-100 p-4 rounded border-2 border-green-400">
                                <div className="font-bold text-green-900 mb-3">📋 Compliance Agent</div>
                                <div className="space-y-2 text-xs">
                                    <div className="bg-green-200 p-2 rounded">
                                        <div className="font-bold">list_user_docs</div>
                                        <div>Query files table via file_id</div>
                                    </div>
                                    <div className="bg-green-200 p-2 rounded">
                                        <div className="font-bold">doc_status</div>
                                        <div>Check stages: init → upload → analyzed</div>
                                    </div>
                                    <div className="bg-green-200 p-2 rounded">
                                        <div className="font-bold">comprehensive_analysis</div>
                                        <div>Chunk docs → Semantic analysis → Cache in DynamoDB</div>
                                        <div className="mt-1 italic">Models: Haiku 3 / Claude 4.5</div>
                                    </div>
                                    <div className="bg-green-200 p-2 rounded">
                                        <div className="font-bold">phrase_wise_analysis</div>
                                        <div>Manual review → Specific phrase → Framework/Control</div>
                                    </div>
                                </div>
                            </div>

                            {/* Annotations Agent */}
                            <div className="bg-blue-100 p-4 rounded border-2 border-blue-400">
                                <div className="font-bold text-blue-900 mb-3">📝 Annotations Agent</div>
                                <div className="space-y-2 text-xs">
                                    <div className="bg-blue-200 p-2 rounded">
                                        <div className="font-bold">CRUD Operations</div>
                                        <div>Create, Read, Update, Delete annotations</div>
                                    </div>
                                    <div className="bg-blue-200 p-2 rounded">
                                        <div className="font-bold">Bookmark Management</div>
                                        <div>Type updates, comments, sessions</div>
                                    </div>
                                    <div className="bg-blue-200 p-2 rounded">
                                        <div className="font-bold">Conversation Threads</div>
                                        <div>Manage user document discussions</div>
                                    </div>
                                    <div className="bg-blue-200 p-2 rounded">
                                        <div className="font-bold">DynamoDB Integration</div>
                                        <div>Direct table operations</div>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-blue-800 italic">
                                    User-friendly annotation operations
                                </div>
                            </div>

                            {/* Supervisor Agent */}
                            <div className="bg-gray-100 p-4 rounded border-2 border-gray-400 opacity-50">
                                <div className="font-bold text-gray-900 mb-3">👔 Supervisor Agent (Inactive)</div>
                                <div className="space-y-2 text-xs">
                                    <div className="bg-gray-200 p-2 rounded">
                                        <div className="font-bold">Intent: Route Requests</div>
                                        <div>Redirect to appropriate sub-agent</div>
                                    </div>
                                    <div className="bg-gray-200 p-2 rounded">
                                        <div className="font-bold">Status: Not in MVP</div>
                                        <div>Misconfigurations & inaccuracies</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bedrock Integration */}
                        <div className="bg-purple-100 p-4 rounded border-2 border-purple-400 mt-4">
                            <div className="font-bold text-purple-900 mb-3">🤖 AI Foundation: Strands Framework + AWS Bedrock</div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="bg-purple-200 p-3 rounded">
                                    <div className="font-bold mb-1">Strands Framework</div>
                                    <div>@tool decorator pattern</div>
                                    <div>Agent orchestration</div>
                                </div>
                                <div className="bg-purple-200 p-3 rounded">
                                    <div className="font-bold mb-1">AWS Bedrock</div>
                                    <div>Claude model access</div>
                                    <div>Haiku 3 & Sonnet 4.5</div>
                                </div>
                                <div className="bg-purple-200 p-3 rounded">
                                    <div className="font-bold mb-1">Evolution</div>
                                    <div>Started: Manual Bedrock UI</div>
                                    <div>Moved: Strands for scalability</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrow Down */}
                <div className="text-center text-4xl text-gray-400">↓</div>

                {/* Phase 6: Data Storage Integration */}
                <div className="bg-teal-50 p-6 rounded-lg border-2 border-teal-300">
                    <h3 className="text-xl font-bold text-teal-900 mb-4">Phase 6: Data Storage & Retrieval</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {/* DynamoDB */}
                        <div className="bg-teal-100 p-4 rounded border-2 border-teal-400">
                            <AWSBox title="DynamoDB" subtitle="NoSQL Storage" icon="🗄️" />
                            <div className="mt-3 space-y-2 text-xs">
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">Files Table</div>
                                    <div>PK: file_id, metadata, status</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">Annotations Table</div>
                                    <div>PK: annotation_id, bookmarks</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">Analysis Cache</div>
                                    <div>doc_id#framework_id composite</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">User Files Table</div>
                                    <div>User document associations</div>
                                </div>
                            </div>
                        </div>

                        {/* S3 */}
                        <div className="bg-teal-100 p-4 rounded border-2 border-teal-400">
                            <AWSBox title="Amazon S3" subtitle="Object Storage" icon="📦" />
                            <div className="mt-3 space-y-2 text-xs">
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">standard-docs/</div>
                                    <div>GDPR, SOC2, HIPAA references</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">public/</div>
                                    <div>Public reference documents</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">manual-docs/</div>
                                    <div>User organization documents</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">Binary Storage</div>
                                    <div>Direct file upload via presigned URLs</div>
                                </div>
                            </div>
                        </div>

                        {/* OpenSearch */}
                        <div className="bg-teal-100 p-4 rounded border-2 border-teal-400">
                            <AWSBox title="OpenSearch" subtitle="Vector Search" icon="🔍" />
                            <div className="mt-3 space-y-2 text-xs">
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">policy-mate-docs</div>
                                    <div>Standard document index</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">policy-mate-embeddings</div>
                                    <div>Vector semantic search</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">Environment Configs</div>
                                    <div>local (Docker) | aws | serverless</div>
                                </div>
                                <div className="bg-teal-200 p-2 rounded">
                                    <div className="font-bold">Query Types</div>
                                    <div>KnnVector (semantic) + TermQuery (exact)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrow Down */}
                <div className="text-center text-4xl text-gray-400">↓</div>

                {/* Phase 7: Response Flow */}
                <div className="bg-orange-50 p-6 rounded-lg border-2 border-orange-300">
                    <h3 className="text-xl font-bold text-orange-900 mb-4">Phase 7: Response & Results</h3>
                    <div className="grid grid-cols-5 gap-4 items-center">
                        <ComponentBox title="Agent Processing" subtitle="Analysis Complete" icon="🤖" color="border-orange-400" />
                        <div className="text-2xl text-center">→</div>
                        <ComponentBox title="JSON Response" subtitle="Formatted Results" icon="📊" color="border-orange-500" />
                        <div className="text-2xl text-center">→</div>
                        <ComponentBox title="Frontend Display" subtitle="User Interface Update" icon="💻" color="border-orange-600" />
                    </div>
                    <div className="mt-4 bg-orange-100 p-4 rounded border border-orange-400 text-xs">
                        <div className="font-bold text-orange-900 mb-2">Response includes:</div>
                        <div className="text-orange-800 grid grid-cols-2 gap-2">
                            <div>• session_id</div>
                            <div>• error_message</div>
                            <div>• tool_payload</div>
                            <div>• summarised_markdown</div>
                            <div>• suggested_next_actions</div>
                            <div>• compliance_results</div>
                        </div>
                    </div>
                </div>

                {/* Legacy Note */}
                <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-300 opacity-70">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">📜 Previous Architecture (TiDB Platform)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                        <div className="space-y-2">
                            <div className="font-bold">Old Stack:</div>
                            <div>• TiDB MySQL database</div>
                            <div>• BM25 + FTS search</div>
                            <div>• Vite React frontend</div>
                            <div>• Single conversation agent</div>
                            <div>• LLM tools (not fully agentic)</div>
                        </div>
                        <div className="space-y-2">
                            <div className="font-bold">Current Stack:</div>
                            <div>• AWS serverless architecture</div>
                            <div>• OpenSearch vector + text</div>
                            <div>• Next.js 15 full-stack</div>
                            <div>• Multi-agent system (Strands)</div>
                            <div>• Complete agent orchestration</div>
                        </div>
                    </div>
                </div>

                {/* Technical Highlights */}
                <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
                    <h3 className="text-lg font-bold text-blue-900 mb-3">🔧 Key Technical Implementations</h3>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                        <div className="bg-blue-100 p-3 rounded">
                            <div className="font-bold text-blue-900 mb-2">Next.js 16 PDF Worker</div>
                            <div className="text-blue-800">
                                • Complex SSR configuration<br />
                                • react-pdf integration<br />
                                • Server-side setup challenges<br />
                                • Stack Overflow reference documented
                            </div>
                        </div>
                        <div className="bg-blue-100 p-3 rounded">
                            <div className="font-bold text-blue-900 mb-2">Deduplication Strategy</div>
                            <div className="text-blue-800">
                                • File hash checking<br />
                                • Prevents S3 spam<br />
                                • Pre-upload validation<br />
                                • Returns existing if duplicate
                            </div>
                        </div>
                        <div className="bg-blue-100 p-3 rounded">
                            <div className="font-bold text-blue-900 mb-2">Caching Mechanism</div>
                            <div className="text-blue-800">
                                • Analysis results cached<br />
                                • DynamoDB storage<br />
                                • force_reanalysis flag<br />
                                • Performance optimization
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOverview = (): JSX.Element => (
        <div className="relative w-full h-full p-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Policy Mate Architecture Overview</h2>
                <p className="text-gray-600">Click on any layer to explore in detail</p>
            </div>

            <div className="flex flex-col items-center gap-8 justify-center h-full">
                {/* Flow Diagram - NEW */}
                <div
                    onClick={() => setSelectedLayer('flow')}
                    className="w-3/4 bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border-2 border-orange-400 shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-orange-900">🔄 End-to-End User Flow</h3>
                            <p className="text-sm text-orange-700">Complete user journey and system interactions</p>
                        </div>
                        <div className="text-4xl">→</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-3xl text-gray-400">↓</div>

                {/* Layer 1 */}
                <div
                    onClick={() => setSelectedLayer('user')}
                    className="w-3/4 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-400 shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-blue-900">👤 User Experience Layer</h3>
                            <p className="text-sm text-blue-700">Frontend interfaces and user interactions</p>
                        </div>
                        <div className="text-4xl">→</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-3xl text-gray-400">↓</div>

                {/* Layer 2 */}
                <div
                    onClick={() => setSelectedLayer('security')}
                    className="w-3/4 bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-lg border-2 border-red-400 shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-red-900">🔐 Security & API Gateway Layer</h3>
                            <p className="text-sm text-red-700">Authentication, authorization, and API management</p>
                        </div>
                        <div className="text-4xl">→</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-3xl text-gray-400">↓</div>

                {/* Layer 3 */}
                <div
                    onClick={() => setSelectedLayer('ai')}
                    className="w-3/4 bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-400 shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-green-900">🧠 AI Processing & Orchestration Layer</h3>
                            <p className="text-sm text-green-700">Serverless compute and AI workflows</p>
                        </div>
                        <div className="text-4xl">→</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-3xl text-gray-400">↓</div>

                {/* Layer 4 */}
                <div
                    onClick={() => setSelectedLayer('data')}
                    className="w-3/4 bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border-2 border-purple-400 shadow-lg hover:shadow-2xl transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-purple-900">💾 Data & Storage Architecture</h3>
                            <p className="text-sm text-purple-700">File storage, databases, and search</p>
                        </div>
                        <div className="text-4xl">→</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
            {/* Header Controls */}
            <div className="bg-white shadow-md p-4 flex items-center justify-between border-b-2 border-gray-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedLayer('overview')}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                    >
                        ← Overview
                    </button>
                    <div className="text-lg font-bold text-gray-800">{layers[selectedLayer]}</div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                        >
                            −
                        </button>
                        <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                        >
                            +
                        </button>
                    </div>

                    <select
                        value={selectedLayer}
                        onChange={(e) => setSelectedLayer(e.target.value as LayerType)}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    >
                        {Object.entries(layers).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Diagram Area */}
            <div className="w-full h-full overflow-auto">
                <div
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        minWidth: '1400px',
                        minHeight: '800px'
                    }}
                >
                    {selectedLayer === 'overview' && renderOverview()}
                    {selectedLayer === 'user' && renderUserLayer()}
                    {selectedLayer === 'security' && renderSecurityLayer()}
                    {selectedLayer === 'ai' && renderAILayer()}
                    {selectedLayer === 'data' && renderDataLayer()}
                    {selectedLayer === 'flow' && renderFlowDiagram()}
                </div>
            </div>
        </div>
    );
};

export default ArchitectureDiagram;