'use client';

import React, { useState, useEffect } from 'react';
import {
    Shield,
    ShieldCheck,
    Sparkles,
    Zap,
    CheckCircle2,
    Loader2,
    Database,
    ArrowRight,
    AlertCircle,
    Info
} from 'lucide-react';

interface DynamicLoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    message?: string;
    fullScreen?: boolean;
    className?: string;
    showTips?: boolean;
}

export const DynamicLoader: React.FC<DynamicLoaderProps> = ({
    size = 'lg',
    message = "Advanced Compliance Analysis & Annotation Platform",
    fullScreen = false,
    className = '',
    showTips = true
}) => {
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
        }, 3000);

        return () => clearInterval(messageInterval);
    }, [loadingMessages.length]);

    // Rotate tips every 4 seconds (slightly offset from messages)
    useEffect(() => {
        if (!showTips) return;

        const tipInterval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % complianceTips.length);
        }, 4000);

        return () => clearInterval(tipInterval);
    }, [showTips, complianceTips.length]);

    const currentMessage = loadingMessages[currentMessageIndex];
    const currentTip = complianceTips[currentTipIndex];
    const MessageIcon = currentMessage.icon;

    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    const LoadingAnimation = () => (
        <div className='flex items-start gap-4 animate-fade-in'>
            <div className='relative'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center'>
                    <MessageIcon className='w-6 h-6 text-white loading-pulse' />
                </div>
                {/* Multiple scanning rings */}
                <div className='absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-20' />
                <div className='absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-30' style={{ animationDelay: '0.3s' }} />
                <div className='absolute inset-0 rounded-full border-2 border-purple-500 animate-ping opacity-20' style={{ animationDelay: '0.6s' }} />
            </div>
            <div className='flex-1 space-y-4 py-1 max-w-md'>
                {/* Main message */}
                <div className='text-center'>
                    <h3 className='text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2'>
                        {message}
                    </h3>
                </div>

                {/* Dynamic loading message */}
                <div className='flex items-center gap-2 justify-center min-h-[24px]'>
                    <div className='relative flex items-center gap-1'>
                        <MessageIcon className='w-4 h-4 text-blue-600 loading-pulse' style={{ animationDelay: '0.1s' }} />
                        <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                    </div>
                    <span
                        key={currentMessageIndex}
                        className='text-sm font-medium text-blue-600 animate-slide-in text-center'
                    >
                        {currentMessage.text}
                    </span>
                </div>

                {/* Animated progress bars */}
                <div className='space-y-2'>
                    <div className='relative h-2 bg-gray-200 rounded-full w-3/4 mx-auto overflow-hidden'>
                        <div className='absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full progress-fill'></div>
                        <div className='absolute inset-0 shimmer-effect rounded-full'></div>
                    </div>
                    <div className='relative h-2 bg-gray-200 rounded-full w-5/6 mx-auto overflow-hidden'>
                        <div className='absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 rounded-full progress-fill' style={{ animationDelay: '0.5s' }}></div>
                        <div className='absolute inset-0 shimmer-effect rounded-full' style={{ animationDelay: '0.3s' }}></div>
                    </div>
                    <div className='relative h-2 bg-gray-200 rounded-full w-2/3 mx-auto overflow-hidden'>
                        <div className='absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full progress-fill' style={{ animationDelay: '1s' }}></div>
                        <div className='absolute inset-0 shimmer-effect rounded-full' style={{ animationDelay: '0.6s' }}></div>
                    </div>
                </div>

                {/* Processing steps indicator */}
                <div className='flex items-center justify-center gap-4 text-xs text-gray-600 bg-gray-50 rounded-full px-4 py-2 border border-gray-100'>
                    <div className='flex items-center gap-2 group'>
                        <div className='relative'>
                            <div className='w-3 h-3 rounded-full bg-green-500 loading-pulse'></div>
                            <div className='absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20'></div>
                        </div>
                        <span className='font-medium group-hover:text-green-700 transition-colors'>Document loaded</span>
                    </div>
                    <div className='w-1 h-1 rounded-full bg-gray-300'></div>
                    <div className='flex items-center gap-2 group'>
                        <div className='relative'>
                            <div className='w-3 h-3 rounded-full bg-blue-500 loading-pulse' style={{ animationDelay: '0.5s' }}></div>
                            <div className='absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20' style={{ animationDelay: '0.5s' }}></div>
                        </div>
                        <span className='font-medium group-hover:text-blue-700 transition-colors'>AI processing</span>
                    </div>
                    <div className='w-1 h-1 rounded-full bg-gray-300'></div>
                    <div className='flex items-center gap-2 group'>
                        <div className='relative'>
                            <div className='w-3 h-3 rounded-full bg-purple-500 loading-pulse' style={{ animationDelay: '1s' }}></div>
                            <div className='absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20' style={{ animationDelay: '1s' }}></div>
                        </div>
                        <span className='font-medium group-hover:text-purple-700 transition-colors'>Ready soon</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const ComplianceTip = () => {
        if (!showTips) return null;

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
            <div className={`mt-6 p-4 ${bgClasses} border rounded-xl shadow-sm max-w-md mx-auto ${isFailureCase ? 'danger-glow warning-pulse' : 'animate-glow'}`}>
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
    };

    const content = (
        <div className={`flex flex-col items-center justify-center space-y-6 ${className}`}>
            <LoadingAnimation />
            <ComplianceTip />
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/50 max-w-2xl w-full">
                    {content}
                </div>
            </div>
        );
    }

    return content;
};