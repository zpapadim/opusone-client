import { Music, Search, Filter, Upload, Plus, Keyboard, Moon, Sun } from 'lucide-react';

const Navbar = ({
    darkMode,
    setDarkMode,
    searchFilters,
    setSearchFilters,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    setShowShortcuts,
    onBatchUpload,
    onAddSheet,
    batchInputRef
}) => {
    return (
        <nav className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b h-16 flex-none z-10 px-4 flex justify-between items-center transition-colors`}>
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                    <Music className="w-5 h-5 text-white" />
                </div>
                <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    OpusOne
                </span>
            </div>
            <div className="flex-1 max-w-xl mx-8 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search title, composer, tags..."
                    value={searchFilters.query}
                    onChange={(e) => setSearchFilters({...searchFilters, query: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                        darkMode ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-slate-100 text-slate-900'
                    }`}
                />
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowShortcuts(true)}
                    className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title="Keyboard shortcuts (?)"
                >
                    <Keyboard size={20}/>
                </button>
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-yellow-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
                <button
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className={`p-2 rounded-lg ${isFilterPanelOpen ? 'bg-indigo-100 text-indigo-600' : darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                    <Filter size={20}/>
                </button>
                <input
                    type="file"
                    ref={batchInputRef}
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={onBatchUpload}
                    className="hidden"
                />
                <button
                    onClick={() => batchInputRef.current?.click()}
                    className={`${darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'} border px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm`}
                >
                    <Upload size={18} /><span>Batch Upload</span>
                </button>
                <button
                    onClick={onAddSheet}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={18} /><span>Add Sheet</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
