import { useState } from 'react';
import { Music, FileText, Folder, Search, Pencil, Play } from 'lucide-react';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';

const LandingPage = ({ darkMode }) => {
    const { isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

    // If authenticated, return null to let App render main interface
    if (isAuthenticated) {
        return null;
    }

    const features = [
        { icon: FileText, title: 'Organize Sheets', description: 'Store and categorize all your sheet music in one place' },
        { icon: Folder, title: 'Smart Folders', description: 'Create folders and tag sheets for easy organization' },
        { icon: Search, title: 'Quick Search', description: 'Find any piece by title, composer, or tags instantly' },
        { icon: Pencil, title: 'Annotations', description: 'Draw, highlight, and add notes directly on your sheets' },
        { icon: Play, title: 'Practice Mode', description: 'Built-in metronome and page looping for practice sessions' },
    ];

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'}`}>
            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal darkMode={darkMode} onClose={() => setShowAuthModal(false)} />
            )}

            {/* Header */}
            <header className={`px-6 py-4 flex justify-between items-center ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Music className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>OpusOne</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Get Started
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h1 className={`text-5xl md:text-6xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Your Sheet Music,
                        <span className="text-indigo-600"> Organized</span>
                    </h1>
                    <p className={`text-xl max-w-2xl mx-auto mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        The ultimate digital library for musicians. Store, annotate, and practice with your sheet music collection.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-medium transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40"
                        >
                            Start Free
                        </button>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className={`px-8 py-3 rounded-xl text-lg font-medium transition-colors ${
                                darkMode
                                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                            }`}
                        >
                            Sign In
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`p-6 rounded-2xl transition-all hover:scale-105 ${
                                darkMode
                                    ? 'bg-slate-800/50 hover:bg-slate-800'
                                    : 'bg-white hover:shadow-lg'
                            }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                                darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
                            }`}>
                                <feature.icon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {feature.title}
                            </h3>
                            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Preview Image Placeholder */}
                <div className={`rounded-2xl overflow-hidden shadow-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className={`h-96 flex items-center justify-center ${darkMode ? 'bg-slate-700/50' : 'bg-gradient-to-br from-indigo-100 to-purple-100'}`}>
                        <div className="text-center">
                            <Music className={`w-20 h-20 mx-auto mb-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-300'}`} />
                            <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Your music library awaits
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className={`px-6 py-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <p className="text-sm">OpusOne - Sheet Music Manager</p>
            </footer>
        </div>
    );
};

export default LandingPage;
