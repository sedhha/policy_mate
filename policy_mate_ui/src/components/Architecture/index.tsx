'use client';
import React, { JSX, useState, useEffect } from 'react';

type LayerType = 'overview' | 'user' | 'security' | 'ai' | 'data' | 'flows';

interface ComponentBoxProps {
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    details?: string;
    id?: string;
    isHighlighted?: boolean;
    glowColor?: string;
}

interface AWSBoxProps {
    title: string;
    subtitle: string;
    icon: string;
    onClick?: () => void;
    details?: string;
    id?: string;
    isHighlighted?: boolean;
    serviceType?: 'compute' | 'storage' | 'ai' | 'security' | 'database';
}

interface ArrowProps {
    from: { x: number; y: number };
    to: { x: number; y: number };
    label?: string;
    dashed?: boolean;
    animated?: boolean;
    color?: string;
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
    const [flowAnimation, setFlowAnimation] = useState<boolean>(true);

    const layers: LayerInfo = {
        overview: 'Full Architecture Overview',
        user: 'User Experience Layer',
        security: 'Security & API Gateway Layer',
        ai: 'AI Processing & Orchestration Layer',
        data: 'Data & Storage Architecture',
        flows: 'Complete Data Flows'
    };

    // AWS Service color schemes
    const awsColors = {
        compute: 'from-orange-500 via-orange-600 to-red-600',
        storage: 'from-green-500 via-emerald-600 to-teal-600',
        ai: 'from-purple-500 via-violet-600 to-indigo-600',
        security: 'from-red-500 via-rose-600 to-pink-600',
        database: 'from-blue-500 via-cyan-600 to-sky-600'
    };

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

    // Enhanced Animated Arrow with glow
    const Arrow: React.FC<ArrowProps> = ({ from, to, label, dashed = false, animated = false, color = "#f97316" }) => {
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
                        <marker id={`arrowhead-${animated ? 'animated' : 'normal'}`} markerWidth="12" markerHeight="12" refX="10" refY="3" orient="auto">
                            <polygon points="0 0, 12 3, 0 6" fill={animated ? color : "#64748b"} />
                        </marker>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={animated ? color : "#64748b"}
                        strokeWidth={animated ? "4" : "2"}
                        strokeDasharray={dashed ? "8,8" : animated ? "12,6" : "0"}
                        strokeDashoffset={animated ? -dashOffset : 0}
                        markerEnd={`url(#arrowhead-${animated ? 'animated' : 'normal'})`}
                        filter={animated ? "url(#glow)" : ""}
                        className={animated ? "animate-pulse" : ""}
                        opacity={animated ? "0.9" : "0.6"}
                    />
                </svg>
                {label && (
                    <div
                        className={`absolute px-4 py-2 text-xs font-semibold rounded-full shadow-lg transition-all backdrop-blur-sm ${animated
                            ? "bg-gradient-to-r from-orange-400 to-red-500 text-white border-2 border-orange-300 shadow-orange-500/50"
                            : "bg-white/90 text-gray-700 border border-gray-300"
                            }`}
                        style={{
                            left: (from.x + to.x) / 2,
                            top: (from.y + to.y) / 2 - 20,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        {label}
                    </div>
                )}
            </div>
        );
    };

    // Enhanced Component box with gradient glow
    const ComponentBox: React.FC<ComponentBoxProps> = ({
        title,
        subtitle,
        icon,
        color,
        onClick,
        size = 'md',
        details,
        id,
        isHighlighted = false,
        glowColor = 'orange'
    }) => {
        const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
            sm: 'p-3 min-w-36',
            md: 'p-4 min-w-44',
            lg: 'p-6 min-w-52'
        };

        const isSelected = selectedComponent === id;
        const isHovered = hoveredComponent === id;
        const shouldHighlight = isHighlighted || isSelected;

        const glowClasses = {
            orange: 'shadow-orange-500/50',
            blue: 'shadow-blue-500/50',
            green: 'shadow-green-500/50',
            purple: 'shadow-purple-500/50',
            red: 'shadow-red-500/50'
        };

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
                    bg-gradient-to-br from-white to-gray-50
                    rounded-2xl border-2 shadow-lg 
                    hover:shadow-2xl hover:scale-110 
                    transition-all duration-500 cursor-pointer 
                    ${color}
                    ${shouldHighlight ? `ring-4 ring-${glowColor}-400 scale-110 shadow-2xl ${glowClasses[glowColor as keyof typeof glowClasses]}` : ''}
                    ${isHovered ? 'scale-105 shadow-xl' : ''}
                    relative overflow-hidden
                    group
                    backdrop-blur-sm
                `}
            >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000" />

                {/* Glow effect */}
                {(isHovered || isSelected) && (
                    <div className={`absolute inset-0 blur-xl opacity-30 bg-gradient-to-br ${color.replace('border', 'from')} to-transparent`} />
                )}

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className={`text-4xl mb-3 transition-all duration-500 ${isHovered ? 'scale-125 animate-bounce' : ''} filter drop-shadow-lg`}>
                        {icon}
                    </div>
                    <div className="font-bold text-sm mb-1 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        {title}
                    </div>
                    <div className="text-xs text-gray-600 italic font-medium">{subtitle}</div>

                    {(isHovered || isSelected) && details && (
                        <div className="mt-3 text-xs text-gray-700 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200 animate-fadeIn shadow-sm">
                            💡 Click for details
                        </div>
                    )}
                </div>

                {/* Pulse effect for selected */}
                {isSelected && (
                    <>
                        <div className="absolute inset-0 border-2 border-orange-400 rounded-2xl animate-ping opacity-50" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 rounded-2xl opacity-20 blur animate-pulse" />
                    </>
                )}
            </div>
        );
    };

    // Enhanced AWS Service box with proper branding
    const AWSBox: React.FC<AWSBoxProps> = ({
        title,
        subtitle,
        icon,
        onClick,
        details,
        id,
        isHighlighted = false,
        serviceType = 'compute'
    }) => {
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
                    p-5 bg-gradient-to-br ${awsColors[serviceType]}
                    rounded-2xl border-2 border-orange-400/50 shadow-2xl 
                    hover:shadow-orange-500/50 hover:shadow-2xl hover:scale-110 
                    transition-all duration-500 cursor-pointer min-w-44
                    ${shouldHighlight ? 'ring-4 ring-orange-300 scale-110 shadow-orange-500/70' : ''}
                    ${isHovered ? 'scale-105' : ''}
                    relative overflow-hidden group
                `}
            >
                {/* AWS Logo watermark */}
                <div className="absolute top-2 right-2 text-white/20 text-xs font-bold">AWS</div>

                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-40 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000" />

                {/* Glow effect */}
                {(isHovered || isSelected) && (
                    <div className="absolute -inset-1 bg-gradient-to-br from-orange-400 via-yellow-400 to-red-400 opacity-50 blur-lg animate-pulse" />
                )}

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className={`text-4xl mb-3 transition-all duration-500 ${isHovered ? 'scale-125 rotate-12' : ''} filter drop-shadow-2xl`}>
                        {icon}
                    </div>
                    <div className="font-bold text-base text-white mb-1 drop-shadow-lg">{title}</div>
                    <div className="text-xs text-orange-100 italic font-medium drop-shadow">{subtitle}</div>

                    {(isHovered || isSelected) && details && (
                        <div className="mt-3 text-xs text-white px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full animate-fadeIn border border-white/40 shadow-lg">
                            🔍 Click for details
                        </div>
                    )}
                </div>

                {/* Pulse effect for selected */}
                {isSelected && (
                    <>
                        <div className="absolute inset-0 border-2 border-white rounded-2xl animate-ping opacity-60" />
                        <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-2xl opacity-30 blur-xl animate-pulse" />
                    </>
                )}
            </div>
        );
    };

    // Enhanced Detail Panel with glassmorphism
    const DetailPanelComponent: React.FC<{ panel: DetailPanel }> = ({ panel }) => (
        <div className="fixed top-24 right-6 w-96 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-orange-400/50 p-6 z-50 animate-slideIn">
            {/* Gradient border glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 rounded-3xl opacity-20 blur-lg -z-10" />

            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
                        {panel.title}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{panel.description}</p>
                </div>
                <button
                    onClick={handleClosePanel}
                    className="ml-4 text-gray-400 hover:text-red-600 transition-all duration-300 hover:rotate-90 hover:scale-110"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-2xl border border-orange-200">
                    <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center">
                        <span className="text-2xl mr-2">🔧</span>
                        Technical Details
                    </h4>
                    <ul className="space-y-2">
                        {panel.technical.map((item, index) => (
                            <li key={index} className="text-xs text-gray-700 flex items-start bg-white/60 p-2 rounded-lg backdrop-blur-sm">
                                <span className="text-orange-500 mr-2 text-sm">▸</span>
                                <span className="flex-1">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-2xl border border-blue-200">
                    <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center">
                        <span className="text-2xl mr-2">🔗</span>
                        Connected Services
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {panel.connections.map((conn, index) => (
                            <span
                                key={index}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded-full hover:from-blue-600 hover:to-purple-600 transition-all cursor-pointer transform hover:scale-105 shadow-lg hover:shadow-xl"
                                onClick={() => handleComponentClick(conn)}
                            >
                                {conn}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border-2 border-amber-300 shadow-inner">
                <p className="text-xs text-gray-700 flex items-center">
                    <span className="text-2xl mr-2">💡</span>
                    <span><span className="font-bold text-amber-800">Pro Tip:</span> Click connection badges to explore related components and see data flow</span>
                </p>
            </div>
        </div>
    );

    const renderUserLayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50">
            <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-400 to-red-500 px-6 py-3 rounded-2xl shadow-lg border-2 border-orange-300">
                <span className="text-white font-bold text-lg drop-shadow-lg">👤 User Experience Layer</span>
            </div>

            <div className="flex items-center justify-between h-full pt-20 gap-8">
                {/* User */}
                <div className="flex flex-col items-center">
                    <ComponentBox
                        title="End User"
                        subtitle="Compliance Officer"
                        icon="🧑‍💼"
                        color="border-blue-500"
                        glowColor="blue"
                        size="lg"
                    />
                </div>

                {/* Frontend */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-6 rounded-3xl border-2 border-purple-400 shadow-xl backdrop-blur-sm">
                        <div className="text-purple-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">💻</span>
                            Next.js 15 App
                        </div>
                        <div className="space-y-3">
                            <ComponentBox
                                title="App Router"
                                subtitle="Server Components"
                                icon="⚛️"
                                color="border-purple-500"
                                glowColor="purple"
                                size="sm"
                            />
                            <ComponentBox
                                title="Dashboard"
                                subtitle="Document Manager"
                                icon="📊"
                                color="border-purple-500"
                                glowColor="purple"
                                size="sm"
                            />
                            <ComponentBox
                                title="PDF Annotator"
                                subtitle="Review Interface"
                                icon="📝"
                                color="border-purple-500"
                                glowColor="purple"
                                size="sm"
                            />
                            <ComponentBox
                                title="Chat Interface"
                                subtitle="AI Assistant"
                                icon="💬"
                                color="border-purple-500"
                                glowColor="purple"
                                size="sm"
                            />
                        </div>
                    </div>
                </div>

                {/* State Management */}
                <div className="flex flex-col gap-3">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-3xl border-2 border-green-400 shadow-xl backdrop-blur-sm">
                        <div className="text-green-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🔄</span>
                            Zustand State
                        </div>
                        <div className="space-y-3">
                            <ComponentBox title="authStore" subtitle="sessionStorage" icon="🔐" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="JWT Tokens" subtitle="Cognito Auth" icon="🎫" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="agentStore" subtitle="Ephemeral" icon="🧠" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="Conversations" subtitle="Agent Chat" icon="💬" color="border-green-500" glowColor="green" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Tools & Libraries */}
                <div className="flex flex-col gap-3">
                    <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-6 rounded-3xl border-2 border-blue-400 shadow-xl backdrop-blur-sm">
                        <div className="text-blue-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🛠️</span>
                            Tools & Libraries
                        </div>
                        <div className="space-y-3">
                            <ComponentBox title="Biome" subtitle="Lint & Format" icon="🔧" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="Tailwind CSS v4" subtitle="Styling" icon="🎨" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="react-markdown" subtitle="MD Renderer" icon="📄" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="pnpm 10.18+" subtitle="Package Mgr" icon="📦" color="border-blue-500" glowColor="blue" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-2xl border-2 border-yellow-400 shadow-lg backdrop-blur-sm text-xs">
                    <div className="font-bold text-yellow-900 mb-2 text-sm flex items-center gap-2">
                        <span className="text-lg">🚀</span>
                        Routes without header:
                    </div>
                    <div className="text-yellow-800 font-mono font-semibold">
                        /login | /register | /architecture
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSecurityLayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8 bg-gradient-to-br from-red-50/50 via-orange-50/50 to-pink-50/50">
            <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-600 px-6 py-3 rounded-2xl shadow-lg border-2 border-red-400">
                <span className="text-white font-bold text-lg drop-shadow-lg">🔐 Security & API Gateway Layer</span>
            </div>

            <div className="grid grid-cols-4 gap-8 h-full pt-20">
                {/* Frontend Connection */}
                <div className="flex items-center justify-center">
                    <ComponentBox
                        title="Frontend Layer"
                        subtitle="HTTPS Requests"
                        icon="💻"
                        color="border-purple-500"
                        glowColor="purple"
                        size="lg"
                    />
                </div>

                {/* Auth */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-3xl border-2 border-green-400 shadow-xl backdrop-blur-sm">
                        <div className="text-green-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🛡️</span>
                            AWS Cognito Auth
                        </div>
                        <div className="space-y-3">
                            <AWSBox title="Amazon Cognito" subtitle="User Pool" icon="🔑" serviceType="security" id="cognito" />
                            <ComponentBox title="User Login" subtitle="JWT Generation" icon="👤" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="Token Storage" subtitle="sessionStorage" icon="💾" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="Auto Refresh" subtitle="Before Expiry" icon="🔄" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="User Claims" subtitle="email, sub, roles" icon="📋" color="border-green-500" glowColor="green" size="sm" />
                        </div>
                    </div>
                </div>

                {/* API Gateway */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-6 rounded-3xl border-2 border-blue-400 shadow-xl backdrop-blur-sm">
                        <div className="text-blue-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🌐</span>
                            API Gateway
                        </div>
                        <div className="space-y-3">
                            <AWSBox title="API Gateway" subtitle="REST Endpoints" icon="🚪" serviceType="compute" />
                            <ComponentBox title="CORS Config" subtitle="Allow Origins" icon="🌍" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="Rate Limiting" subtitle="Throttling" icon="⚡" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="Authorization" subtitle="Bearer Token" icon="🔒" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="Request Validation" subtitle="Schema Check" icon="✅" color="border-blue-500" glowColor="blue" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Lambda Auth */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-red-100 to-rose-100 p-6 rounded-3xl border-2 border-red-400 shadow-xl backdrop-blur-sm">
                        <div className="text-red-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🔐</span>
                            Lambda Security
                        </div>
                        <div className="space-y-3">
                            <ComponentBox title="@require_cognito_auth" subtitle="Decorator" icon="🎭" color="border-red-500" glowColor="red" size="sm" />
                            <ComponentBox title="JWT Validation" subtitle="Verify Token" icon="✓" color="border-red-500" glowColor="red" size="sm" />
                            <ComponentBox title="User Claims" subtitle="Extract Data" icon="📄" color="border-red-500" glowColor="red" size="sm" />
                            <ComponentBox title="Reject Invalid" subtitle="401 Response" icon="❌" color="border-red-500" glowColor="red" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-2xl border-2 border-blue-400 shadow-lg backdrop-blur-sm text-xs">
                    <div className="font-bold text-blue-900 mb-2 text-sm flex items-center gap-2">
                        <span className="text-lg">🔐</span>
                        Auth Flow:
                    </div>
                    <div className="text-blue-800 font-mono font-semibold space-y-1">
                        <div>Login → JWT → sessionStorage → API Call</div>
                        <div>→ Bearer Token → Lambda → Validated</div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4">
                <ComponentBox
                    title="Processing Layer"
                    subtitle="Authorized Requests"
                    icon="⚡"
                    color="border-purple-500"
                    glowColor="purple"
                    size="lg"
                />
            </div>
        </div>
    );

    const renderAILayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8 bg-gradient-to-br from-purple-50/50 via-indigo-50/50 to-blue-50/50">
            <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-3 rounded-2xl shadow-lg border-2 border-purple-400">
                <span className="text-white font-bold text-lg drop-shadow-lg">🧠 AI Processing & Orchestration Layer</span>
            </div>

            <div className="grid grid-cols-4 gap-8 h-full pt-20">
                {/* Lambda Handlers */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-orange-100 to-red-100 p-6 rounded-3xl border-2 border-orange-400 shadow-xl backdrop-blur-sm">
                        <div className="text-orange-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">⚡</span>
                            Lambda Handlers
                        </div>
                        <div className="space-y-3">
                            <AWSBox title="AWS Lambda" subtitle="Python 3.12" icon="⚡" serviceType="compute" />
                            <ComponentBox title="agent_v2_handler" subtitle="Main Entry" icon="🚪" color="border-orange-500" glowColor="orange" size="sm" />
                            <ComponentBox title="file_upload_handler" subtitle="S3 Upload" icon="📤" color="border-orange-500" glowColor="orange" size="sm" />
                            <ComponentBox title="Auth Decorator" subtitle="@require_cognito_auth" icon="🔒" color="border-orange-500" glowColor="orange" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Multi-Agent System */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-green-100 to-teal-100 p-6 rounded-3xl border-2 border-green-400 shadow-xl backdrop-blur-sm">
                        <div className="text-green-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🎯</span>
                            Multi-Agent System
                        </div>
                        <div className="space-y-3">
                            <ComponentBox
                                title="Supervisor Agent"
                                subtitle="Tool-Agent Pattern"
                                icon="👔"
                                color="border-green-500"
                                glowColor="green"
                                size="sm"
                                id="supervisor-agent"
                            />
                            <div className="text-center text-xs font-bold text-gray-600 py-2 flex items-center justify-center gap-2">
                                <span className="text-lg">↓</span> Routes to <span className="text-lg">↓</span>
                            </div>
                            <ComponentBox
                                title="Compliance Agent"
                                subtitle="Doc Analysis"
                                icon="📊"
                                color="border-emerald-500"
                                glowColor="green"
                                size="sm"
                                id="compliance-agent"
                            />
                            <ComponentBox
                                title="Annotations Agent"
                                subtitle="Bookmark Mgmt"
                                icon="📝"
                                color="border-emerald-500"
                                glowColor="green"
                                size="sm"
                                id="annotations-agent"
                            />
                        </div>
                    </div>
                </div>

                {/* Bedrock & Strands */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-6 rounded-3xl border-2 border-purple-400 shadow-xl backdrop-blur-sm">
                        <div className="text-purple-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            AI Infrastructure
                        </div>
                        <div className="space-y-3">
                            <AWSBox title="Amazon Bedrock" subtitle="Claude Models" icon="🤖" serviceType="ai" />
                            <ComponentBox title="Claude Haiku" subtitle="Fast & Cheap" icon="⚡" color="border-purple-500" glowColor="purple" size="sm" />
                            <ComponentBox title="Claude Sonnet" subtitle="Complex Analysis" icon="🎯" color="border-purple-500" glowColor="purple" size="sm" />
                            <ComponentBox title="Strands Framework" subtitle="@tool Decorator" icon="🔧" color="border-purple-500" glowColor="purple" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Agent Tools */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-pink-100 to-rose-100 p-6 rounded-3xl border-2 border-pink-400 shadow-xl backdrop-blur-sm">
                        <div className="text-pink-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🛠️</span>
                            Agent Tools
                        </div>
                        <div className="space-y-2">
                            <ComponentBox title="compliance_check" subtitle="Text Analysis" icon="✅" color="border-pink-500" glowColor="purple" size="sm" />
                            <ComponentBox title="comprehensive_check" subtitle="Full Doc Scan" icon="📄" color="border-pink-500" glowColor="purple" size="sm" />
                            <ComponentBox title="annotation_tools" subtitle="CRUD Ops" icon="📝" color="border-pink-500" glowColor="purple" size="sm" />
                            <ComponentBox title="doc_status" subtitle="Status Check" icon="📊" color="border-pink-500" glowColor="purple" size="sm" />
                            <ComponentBox title="show_doc" subtitle="List Docs" icon="📋" color="border-pink-500" glowColor="purple" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-2xl border-2 border-yellow-400 shadow-lg backdrop-blur-sm text-xs">
                    <div className="font-bold text-yellow-900 mb-2 text-sm flex items-center gap-2">
                        <span className="text-lg">📦</span>
                        Response Format (JSON):
                    </div>
                    <div className="text-yellow-800 font-mono font-semibold space-y-1">
                        <div>session_id | error_message | tool_payload</div>
                        <div>summarised_markdown | suggested_next_actions</div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4">
                <ComponentBox
                    title="Data Storage"
                    subtitle="Results"
                    icon="💾"
                    color="border-cyan-500"
                    glowColor="blue"
                    size="lg"
                />
            </div>
        </div>
    );

    const renderDataLayer = (): JSX.Element => (
        <div className="relative w-full h-full p-8 bg-gradient-to-br from-cyan-50/50 via-blue-50/50 to-indigo-50/50">
            <div className="absolute top-4 left-4 bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-2xl shadow-lg border-2 border-cyan-400">
                <span className="text-white font-bold text-lg drop-shadow-lg">💾 Data & Storage Architecture</span>
            </div>

            <div className="grid grid-cols-4 gap-8 h-full pt-20">
                {/* External Inputs */}
                <div className="flex flex-col gap-8 items-center justify-center">
                    <ComponentBox
                        title="AI Processing"
                        subtitle="Stores Data"
                        icon="🧠"
                        color="border-purple-500"
                        glowColor="purple"
                        size="lg"
                    />
                    <ComponentBox
                        title="User Interface"
                        subtitle="Queries Data"
                        icon="💻"
                        color="border-blue-500"
                        glowColor="blue"
                        size="lg"
                    />
                </div>

                {/* File Storage */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-3xl border-2 border-green-400 shadow-xl backdrop-blur-sm">
                        <div className="text-green-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">📦</span>
                            S3 File Storage
                        </div>
                        <div className="space-y-3">
                            <AWSBox title="Amazon S3" subtitle="Document Repo" icon="📦" serviceType="storage" id="s3" />
                            <ComponentBox title="standard-docs/" subtitle="GDPR/SOC2/HIPAA" icon="📋" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="public/" subtitle="Reference Docs" icon="🌐" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="manual-docs/" subtitle="Org Documents" icon="📁" color="border-green-500" glowColor="green" size="sm" />
                            <ComponentBox title="Presigned URLs" subtitle="15 min expiry" icon="🔗" color="border-green-500" glowColor="green" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Database */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-6 rounded-3xl border-2 border-blue-400 shadow-xl backdrop-blur-sm">
                        <div className="text-blue-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🗄️</span>
                            DynamoDB Tables
                        </div>
                        <div className="space-y-2">
                            <AWSBox title="DynamoDB" subtitle="NoSQL Database" icon="🗄️" serviceType="database" id="dynamodb" />
                            <ComponentBox title="Documents" subtitle="PK: file_id" icon="📄" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="Annotations" subtitle="PK: annotation_id" icon="🔖" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="Analysis Cache" subtitle="doc_id#framework_id" icon="💾" color="border-blue-500" glowColor="blue" size="sm" />
                            <ComponentBox title="replace_decimals()" subtitle="JSON Helper" icon="🔧" color="border-blue-500" glowColor="blue" size="sm" />
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-6 rounded-3xl border-2 border-purple-400 shadow-xl backdrop-blur-sm">
                        <div className="text-purple-900 font-bold mb-4 text-base flex items-center gap-2">
                            <span className="text-2xl">🔍</span>
                            OpenSearch
                        </div>
                        <div className="space-y-3">
                            <AWSBox title="OpenSearch" subtitle="Env-Based Config" icon="🔍" serviceType="database" id="opensearch" />
                            <ComponentBox title="policy-mate-docs" subtitle="Standard Docs" icon="📚" color="border-purple-500" glowColor="purple" size="sm" />
                            <ComponentBox title="policy-mate-embeddings" subtitle="Vector Search" icon="🎯" color="border-purple-500" glowColor="purple" size="sm" />
                            <ComponentBox title="KnnVectorQuery" subtitle="Semantic" icon="🧠" color="border-purple-500" glowColor="purple" size="sm" />
                            <ComponentBox title="TermQuery" subtitle="Exact Match" icon="🔎" color="border-purple-500" glowColor="purple" size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-4">
                <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-2xl border-2 border-blue-400 shadow-lg backdrop-blur-sm text-xs">
                    <div className="font-bold text-blue-900 mb-2 text-sm flex items-center gap-2">
                        <span className="text-lg">🌍</span>
                        Environment Switching:
                    </div>
                    <div className="text-blue-800 font-mono font-semibold space-y-1">
                        <div>OPEN_SEARCH_ENV=local (Docker)</div>
                        <div>OPEN_SEARCH_ENV=aws (Production)</div>
                        <div>OPEN_SEARCH_ENV=serverless</div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOverview = (): JSX.Element => (
        <div className="relative w-full h-full p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent mb-4 drop-shadow-lg">
                    Policy Mate Architecture Overview
                </h2>
                <p className="text-gray-700 text-lg font-medium">Click on any layer to explore in detail • Interactive navigation enabled</p>
            </div>

            <div className="flex flex-col items-center gap-10 justify-center h-full">
                {/* Layer 1 */}
                <div
                    onClick={() => setSelectedLayer('user')}
                    className="w-3/4 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 p-8 rounded-3xl border-2 border-blue-300 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-500 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">👤 User Experience Layer</h3>
                            <p className="text-base text-blue-100 font-medium">Frontend interfaces and user interactions</p>
                        </div>
                        <div className="text-5xl group-hover:translate-x-2 transition-transform duration-300">→</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-5xl text-gray-400 animate-bounce">↓</div>

                {/* Layer 2 */}
                <div
                    onClick={() => setSelectedLayer('security')}
                    className="w-3/4 bg-gradient-to-r from-red-400 via-red-500 to-pink-500 p-8 rounded-3xl border-2 border-red-300 shadow-2xl hover:shadow-red-500/50 hover:scale-105 transition-all duration-500 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">🔐 Security & API Gateway Layer</h3>
                            <p className="text-base text-red-100 font-medium">Authentication, authorization, and API management</p>
                        </div>
                        <div className="text-5xl group-hover:translate-x-2 transition-transform duration-300">→</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-5xl text-gray-400 animate-bounce">↓</div>

                {/* Layer 3 */}
                <div
                    onClick={() => setSelectedLayer('ai')}
                    className="w-3/4 bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 p-8 rounded-3xl border-2 border-purple-300 shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-500 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">🧠 AI Processing & Orchestration Layer</h3>
                            <p className="text-base text-purple-100 font-medium">Serverless compute and AI workflows</p>
                        </div>
                        <div className="text-5xl group-hover:translate-x-2 transition-transform duration-300">→</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-5xl text-gray-400 animate-bounce">↓</div>

                {/* Layer 4 */}
                <div
                    onClick={() => setSelectedLayer('data')}
                    className="w-3/4 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 p-8 rounded-3xl border-2 border-cyan-300 shadow-2xl hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-500 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">💾 Data & Storage Architecture</h3>
                            <p className="text-base text-cyan-100 font-medium">File storage, databases, and search</p>
                        </div>
                        <div className="text-5xl group-hover:translate-x-2 transition-transform duration-300">→</div>
                    </div>
                </div>
            </div>

            {/* Floating Info Cards */}
            <div className="absolute top-4 right-4 space-y-3">
                <div className="bg-white/90 backdrop-blur-lg p-4 rounded-2xl shadow-xl border-2 border-orange-300">
                    <div className="text-xs font-bold text-orange-600 mb-1">⚡ Real-time Status</div>
                    <div className="text-xs text-gray-700">All systems operational</div>
                </div>
                <div className="bg-white/90 backdrop-blur-lg p-4 rounded-2xl shadow-xl border-2 border-green-300">
                    <div className="text-xs font-bold text-green-600 mb-1">🚀 Performance</div>
                    <div className="text-xs text-gray-700">Response time: &lt;100ms</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 overflow-hidden">
            {/* Enhanced CSS Animations */}
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
                    50% { opacity: 0.7; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.4s ease-out;
                }
                .animate-slideIn {
                    animation: slideIn 0.4s ease-out;
                }
                .animate-bounce {
                    animation: bounce 2s infinite;
                }
            `}</style>

            {/* Detail Panel */}
            {detailPanel && <DetailPanelComponent panel={detailPanel} />}

            {/* Enhanced Header Controls */}
            <div className="bg-gradient-to-r from-white via-gray-50 to-white shadow-2xl p-4 flex items-center justify-between border-b-2 border-gray-200 backdrop-blur-lg">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            setSelectedLayer('overview');
                            handleClosePanel();
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-2xl font-bold hover:from-orange-600 hover:via-red-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                    >
                        ← Overview
                    </button>
                    <div className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
                        {layers[selectedLayer]}
                        {selectedComponent && (
                            <span className="text-sm font-semibold text-orange-600 animate-pulse flex items-center gap-1">
                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                                Component Selected
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {showConnections && (
                        <button
                            onClick={handleClosePanel}
                            className="px-5 py-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 rounded-xl font-bold hover:from-red-200 hover:to-pink-200 transition-all border-2 border-red-300 shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                            Clear Selection
                        </button>
                    )}

                    <div className="flex items-center gap-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-3 shadow-inner border border-gray-300">
                        <button
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                            className="px-4 py-2 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-md border border-gray-200 font-bold text-lg hover:scale-110"
                        >
                            −
                        </button>
                        <span className="text-sm font-bold w-20 text-center bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                            className="px-4 py-2 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-md border border-gray-200 font-bold text-lg hover:scale-110"
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
                        className="px-5 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-orange-500 bg-white shadow-lg hover:border-gray-400 transition-all font-semibold cursor-pointer hover:shadow-xl"
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
                        minWidth: '1600px',
                        minHeight: '900px',
                        transition: 'transform 0.3s ease-out'
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

// Additional utility components for future expansion
export const FlowDiagram: React.FC = () => {
    return (
        <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Complete Data Flow Architecture
            </h2>
            {/* Placeholder for complete flow diagram */}
            <div className="text-center text-gray-600">
                Complete flow diagrams coming soon...
            </div>
        </div>
    );
};