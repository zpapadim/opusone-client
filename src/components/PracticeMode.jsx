import { X, Repeat, SkipBack, SkipForward } from 'lucide-react';

const PracticeMode = ({
    numPages,
    loopStart,
    setLoopStart,
    loopEnd,
    setLoopEnd,
    autoAdvance,
    setAutoAdvance,
    bpm,
    setPageNumber,
    onClose
}) => {
    return (
        <div className="absolute top-16 left-4 z-30 bg-purple-900 text-white p-4 rounded-xl shadow-xl w-64 border border-purple-700">
            <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm flex items-center gap-2">
                    <Repeat size={16}/> Practice Mode
                </span>
                <button onClick={onClose} className="hover:text-purple-300">
                    <X size={14}/>
                </button>
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-300">Loop Pages:</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={numPages || 1}
                            value={loopStart}
                            onChange={(e) => setLoopStart(Math.min(parseInt(e.target.value) || 1, loopEnd))}
                            className="w-12 px-2 py-1 bg-purple-800 border border-purple-600 rounded text-center text-xs"
                        />
                        <span className="text-purple-400">to</span>
                        <input
                            type="number"
                            min={loopStart}
                            max={numPages || 1}
                            value={loopEnd}
                            onChange={(e) => setLoopEnd(Math.max(parseInt(e.target.value) || 1, loopStart))}
                            className="w-12 px-2 py-1 bg-purple-800 border border-purple-600 rounded text-center text-xs"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPageNumber(loopStart)}
                        className="flex-1 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-xs font-medium flex items-center justify-center gap-1"
                    >
                        <SkipBack size={12}/> Start
                    </button>
                    <button
                        onClick={() => setPageNumber(loopEnd)}
                        className="flex-1 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-xs font-medium flex items-center justify-center gap-1"
                    >
                        End <SkipForward size={12}/>
                    </button>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={(e) => setAutoAdvance(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-500"
                    />
                    <span>Auto-advance with metronome</span>
                </label>
                {autoAdvance && (
                    <p className="text-[10px] text-purple-300">
                        Pages advance every 16 beats at {bpm} BPM
                    </p>
                )}
            </div>
        </div>
    );
};

export default PracticeMode;
