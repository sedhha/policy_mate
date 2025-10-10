'use client';
import { loginWithAwsCognito } from '@/utils/loginUser';
import { useReducer } from 'react';
import { loginReducer, loginState } from '@/reducers/login.reducer';
import { useAuthStore } from '@/stores/authStore';
import { Lock, Mail, ArrowRight, Shield, CheckCircle } from 'lucide-react';

const LoginPage = () => {
    const [{ username, password, error, isLoading }, dispatch] = useReducer(
        loginReducer,
        loginState
    );

    const { setIdToken, idToken, user } = useAuthStore();

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
                    dispatch({ actionType: 'SET_ERROR', payload: undefined });
                } else {
                    dispatch({ actionType: 'SET_ERROR', payload: 'Login failed' });
                }
            }).finally(() => {
                dispatch({ actionType: 'SET_LOADING', payload: false });
            });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            onClick();
        }
    };

    if (idToken && user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                            Hello @{user.username || user.email || 'user'}!
                        </h2>
                        <p className="text-center text-gray-600 mb-6">
                            You're already logged in.
                        </p>
                        <a
                            href="/"
                            className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold text-center hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to PolicyMate</h1>
                    <p className="text-gray-600">Sign in to continue to your account</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                    <div className="space-y-6">
                        {/* Username Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={onUsernameChange}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={onPasswordChange}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            onClick={onClick}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        {/* Forgot Password Link */}
                        <div className="text-center">
                            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                                Forgot your password?
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-600">
                    Don't have an account?{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                        Sign up
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;