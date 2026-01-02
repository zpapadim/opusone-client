import { useState } from 'react';
import { Music, FileText, Folder, Search, Pencil, Play, ChevronRight, Star } from 'lucide-react';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';

const LandingPage = ({ darkMode }) => {
    const { isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // If authenticated, return null to let App render main interface
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className={`min-h-screen font-sans selection:bg-indigo-500 selection:text-white ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal darkMode={darkMode} onClose={() => setShowAuthModal(false)} />
            )}

            {/* Navbar */}
            <nav className={`fixed w-full z-40 transition-all duration-300 ${darkMode ? 'bg-slate-950/80 border-b border-slate-800' : 'bg-white/80 border-b border-slate-100'} backdrop-blur-md`}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="bg-indigo-600 p-2.5 rounded-xl transform transition-transform group-hover:rotate-12 group-hover:scale-110 shadow-lg shadow-indigo-600/20">
                            <Music className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">OpusOne</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className={`px-5 py-2.5 text-sm font-medium transition-colors ${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className={`absolute top-20 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 ${darkMode ? 'bg-indigo-600' : 'bg-indigo-400'}`} />
                    <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 ${darkMode ? 'bg-purple-600' : 'bg-purple-400'}`} />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="max-w-3xl">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 border ${
                            darkMode ? 'bg-slate-900 border-slate-700 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        }`}>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            v1.0 is now live
                        </div>
                        <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.1] mb-8">
                            Master your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">musical library.</span>
                        </h1>
                        <p className={`text-xl md:text-2xl leading-relaxed mb-10 max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            The definitive platform for musicians to organize sheet music, 
                            annotate scores, and practice with purpose.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-lg font-semibold transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1 flex items-center justify-center gap-2 group"
                            >
                                Start for Free 
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className={`px-8 py-4 rounded-full text-lg font-semibold transition-all border flex items-center justify-center gap-2 group ${
                                    darkMode
                                        ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Watch Demo
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className={`py-24 ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: FileText, title: 'Centralized Library', desc: 'Upload PDF and image scores. We automatically index them with OCR technology.' },
                            { icon: Pencil, title: 'Rich Annotations', desc: 'Mark up your scores with precision tools. Highlights, text, and freehand drawing.' },
                            { icon: Play, title: 'Practice Suite', desc: 'Built-in metronome, loop sections, and auto-scroll for hands-free practice.' },
                            { icon: Search, title: 'Smart Search', desc: 'Find any piece instantly by composer, key, difficulty, or custom tags.' },
                            { icon: Folder, title: 'Organization', desc: 'Create nested collections and playlists for concerts or students.' },
                            { icon: Star, title: 'Secure Cloud', desc: 'Your library syncs across all devices. Never lose a page again.' }
                        ].map((feature, i) => (
                            <div key={i} className={`p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 ${
                                darkMode ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800' : 'bg-white hover:shadow-xl hover:shadow-indigo-900/5 border border-slate-100'
                            }`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                                    darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                    <feature.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className={`leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to compose your legacy?</h2>
                    <p className={`text-xl mb-10 max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Join thousands of musicians who have elevated their practice with OpusOne.
                    </p>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xl font-semibold transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1"
                    >
                        Get Started Now
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className={`py-12 border-t ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-white'}`}>
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 opacity-50">
                        <Music className="w-5 h-5" />
                        <span className="font-semibold">OpusOne</span>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        © {new Date().getFullYear()} OpusOne. Built for musicians.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;