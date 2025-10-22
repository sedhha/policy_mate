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
    AlertCircle,
    CheckCircle2,
    XCircle,
    Info,
    Database,
    Code2,
    FileJson,
    ChevronUp,
    Sparkles,
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
    toolPayload?: any;
    errorMessage?: string;
}

// Dynamic Loading Animation Component with Rotating Messages
const LoadingMessage = () => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    // Fun encouraging messages with compliance awareness
    const loadingMessages = [
        { text: "🔍 Analyzing your document for compliance gaps...", icon: Shield },
        { text: "🧠 Our AI is thinking hard about your request...", icon: Sparkles },
        { text: "⚡ Good things take time - we're getting the best response!", icon: Zap },
        { text: "🎯 Scanning for the most relevant compliance insights...", icon: ShieldCheck },
        { text: "🚀 Almost there - preparing your personalized analysis...", icon: Loader2 },
        { text: "✨ Crafting the perfect compliance recommendations...", icon: CheckCircle2 },
        { text: "🔬 Deep-diving into regulatory requirements...", icon: Shield },
        { text: "🎪 Performing compliance magic behind the scenes...", icon: Sparkles },
        { text: "🏗️ Building your comprehensive analysis report...", icon: Database },
        { text: "🎨 Polishing the final touches on your insights...", icon: ArrowRight },
        { text: "🔥 Cooking up some amazing compliance findings...", icon: Zap },
        { text: "🌟 We're working to exceed your expectations!", icon: CheckCircle2 },
        { text: "💰 Helping you avoid million-dollar compliance mistakes...", icon: Shield },
        { text: "🛡️ Building shields against costly regulatory failures...", icon: ShieldCheck },
        { text: "📊 Preventing the next compliance disaster story...", icon: AlertCircle },
        { text: "🎯 Ensuring you stay off the regulatory penalty list...", icon: CheckCircle2 },
        { text: "🚨 Analyzing to keep you out of compliance headlines...", icon: Shield },
        { text: "💡 Turning compliance complexity into clarity...", icon: Sparkles }
    ];

    // Compliance tips, best practices, and real-world failure cases
    const complianceTips = [
        "💡 Tip: Regular compliance audits help identify gaps before they become issues",
        "🔒 Did you know? Data encryption is required for GDPR Article 32 compliance",
        "📋 Best practice: Document all data processing activities for transparency",
        "⚖️ Remember: Consent must be freely given, specific, and withdrawable",
        "🏥 HIPAA tip: The minimum necessary standard applies to all PHI disclosures",
        "🛡️ SOC2 insight: Access controls should be reviewed quarterly for effectiveness",
        "📊 Pro tip: Regular risk assessments strengthen your compliance posture",
        "🔄 Keep in mind: Incident response plans should be tested regularly",
        "📝 Good to know: Privacy policies must be written in plain language",
        "🎯 Focus: Data retention policies should align with legal requirements",
        "🚨 Quick fact: Data breach notifications must be made within 72 hours under GDPR",
        "🌐 Remember: Cross-border data transfers require appropriate safeguards",
        "📱 Mobile tip: Apps collecting personal data need clear privacy notices",
        "🔐 Security note: Multi-factor authentication reduces breach risk by 99.9%",
        "📈 Analytics insight: Privacy by design should be built into all systems",
        "🤝 Vendor management: Third-party processors need proper agreements",
        "⏰ Retention reminder: Keep data only as long as necessary for the purpose",
        "👥 Training tip: Staff awareness reduces human error in data handling",
        "📋 Documentation: Well-maintained records are your best compliance defense",
        "🎯 Risk assessment: Identify and prioritize your highest compliance risks",

        // Real-world compliance failure cases with consequences
        "💸 Reality check: Facebook paid €1.2B GDPR fine in 2023 for EU-US data transfers",
        "🏥 Case study: Anthem paid $16M HIPAA fine after 78.8M patient records were breached",
        "📱 Shocking fact: TikTok faces $27M UK fine for processing children's data illegally",
        "💰 Warning: British Airways paid £20M for GDPR violation affecting 400K customers",
        "🏢 Corporate lesson: Equifax settlement reached $700M after 147M records compromised",
        "🚨 Reality: Marriott paid £99M fine for data breach affecting 339M guest records",
        "⚠️ Consequence: Uber paid €10M Dutch fine for GDPR violations and poor data practices",
        "💔 Failure cost: Target's 2013 breach cost them $162M in settlements and reputation loss",
        "🔥 Disaster story: Yahoo's breach affected 3B accounts, reduced acquisition price by $350M",
        "📉 Stock impact: Capital One's breach cost $290M+ and 30% stock price drop initially",
        "🏥 Medical nightmare: UCLA Health paid $7.5M for multiple HIPAA violations over 4 years",
        "🎯 Retail reality: Home Depot breach cost $134M+ affecting 56M payment cards",
        "💸 Financial pain: JPMorgan Chase spent $250M+ on cybersecurity after 83M accounts breach",
        "🌍 Global impact: Cambridge Analytica scandal cost Facebook $5B FTC fine + reputation damage",
        "🏛️ Government fail: OPM breach compromised 21.5M federal employee records, cost $133M+",
        "💊 Pharma shock: Pfizer subsidiary paid $975K HIPAA fine for unsecured patient data",
        "🎮 Gaming lesson: Sony PlayStation breach cost $171M, 77M accounts compromised",
        "🏨 Hospitality hit: MGM Resorts breach cost $100M+ affecting 10.6M guest records",
        "📺 Media mess: CNN paid undisclosed millions after health data exposure to advertisers",
        "🛒 E-commerce error: eBay breach affected 145M users, stock dropped 3.2% in one day"
    ];

    // Rotate main messages every 3 seconds
    useEffect(() => {
        const messageInterval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 5000);

        return () => clearInterval(messageInterval);
    }, []);

    // Rotate tips every 4 seconds (slightly offset from messages)
    useEffect(() => {
        const tipInterval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % complianceTips.length);
        }, 6000);

        return () => clearInterval(tipInterval);
    }, []);

    const currentMessage = loadingMessages[currentMessageIndex];
    const currentTip = complianceTips[currentTipIndex];
    const MessageIcon = currentMessage.icon;

    return (
        <div className='flex items-start gap-3 animate-fade-in'>
            <div className='relative'>
                <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center'>
                    <MessageIcon className='w-4 h-4 text-white animate-pulse' />
                </div>
                {/* Multiple scanning rings */}
                <div className='absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-20' />
                <div className='absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-30' style={{ animationDelay: '0.3s' }} />
                <div className='absolute inset-0 rounded-full border-2 border-purple-500 animate-ping opacity-20' style={{ animationDelay: '0.6s' }} />
            </div>
            <div className='flex-1 space-y-4 py-1'>
                {/* Main loading message with smooth transitions */}
                <div className='flex items-center gap-2 min-h-[24px]'>
                    <div className='relative flex items-center gap-1'>
                        <MessageIcon className='w-4 h-4 text-blue-600 loading-pulse' style={{ animationDelay: '0.1s' }} />
                        <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                    </div>
                    <span
                        key={currentMessageIndex}
                        className='text-sm font-medium text-blue-600 animate-slide-in'
                    >
                        {currentMessage.text}
                    </span>
                </div>

                {/* Animated progress bars with enhanced effects */}
                <div className='space-y-2'>
                    <div className='relative h-2 bg-gray-200 rounded-full w-3/4 overflow-hidden'>
                        <div className='absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full progress-fill'></div>
                        <div className='absolute inset-0 shimmer-effect rounded-full'></div>
                    </div>
                    <div className='relative h-2 bg-gray-200 rounded-full w-5/6 overflow-hidden'>
                        <div className='absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 rounded-full progress-fill' style={{ animationDelay: '0.5s' }}></div>
                        <div className='absolute inset-0 shimmer-effect rounded-full' style={{ animationDelay: '0.3s' }}></div>
                    </div>
                    <div className='relative h-2 bg-gray-200 rounded-full w-2/3 overflow-hidden'>
                        <div className='absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full progress-fill' style={{ animationDelay: '1s' }}></div>
                        <div className='absolute inset-0 shimmer-effect rounded-full' style={{ animationDelay: '0.6s' }}></div>
                    </div>
                </div>

                {/* Compliance tip section with enhanced styling and dynamic theming */}
                {(() => {
                    // Determine if this is a failure case or regular tip
                    const isFailureCase = currentTip.includes('💸') || currentTip.includes('🚨') || currentTip.includes('💰') ||
                        currentTip.includes('⚠️') || currentTip.includes('💔') || currentTip.includes('🔥') ||
                        currentTip.includes('📉') || currentTip.includes('🌍') || currentTip.includes('🏛️') ||
                        currentTip.includes('💊') || currentTip.includes('🎮') || currentTip.includes('🏨') ||
                        currentTip.includes('📺') || currentTip.includes('🛒') || currentTip.includes('🏥') ||
                        currentTip.includes('📱') || currentTip.includes('🏢') || currentTip.includes('💸') ||
                        currentTip.includes('Case study:') || currentTip.includes('Reality check:') ||
                        currentTip.includes('Shocking fact:') || currentTip.includes('Warning:') ||
                        currentTip.includes('Consequence:') || currentTip.includes('Failure cost:') ||
                        currentTip.includes('Reality:') || currentTip.includes('Disaster story:') ||
                        currentTip.includes('Stock impact:') || currentTip.includes('Medical nightmare:') ||
                        currentTip.includes('Retail reality:') || currentTip.includes('Financial pain:') ||
                        currentTip.includes('Global impact:') || currentTip.includes('Government fail:') ||
                        currentTip.includes('Pharma shock:') || currentTip.includes('Gaming lesson:') ||
                        currentTip.includes('Hospitality hit:') || currentTip.includes('Media mess:') ||
                        currentTip.includes('E-commerce error:');

                    const bgClasses = isFailureCase
                        ? 'bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 border-red-200'
                        : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200';

                    const iconBg = isFailureCase
                        ? 'from-red-500 to-pink-600'
                        : 'from-amber-400 to-orange-500';

                    const textColor = isFailureCase
                        ? 'text-red-900'
                        : 'text-amber-900';

                    const contentColor = isFailureCase
                        ? 'text-red-800'
                        : 'text-amber-800';

                    const accentColor = isFailureCase
                        ? 'via-red-400'
                        : 'via-amber-300';

                    const headerText = isFailureCase
                        ? '⚠️ Compliance Reality Check'
                        : '💡 Compliance Insight';

                    return (
                        <div className={`mt-4 p-4 ${bgClasses} border rounded-xl shadow-sm ${isFailureCase ? 'danger-glow warning-pulse' : 'animate-glow'}`}>
                            <div className='flex items-start gap-3'>
                                <div className={`w-8 h-8 bg-gradient-to-br ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md loading-pulse`}>
                                    {isFailureCase ? (
                                        <AlertCircle className='w-4 h-4 text-white' />
                                    ) : (
                                        <Info className='w-4 h-4 text-white' />
                                    )}
                                </div>
                                <div className='flex-1'>
                                    <div className='flex items-center gap-2 mb-2'>
                                        <div className={`text-xs font-bold ${textColor}`}>{headerText}</div>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${isFailureCase ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                    </div>
                                    <p
                                        key={currentTipIndex}
                                        className={`text-xs ${contentColor} leading-relaxed animate-slide-in font-medium`}
                                    >
                                        {currentTip}
                                    </p>
                                    {isFailureCase && (
                                        <div className='mt-2 text-[10px] text-red-600 font-semibold opacity-80 flex items-center gap-1'>
                                            <ShieldCheck className='w-3 h-3' />
                                            <span>Don't let this be your story - stay compliant!</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Dynamic accent line */}
                            <div className={`mt-3 h-0.5 bg-gradient-to-r from-transparent ${accentColor} to-transparent rounded-full`}></div>
                        </div>
                    );
                })()}

                {/* Processing steps indicator with enhanced styling */}
                <div className='flex items-center justify-center gap-4 text-xs text-gray-600 bg-gray-50 rounded-full px-4 py-2 border border-gray-100'>
                    <div className='flex items-center gap-2 group'>
                        <div className='relative'>
                            <div className='w-3 h-3 rounded-full bg-green-500 loading-pulse'></div>
                            <div className='absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20'></div>
                        </div>
                        <span className='font-medium group-hover:text-green-700 transition-colors'>Document parsed</span>
                    </div>
                    <div className='w-1 h-1 rounded-full bg-gray-300'></div>
                    <div className='flex items-center gap-2 group'>
                        <div className='relative'>
                            <div className='w-3 h-3 rounded-full bg-blue-500 loading-pulse' style={{ animationDelay: '0.5s' }}></div>
                            <div className='absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20' style={{ animationDelay: '0.5s' }}></div>
                        </div>
                        <span className='font-medium group-hover:text-blue-700 transition-colors'>AI analyzing</span>
                    </div>
                    <div className='w-1 h-1 rounded-full bg-gray-300'></div>
                    <div className='flex items-center gap-2 group'>
                        <div className='relative'>
                            <div className='w-3 h-3 rounded-full bg-purple-500 loading-pulse' style={{ animationDelay: '1s' }}></div>
                            <div className='absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20' style={{ animationDelay: '1s' }}></div>
                        </div>
                        <span className='font-medium group-hover:text-purple-700 transition-colors'>Generating insights</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Tool Payload Inspector Component
const ToolPayloadInspector = ({ payload }: { payload: any }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!payload || Object.keys(payload).length === 0) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Check if payload has meaningful data
    const hasData = Object.keys(payload).length > 0;
    const isComplexPayload = JSON.stringify(payload).length > 100;

    return (
        <div className='mt-4 animate-fade-in'>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className='w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-gray-200 rounded-xl transition-all duration-200 group'
            >
                <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md'>
                        <Database className='w-4 h-4 text-white' />
                    </div>
                    <div className='text-left'>
                        <div className='text-sm font-semibold text-gray-900 flex items-center gap-2'>
                            Tool Response Data
                            {hasData && (
                                <span className='px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full'>
                                    {Object.keys(payload).length} fields
                                </span>
                            )}
                        </div>
                        <div className='text-xs text-gray-500'>
                            {isExpanded ? 'Click to collapse' : 'Click to view raw data'}
                        </div>
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    {isExpanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopy();
                            }}
                            className='p-2 hover:bg-white rounded-lg transition-colors'
                        >
                            {copied ? (
                                <Check className='w-4 h-4 text-green-600' />
                            ) : (
                                <Copy className='w-4 h-4 text-gray-500' />
                            )}
                        </button>
                    )}
                    <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                            }`}
                    />
                </div>
            </button>

            {isExpanded && (
                <div className='mt-2 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm animate-fade-in'>
                    <div className='bg-gradient-to-r from-slate-800 to-gray-900 px-4 py-2 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <FileJson className='w-4 h-4 text-purple-400' />
                            <span className='text-xs font-mono text-gray-300'>JSON Response</span>
                        </div>
                        <span className='text-xs text-gray-400 font-mono'>
                            {(JSON.stringify(payload).length / 1024).toFixed(2)} KB
                        </span>
                    </div>
                    <div className='p-4 bg-slate-900 overflow-x-auto max-h-96 overflow-y-auto'>
                        <pre className='text-xs font-mono text-gray-300 leading-relaxed'>
                            <code>{JSON.stringify(payload, null, 2)}</code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

// Error Message Component
const ErrorBanner = ({ message }: { message: string }) => {
    if (!message) return null;

    return (
        <div className='mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-lg animate-fade-in'>
            <div className='flex items-start gap-3'>
                <div className='w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0'>
                    <XCircle className='w-5 h-5 text-red-600' />
                </div>
                <div className='flex-1'>
                    <h4 className='text-sm font-semibold text-red-900 mb-1'>Error Occurred</h4>
                    <p className='text-sm text-red-700 leading-relaxed'>{message}</p>
                </div>
            </div>
        </div>
    );
};

// Success Indicator Component
const SuccessIndicator = () => (
    <div className='mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg flex items-center gap-3 animate-fade-in'>
        <div className='w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0'>
            <CheckCircle2 className='w-4 h-4 text-green-600' />
        </div>
        <span className='text-sm font-medium text-green-800'>Analysis completed successfully</span>
    </div>
);

// Action Suggestions Component - Enhanced
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
            <div className='flex items-center gap-2 px-1'>
                <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md'>
                    <Sparkles className='w-4 h-4 text-white' />
                </div>
                <div>
                    <div className='text-sm font-bold text-gray-900'>Suggested Next Actions</div>
                    <div className='text-xs text-gray-500'>Click any action to execute</div>
                </div>
            </div>
            <div className='grid gap-3'>
                {actions.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onActionClick(item.description)}
                        className='group relative overflow-hidden text-left rounded-2xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]'
                        style={{
                            animationDelay: `${idx * 100}ms`,
                            animation: 'fade-in 0.5s ease-out both'
                        }}
                    >
                        {/* Gradient hover effect */}
                        <div className='absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />

                        {/* Shimmer effect */}
                        <div className='absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/60 to-transparent' />

                        <div className='relative p-5 flex items-start gap-4'>
                            <div className='flex-shrink-0'>
                                <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg'>
                                    <ArrowRight className='w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform' />
                                </div>
                            </div>

                            <div className='flex-1 min-w-0 pr-8'>
                                <div className='flex items-center gap-2 mb-2'>
                                    <h4 className='font-bold text-base text-gray-900 group-hover:text-blue-700 transition-colors'>
                                        {item.action}
                                    </h4>
                                    <div className='px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full'>
                                        Action {idx + 1}
                                    </div>
                                </div>
                                <p className='text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors'>
                                    {item.description}
                                </p>
                            </div>

                            <div className='absolute top-5 right-5'>
                                <div className='w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors'>
                                    <ChevronRight className='w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform' />
                                </div>
                            </div>
                        </div>

                        {/* Bottom accent line */}
                        <div className='h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left' />
                    </button>
                ))}
            </div>
        </div>
    );
};

// Custom markdown components
const MarkdownComponents = {
    h1: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h1 className='text-2xl md:text-3xl font-bold text-gray-900 mb-4 mt-6 pb-2 border-b-2 border-gradient-to-r from-blue-500 to-indigo-500 first:mt-0' {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
        <h2 className='text-xl md:text-2xl font-bold text-gray-800 mb-3 mt-5 flex items-center gap-2 first:mt-0' {...props}>
            <div className='w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full' />
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
            <div className='w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0' />
            <span className='flex-1'>{children}</span>
        </li>
    ),
    blockquote: ({ children, ...props }: React.HTMLProps<HTMLQuoteElement>) => (
        <blockquote className='border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 pl-3 md:pl-4 py-2 md:py-3 pr-3 md:pr-4 mb-4 rounded-r-lg' {...props}>
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
                <code className='px-2 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-md text-xs md:text-sm font-mono border border-purple-200' {...props}>
                    {children}
                </code>
            );
        }

        return (
            <div className='relative group mb-4 not-prose'>
                <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10'>
                    <button
                        onClick={handleCopy}
                        className='p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all hover:scale-110 active:scale-95 shadow-lg'>
                        {copied ? (
                            <Check className='w-4 h-4 text-green-400' />
                        ) : (
                            <Copy className='w-4 h-4 text-gray-300' />
                        )}
                    </button>
                </div>
                <div className='bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl overflow-hidden shadow-xl border border-gray-800'>
                    <div className='flex items-center justify-between px-4 py-2.5 bg-gray-800/50 border-b border-gray-700'>
                        <div className='flex items-center gap-2'>
                            <Code2 className='w-4 h-4 text-blue-400' />
                            <span className='text-xs text-gray-300 font-mono font-semibold'>
                                {className?.replace('language-', '') || 'code'}
                            </span>
                        </div>
                        <div className='flex gap-1.5'>
                            <div className='w-2 h-2 rounded-full bg-red-500' />
                            <div className='w-2 h-2 rounded-full bg-yellow-500' />
                            <div className='w-2 h-2 rounded-full bg-green-500' />
                        </div>
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
    pre: ({ children }: React.HTMLProps<HTMLPreElement>) => <>{children}</>,
    a: ({ children, href, ...props }: React.HTMLProps<HTMLAnchorElement>) => (
        <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 decoration-2 underline-offset-2 transition-all break-words font-medium'
            {...props}>
            {children}
        </a>
    ),
    table: ({ children, ...props }: React.HTMLProps<HTMLTableElement>) => (
        <div className='overflow-x-auto mb-4 -mx-2 md:mx-0 rounded-xl border border-gray-200 shadow-sm'>
            <table className='min-w-full divide-y divide-gray-200' {...props}>
                {children}
            </table>
        </div>
    ),
    thead: ({ children, ...props }: React.HTMLProps<HTMLTableSectionElement>) => (
        <thead className='bg-gradient-to-r from-gray-50 to-slate-50' {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <th className='px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300' {...props}>
            {children}
        </th>
    ),
    td: ({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) => (
        <td className='px-4 py-3 text-sm text-gray-700 border-t border-gray-100' {...props}>
            {children}
        </td>
    ),
    hr: () => <hr className='my-6 border-t-2 border-gray-200' />,
    strong: ({ children, ...props }: React.HTMLProps<HTMLElement>) => (
        <strong className='font-bold text-gray-900' {...props}>{children}</strong>
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
        // Auto-scroll to input
        setTimeout(() => {
            textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
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
                        toolPayload: response.tool_payload,
                        errorMessage: response.error_message,
                    },
                ];
            } else {
                return [
                    ...messagesWithoutLoading,
                    {
                        role: 'assistant' as const,
                        content: '❌ Failed to get response. Please try again.',
                        errorMessage: agentStates.chat.error || 'Unknown error occurred',
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

    const frameworkColors = {
        GDPR: { bg: 'from-blue-600 to-indigo-600', hover: 'from-blue-700 to-indigo-700', text: 'text-blue-600' },
        SOC2: { bg: 'from-purple-600 to-pink-600', hover: 'from-purple-700 to-pink-700', text: 'text-purple-600' },
        HIPAA: { bg: 'from-emerald-600 to-teal-600', hover: 'from-emerald-700 to-teal-700', text: 'text-emerald-600' },
    };

    const currentFrameworkColor = frameworkColors[frameworkId];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Messages */}
            <div className="flex flex-col flex-1 min-h-0">
                {/* Document Info & Framework Selector Bar */}
                <div className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
                    <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white rounded-full">
                                    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />
                                </div>
                            </div>
                            <div className="truncate flex-1">
                                <h2 className="text-base md:text-lg font-bold text-gray-900 truncate flex items-center gap-2">
                                    {selectedDocument.file_name}
                                    <div className="relative">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
                                    </div>
                                </h2>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Active analysis session
                                </p>
                            </div>
                        </div>

                        {/* Framework Selector */}
                        <div className="relative" ref={frameworkDropdownRef}>
                            <button
                                onClick={() => setIsFrameworkDropdownOpen(!isFrameworkDropdownOpen)}
                                className="relative group"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r ${currentFrameworkColor.bg} rounded-2xl opacity-75 blur-lg group-hover:opacity-100 transition-opacity duration-300`}></div>
                                <div className={`relative flex items-center gap-3 px-5 py-3 bg-gradient-to-br ${currentFrameworkColor.bg} hover:${currentFrameworkColor.hover} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20`}>
                                    <Shield className="w-5 h-5 text-white/90 flex-shrink-0" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-white/80 whitespace-nowrap hidden sm:inline">Framework:</span>
                                        <span className="text-sm font-bold text-white tracking-wide">{frameworkId}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-white/90 transition-transform duration-300 ${isFrameworkDropdownOpen ? 'rotate-180' : ''}`} />
                                    <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse flex-shrink-0"></div>
                                </div>
                            </button>

                            {/* Custom Dropdown Menu */}
                            {isFrameworkDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                                    <div className="p-2">
                                        {(['GDPR', 'SOC2', 'HIPAA'] as const).map((framework) => {
                                            const fwColor = frameworkColors[framework];
                                            return (
                                                <button
                                                    key={framework}
                                                    onClick={() => {
                                                        setFrameworkId(framework);
                                                        setIsFrameworkDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-3.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 group mb-1 last:mb-0 ${frameworkId === framework
                                                        ? `bg-gradient-to-r ${fwColor.bg} text-white shadow-lg scale-[1.02]`
                                                        : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 text-gray-700'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${frameworkId === framework
                                                        ? 'bg-white/20'
                                                        : `bg-gradient-to-br ${fwColor.bg}`
                                                        }`}>
                                                        <Shield className={`w-5 h-5 ${frameworkId === framework ? 'text-white' : 'text-white'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className={`font-bold text-sm mb-0.5 ${frameworkId === framework ? 'text-white' : 'text-gray-900'
                                                            }`}>
                                                            {framework}
                                                        </div>
                                                        <div className={`text-xs ${frameworkId === framework ? 'text-white/80' : 'text-gray-500'
                                                            }`}>
                                                            {framework === 'GDPR' && 'General Data Protection'}
                                                            {framework === 'SOC2' && 'Security & Compliance'}
                                                            {framework === 'HIPAA' && 'Healthcare Privacy'}
                                                        </div>
                                                    </div>
                                                    {frameworkId === framework && (
                                                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                                            <Check className="w-5 h-5 text-white flex-shrink-0" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
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
                    <div className="max-w-5xl mx-auto space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                                        <ShieldCheck className="w-12 h-12 text-white" />
                                    </div>
                                    {/* Multiple scanning rings */}
                                    <div className="absolute inset-0 rounded-3xl border-4 border-blue-400 animate-ping opacity-20" />
                                    <div className="absolute inset-0 rounded-3xl border-4 border-indigo-400 animate-ping opacity-15" style={{ animationDelay: '0.3s' }} />
                                    <div className="absolute inset-0 rounded-3xl border-4 border-purple-400 animate-ping opacity-10" style={{ animationDelay: '0.6s' }} />
                                </div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                                    Start Your Compliance Analysis
                                </h2>
                                <p className="text-gray-600 max-w-md mb-8 leading-relaxed">
                                    Ask questions about <span className="font-bold text-blue-600">{selectedDocument.file_name}</span> to get AI-powered compliance insights and recommendations
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 text-sm text-gray-600 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-blue-600" />
                                        Framework: {frameworkId}
                                    </div>
                                    <div className="px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 text-sm text-gray-600 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        Ready to analyze
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                        {msg.role === 'user' ? (
                                            <div className="max-w-[80%] sm:max-w-[70%]">
                                                <div className="inline-block px-6 py-4 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 text-white shadow-xl">
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-400 text-right">
                                                    Just now
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-full">
                                                {msg.isLoading ? (
                                                    <LoadingMessage />
                                                ) : (
                                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                                        <div className="p-6">
                                                            {/* Error Message if present */}
                                                            {msg.errorMessage && (
                                                                <ErrorBanner message={msg.errorMessage} />
                                                            )}

                                                            {/* Success indicator if no errors */}
                                                            {!msg.errorMessage && msg.content && (
                                                                <SuccessIndicator />
                                                            )}

                                                            {/* Main Content */}
                                                            <div className="prose prose-slate max-w-none">
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                                                    components={MarkdownComponents}
                                                                >
                                                                    {msg.content}
                                                                </ReactMarkdown>
                                                            </div>

                                                            {/* Tool Payload Inspector */}
                                                            {msg.toolPayload && Object.keys(msg.toolPayload).length > 0 && (
                                                                <ToolPayloadInspector payload={msg.toolPayload} />
                                                            )}

                                                            {/* Suggested Actions */}
                                                            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                                                <ActionSuggestions
                                                                    actions={msg.suggestedActions}
                                                                    onActionClick={handleActionClick}
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Footer with metadata */}
                                                        <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-100">
                                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                                                        AI-powered response
                                                                    </span>
                                                                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                                            {msg.suggestedActions.length} suggested actions
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span>Just now</span>
                                                            </div>
                                                        </div>
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
                <div className="flex-shrink-0 border-t border-gray-200 bg-white/95 backdrop-blur-xl shadow-2xl">
                    <div className="max-w-5xl mx-auto p-4">
                        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                            <div className="flex-1 relative">
                                <div className="absolute left-4 top-3.5 pointer-events-none">
                                    <div className={`w-2 h-2 rounded-full ${message.trim() ? 'bg-green-500' : 'bg-gray-300'} transition-colors`} />
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about compliance requirements, gaps, or request analysis..."
                                    rows={1}
                                    disabled={agentStates.chat.loading}
                                    className="w-full resize-none border-2 border-gray-200 rounded-2xl pl-8 pr-16 py-4 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                    style={{ maxHeight: '150px' }}
                                />
                                {message.trim() && (
                                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md">
                                            {message.length}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={!message.trim() || agentStates.chat.loading}
                                className={`px-6 py-4 bg-gradient-to-r ${currentFrameworkColor.bg} text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 shadow-xl relative overflow-hidden group`}
                            >
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                                <div className="relative flex items-center gap-2">
                                    {agentStates.chat.loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {agentStates.chat.loading ? 'Analyzing...' : 'Send'}
                                    </span>
                                </div>
                            </button>
                        </form>

                        {/* Keyboard shortcuts hint */}
                        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg font-mono text-[10px] shadow-sm">
                                    Enter
                                </kbd>
                                <span>Send message</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg font-mono text-[10px] shadow-sm">
                                    Shift
                                </kbd>
                                <span>+</span>
                                <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg font-mono text-[10px] shadow-sm">
                                    Enter
                                </kbd>
                                <span>New line</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-3 h-3" />
                                <span className="font-medium">{frameworkId}</span>
                                <span>active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}