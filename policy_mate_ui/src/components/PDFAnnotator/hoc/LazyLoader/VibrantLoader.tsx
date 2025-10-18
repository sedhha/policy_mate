'use client';
// src/components/common/VibrantLoader.tsx
import React from 'react';

interface VibrantLoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
    message?: string;
    fullScreen?: boolean;
    className?: string;
}

export const VibrantLoader: React.FC<VibrantLoaderProps> = ({
    size = 'md',
    variant = 'spinner',
    message,
    fullScreen = false,
    className = ''
}) => {
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
