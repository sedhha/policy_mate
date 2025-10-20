'use client';
import { useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerReducer, registerState } from '@/reducers/register.reducer';
import { registerWithAwsCognito, confirmRegistration, resendConfirmationCode } from '@/utils/registerUser';
import { loginWithAwsCognito } from '@/utils/loginUser';
import { useAuthStore } from '@/stores/authStore';
import {
    UserPlus,
    Mail,
    Lock,
    User,
    ArrowRight,
    Shield,
    CheckCircle,
    Sparkles,
    Zap,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';

const RegisterPage = () => {
    const [state, dispatch] = useReducer(registerReducer, registerState);
    const { setIdToken } = useAuthStore();
    const router = useRouter();
    const [confirmationSuccess, setConfirmationSuccess] = useState(false);

    const {
        email,
        password,
        confirmPassword,
        username,
        firstName,
        lastName,
        isLoading,
        error,
        showConfirmation,
        confirmationCode,
        resendingCode,
    } = state;

    // Field change handlers
    const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_EMAIL', payload: e.target.value });
    };

    const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_PASSWORD', payload: e.target.value });
    };

    const onConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_CONFIRM_PASSWORD', payload: e.target.value });
    };

    const onUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_USERNAME', payload: e.target.value });
    };

    const onFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_FIRST_NAME', payload: e.target.value });
    };

    const onLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_LAST_NAME', payload: e.target.value });
    };

    const onConfirmationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ actionType: 'UPDATE_CONFIRMATION_CODE', payload: e.target.value });
    };

    // Validation
    const validateForm = (): string | null => {
        if (!username.trim()) {
            return 'Username is required';
        }
        if (username.length < 3) {
            return 'Username must be at least 3 characters long';
        }
        if (!email.trim()) {
            return 'Email is required';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return 'Please enter a valid email address';
        }
        if (!password) {
            return 'Password is required';
        }
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        if (password !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };

    // Handle registration submission
    const onRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            dispatch({ actionType: 'SET_ERROR', payload: validationError });
            return;
        }

        dispatch({ actionType: 'SET_LOADING', payload: true });
        dispatch({ actionType: 'SET_ERROR', payload: undefined });

        const result = await registerWithAwsCognito({
            email,
            password,
            username,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
        });

        if (result.error) {
            dispatch({ actionType: 'SET_ERROR', payload: result.error });
            dispatch({ actionType: 'SET_LOADING', payload: false });
        } else {
            // Registration successful, show confirmation step
            dispatch({ actionType: 'SET_LOADING', payload: false });
            dispatch({ actionType: 'SET_SHOW_CONFIRMATION', payload: true });
        }
    };

    // Handle confirmation submission
    const onConfirmationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!confirmationCode.trim()) {
            dispatch({ actionType: 'SET_ERROR', payload: 'Please enter the confirmation code' });
            return;
        }

        dispatch({ actionType: 'SET_LOADING', payload: true });
        dispatch({ actionType: 'SET_ERROR', payload: undefined });

        const result = await confirmRegistration(username, confirmationCode.trim());

        if (result.error) {
            dispatch({ actionType: 'SET_ERROR', payload: result.error });
            dispatch({ actionType: 'SET_LOADING', payload: false });
        } else {
            // Confirmation successful, auto-login the user
            setConfirmationSuccess(true);

            // Auto-login after successful confirmation
            const loginResult = await loginWithAwsCognito(username, password);

            if (loginResult.error) {
                // If auto-login fails, redirect to login page
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else if (loginResult.data?.AuthenticationResult?.IdToken) {
                setIdToken(loginResult.data.AuthenticationResult.IdToken);
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            }

            dispatch({ actionType: 'SET_LOADING', payload: false });
        }
    };

    // Handle resend confirmation code
    const onResendCode = async () => {
        dispatch({ actionType: 'SET_RESENDING_CODE', payload: true });
        dispatch({ actionType: 'SET_ERROR', payload: undefined });

        const result = await resendConfirmationCode(username);

        if (result.error) {
            dispatch({ actionType: 'SET_ERROR', payload: result.error });
        } else {
            dispatch({ actionType: 'SET_ERROR', payload: 'Confirmation code resent successfully!' });
        }

        dispatch({ actionType: 'SET_RESENDING_CODE', payload: false });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            if (showConfirmation) {
                onConfirmationSubmit(e as unknown as React.FormEvent);
            } else {
                onRegisterSubmit(e as unknown as React.FormEvent);
            }
        }
    };

    // Loading state during processing
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
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-spin-slow"></div>
                        <div className="absolute inset-2 rounded-full border-4 border-white/30 animate-spin-reverse"></div>
                        <div className="absolute inset-4 rounded-full border-4 border-white/40 animate-spin-slow"></div>

                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                <Shield className="w-16 h-16 text-white animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <UserPlus className="w-8 h-8 text-emerald-200 animate-bounce" />
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
                            {showConfirmation ? 'Confirming Account' : 'Creating Account'}
                        </h2>
                        <p className="text-blue-100 text-lg animate-fade-in-delay">
                            {showConfirmation ? 'Verifying your email...' : 'Setting up your profile...'}
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

    // Success state after confirmation
    if (confirmationSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl animate-pulse delay-700"></div>
                </div>

                <div className="max-w-md w-full relative z-10">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 backdrop-blur-sm">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center animate-scale-in shadow-lg">
                                    <CheckCircle className="w-12 h-12 text-white animate-check-in" />
                                </div>
                                <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-ping"></div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2 animate-fade-in">
                            Account Created Successfully! 🎉
                        </h2>
                        <p className="text-center text-gray-600 mb-6 animate-fade-in-delay">
                            Redirecting you to your dashboard...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Email confirmation step
    if (showConfirmation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="max-w-md w-full relative z-10">
                    <div className="text-center mb-8 animate-fade-in">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-xl">
                            <Mail className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Verify Your Email
                        </h1>
                        <p className="text-gray-600">
                            We've sent a confirmation code to <strong>{email}</strong>
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-100 animate-fade-in-delay">
                        <form onSubmit={onConfirmationSubmit} className="space-y-6">
                            <div className="group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirmation Code
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={confirmationCode}
                                    onChange={onConfirmationCodeChange}
                                    onKeyPress={handleKeyPress}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400 text-center text-2xl tracking-widest"
                                    maxLength={6}
                                />
                            </div>

                            {error && (
                                <div className={`${error.includes('success') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4 animate-shake`}>
                                    <p className={`${error.includes('success') ? 'text-green-700' : 'text-red-700'} text-sm font-medium flex items-center gap-2`}>
                                        <span className={`w-2 h-2 ${error.includes('success') ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></span>
                                        {error}
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group active:scale-[0.98]"
                            >
                                <span className="flex items-center gap-2">
                                    Confirm Email
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>

                            <div className="text-center space-y-2">
                                <p className="text-sm text-gray-600">
                                    Didn't receive the code?
                                </p>
                                <button
                                    type="button"
                                    onClick={onResendCode}
                                    disabled={resendingCode}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors hover:underline disabled:opacity-50 flex items-center gap-2 mx-auto"
                                >
                                    <RefreshCw className={`w-4 h-4 ${resendingCode ? 'animate-spin' : ''}`} />
                                    Resend Code
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="text-center mt-6 text-sm text-gray-600">
                        <button
                            onClick={() => dispatch({ actionType: 'SET_SHOW_CONFIRMATION', payload: false })}
                            className="text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
                        >
                            ← Back to registration
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Registration form
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
                        <UserPlus className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Join PolicyMate
                    </h1>
                    <p className="text-gray-600">Create your account to get started</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-100 animate-fade-in-delay">
                    <form onSubmit={onRegisterSubmit} className="space-y-6">
                        {/* Name fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={firstName}
                                    onChange={onFirstNameChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Doe"
                                    value={lastName}
                                    onChange={onLastNameChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                                Username *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="johndoe"
                                    value={username}
                                    onChange={onUsernameChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                                Email Address *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={onEmailChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                                Password *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={onPasswordChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Must be 8+ characters with uppercase, lowercase, and number
                            </p>
                        </div>

                        {/* Confirm Password */}
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-2 group-focus-within:text-blue-600 transition-colors">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={onConfirmPasswordChange}
                                    onKeyPress={handleKeyPress}
                                    required
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none hover:border-gray-400"
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-shake">
                                <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group active:scale-[0.98] relative overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                            <span className="relative flex items-center gap-2">
                                Create Account
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-600 animate-fade-in-delay">
                    Already have an account?{' '}
                    <a
                        href="/login"
                        className="text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
                    >
                        Sign in
                    </a>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
