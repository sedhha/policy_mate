'use client';
import React, { JSX, useState, useEffect } from 'react';

type LayerType = 'overview' | 'user' | 'security' | 'ai' | 'data';

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
        data: 'Data & Storage Architecture'
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

    // Enhanced Component box with interactions
    const ComponentBox: React.FC<ComponentBoxProps> = ({
        title,
        subtitle,
        icon,
        color,
        onClick,
        size = 'md',
        details,
        id,
        isHighlighted = false
    }) => {
        const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
            sm: 'p-3 min-w-32',
            md: 'p-4 min-w-40',
            lg: 'p-5 min-w-48'
        };

        const isSelected = selectedComponent === id;
        const isHovered = hoveredComponent === id;
        const shouldHighlight = isHighlighted || isSelected;

        return (
            <div
                onClick={() => {
                    if (id) handleComponentClick(id);
                    onClick?.();
                }}
                onMouseEnter={() => id && setHoveredComponent(id)}
                onMouseLeave={() => setHoveredComponent(null)}
                className={`
                    ${sizeClasses[size]} 
                    bg-white rounded-xl border-2 shadow-md 
                    hover:shadow-2xl hover:scale-105 
                    transition-all duration-300 cursor-pointer 
                    ${color}
                    ${shouldHighlight ? 'ring-4 ring-orange-400 scale-105 shadow-2xl' : ''}
                    ${isHovered ? 'scale-105' : ''}
                    relative overflow-hidden
                    group
                `}
            >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000" />

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className={`text-3xl mb-2 transition-transform duration-300 ${isHovered ? 'scale-125' : ''}`}>
                        {icon}
                    </div>
                    <div className="font-bold text-sm mb-1">{title}</div>
                    <div className="text-xs text-gray-600 italic">{subtitle}</div>

                    {(isHovered || isSelected) && details && (
                        <div className="mt-2 text-xs text-gray-700 px-2 py-1 bg-gray-50 rounded border border-gray-200 animate-fadeIn">
                            Click for details
                        </div>
                    )}
                </div>

                {/* Pulse effect for selected */}
                {isSelected && (
                    <div className="absolute inset-0 border-2 border-orange-400 rounded-xl animate-ping opacity-75" />
                )}
            </div>
        );
    };

    // Enhanced AWS Service box
    const AWSBox: React.FC<AWSBoxProps> = ({ title, subtitle, icon, onClick, details, id, isHighlighted = false }) => {
        const isSelected = selectedComponent === id;
        const isHovered = hoveredComponent === id;
        const shouldHighlight = isHighlighted || isSelected;

        return (
            <div
                onClick={() => {
                    if (id) handleComponentClick(id);
                    onClick?.();
                }}
                onMouseEnter={() => id && setHoveredComponent(id)}
                onMouseLeave={() => setHoveredComponent(null)}
                className={`
                    p-4 bg-gradient-to-br from-orange-500 to-orange-600 
                    rounded-xl border-2 border-orange-700 shadow-lg 
                    hover:shadow-2xl hover:scale-105 
                    transition-all duration-300 cursor-pointer min-w-40
                    ${shouldHighlight ? 'ring-4 ring-orange-300 scale-105 shadow-2xl' : ''}
                    ${isHovered ? 'scale-105' : ''}
                    relative overflow-hidden group
                `}
            >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000" />

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className={`text-3xl mb-2 transition-transform duration-300 ${isHovered ? 'scale-125' : ''}`}>
                        {icon}
                    </div>
                    <div className="font-bold text-sm text-white mb-1">{title}</div>
                    <div className="text-xs text-orange-100 italic">{subtitle}</div>

                    {(isHovered || isSelected) && details && (
                        <div className="mt-2 text-xs text-white px-2 py-1 bg-orange-700 rounded animate-fadeIn">
                            Click for details
                        </div>
                    )}
                </div>

                {/* Pulse effect for selected */}
                {isSelected && (
                    <div className="absolute inset-0 border-2 border-white rounded-xl animate-ping opacity-50" />
                )}
            </div>
        );
    };

    // Detail Panel Component
    const DetailPanelComponent: React.FC<{ panel: DetailPanel }> = ({ panel }) => (
        <div className="fixed top-20 right-4 w-96 bg-white rounded-xl shadow-2xl border-2 border-orange-400 p-6 z-50 animate-slideIn">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{panel.title}</h3>
                    <p className="text-sm text-gray-600">{panel.description}</p>
                </div>
                <button
                    onClick={handleClosePanel}
                    className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center">
                        <span className="text-orange-500 mr-2">🔧</span>
                        Technical Details
                    </h4>
                    <ul className="space-y-1">
                        {panel.technical.map((item, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-start">
                                <span className="text-orange-500 mr-2">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center">
                        <span className="text-blue-500 mr-2">🔗</span>
                        Connections
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {panel.connections.map((conn, index) => (
                            <span
                                key={index}
                                className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                onClick={() => handleComponentClick(conn)}
                            >
                                {conn}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                <p className="text-xs text-gray-600">
                    💡 <span className="font-semibold">Tip:</span> Click on connection tags to explore related components
                </p>
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
                        <div className="text-green-900 font-bold mb-3 text-sm">�️ AWS Cognito Auth</div>
                        <div className="space-y-2">
                            <AWSBox title="Amazon Cognito" subtitle="User Pool" icon="�" />
                            <ComponentBox title="User Login" subtitle="JWT Generation" icon="👤" color="border-green-400" size="sm" />
                            <ComponentBox title="Token Storage" subtitle="sessionStorage" icon="�" color="border-green-400" size="sm" />
                            <ComponentBox title="Auto Refresh" subtitle="Before Expiry" icon="🔄" color="border-green-400" size="sm" />
                            <ComponentBox title="User Claims" subtitle="email, sub, roles" icon="�" color="border-green-400" size="sm" />
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
                        <div className="text-red-900 font-bold mb-3 text-sm">� Lambda Security</div>
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
                            <ComponentBox title="Compliance Agent" subtitle="Doc Analysis" icon="�" color="border-green-500" size="sm" />
                            <ComponentBox title="Annotations Agent" subtitle="Bookmark Mgmt" icon="�" color="border-green-500" size="sm" />
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
                            <ComponentBox title="Claude Sonnet" subtitle="Complex Analysis" icon="�" color="border-purple-400" size="sm" />
                            <ComponentBox title="Strands Framework" subtitle="@tool Decorator" icon="�" color="border-purple-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Agent Tools */}
                <div className="flex flex-col gap-4">
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-300">
                        <div className="text-pink-900 font-bold mb-3 text-sm">� Agent Tools</div>
                        <div className="space-y-2">
                            <ComponentBox title="compliance_check" subtitle="Text Analysis" icon="✅" color="border-pink-400" size="sm" />
                            <ComponentBox title="comprehensive_check" subtitle="Full Doc Scan" icon="📄" color="border-pink-400" size="sm" />
                            <ComponentBox title="annotation_tools" subtitle="CRUD Ops" icon="�" color="border-pink-400" size="sm" />
                            <ComponentBox title="doc_status" subtitle="Status Check" icon="📊" color="border-pink-400" size="sm" />
                            <ComponentBox title="show_doc" subtitle="List Docs" icon="�" color="border-pink-400" size="sm" />
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
                            <ComponentBox title="manual-docs/" subtitle="Org Documents" icon="�" color="border-blue-400" size="sm" />
                            <ComponentBox title="Presigned URLs" subtitle="15 min expiry" icon="�" color="border-blue-400" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Database */}
                <div className="flex flex-col gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                        <div className="text-green-900 font-bold mb-3 text-sm">🗄️ DynamoDB Tables</div>
                        <div className="space-y-2">
                            <AWSBox title="DynamoDB" subtitle="NoSQL Database" icon="🗄️" />
                            <ComponentBox title="Documents" subtitle="PK: file_id" icon="�" color="border-green-400" size="sm" />
                            <ComponentBox title="Annotations" subtitle="PK: annotation_id" icon="🔖" color="border-green-400" size="sm" />
                            <ComponentBox title="Analysis Cache" subtitle="doc_id#framework_id" icon="�" color="border-green-400" size="sm" />
                            <ComponentBox title="replace_decimals()" subtitle="JSON Helper" icon="�" color="border-green-400" size="sm" />
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
                            <ComponentBox title="TermQuery" subtitle="Exact Match" icon="�" color="border-pink-400" size="sm" />
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

    const renderOverview = (): JSX.Element => (
        <div className="relative w-full h-full p-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Policy Mate Architecture Overview</h2>
                <p className="text-gray-600">Click on any layer to explore in detail</p>
            </div>

            <div className="flex flex-col items-center gap-8 justify-center h-full">
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
            {/* CSS Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>

            {/* Detail Panel */}
            {detailPanel && <DetailPanelComponent panel={detailPanel} />}

            {/* Header Controls */}
            <div className="bg-white shadow-md p-4 flex items-center justify-between border-b-2 border-gray-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            setSelectedLayer('overview');
                            handleClosePanel();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                        ← Overview
                    </button>
                    <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        {layers[selectedLayer]}
                        {selectedComponent && (
                            <span className="text-sm font-normal text-orange-600 animate-pulse">
                                • Component Selected
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {showConnections && (
                        <button
                            onClick={handleClosePanel}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors border border-red-300"
                        >
                            Clear Selection
                        </button>
                    )}

                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
                        <button
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                            className="px-3 py-1 bg-white rounded hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
                        >
                            −
                        </button>
                        <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                            className="px-3 py-1 bg-white rounded hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
                        >
                            +
                        </button>
                    </div>

                    <select
                        value={selectedLayer}
                        onChange={(e) => {
                            setSelectedLayer(e.target.value as LayerType);
                            handleClosePanel();
                        }}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 bg-white shadow-sm hover:border-gray-400 transition-colors"
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
                </div>
            </div>
        </div>
    );
};

export default ArchitectureDiagram;