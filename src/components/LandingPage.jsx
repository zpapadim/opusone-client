import { useState } from 'react';
import { Music, ArrowRight, Lock } from 'lucide-react';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';

const LandingPage = ({ darkMode }) => {
    const { isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    if (isAuthenticated) return null;

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 ${
            darkMode ? 'bg-slate-950 text-slate-200' : 'bg-[#f8f9fa] text-slate-800'
        }`}>
            {showAuthModal && (
                <AuthModal darkMode={darkMode} onClose={() => setShowAuthModal(false)} />
            )}

            <main className="w-full max-w-md px-6 text-center animate-fade-in">
                {/* Logo / Icon */}
                <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-2xl ${
                    darkMode ? 'bg-indigo-900/30 shadow-indigo-900/20' : 'bg-white shadow-slate-200'
                }`}>
                    <Music strokeWidth={1} size={48} className={darkMode ? 'text-indigo-400' : 'text-slate-700'} />
                </div>

                {/* Title */}
                <h1 className="text-4xl font-serif tracking-tight font-medium mb-3">
                    OpusOne
                </h1>
                <p className={`text-sm tracking-widest uppercase mb-12 ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                    Personal Music Archive
                </p>

                {/* Login Action */}
                <div className="space-y-4">
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className={`group w-full py-4 px-6 rounded-xl flex items-center justify-between transition-all duration-300 ${
                            darkMode 
                                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800' 
                                : 'bg-white hover:bg-white/80 text-slate-600 shadow-sm hover:shadow-md border border-slate-100'
                        }`}
                    >
                        <span className="flex items-center gap-3">
                            <Lock size={18} className="opacity-50" />
                            <span className="font-medium">Enter Library</span>
                        </span>
                        <ArrowRight size={18} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Footer */}
                <footer className={`mt-16 text-xs ${darkMode ? 'text-slate-700' : 'text-slate-400'}`}>
                    {new Date().getFullYear()} • Private Collection
                </footer>
            </main>
        </div>
    );
};

export default LandingPage;
