import { X } from 'lucide-react';

const SHORTCUTS = [
    ['←/→', 'Previous/Next page'],
    ['+/-', 'Zoom in/out'],
    ['F', 'Toggle fullscreen'],
    ['D', 'Toggle dual page'],
    ['M', 'Toggle metronome'],
    ['Space', 'Start/stop metronome'],
    ['Ctrl+S', 'Save changes'],
    ['Esc', 'Exit fullscreen/close modal'],
    ['?', 'Show this help'],
];

const KeyboardShortcutsModal = ({ darkMode, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-md p-6`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        Keyboard Shortcuts
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20}/>
                    </button>
                </div>
                <div className="space-y-2 text-sm">
                    {SHORTCUTS.map(([key, desc]) => (
                        <div key={key} className="flex justify-between">
                            <kbd className={`px-2 py-1 rounded text-xs font-mono ${
                                darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {key}
                            </kbd>
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                                {desc}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsModal;
