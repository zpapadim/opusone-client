import { useState, useEffect } from 'react';
import { Music, Mail, Lock, User, X, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE } from '../constants';

const AuthModal = ({ darkMode, onClose, initialMode = 'login', resetToken = null }) => {
    const [mode, setMode] = useState(initialMode); // 'login', 'register', 'forgot', 'reset-sent', 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState(resetToken);

    const { login, register } = useAuth();

    // Check for reset token in URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
            setToken(urlToken);
            setMode('reset');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await login(email, password);
                // Don't call onClose - let the auth state change trigger App re-render
                // which will unmount LandingPage and this modal naturally
            } else if (mode === 'register') {
                await register(email, password, displayName);
                // Same as login
            } else if (mode === 'forgot') {
                await axios.post(`${API_BASE}/api/auth/forgot-password`, { email });
                setMode('reset-sent');
            } else if (mode === 'reset') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                await axios.post(`${API_BASE}/api/auth/reset-password`, {
                    token,
                    newPassword: password
                });
                setMode('reset-success');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'register': return 'Create Account';
            case 'forgot': return 'Reset Password';
            case 'reset-sent': return 'Check Your Email';
            case 'reset': return 'Set New Password';
            case 'reset-success': return 'Password Reset!';
            default: return 'Welcome Back';
        }
    };

    const getSubtitle = () => {
        switch (mode) {
            case 'register': return 'Start organizing your sheet music';
            case 'forgot': return 'Enter your email to reset password';
            case 'reset-sent': return 'Password reset instructions sent';
            case 'reset': return 'Enter your new password below';
            case 'reset-success': return 'Your password has been updated';
            default: return 'Sign in to your OpusOne account';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}>
                {/* Header */}
                <div className={`px-6 py-8 text-center ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-indigo-600 to-purple-600'}`}>
                    <div className="flex justify-between -mt-4 -mx-2">
                        {mode !== 'login' && mode !== 'reset-sent' ? (
                            <button
                                onClick={() => { setMode('login'); setError(''); }}
                                className="text-white/70 hover:text-white p-1 flex items-center gap-1 text-sm"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                        ) : <div />}
                        <button onClick={onClose} className="text-white/70 hover:text-white p-1">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        {mode === 'reset-sent' ? (
                            <CheckCircle className="w-8 h-8 text-white" />
                        ) : (
                            <Music className="w-8 h-8 text-white" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
                    <p className="text-white/70 text-sm mt-1">{getSubtitle()}</p>
                </div>

                {/* Reset Sent / Reset Success Confirmation */}
                {mode === 'reset-sent' || mode === 'reset-success' ? (
                    <div className="p-6 text-center">
                        <p className={`mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {mode === 'reset-sent'
                                ? <>If an account exists for <strong>{email}</strong>, you will receive password reset instructions.</>
                                : 'Your password has been successfully reset. You can now sign in with your new password.'
                            }
                        </p>
                        <button
                            onClick={() => { setMode('login'); setEmail(''); setPassword(''); setConfirmPassword(''); }}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                        >
                            {mode === 'reset-sent' ? 'Back to Sign In' : 'Sign In Now'}
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label className={`text-xs font-medium block mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Display Name
                                </label>
                                <div className="relative">
                                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your name"
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            darkMode
                                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        {mode !== 'reset' && (
                            <div>
                                <label className={`text-xs font-medium block mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            darkMode
                                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        {(mode !== 'forgot') && (
                            <div>
                                <label className={`text-xs font-medium block mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {mode === 'reset' ? 'New Password' : 'Password'}
                                </label>
                                <div className="relative">
                                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={mode === 'login' ? 'Enter password' : 'Min 6 characters'}
                                        required
                                        minLength={6}
                                        className={`w-full pl-10 pr-10 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            darkMode
                                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'reset' && (
                            <div>
                                <label className={`text-xs font-medium block mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        required
                                        minLength={6}
                                        className={`w-full pl-10 pr-10 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            darkMode
                                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'login' && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => { setMode('forgot'); setError(''); }}
                                    className={`text-xs ${darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {mode === 'login' ? 'Signing in...' : mode === 'register' ? 'Creating account...' : mode === 'reset' ? 'Resetting...' : 'Sending...'}
                                </span>
                            ) : (
                                mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'reset' ? 'Reset Password' : 'Send Reset Link'
                            )}
                        </button>

                        {mode === 'login' && (
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setMode('register'); setError(''); }}
                                    className={`text-sm ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                >
                                    Don't have an account? Sign up
                                </button>
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); }}
                                    className={`text-sm ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                >
                                    Already have an account? Sign in
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
