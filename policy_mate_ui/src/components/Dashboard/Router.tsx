// filePath: policy_mate_ui/src/components/Dashboard/Router.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore, isTokenExpired } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import { Shield, Lock, Key, CheckCircle } from 'lucide-react';

export const Router = () => {
    const { idToken, clearAuth } = useAuthStore();
    const router = useRouter();
    const [isHydrated, setIsHydrated] = useState(false);

    // Wait for Zustand to hydrate from sessionStorage
    useEffect(() => {
        const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
            setIsHydrated(true);
        });

        // If already hydrated, set immediately
        if (useAuthStore.persist.hasHydrated()) {
            setIsHydrated(true);
        }

        return unsubscribe;
    }, []);

    // Only check auth after hydration is complete
    useEffect(() => {
        if (!isHydrated) return;

        // Check if token is missing
        if (!idToken) {
            router.push('/login');
            return;
        }

        // Check if token has expired
        if (isTokenExpired(idToken)) {
            clearAuth(); // Clear expired token from store
            router.push('/login');
            return;
        }
    }, [idToken, router, isHydrated, clearAuth]);

    // Periodic token expiration check (every 60 seconds)
    useEffect(() => {
        if (!isHydrated || !idToken) return;

        const intervalId = setInterval(() => {
            if (isTokenExpired(idToken)) {
                clearAuth();
                router.push('/login');
            }
        }, 60000); // Check every 60 seconds

        return () => clearInterval(intervalId);
    }, [idToken, router, isHydrated, clearAuth]);

    // Show loading while hydrating or if no token (before redirect)
    if (!isHydrated || !idToken) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    {/* Floating orbs */}
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse delay-700"></div>
                    <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-indigo-400/30 rounded-full blur-3xl animate-pulse delay-1000"></div>

                    {/* Animated grid pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
                </div>

                {/* Main content */}
                <div className="relative z-10 text-center">
                    {/* Animated shield container */}
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        {/* Outer rotating ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-spin-slow"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-white/30 animate-spin-reverse"></div>
                        <div className="absolute inset-4 rounded-full border-4 border-white/40 animate-spin-slow"></div>

                        {/* Center shield */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                <Shield className="w-16 h-16 text-white animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-blue-200 animate-bounce" />
                                </div>
                            </div>
                        </div>

                        {/* Orbiting icons */}
                        <div className="absolute inset-0 animate-orbit">
                            <Key className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-yellow-300" />
                        </div>
                        <div className="absolute inset-0 animate-orbit-reverse">
                            <CheckCircle className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-6 text-green-300" />
                        </div>
                    </div>

                    {/* Text content */}
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-white animate-fade-in">
                            Securing Your Session
                        </h2>
                        <p className="text-blue-100 text-lg animate-fade-in-delay">
                            {!isHydrated ? 'Loading session...' : 'Verifying credentials...'}
                        </p>
                    </div>

                    {/* Loading dots */}
                    <div className="flex justify-center gap-2 mt-8">
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-150"></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-300"></div>
                    </div>
                </div>

                {/* Bottom gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
        );
    }

    return null;
};