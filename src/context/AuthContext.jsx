import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const AUTH_URL = `${API_BASE}/api/auth`;

// Idle timeout: 4 hours in milliseconds
const IDLE_TIMEOUT = 4 * 60 * 60 * 1000;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('opusone-token'));
    const [loading, setLoading] = useState(true);
    const idleTimerRef = useRef(null);

    // Logout function
    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
    }, []);

    // Reset idle timer on user activity
    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        if (token) {
            idleTimerRef.current = setTimeout(() => {
                console.log('Session expired due to inactivity');
                logout();
            }, IDLE_TIMEOUT);
        }
    }, [token, logout]);

    // Set up activity listeners for idle timeout
    useEffect(() => {
        if (!token) return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetIdleTimer();
            // Update last activity timestamp
            localStorage.setItem('opusone-last-activity', Date.now().toString());
        };

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Check if session expired while tab was inactive
        const checkSessionOnFocus = () => {
            const lastActivity = localStorage.getItem('opusone-last-activity');
            if (lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity);
                if (elapsed > IDLE_TIMEOUT) {
                    console.log('Session expired while inactive');
                    logout();
                }
            }
        };

        window.addEventListener('focus', checkSessionOnFocus);

        // Start initial timer
        resetIdleTimer();

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            window.removeEventListener('focus', checkSessionOnFocus);
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
        };
    }, [token, resetIdleTimer, logout]);

    // Set up axios default headers when token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('opusone-token', token);
            localStorage.setItem('opusone-last-activity', Date.now().toString());
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('opusone-token');
            localStorage.removeItem('opusone-last-activity');
        }
    }, [token]);

    // Verify token and get user on mount
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            // Check if session expired
            const lastActivity = localStorage.getItem('opusone-last-activity');
            if (lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity);
                if (elapsed > IDLE_TIMEOUT) {
                    console.log('Session expired');
                    setToken(null);
                    setUser(null);
                    setLoading(false);
                    return;
                }
            }

            try {
                const res = await axios.get(`${AUTH_URL}/me`);
                setUser(res.data.user);
            } catch (err) {
                console.error('Token verification failed:', err);
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, []);

    // Axios interceptor to handle 401 errors (expired token)
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [logout]);

    const login = async (email, password) => {
        const res = await axios.post(`${AUTH_URL}/login`, { email, password });
        console.log('Login successful, setting user:', res.data.user);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (email, password, displayName) => {
        const res = await axios.post(`${AUTH_URL}/register`, { email, password, displayName });
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
