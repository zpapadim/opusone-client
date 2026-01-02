import { X, Play, Square } from 'lucide-react';

const Metronome = ({ bpm, setBpm, isPlaying, setIsPlaying, onClose }) => {
    return (
        <div className="absolute top-16 right-4 z-30 bg-slate-800 text-white p-4 rounded-xl shadow-xl w-48 border border-slate-700">
            <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm">Metronome</span>
                <button onClick={onClose}>
                    <X size={14}/>
                </button>
            </div>
            <div className="flex items-center justify-center gap-4 mb-4">
                <button
                    onClick={() => setBpm(b => Math.max(40, b - 5))}
                    className="p-1 bg-slate-700 rounded"
                >
                    -
                </button>
                <span className="text-2xl font-mono font-bold">{bpm}</span>
                <button
                    onClick={() => setBpm(b => Math.min(240, b + 5))}
                    className="p-1 bg-slate-700 rounded"
                >
                    +
                </button>
            </div>
            <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 ${
                    isPlaying ? 'bg-red-500' : 'bg-green-500'
                }`}
            >
                {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {isPlaying ? 'Stop' : 'Start'}
            </button>
        </div>
    );
};

export default Metronome;
