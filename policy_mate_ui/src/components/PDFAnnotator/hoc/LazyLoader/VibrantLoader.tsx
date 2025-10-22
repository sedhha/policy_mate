'use client';
// src/components/common/VibrantLoader.tsx
import React, { useState, useEffect } from 'react';

interface VibrantLoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
    message?: string;
    fullScreen?: boolean;
    className?: string;
    showFacts?: boolean;
}

export const VibrantLoader: React.FC<VibrantLoaderProps> = ({
    size = 'md',
    variant = 'spinner',
    message,
    fullScreen = false,
    className = '',
    showFacts = false
}) => {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [shuffledTips, setShuffledTips] = useState<string[]>([]);

    // Best practices and compliance tips (40% probability)
    const educationalTips = [
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
    ];

    // Real-world breaches and compliance failures (60% probability)
    const breachStories = [
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
        "🛒 E-commerce error: eBay breach affected 145M users, stock dropped 3.2% in one day",
        "🏦 Banking disaster: Wells Fargo paid $3B for fake account scandal affecting millions",
        "🚗 Auto industry: Volkswagen emissions scandal cost over $30B in fines and settlements",
        "☁️ Cloud breach: Microsoft Exchange hack compromised 30K+ US organizations in 2021",
        "💳 Payment fail: Heartland Payment Systems breach cost $140M affecting 130M cards",
        "🏪 Retail warning: T.J. Maxx breach exposed 94M cards, paid $256M in settlements",
        "🎓 Education risk: University of California paid $10.5M after patient data breach",
        "✈️ Travel industry: Cathay Pacific breach affected 9.4M passengers, paid $650K fine",
        "🏥 Healthcare alert: Premera Blue Cross paid $10M after 11M patient records exposed",
        "📧 Email disaster: SolarWinds hack compromised 18K+ organizations including US agencies",
        "🎪 Entertainment: Adult Friend Finder breach exposed 412M accounts, massive reputation hit"
    ];

    // Create weighted random mix: 60% breaches, 40% tips
    useEffect(() => {
        if (!showFacts) return;

        const createWeightedMix = () => {
            const mix: string[] = [];
            const totalItems = 50; // Total items in our rotation

            // Calculate counts based on 60:40 ratio
            const breachCount = Math.round(totalItems * 0.6); // 30 breach stories
            const tipCount = totalItems - breachCount; // 20 educational tips

            // Add breach stories (with repetition if needed)
            for (let i = 0; i < breachCount; i++) {
                mix.push(breachStories[i % breachStories.length]);
            }

            // Add educational tips (with repetition if needed)
            for (let i = 0; i < tipCount; i++) {
                mix.push(educationalTips[i % educationalTips.length]);
            }

            // Shuffle the mix using Fisher-Yates algorithm for true randomness
            for (let i = mix.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mix[i], mix[j]] = [mix[j], mix[i]];
            }

            return mix;
        };

        setShuffledTips(createWeightedMix());
    }, [showFacts]);

    // Rotate tips every 4 seconds
    useEffect(() => {
        if (!showFacts || shuffledTips.length === 0) return;

        const tipInterval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % shuffledTips.length);
        }, 4000);

        return () => clearInterval(tipInterval);
    }, [showFacts, shuffledTips.length]);

    const currentTip = shuffledTips[currentTipIndex] || educationalTips[0];
    const isBreach = currentTip.includes('€') || currentTip.includes('$') ||
        currentTip.includes('paid') || currentTip.includes('cost') ||
        currentTip.includes('breach') || currentTip.includes('fine') ||
        currentTip.includes('scandal') || currentTip.includes('hack');
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    const messageSizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
    };

    const SpinnerLoader = () => (
        <div className="relative">
            {/* Outer ring */}
            <div className={`${sizeClasses[size]} rounded-full border-4 border-gray-200 animate-spin`}>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"></div>
            </div>
            {/* Inner glow */}
            <div className={`absolute inset-2 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse`}></div>
        </div>
    );

    const DotsLoader = () => (
        <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={`${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-5 w-5'}
                              bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce`}
                    style={{
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: '1s'
                    }}
                ></div>
            ))}
        </div>
    );

    const PulseLoader = () => (
        <div className="relative">
            <div className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse`}></div>
            <div className={`absolute inset-0 ${sizeClasses[size]} bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-ping`}></div>
        </div>
    );

    const BarsLoader = () => (
        <div className="flex items-end space-x-1">
            {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className={`${size === 'sm' ? 'w-1' : size === 'md' ? 'w-1.5' : size === 'lg' ? 'w-2' : 'w-3'}
                              bg-gradient-to-t from-blue-500 to-indigo-500 rounded-sm animate-pulse`}
                    style={{
                        height: `${20 + (i * 8)}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '1.2s'
                    }}
                ></div>
            ))}
        </div>
    );

    const LoaderVariant = () => {
        switch (variant) {
            case 'dots':
                return <DotsLoader />;
            case 'pulse':
                return <PulseLoader />;
            case 'bars':
                return <BarsLoader />;
            default:
                return <SpinnerLoader />;
        }
    };

    const content = (
        <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
            <LoaderVariant />
            {message && (
                <div className="text-center">
                    <p className={`${messageSizeClasses[size]} font-medium bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
                        {message}
                    </p>
                    <div className="mt-2 flex justify-center">
                        <div className="flex space-x-1">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="h-1 w-1 bg-blue-400 rounded-full animate-pulse"
                                    style={{
                                        animationDelay: `${i * 0.3}s`,
                                        animationDuration: '1.5s'
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {showFacts && shuffledTips.length > 0 && (
                <div className="mt-6 max-w-lg px-4 animate-fade-in">
                    <div
                        key={currentTipIndex}
                        className={`
                            p-4 rounded-xl border transition-all duration-500
                            ${isBreach
                                ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200/50'
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50'
                            }
                            animate-slide-in
                        `}
                    >
                        <p className="text-sm text-gray-700 leading-relaxed text-center">
                            {currentTip}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50">
                    {content}
                </div>
            </div>
        );
    }

    return content;
};

// Convenient preset components for common use cases
export const FullScreenLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
    <VibrantLoader fullScreen variant="spinner" size="lg" message={message} />
);

export const InlineLoader: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
    message,
    size = 'md'
}) => (
    <VibrantLoader variant="dots" size={size} message={message} />
);

export const ButtonLoader: React.FC = () => (
    <VibrantLoader variant="spinner" size="sm" className="text-white" />
);
