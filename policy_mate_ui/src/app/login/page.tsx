// filePath: policy_mate_ui/src/app/login/page.tsx
'use client';
import { loginWithAwsCognito } from '@/utils/loginUser';
import { useReducer } from 'react';
import { loginReducer, loginState } from '@/reducers/login.reducer';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Shield, CheckCircle, Sparkles, Zap, LogOut } from 'lucide-react';

const LoginPage = () => {
    const [{ username, password, error, isLoading }, dispatch] = useReducer(
        loginReducer,
        loginState
    );

    const { setIdToken, idToken, user, clearAuth } = useAuthStore();
    const router = useRouter();

    const onUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_USERNAME', payload: e.target.value });
    };

    const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_PASSWORD', payload: e.target.value });
    };

    const onClick = async () => {
        if (isLoading) return;
        dispatch({ actionType: 'SET_LOADING', payload: true });
        await loginWithAwsCognito(username, password)
            .then(response => {
                if (response.error) {
                    dispatch({ actionType: 'SET_ERROR', payload: response.error });
                    return;
                }
                if (response.data?.AuthenticationResult?.IdToken) {
                    setIdToken(response.data?.AuthenticationResult?.IdToken);
                    dispatch({ actionType: 'SET_LOADING', payload: false });
                    dispatch({ actionType: 'SET_ERROR', payload: undefined });
                    router.push('/');
                } else {
                    dispatch({ actionType: 'SET_ERROR', payload: 'Login failed' });
                }
            }).finally(() => {
                dispatch({ actionType: 'SET_LOADING', payload: false });
            });
    };

    const handleLogout = () => {
        clearAuth();
        // Reload the page to reset all state
        window.location.reload();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            onClick();
        }
    };

    // Loading overlay during authentication
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
                {/* Animated background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse delay-700"></div>
                    <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-indigo-400/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
                </div>

                {/* Main content */}
                <div className="relative z-10 text-center">
                    {/* Animated lock container */}
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-spin-slow"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-white/30 animate-spin-reverse"></div>
                        <div className="absolute inset-4 rounded-full border-4 border-white/40 animate-spin-slow"></div>

                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                <Shield className="w-16 h-16 text-white animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-blue-200 animate-bounce" />
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-0 animate-orbit">
                            <Sparkles className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-yellow-300" />
                        </div>
                        <div className="absolute inset-0 animate-orbit-reverse">
                            <Zap className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-6 text-green-300" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-white animate-fade-in">
                            Authenticating
                        </h2>
                        <p className="text-blue-100 text-lg animate-fade-in-delay">
                            Securing your session...
                        </p>
                    </div>

                    <div className="flex justify-center gap-2 mt-8">
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-150"></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce delay-300"></div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
        );
    }

    // Already logged in - show message with logout option
    if (idToken && user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl animate-pulse delay-700"></div>
                </div>

                <div className="max-w-md w-full relative z-10">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 backdrop-blur-sm">
                        {/* Success animation */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center animate-scale-in shadow-lg">
                                    <CheckCircle className="w-12 h-12 text-white animate-check-in" />
                                </div>
                                <div className="absolute inset-0 bg-emerald-400/30 rounded-full animate-ping"></div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2 animate-fade-in">
                            Welcome back, {user.username || user.email || 'user'}! 👋
                        </h2>
                        <p className="text-center text-gray-600 mb-6 animate-fade-in-delay">
                            You're already logged in.
                        </p>

                        <div className="space-y-3">
                            <a
                                href="/"
                                className="block w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-semibold text-center hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl group"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    Go to Dashboard
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </a>

                            <button
                                onClick={handleLogout}
                                className="cursor-pointer w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md group flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-5 h-5" />
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Login form
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>

            <div className="max-w-md w-full relative z-10">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                        <Shield className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        PolicyMate
                    </h1>
                    <p className="text-gray-600">Sign in to continue to your account</p>
                </div>

                {/* Login Form */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-100 animate-fade-in-delay">
                    <div className="space-y-6">
                        {/* Username Input */}
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={onUsernameChange}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={onPasswordChange}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-shake">
                                <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            onClick={onClick}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group active:scale-[0.98] relative overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                            <span className="relative flex items-center gap-2">
                                Sign In
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>

                        {/* Forgot Password Link */}
                        <div className="text-center">
                            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline">
                                Forgot your password?
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-600 animate-fade-in-delay">
                    Don't have an account?{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline">
                        Sign up
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;