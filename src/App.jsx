import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Trash2, FileText, Music, Search, X, Upload, Filter,
    ChevronRight, Eye, EyeOff, Maximize2, Minimize2,
    BookOpen, ZoomIn, ZoomOut, Play, Square, Settings,
    Edit2, Folder, FolderPlus, Save, Highlighter,
    Download, ChevronDown, Type, MousePointer, Pen, Info,
    Tag, Globe, User, Layers, Eraser,
    Moon, Sun, Printer, Keyboard, Repeat, LogOut, Share2, Users,
    CheckSquare, Square as SquareIcon, Menu
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Import components
import {
    ErrorBoundary,
    AnnotationCanvas,
    Toast,
    KeyboardShortcutsModal,
    Metronome,
    PracticeMode,
    Navbar,
    AuthModal,
    LandingPage,
    AutosuggestInput,
    SettingsModal
} from './components';

// Import auth context
import { AuthProvider, useAuth } from './context/AuthContext';

// Import constants
import {
    API_BASE,
    API_URL,
    OCR_URL,
    FOLDERS_URL,
    UPLOADS_URL,
    INSTRUMENTS,
    GENRES,
    DIFFICULTIES,
    KEY_SIGNATURES,
    TIME_SIGNATURES
} from './constants';

// Configure PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Helper to calculate SHA-256 hash of a file
const calculateFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

function App() {
    // Auth
    const { user, token, isAuthenticated, loading: authLoading, logout } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Check for password reset token in URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('token')) {
            setShowAuthModal(true);
        }
    }, []);

    const [sheets, setSheets] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null); // null = All
    const [showFolderPanel, setShowFolderPanel] = useState(true);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle

    // Mass selection state
    const [selectedSheetIds, setSelectedSheetIds] = useState(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [lastSelectedIndex, setLastSelectedIndex] = useState(null); // For shift+click range selection
    
    // Viewer States
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [isDualPage, setIsDualPage] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    
    // Annotation States
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [tool, setTool] = useState('cursor'); // cursor, pen, highlighter, text, eraser
    const [color, setColor] = useState('{"r":1,"g":1,"b":0}');
    const [size, setSize] = useState(5);
    const [annotations, setAnnotations] = useState({});
    const [pageDimensions, setPageDimensions] = useState({});
    const [showOriginal, setShowOriginal] = useState(false); // Hide annotations to view original

    // Metronome
    const [showMetronome, setShowMetronome] = useState(false);
    const [bpm, setBpm] = useState(100);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const timerIDRef = useRef(null);

    // Search with filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState([]);
    // Filter format: { type: 'instrument'|'genre'|'difficulty'|'composer', value: string }

    const addFilter = (type, value) => {
        if (!value) return;
        // Remove existing filter of same type, then add new one
        setActiveFilters(prev => [...prev.filter(f => f.type !== type), { type, value }]);
    };

    const removeFilter = (type) => {
        setActiveFilters(prev => prev.filter(f => f.type !== type));
    };

    const clearAllFilters = () => {
        setActiveFilters([]);
        setSearchQuery('');
    };

    const [formData, setFormData] = useState({
        title: '', subtitle: '', composer: '', arranger: '', lyricist: '',
        instrument: '', keySignature: '', timeSignature: '', tempo: '',
        genre: '', difficulty: 'Intermediate', opus: '', publisher: '',
        copyrightYear: '', tags: '', notes: '', folderIds: [], mediaLinks: [], file: null
    });

    const [editingId, setEditingId] = useState(null);
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

    // Dark Mode (persisted to localStorage)
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('opusone-dark-mode');
        return saved ? JSON.parse(saved) : false;
    });

    // Practice Mode
    const [practiceMode, setPracticeMode] = useState(false);
    const [loopStart, setLoopStart] = useState(1);
    const [loopEnd, setLoopEnd] = useState(1);
    const [autoAdvance, setAutoAdvance] = useState(false);
    const practiceTimerRef = useRef(null);

    // Print Mode
    const [isPrintMode, setIsPrintMode] = useState(false);

    // Toast Notifications
    const [toasts, setToasts] = useState([]);
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    // Keyboard shortcuts help modal
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareTarget, setShareTarget] = useState(null); // The object being shared
    const [shareType, setShareType] = useState('sheet'); // 'sheet' or 'folder'
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermission, setSharePermission] = useState('view');
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError, setShareError] = useState('');
    const [currentShares, setCurrentShares] = useState([]);

    // Permission options for sharing
    const PERMISSION_OPTIONS = [
        { value: 'view', label: 'View Only', description: 'Can only view items' },
        { value: 'annotate_self', label: 'Personal Notes', description: 'Can add private annotations' },
        { value: 'annotate_all', label: 'Shared Notes', description: 'Can add annotations visible to all' },
        { value: 'full', label: 'Full Access', description: 'Can delete and manage items' }
    ];

    // ... (lifecycle effects)

    // Share functions
    const openShareModal = async (item, type = 'sheet') => {
        setShareTarget(item);
        setShareType(type);
        setShowShareModal(true);
        setShareEmail('');
        setSharePermission('view');
        setShareError('');
        setCurrentShares([]);

        // Load current shares
        try {
            const endpoint = type === 'sheet' ? API_URL : FOLDERS_URL;
            const res = await axios.get(`${endpoint}/${item.id}/shares`);
            setCurrentShares(res.data);
        } catch (err) {
            console.error('Failed to load shares:', err);
        }
    };

    const handleShare = async () => {
        if (!shareEmail || !shareTarget) return;
        setShareLoading(true);
        setShareError('');

        try {
            const endpoint = shareType === 'sheet' ? API_URL : FOLDERS_URL;
            await axios.post(`${endpoint}/${shareTarget.id}/share`, {
                email: shareEmail,
                permission: sharePermission
            });
            const permLabel = PERMISSION_OPTIONS.find(p => p.value === sharePermission)?.label || sharePermission;
            showToast(`Shared with ${shareEmail} (${permLabel})`, 'success');
            setShareEmail('');
            setSharePermission('view');
            // Reload shares
            const res = await axios.get(`${endpoint}/${shareTarget.id}/shares`);
            setCurrentShares(res.data);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to share';
            setShareError(msg);
        } finally {
            setShareLoading(false);
        }
    };

    const handleUnshare = async (email) => {
        if (!shareTarget) return;
        try {
            const endpoint = shareType === 'sheet' ? API_URL : FOLDERS_URL;
            await axios.delete(`${endpoint}/${shareTarget.id}/share`, { data: { email } });
            showToast(`Removed access for ${email}`, 'success');
            setCurrentShares(currentShares.filter(s => s.user.email !== email));
        } catch (err) {
            showToast('Failed to remove access', 'error');
        }
    };
    // Persist dark mode
    useEffect(() => {
        localStorage.setItem('opusone-dark-mode', JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Ctrl/Cmd + S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (selectedSheet) {
                    saveChanges();
                    showToast('Changes saved!');
                }
                return;
            }

            // Escape: Exit fullscreen or close modals
            if (e.key === 'Escape') {
                if (isFullscreen) setIsFullscreen(false);
                if (isModalOpen) setIsModalOpen(false);
                if (showShortcuts) setShowShortcuts(false);
                return;
            }

            // Only process navigation shortcuts if a sheet is selected
            if (!selectedSheet) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setPageNumber(prev => Math.max(1, prev - (isDualPage ? 2 : 1)));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setPageNumber(prev => Math.min(numPages || 1, prev + (isDualPage ? 2 : 1)));
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    setScale(s => Math.min(3, s + 0.25));
                    break;
                case '-':
                    e.preventDefault();
                    setScale(s => Math.max(0.25, s - 0.25));
                    break;
                case 'f':
                    e.preventDefault();
                    setIsFullscreen(prev => !prev);
                    break;
                case 'd':
                    e.preventDefault();
                    setIsDualPage(prev => !prev);
                    break;
                case 'm':
                    e.preventDefault();
                    setShowMetronome(prev => !prev);
                    break;
                case ' ':
                    e.preventDefault();
                    if (showMetronome) setIsPlaying(prev => !prev);
                    break;
                case '?':
                    e.preventDefault();
                    setShowShortcuts(prev => !prev);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSheet, isFullscreen, isModalOpen, isDualPage, numPages, showMetronome, showShortcuts, showToast, noteContent, annotations]);

    // Practice mode auto-advance
    useEffect(() => {
        if (practiceMode && autoAdvance && isPlaying && selectedSheet) {
            const beatsPerPage = 16; // Assume 16 beats per page
            const msPerBeat = 60000 / bpm;
            const interval = beatsPerPage * msPerBeat;

            practiceTimerRef.current = setInterval(() => {
                setPageNumber(prev => {
                    const next = prev + (isDualPage ? 2 : 1);
                    if (next > loopEnd) {
                        return loopStart;
                    }
                    return Math.min(next, numPages || 1);
                });
            }, interval);

            return () => clearInterval(practiceTimerRef.current);
        }
        return () => clearInterval(practiceTimerRef.current);
    }, [practiceMode, autoAdvance, isPlaying, bpm, loopStart, loopEnd, isDualPage, numPages, selectedSheet]);

    // Clear all cached data when user changes (login/logout/switch user)
    useEffect(() => {
        // Clear state when user changes
        setSheets([]);
        setFolders([]);
        setSelectedSheet(null);
        setSelectedFolder(null);
        setAnnotations({});
        setNoteContent('');
        setPageNumber(1);
        setNumPages(null);

        // Fetch fresh data if authenticated
        if (isAuthenticated && token) {
            // Small delay to ensure axios headers are set
            const timer = setTimeout(() => {
                fetchData();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [user?.id, token]); // Depend on user ID so it triggers on user switch

    // Audio context initialization
    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        return () => {
            if(timerIDRef.current) clearTimeout(timerIDRef.current);
            if(audioContextRef.current) audioContextRef.current.close();
        }
    }, []);

    useEffect(() => {
        if(selectedSheet) {
            setNoteContent(selectedSheet.notes || '');
            setShowOriginal(false); // Reset to show annotations
            let loadedAnns = selectedSheet.annotations;
            if (!loadedAnns) loadedAnns = {};
            // Legacy unwrap
            if (loadedAnns.versions && Array.isArray(loadedAnns.versions)) {
                const activeId = loadedAnns.activeVersionId;
                const version = loadedAnns.versions.find(v => v.id === activeId) || loadedAnns.versions[0];
                loadedAnns = version ? version.data : {};
            }
            setAnnotations(loadedAnns);
            setPageNumber(1);
            setPageDimensions({});
            setTool('cursor');
            setIsAnnotating(false);
        }
    }, [selectedSheet]);

    // Metronome
    const scheduleNote = (time) => {
        const osc = audioContextRef.current.createOscillator();
        const envelope = audioContextRef.current.createGain();
        osc.frequency.value = 800;
        envelope.gain.value = 1;
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(envelope);
        envelope.connect(audioContextRef.current.destination);
        osc.start(time);
        osc.stop(time + 0.1);
    };

    const scheduler = () => {
        while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
            scheduleNote(nextNoteTimeRef.current);
            nextNoteTimeRef.current += 60.0 / bpm;
        }
        timerIDRef.current = setTimeout(scheduler, 25);
    };

    useEffect(() => {
        if (isPlaying) {
            if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
            nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
            scheduler();
        } else {
            clearTimeout(timerIDRef.current);
        }
        return () => clearTimeout(timerIDRef.current);
    }, [isPlaying, bpm]);

    const fetchData = useCallback(async () => {
        try {
            const params = {};
            if (searchQuery) params.q = searchQuery;
            
            // Handle folder filtering
            if (selectedFolder && selectedFolder !== 'shared') {
                params.folder_id = selectedFolder;
            }

            // Handle active filters
            activeFilters.forEach(f => {
                params[f.type] = f.value;
            });

            const [resSheets, resFolders] = await Promise.all([
                axios.get(API_URL, { params }),
                axios.get(FOLDERS_URL)
            ]);
            
            let returnedSheets = resSheets.data;
            // Client-side handling for 'shared' virtual folder
            if (selectedFolder === 'shared') {
                returnedSheets = returnedSheets.filter(s => !s.is_owner);
            }

            setSheets(returnedSheets);
            setFolders(resFolders.data);
        } catch (err) {
            console.error(err);
        }
    }, [searchQuery, activeFilters, selectedFolder, user?.id]);

    useEffect(() => {
        if (isAuthenticated && token) {
             // Debounce the fetch
            const timeoutId = setTimeout(() => {
                fetchData();
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [fetchData, isAuthenticated, token]);

    const createFolder = async () => {
        const name = prompt("Enter folder name:");
        if(!name) return;
        try {
            const res = await axios.post(FOLDERS_URL, { name });
            setFolders([...folders, res.data]);
        } catch(err) { console.error(err); }
    };

    const deleteFolder = async (folderId, e) => {
        e.stopPropagation();
        if (!confirm('Delete this folder? Sheets in this folder will not be deleted.')) return;
        try {
            await axios.delete(`${FOLDERS_URL}/${folderId}`);
            setFolders(folders.filter(f => f.id !== folderId));
            if (selectedFolder === folderId) setSelectedFolder(null);
        } catch(err) { console.error(err); }
    };

    const saveChanges = async () => {
        if(!selectedSheet) return;
        try {
            const res = await axios.put(`${API_URL}/${selectedSheet.id}`, {
                ...selectedSheet,
                notes: noteContent,
                annotations: JSON.stringify(annotations)
            });
            const updated = res.data;
            if (typeof updated.annotations === 'string') updated.annotations = JSON.parse(updated.annotations);
            setSheets(sheets.map(s => s.id === updated.id ? updated : s));
            setSelectedSheet(updated);
            showToast('Changes saved!', 'success');
        } catch(err) {
            console.error(err);
            showToast('Failed to save changes', 'error');
        }
    };



    const onAddAnnotation = (pageNum, annotation) => {
        setAnnotations(prev => ({
            ...prev,
            [pageNum]: [...(prev[pageNum] || []), annotation]
        }));
    };

    const onRemoveAnnotation = (pageNum, annotationIndex) => {
        setAnnotations(prev => ({
            ...prev,
            [pageNum]: (prev[pageNum] || []).filter((_, i) => i !== annotationIndex)
        }));
    };

    const clearPageAnnotations = () => {
        if (confirm('Clear all annotations on this page?')) {
            setAnnotations(prev => ({
                ...prev,
                [pageNumber]: []
            }));
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if(!window.confirm("Delete this sheet?")) return;
        try {
            await axios.delete(`${API_URL}/${id}`);
            setSheets(sheets.filter(s => s.id !== id));
            if (selectedSheet?.id === id) setSelectedSheet(null);
        } catch (err) { console.error(err); }
    };

    // Mass selection handlers
    const toggleSheetSelection = (e, sheetId, sheetIndex) => {
        e.stopPropagation();

        // Get deletable sheets for range selection
        const deletableSheets = filteredSheets.filter(s => s.is_owner !== false || s.share_permission === 'full');
        const deletableIds = new Set(deletableSheets.map(s => s.id));

        // Shift+Click: range selection
        if (e.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, sheetIndex);
            const end = Math.max(lastSelectedIndex, sheetIndex);

            setSelectedSheetIds(prev => {
                const newSet = new Set(prev);
                for (let i = start; i <= end; i++) {
                    const sheet = filteredSheets[i];
                    if (sheet && deletableIds.has(sheet.id)) {
                        newSet.add(sheet.id);
                    }
                }
                return newSet;
            });
        } else {
            // Regular click or Ctrl+Click: toggle individual
            setSelectedSheetIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(sheetId)) {
                    newSet.delete(sheetId);
                } else {
                    newSet.add(sheetId);
                }
                return newSet;
            });
            setLastSelectedIndex(sheetIndex);
        }
    };

    // Handle click on sheet row with modifier keys
    const handleSheetClick = (e, sheet, sheetIndex) => {
        const canDelete = sheet.is_owner !== false || sheet.share_permission === 'full';

        // Ctrl+Click or Cmd+Click (Mac): enter selection mode and toggle
        if ((e.ctrlKey || e.metaKey) && canDelete) {
            e.preventDefault(); // Prevent text selection
            if (!isSelectionMode) {
                setIsSelectionMode(true);
            }
            toggleSheetSelection(e, sheet.id, sheetIndex);
            return;
        }

        // Shift+Click: range selection
        if (e.shiftKey && canDelete) {
            e.preventDefault(); // Prevent text selection
            if (!isSelectionMode) {
                setIsSelectionMode(true);
            }
            // If no prior selection, treat this as the starting point
            if (lastSelectedIndex === null) {
                setLastSelectedIndex(sheetIndex);
                setSelectedSheetIds(new Set([sheet.id]));
            } else {
                toggleSheetSelection(e, sheet.id, sheetIndex);
            }
            return;
        }

        // In selection mode: toggle selection on regular click
        if (isSelectionMode && canDelete) {
            toggleSheetSelection(e, sheet.id, sheetIndex);
            return;
        }

        // Normal click: select sheet for viewing
        setSelectedSheet(sheet);
    };

    const toggleSelectAll = () => {
        // Only select sheets that can be deleted (owned or full permission)
        const deletableSheets = filteredSheets.filter(s => s.is_owner !== false || s.share_permission === 'full');
        if (selectedSheetIds.size === deletableSheets.length && deletableSheets.length > 0) {
            setSelectedSheetIds(new Set());
        } else {
            setSelectedSheetIds(new Set(deletableSheets.map(s => s.id)));
        }
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedSheetIds(new Set());
        setLastSelectedIndex(null);
    };

    const handleMassDelete = async () => {
        if (selectedSheetIds.size === 0) return;

        const count = selectedSheetIds.size;
        if (!window.confirm(`Delete ${count} selected sheet${count > 1 ? 's' : ''}? This will also remove files from storage.`)) {
            return;
        }

        const idsToDelete = Array.from(selectedSheetIds);
        const total = idsToDelete.length;
        let deletedCount = 0;
        let errorCount = 0;

        setOperationProgress({ type: 'delete', current: 0, total, message: 'Deleting sheets...' });

        for (let i = 0; i < idsToDelete.length; i++) {
            const id = idsToDelete[i];
            const sheet = sheets.find(s => s.id === id);
            const sheetName = sheet?.title || 'Unknown';

            setOperationProgress({
                type: 'delete',
                current: i + 1,
                total,
                message: `Deleting "${sheetName}"...`
            });

            try {
                await axios.delete(`${API_URL}/${id}`);
                deletedCount++;

                // Remove from state immediately
                setSheets(prev => prev.filter(s => s.id !== id));

                // Clear selection if this was the selected sheet
                if (selectedSheet?.id === id) {
                    setSelectedSheet(null);
                }
            } catch (err) {
                console.error(`Failed to delete sheet ${id}:`, err);
                errorCount++;
            }
        }

        setOperationProgress(null);
        exitSelectionMode();

        if (errorCount === 0) {
            showToast(`Successfully deleted ${deletedCount} sheet${deletedCount > 1 ? 's' : ''}`, 'success');
        } else {
            showToast(`Deleted ${deletedCount} sheets, ${errorCount} failed`, 'warning');
        }
    };

    const handleEdit = (sheet) => {
        setEditingId(sheet.id);
        // Get folder IDs from sheet (handle both new and legacy formats)
        const sheetFolderIds = sheet.folder_ids || sheet.folderIds ||
            (sheet.folder_id ? [sheet.folder_id] : (sheet.folderId ? [sheet.folderId] : []));

        // Handle tags - could be array, comma-separated string, or null
        let tagsString = '';
        if (Array.isArray(sheet.tags)) {
            tagsString = sheet.tags.filter(t => t).join(', ');
        } else if (typeof sheet.tags === 'string') {
            tagsString = sheet.tags;
        }

        // Handle media links - could be array, JSON string, or null
        let mediaLinksArray = [];
        if (Array.isArray(sheet.media_links)) {
            mediaLinksArray = sheet.media_links;
        } else if (Array.isArray(sheet.mediaLinks)) {
            mediaLinksArray = sheet.mediaLinks;
        } else if (typeof sheet.media_links === 'string') {
            try { mediaLinksArray = JSON.parse(sheet.media_links); } catch (e) { }
        }

        setFormData({
            title: sheet.title || '',
            subtitle: sheet.subtitle || '',
            composer: sheet.composer || '',
            arranger: sheet.arranger || '',
            lyricist: sheet.lyricist || '',
            instrument: sheet.instrument || '',
            keySignature: sheet.keySignature || sheet.key_signature || '',
            timeSignature: sheet.timeSignature || sheet.time_signature || '',
            tempo: sheet.tempo ? String(sheet.tempo) : '',
            genre: sheet.genre_name || sheet.genre || '',
            difficulty: sheet.difficulty || 'Intermediate',
            opus: sheet.opus || '',
            publisher: sheet.publisher || '',
            copyrightYear: sheet.copyrightYear || sheet.copyright_year || '',
            tags: tagsString,
            notes: sheet.notes || '',
            folderIds: sheetFolderIds,
            mediaLinks: mediaLinksArray,
            file: null
        });
        setIsModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const performSearch = (query) => {
        if (!query || query.length < 3) return;
        setIsSearching(true);
        setShowSearchDropdown(true);
        setSearchResults([]);

        axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`)
            .then(res => {
                setSearchResults(res.data.results || []);
            })
            .catch(err => {
                console.error('Search failed:', err);
                setSearchResults([]);
            })
            .finally(() => {
                setIsSearching(false);
            });
    };

    // Auto-search disabled - use manual search button instead

    // Close dropdown when modal closes
    useEffect(() => {
        if (!isModalOpen) {
            setShowSearchDropdown(false);
            setSearchResults([]);
        }
    }, [isModalOpen]);

    // Helper to render PDF page to image
    const convertPdfToImage = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });
    };

    // Web search for song metadata
    const handleWebSearch = async (title) => {
        if (!title || title.length < 3) return;
        setIsSearching(true);
        setShowSearchDropdown(true);
        setSearchResults([]);

        try {
            const res = await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(title)}`);
            setSearchResults(res.data.results || []);
        } catch (err) {
            console.error('Search failed:', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleOcr = async () => {
        if (!formData.file) return;
        setIsOcrLoading(true);
        
        try {
            let fileToUpload = formData.file;
            let filename = formData.file.name;

            // If PDF, convert first page to image
            if (formData.file.type === 'application/pdf') {
                try {
                    fileToUpload = await convertPdfToImage(formData.file);
                    filename = "ocr-temp.png";
                } catch (e) {
                    console.error("PDF Conversion Failed", e);
                    showToast("Could not convert PDF for OCR. Try uploading an image.", 'error');
                    setIsOcrLoading(false);
                    return;
                }
            }

            const data = new FormData();
            data.append('file', fileToUpload, filename);
            
            const res = await axios.post(OCR_URL, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            if (res.data.title || res.data.composer) {
                setFormData(prev => ({
                    ...prev,
                    title: res.data.title || prev.title,
                    composer: res.data.composer || prev.composer
                }));
                // Trigger web search if title was found
                if (res.data.title) {
                    handleWebSearch(res.data.title);
                }
            } else if (res.data.warning) {
                showToast(res.data.warning, 'warning');
            } else {
                showToast("No text found in image.", 'warning');
            }
        } catch (err) {
            console.error(err);
            showToast("OCR Failed", 'error');
        } finally {
            setIsOcrLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'file') {
                if (formData.file) data.append('file', formData.file);
            } else if (key === 'folderIds' || key === 'mediaLinks') {
                // Send as JSON string for arrays
                data.append(key, JSON.stringify(formData[key]));
            } else {
                data.append(key, formData[key]);
            }
        });
        try {
            let res;
            if (editingId) {
                res = await axios.put(`${API_URL}/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                setSheets(sheets.map(s => s.id === editingId ? res.data : s));
                if (selectedSheet?.id === editingId) setSelectedSheet(res.data);
            } else {
                res = await axios.post(API_URL, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                setSheets([...sheets, res.data]);
            }
            setIsModalOpen(false);
            setEditingId(null);
            resetForm();
        } catch (err) { console.error(err); }
    };

    const [batchQueue, setBatchQueue] = useState([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchConflict, setBatchConflict] = useState(null);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const batchInputRef = useRef(null);

    // General operation progress (for uploads, deletes, etc.)
    const [operationProgress, setOperationProgress] = useState(null);
    // { type: 'upload' | 'delete', current: number, total: number, message: string }

    const handleBatchSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const queue = files.map(file => {
            const name = file.name.replace(/\.[^/.]+$/, "");
            const parts = name.split(/\s*-\s*/);
            // Default: Composer - Title, fallback to Title
            return {
                file,
                title: parts.length > 1 ? parts[1] : name,
                composer: parts.length > 1 ? parts[0] : '',
            };
        });

        setBatchQueue(queue);
        setBatchProgress({ current: 0, total: queue.length });
        setIsBatchProcessing(true);
        setOperationProgress({ type: 'upload', current: 0, total: queue.length, message: 'Starting upload...' });
        processNextBatchItem(queue, 0);
        e.target.value = null;
    };

    const processNextBatchItem = async (queue, index) => {
        if (index >= queue.length) {
            setIsBatchProcessing(false);
            setBatchQueue([]);
            setBatchConflict(null);
            setOperationProgress(null);
            showToast("Batch upload complete!", 'success');
            return;
        }

        setBatchProgress({ current: index + 1, total: queue.length });
        const item = queue[index];
        setOperationProgress({
            type: 'upload',
            current: index + 1,
            total: queue.length,
            message: `Uploading "${item.file.name}"...`
        });

        // 1. Check content hash (exact duplicate)
        const fileHash = await calculateFileHash(item.file);
        const contentDup = sheets.find(s => s.file_hash === fileHash);
        if (contentDup) {
            setBatchConflict({ item, index, queue, type: 'content', existing: contentDup });
            return;
        }

        // 2. Check metadata duplicate
        const metaDup = sheets.find(s => 
            (s.title?.toLowerCase() === item.title.toLowerCase() && 
             s.composer?.toLowerCase() === item.composer.toLowerCase()) ||
            s.file_name === item.file.name
        );
        if (metaDup) {
            setBatchConflict({ item, index, queue, type: 'metadata', existing: metaDup });
            return;
        }

        await uploadBatchItem(item);
        // Add small delay to prevent overwhelming server/UI
        setTimeout(() => processNextBatchItem(queue, index + 1), 200);
    };

    const uploadBatchItem = async (item) => {
        const data = new FormData();
        data.append('file', item.file);
        data.append('title', item.title);
        data.append('composer', item.composer);
        data.append('difficulty', 'Intermediate');
        // Add any default fields here if needed

        try {
            const res = await axios.post(API_URL, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSheets(prev => [res.data, ...prev]);
        } catch (err) {
            console.error("Batch upload failed for", item.file.name, err);
            // If server rejects due to hash (in case client list was stale), handle it
            if (err.response?.status === 409) {
                showToast(`Skipped ${item.file.name}: Duplicate content`, 'warning');
            } else {
                showToast(`Failed to upload ${item.file.name}`, 'error');
            }
        }
    };

    const resolveConflict = async (choice) => {
        if (choice === 'upload') {
            await uploadBatchItem(batchConflict.item);
        }
        const { queue, index } = batchConflict;
        setBatchConflict(null);
        processNextBatchItem(queue, index + 1);
    };

    const resetForm = () => {
        setFormData({
            title: '', subtitle: '', composer: '', arranger: '', lyricist: '',
            instrument: '', keySignature: '', timeSignature: '', tempo: '',
            genre: '', difficulty: 'Intermediate', opus: '', publisher: '',
            copyrightYear: '', tags: '', notes: '', folderIds: [], mediaLinks: [], file: null
        });
    };

    const addMediaLink = () => {
        setFormData(prev => ({
            ...prev,
            mediaLinks: [...prev.mediaLinks, { type: 'youtube', url: '', title: '' }]
        }));
    };

    const updateMediaLink = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            mediaLinks: prev.mediaLinks.map((link, i) =>
                i === index ? { ...link, [field]: value } : link
            )
        }));
    };

    const removeMediaLink = (index) => {
        setFormData(prev => ({
            ...prev,
            mediaLinks: prev.mediaLinks.filter((_, i) => i !== index)
        }));
    };

    const toggleFolderInForm = (folderId) => {
        setFormData(prev => ({
            ...prev,
            folderIds: prev.folderIds.includes(folderId)
                ? prev.folderIds.filter(id => id !== folderId)
                : [...prev.folderIds, folderId]
        }));
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    const changePage = (delta) => {
        setPageNumber(prev => Math.min(Math.max(1, prev + delta), numPages || 1));
    };

    const filteredSheets = sheets;

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Loading...</p>
                </div>
            </div>
        );
    }

    // Show landing page if not authenticated
    if (!isAuthenticated) {
        return <LandingPage darkMode={darkMode} />;
    }

    return (
        <div className={`h-screen flex flex-col font-sans overflow-hidden transition-colors duration-200 ${
            isFullscreen
                ? 'bg-slate-900 text-slate-100'
                : darkMode
                    ? 'bg-slate-900 text-slate-100'
                    : 'bg-slate-50 text-slate-900'
        }`}>
            {/* Toast Notifications */}
            <Toast toasts={toasts} />

            {/* Operation Progress Bar */}
            {operationProgress && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                {operationProgress.type === 'delete' ? (
                                    <Trash2 size={18} className="text-red-400" />
                                ) : (
                                    <Upload size={18} className="text-indigo-400" />
                                )}
                                <span className="text-sm text-white font-medium">
                                    {operationProgress.message}
                                </span>
                            </div>
                            <span className="text-sm text-slate-400">
                                {operationProgress.current} / {operationProgress.total}
                            </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                    operationProgress.type === 'delete' ? 'bg-red-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${(operationProgress.current / operationProgress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal darkMode={darkMode} onClose={() => setShowAuthModal(false)} />
            )}

            {/* Settings Modal */}
            {showSettings && (
                <SettingsModal darkMode={darkMode} onClose={() => setShowSettings(false)} />
            )}

            {/* Keyboard Shortcuts Modal */}
            {showShortcuts && (
                <KeyboardShortcutsModal darkMode={darkMode} onClose={() => setShowShortcuts(false)} />
            )}

            {/* Share Modal */}
            {showShareModal && shareTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}>
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                                <Share2 className="text-green-500" size={20} />
                                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    Share {shareType === 'folder' ? 'Folder' : 'Sheet'}
                                </h2>
                            </div>
                            <button onClick={() => setShowShareModal(false)} className={darkMode ? 'text-slate-400 hover:text-white' : ''}><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <p className={`text-sm mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                Share {shareType === 'folder' ? 'folder' : 'sheet'} "<strong>{shareTarget.name || shareTarget.title}</strong>" with other users
                            </p>

                            {/* Share input */}
                            <div className="space-y-3 mb-4">
                                <input
                                    type="email"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className={`w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={sharePermission}
                                        onChange={(e) => setSharePermission(e.target.value)}
                                        className={`flex-1 p-2.5 border rounded-lg outline-none text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    >
                                        {PERMISSION_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleShare}
                                        disabled={shareLoading || !shareEmail}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {shareLoading ? '...' : 'Share'}
                                    </button>
                                </div>
                                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {PERMISSION_OPTIONS.find(p => p.value === sharePermission)?.description}
                                </p>
                            </div>

                            {shareError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {shareError}
                                </div>
                            )}

                            {/* Current shares */}
                            <div>
                                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Shared with ({currentShares.length})
                                </h3>
                                {currentShares.length === 0 ? (
                                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Not shared with anyone yet</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {currentShares.map((share) => (
                                            <div key={share.id} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <Users size={16} className={`flex-shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                                            {share.user.display_name || share.user.email}
                                                        </p>
                                                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {PERMISSION_OPTIONS.find(p => p.value === share.permission)?.label || share.permission}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnshare(share.user.email)}
                                                    className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                                                    title="Remove access"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Application Layout */}
            {!isFullscreen && (
                <div className="md:hidden flex items-center justify-between p-4 border-b bg-white dark:bg-slate-800 dark:border-slate-700">
                     <div className="flex items-center gap-2">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Menu size={24} className={darkMode ? 'text-white' : 'text-slate-800'} />
                        </button>
                        <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>OpusOne</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                             <Settings size={20} />
                        </button>
                     </div>
                </div>
            )}

            {!isFullscreen && (
                <nav className={`hidden md:flex ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b h-16 flex-none z-10 px-4 justify-between items-center transition-colors`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg"><Music className="w-5 h-5 text-white" /></div>
                        <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>OpusOne</span>
                    </div>
                    <div className="flex-1" /> {/* Spacer */}
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
                        <input
                            type="file"
                            ref={batchInputRef}
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleBatchSelect}
                            className="hidden"
                        />
                        <button onClick={() => batchInputRef.current?.click()} className={`${darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'} border px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm`}>
                            <Upload size={18} /><span>Batch Upload</span>
                        </button>
                        <button onClick={() => { setEditingId(null); resetForm(); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                            <Plus size={18} /><span>Add Sheet</span>
                        </button>
                        {/* Auth buttons */}
                        <div className={`w-px h-6 ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`} />
                        {isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {user?.displayName || user?.email?.split('@')[0]}
                                </span>
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                    title="Settings"
                                >
                                    <Settings size={18} />
                                </button>
                                <button
                                    onClick={logout}
                                    className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                    title="Sign out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                                    darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                                }`}
                            >
                                <User size={16} /> Sign In
                            </button>
                        )}
                    </div>
                </nav>
            )}

            <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && !isFullscreen && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-20 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {!isFullscreen && (
                    <div className={`
                        fixed inset-y-0 left-0 z-30 w-80 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-1/3 md:min-w-[320px] md:max-w-md 
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} 
                        border-r flex flex-col
                    `}>
                        {/* Mobile Close Button */}
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute top-2 right-2 p-2 md:hidden text-slate-500 hover:bg-slate-100 rounded-full"
                        >
                            <X size={20} />
                        </button>

                        {/* Search and Filters */}
                        <div className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                            {/* Search input */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by title, composer, tags..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-9 pr-8 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200'
                                    }`}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Filter dropdowns */}
                            <div className="flex gap-2 flex-wrap">
                                <select
                                    value={activeFilters.find(f => f.type === 'instrument')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('instrument', e.target.value) : removeFilter('instrument')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none ${
                                        activeFilters.find(f => f.type === 'instrument')
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <option value="">Instrument</option>
                                    {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>

                                <select
                                    value={activeFilters.find(f => f.type === 'genre')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('genre', e.target.value) : removeFilter('genre')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none ${
                                        activeFilters.find(f => f.type === 'genre')
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <option value="">Genre</option>
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>

                                <select
                                    value={activeFilters.find(f => f.type === 'difficulty')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('difficulty', e.target.value) : removeFilter('difficulty')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none ${
                                        activeFilters.find(f => f.type === 'difficulty')
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <option value="">Difficulty</option>
                                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>

                                {/* New Filters */}
                                <input
                                    type="text"
                                    placeholder="Composer"
                                    value={activeFilters.find(f => f.type === 'composer')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('composer', e.target.value) : removeFilter('composer')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none w-24 ${
                                        activeFilters.find(f => f.type === 'composer')
                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                />
                                
                                <select
                                    value={activeFilters.find(f => f.type === 'key_signature')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('key_signature', e.target.value) : removeFilter('key_signature')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none ${
                                        activeFilters.find(f => f.type === 'key_signature')
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <option value="">Key</option>
                                    {KEY_SIGNATURES.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>

                                <select
                                    value={activeFilters.find(f => f.type === 'time_signature')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('time_signature', e.target.value) : removeFilter('time_signature')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none ${
                                        activeFilters.find(f => f.type === 'time_signature')
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                >
                                    <option value="">Time</option>
                                    {TIME_SIGNATURES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Tempo"
                                    value={activeFilters.find(f => f.type === 'tempo')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('tempo', e.target.value) : removeFilter('tempo')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none w-20 ${
                                        activeFilters.find(f => f.type === 'tempo')
                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                />

                                <input
                                    type="text"
                                    placeholder="Publisher"
                                    value={activeFilters.find(f => f.type === 'publisher')?.value || ''}
                                    onChange={(e) => e.target.value ? addFilter('publisher', e.target.value) : removeFilter('publisher')}
                                    className={`text-xs px-2 py-1.5 rounded-lg border outline-none w-24 ${
                                        activeFilters.find(f => f.type === 'publisher')
                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-300 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                />
                            </div>

                            {/* Active filters & results count */}
                            {(searchQuery || activeFilters.length > 0) && (
                                <div className={`mt-2 pt-2 border-t flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {filteredSheets.length} of {sheets.length} sheets
                                    </span>
                                    <button
                                        onClick={clearAllFilters}
                                        className={`text-xs font-medium ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                    >
                                        Clear all
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`border-b ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                            <div
                                onClick={() => setShowFolderPanel(!showFolderPanel)}
                                className={`w-full p-3 flex justify-between items-center transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Folder size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                                    <h3 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Folders</h3>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{folders.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); createFolder(); }} className="text-indigo-500 hover:text-indigo-400 p-1"><FolderPlus size={14}/></button>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${showFolderPanel ? '' : '-rotate-90'}`} />
                                </div>
                            </div>
                            {showFolderPanel && (
                                <div className="max-h-48 overflow-y-auto px-2 pb-2">
                                    <button
                                        onClick={() => setSelectedFolder(null)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-1 ${
                                            selectedFolder === null
                                                ? 'bg-indigo-600 text-white'
                                                : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'
                                        }`}
                                    >
                                        <Layers size={14} /> All Sheets
                                        <span className="ml-auto text-[10px] opacity-70">{sheets.length}</span>
                                    </button>
                                    {/* Shared With Me virtual folder */}
                                    {sheets.some(s => s.is_owner === false) && (
                                        <button
                                            onClick={() => setSelectedFolder('shared')}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-1 ${
                                                selectedFolder === 'shared'
                                                    ? 'bg-green-600 text-white'
                                                    : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'
                                            }`}
                                        >
                                            <Share2 size={14} /> Shared With Me
                                            <span className="ml-auto text-[10px] opacity-70">{sheets.filter(s => s.is_owner === false).length}</span>
                                        </button>
                                    )}
                                    {(() => {
                                        // Filter folders by search query if present
                                        const query = searchQuery.toLowerCase().trim();
                                        const filteredFolders = folders.filter(f => 
                                            !query || f.name.toLowerCase().includes(query)
                                        );

                                        const myFolders = filteredFolders.filter(f => f.is_owner !== false);
                                        const sharedFolders = filteredFolders.filter(f => f.is_owner === false);

                                        return (
                                            <>
                                                {/* My Folders */}
                                                {myFolders.length > 0 && (
                                                    <div className="mb-2">
                                                        <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>My Folders</div>
                                                        {myFolders.map(folder => {
                                                            const folderCount = sheets.filter(s => {
                                                                const ids = s.folder_ids || (s.folder_id ? [s.folder_id] : []);
                                                                return ids.includes(folder.id);
                                                            }).length;
                                                            return (
                                                                <div key={folder.id} className="group relative">
                                                                    <button
                                                                        onClick={() => setSelectedFolder(folder.id)}
                                                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                                                            selectedFolder === folder.id
                                                                                ? 'bg-indigo-600 text-white'
                                                                                : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'
                                                                        }`}
                                                                    >
                                                                        <Folder size={14} style={{ color: folder.color || 'inherit' }} />
                                                                        <span className="truncate flex-1 text-left">{folder.name}</span>
                                                                        <span className="text-[10px] opacity-70">{folderCount}</span>
                                                                    </button>
                                                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); openShareModal(folder, 'folder'); }}
                                                                            className="w-5 h-5 bg-green-500 text-white rounded text-xs flex items-center justify-center hover:bg-green-600"
                                                                            title="Share Folder"
                                                                        >
                                                                            <Share2 size={10} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => deleteFolder(folder.id, e)}
                                                                            className="w-5 h-5 bg-red-500 text-white rounded text-xs flex items-center justify-center hover:bg-red-600"
                                                                            title="Delete Folder"
                                                                        >
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Shared Folders */}
                                                {sharedFolders.length > 0 && (
                                                    <div className="mb-2">
                                                        <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Shared Folders</div>
                                                        {sharedFolders.map(folder => {
                                                            const folderCount = sheets.filter(s => {
                                                                const ids = s.folder_ids || (s.folder_id ? [s.folder_id] : []);
                                                                return ids.includes(folder.id);
                                                            }).length;
                                                            return (
                                                                <div key={folder.id} className="group relative">
                                                                    <button
                                                                        onClick={() => setSelectedFolder(folder.id)}
                                                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                                                            selectedFolder === folder.id
                                                                                ? 'bg-indigo-600 text-white'
                                                                                : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-slate-600'
                                                                        }`}
                                                                    >
                                                                        <Folder size={14} className="text-indigo-400" />
                                                                        <div className="flex-1 min-w-0 text-left">
                                                                            <div className="truncate">{folder.name}</div>
                                                                            <div className="text-[9px] opacity-60 truncate">by {folder.shared_by}</div>
                                                                        </div>
                                                                        <span className="text-[10px] opacity-70">{folderCount}</span>
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Selection Mode Toolbar */}
                        {isSelectionMode ? (
                            <div className={`p-3 border-b flex items-center justify-between ${darkMode ? 'border-slate-700 bg-red-900/20' : 'border-slate-200 bg-red-50'}`}>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleSelectAll}
                                        className={`flex items-center gap-2 text-xs font-medium ${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        {selectedSheetIds.size === filteredSheets.filter(s => s.is_owner !== false || s.share_permission === 'full').length && filteredSheets.length > 0
                                            ? <CheckSquare size={16} className="text-indigo-500" />
                                            : <SquareIcon size={16} />
                                        }
                                        Select All
                                    </button>
                                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {selectedSheetIds.size} selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleMassDelete}
                                        disabled={selectedSheetIds.size === 0}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 size={14} />
                                        Delete Selected
                                    </button>
                                    <button
                                        onClick={exitSelectionMode}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={`p-2 border-b flex justify-end ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <button
                                    onClick={() => setIsSelectionMode(true)}
                                    className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <CheckSquare size={14} />
                                    Select
                                </button>
                            </div>
                        )}

                        <div className={`flex-1 overflow-y-auto ${isSelectionMode ? 'select-none' : ''}`}>
                            {filteredSheets.map((sheet, index) => {
                                const canDelete = sheet.is_owner !== false || sheet.share_permission === 'full';
                                const isSelected = selectedSheetIds.has(sheet.id);
                                return (
                                <div
                                    key={sheet.id}
                                    onClick={(e) => handleSheetClick(e, sheet, index)}
                                    onMouseDown={(e) => {
                                        // Prevent text selection when using modifier keys
                                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className={`p-4 cursor-pointer transition-colors relative group ${
                                        darkMode
                                            ? `border-b border-slate-700 ${isSelected ? 'bg-red-900/30 border-l-4 border-l-red-500' : selectedSheet?.id === sheet.id ? 'bg-indigo-900/50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent hover:bg-slate-700/50'}`
                                            : `border-b border-slate-100 ${isSelected ? 'bg-red-50 border-l-4 border-l-red-500' : selectedSheet?.id === sheet.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent hover:bg-slate-50'}`
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {/* Checkbox for selection mode */}
                                            {isSelectionMode && (
                                                <button
                                                    onClick={(e) => canDelete && toggleSheetSelection(e, sheet.id, index)}
                                                    className={`flex-shrink-0 ${!canDelete ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    disabled={!canDelete}
                                                    title={!canDelete ? 'Cannot delete shared sheets without full permission' : ''}
                                                >
                                                    {isSelected
                                                        ? <CheckSquare size={18} className="text-red-500" />
                                                        : <SquareIcon size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                                                    }
                                                </button>
                                            )}
                                            <h3 className={`font-semibold text-sm truncate ${
                                                darkMode
                                                    ? (selectedSheet?.id === sheet.id ? 'text-indigo-300' : 'text-slate-200')
                                                    : (selectedSheet?.id === sheet.id ? 'text-indigo-900' : 'text-slate-800')
                                            }`}>{sheet.title}</h3>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if(selectedSheet?.id === sheet.id) {
                                                        setShowDetails(!showDetails);
                                                    } else {
                                                        setSelectedSheet(sheet);
                                                        setShowDetails(true);
                                                    }
                                                }}
                                                className={`p-1 rounded-full transition-transform ${selectedSheet?.id === sheet.id && showDetails ? 'rotate-180' : ''} ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200/50'}`}
                                            >
                                                <ChevronDown size={14} className={darkMode ? 'text-slate-400' : 'text-slate-400'} />
                                            </button>
                                        </div>
                                        {!isSelectionMode && (
                                        <div className={`flex gap-1 opacity-0 group-hover:opacity-100 absolute right-2 top-3 ${darkMode ? 'bg-slate-700/80' : 'bg-white/80'} backdrop-blur-sm rounded shadow-sm`}>
                                            {sheet.is_owner !== false && (
                                                <button onClick={(e) => { e.stopPropagation(); openShareModal(sheet); }} className="p-1 text-slate-400 hover:text-green-500" title="Share"><Share2 size={14} /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(sheet); }} className="p-1 text-slate-400 hover:text-indigo-500"><Edit2 size={14} /></button>
                                            {canDelete && (
                                                <button onClick={(e) => handleDelete(e, sheet.id)} className="p-1 text-slate-400 hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} ${isSelectionMode ? 'ml-6' : ''}`}>{sheet.composer}</p>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {sheet.instrument && <span className={`px-2 py-0.5 text-[10px] rounded-full ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{sheet.instrument}</span>}
                                        {sheet.difficulty && <span className={`px-2 py-0.5 text-[10px] rounded-full ${sheet.difficulty === 'Advanced' ? (darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-50 text-amber-700') : (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`}>{sheet.difficulty}</span>}
                                        {sheet.is_owner === false && (
                                            <span className={`px-2 py-0.5 text-[10px] rounded-full flex items-center gap-1 ${darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-50 text-green-700'}`}>
                                                <Share2 size={10} /> Shared
                                            </span>
                                        )}
                                    </div>
                                    {selectedSheet?.id === sheet.id && showDetails && (
                                        <div onClick={e => e.stopPropagation()} className={`mt-4 pt-4 border-t cursor-default animate-in slide-in-from-top-2 duration-200 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                            <div className="space-y-4">
                                                <section className="space-y-2">
                                                    <h4 className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>General Information</h4>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}><User size={14} className="text-slate-400"/> <span>{sheet.composer}</span></div>
                                                        {sheet.subtitle && <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}><FileText size={14} className="text-slate-400"/> <span>{sheet.subtitle}</span></div>}
                                                        <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}><Layers size={14} className="text-slate-400"/> <span>{sheet.instrument}</span></div>
                                                        <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}><Globe size={14} className="text-slate-400"/> <span>{sheet.genre}</span></div>
                                                    </div>
                                                </section>
                                                <section className="space-y-2">
                                                    <h4 className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Musical Specs</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">Key: {sheet.keySignature || sheet.key_signature || 'N/A'}</span>
                                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">Time: {sheet.timeSignature || sheet.time_signature || 'N/A'}</span>
                                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">BPM: {sheet.tempo || 'N/A'}</span>
                                                    </div>
                                                </section>
                                                <section className="space-y-2">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tags</h4>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(Array.isArray(sheet.tags) ? sheet.tags : (sheet.tags || '').split(',')).map((t, i) => {
                                                            const tag = typeof t === 'string' ? t.trim() : t;
                                                            return tag && <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded flex items-center gap-1"><Tag size={8}/>{tag}</span>;
                                                        })}
                                                    </div>
                                                </section>
                                                {(() => {
                                                    let mediaLinks = sheet.media_links || sheet.mediaLinks || [];
                                                    if (typeof mediaLinks === 'string') {
                                                        try { mediaLinks = JSON.parse(mediaLinks); } catch { mediaLinks = []; }
                                                    }
                                                    if (!Array.isArray(mediaLinks) || mediaLinks.length === 0) return null;
                                                    const firstLink = mediaLinks[0];
                                                    if (!firstLink || !firstLink.url) return null;
                                                    const getEmbedUrl = (link) => {
                                                        if (!link || !link.url) return null;
                                                        const url = link.url;
                                                        if (link.type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
                                                            const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                                                            return match ? `https://www.youtube.com/embed/${match[1]}` : null;
                                                        }
                                                        if (link.type === 'spotify' || url.includes('spotify.com')) {
                                                            const match = url.match(/spotify\.com\/(track|album|playlist)\/([^?\s]+)/);
                                                            return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
                                                        }
                                                        return null;
                                                    };
                                                    const embedUrl = getEmbedUrl(firstLink);
                                                    return (
                                                        <section className="space-y-2">
                                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Media</h4>
                                                            {embedUrl && (
                                                                <div className="rounded-lg overflow-hidden border border-slate-200">
                                                                    <iframe
                                                                        src={embedUrl}
                                                                        width="100%"
                                                                        height={firstLink.type === 'spotify' ? '80' : '150'}
                                                                        frameBorder="0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                        className="w-full"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="space-y-1">
                                                                {mediaLinks.filter(link => link && link.url).map((link, i) => (
                                                                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded">
                                                                        <a href={link.url} target="_blank" rel="noreferrer" className="flex-1 flex items-center gap-2 hover:text-indigo-600 transition-colors">
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                                link.type === 'youtube' ? 'bg-red-100 text-red-600' :
                                                                                link.type === 'spotify' ? 'bg-green-100 text-green-600' :
                                                                                link.type === 'soundcloud' ? 'bg-orange-100 text-orange-600' :
                                                                                'bg-slate-200 text-slate-600'
                                                                            }`}>
                                                                                {(link.type || 'link').toUpperCase()}
                                                                            </span>
                                                                            <span className="text-xs text-slate-700 truncate">{link.title || 'Untitled'}</span>
                                                                        </a>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    );
                                                })()}
                                                <section className="space-y-2 pt-2 border-t border-slate-100">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance Notes</h4>
                                                    <textarea 
                                                        className="w-full h-32 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-slate-700 font-mono text-xs leading-relaxed resize-none focus:ring-2 focus:ring-yellow-400 outline-none" 
                                                        value={noteContent} 
                                                        onChange={e => setNoteContent(e.target.value)} 
                                                        placeholder="Add performance notes..."
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <button onClick={(e) => { e.stopPropagation(); saveChanges(); }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-bold">Save Notes</button>
                                                </section>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className={`flex-1 flex flex-col h-full overflow-hidden transition-colors ${isFullscreen || darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    {selectedSheet ? (
                        <div className="flex flex-col h-full relative">
                            <div className={`${isFullscreen || darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border-b px-4 py-2 flex justify-between items-center shadow-sm z-20 transition-colors`}>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <h2 className="font-bold text-sm">{selectedSheet.title}</h2>
                                        <span className="text-xs opacity-70">{selectedSheet.composer}</span>
                                    </div>
                                    <div className="h-6 w-px bg-slate-300 mx-2" />
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => changePage(-1 * (isDualPage ? 2 : 1))} disabled={pageNumber <= 1} className="p-1.5 rounded hover:bg-slate-200/20 disabled:opacity-30"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                                        <span className="text-sm font-mono min-w-[3rem] text-center">{pageNumber} / {numPages || '--'}</span>
                                        <button onClick={() => changePage(1 * (isDualPage ? 2 : 1))} disabled={pageNumber >= numPages} className="p-1.5 rounded hover:bg-slate-200/20 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(selectedSheet.file_url?.endsWith('.pdf') || selectedSheet.file_name?.endsWith('.pdf') || selectedSheet.filename?.endsWith('.pdf')) && (
                                        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1 text-slate-500">
                                            <button onClick={() => { setIsAnnotating(true); setTool('cursor'); }} className={`p-1.5 rounded ${tool === 'cursor' && isAnnotating ? 'bg-white shadow text-indigo-600' : 'hover:text-slate-700'}`} title="Select"><MousePointer size={16}/></button>
                                            <button onClick={() => { setIsAnnotating(true); setTool('pen'); setColor('{"r":0,"g":0,"b":0}'); setSize(2); }} className={`p-1.5 rounded ${tool === 'pen' && isAnnotating ? 'bg-white shadow text-indigo-600' : 'hover:text-slate-700'}`} title="Pen"><Pen size={16}/></button>
                                            <button onClick={() => { setIsAnnotating(true); setTool('highlighter'); setColor('{"r":1,"g":1,"b":0}'); setSize(15); }} className={`p-1.5 rounded ${tool === 'highlighter' && isAnnotating ? 'bg-white shadow text-yellow-600' : 'hover:text-slate-700'}`} title="Highlighter"><Highlighter size={16}/></button>
                                            <button onClick={() => { setIsAnnotating(true); setTool('text'); setColor('{"r":0,"g":0,"b":0}'); setSize(16); }} className={`p-1.5 rounded ${tool === 'text' && isAnnotating ? 'bg-white shadow text-indigo-600' : 'hover:text-slate-700'}`} title="Text"><Type size={16}/></button>
                                            <button onClick={() => { setIsAnnotating(true); setTool('eraser'); }} className={`p-1.5 rounded ${tool === 'eraser' && isAnnotating ? 'bg-white shadow text-red-600' : 'hover:text-slate-700'}`} title="Eraser - click on annotation to remove"><Eraser size={16}/></button>
                                            <div className="w-px h-4 bg-slate-300 mx-0.5" />
                                            <button onClick={clearPageAnnotations} className="p-1.5 rounded hover:text-red-600 hover:bg-red-50" title="Clear page annotations"><Trash2 size={16}/></button>
                                        </div>
                                    )}
                                    <button onClick={() => setShowOriginal(!showOriginal)} className={`p-2 rounded-lg ${showOriginal ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-200/20'}`} title={showOriginal ? 'Show annotations' : 'Hide annotations (view original)'}>{showOriginal ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                    <button onClick={saveChanges} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="Save"><Save size={18} /></button>
                                    {selectedSheet.is_owner !== false && (
                                        <button onClick={() => openShareModal(selectedSheet)} className="p-2 hover:bg-slate-200/20 rounded-lg" title="Share"><Share2 size={18} /></button>
                                    )}
                                    <div className="relative">
                                        <button onClick={() => setDownloadMenuOpen(!downloadMenuOpen)} className="p-2 hover:bg-slate-200/20 rounded flex items-center gap-1"><Download size={18} /><ChevronDown size={14} /></button>
                                        {downloadMenuOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                                                <a href={`${API_URL}/${selectedSheet.id}/download`} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2" target="_blank" rel="noreferrer">
                                                    <Download size={14} /> Download Original
                                                </a>
                                                <a href={`${API_URL}/${selectedSheet.id}/download?annotated=true`} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2" target="_blank" rel="noreferrer">
                                                    <Download size={14} /> Download Annotated
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={() => setShowMetronome(!showMetronome)} className={`p-2 rounded-lg ${showMetronome ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200/20'}`} title="Metronome"><Settings size={18} /></button>
                                    <button
                                        onClick={() => {
                                            setPracticeMode(!practiceMode);
                                            if (!practiceMode) {
                                                setLoopStart(1);
                                                setLoopEnd(numPages || 1);
                                            }
                                        }}
                                        className={`p-2 rounded-lg ${practiceMode ? 'bg-purple-600 text-white' : 'hover:bg-slate-200/20'}`}
                                        title="Practice mode"
                                    >
                                        <Repeat size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsPrintMode(true);
                                            setTimeout(() => {
                                                window.print();
                                                setIsPrintMode(false);
                                            }, 100);
                                        }}
                                        className="p-2 hover:bg-slate-200/20 rounded-lg"
                                        title="Print"
                                    >
                                        <Printer size={18} />
                                    </button>
                                    <div className={`flex items-center ${darkMode || isFullscreen ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-1 gap-1 ${darkMode || isFullscreen ? 'text-slate-300' : 'text-slate-500'}`}>
                                        <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className={`p-1.5 rounded ${darkMode || isFullscreen ? 'hover:bg-slate-600 hover:text-white' : 'hover:bg-white hover:text-slate-700'}`}><ZoomOut size={16}/></button>
                                        <span className="text-xs font-mono min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                                        <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className={`p-1.5 rounded ${darkMode || isFullscreen ? 'hover:bg-slate-600 hover:text-white' : 'hover:bg-white hover:text-slate-700'}`}><ZoomIn size={16}/></button>
                                    </div>
                                    <button onClick={() => setIsDualPage(!isDualPage)} className={`p-2 rounded ${isDualPage ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200/20'}`}><BookOpen size={18} /></button>
                                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 hover:bg-slate-200/20 rounded">{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
                                </div>
                            </div>

                            {/* Practice Mode Panel */}
                            {practiceMode && (
                                <PracticeMode
                                    numPages={numPages}
                                    loopStart={loopStart}
                                    setLoopStart={setLoopStart}
                                    loopEnd={loopEnd}
                                    setLoopEnd={setLoopEnd}
                                    autoAdvance={autoAdvance}
                                    setAutoAdvance={setAutoAdvance}
                                    bpm={bpm}
                                    setPageNumber={setPageNumber}
                                    onClose={() => setPracticeMode(false)}
                                />
                            )}

                            {/* Metronome Panel */}
                            {showMetronome && (
                                <Metronome
                                    bpm={bpm}
                                    setBpm={setBpm}
                                    isPlaying={isPlaying}
                                    setIsPlaying={setIsPlaying}
                                    onClose={() => setShowMetronome(false)}
                                />
                            )}

                            <div className={`flex-1 overflow-auto flex items-start justify-center p-8 transition-colors ${isFullscreen || darkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}>
                                {(selectedSheet.file_url || selectedSheet.filename)?.endsWith('.pdf') ? (
                                    <Document file={selectedSheet.file_url || `${UPLOADS_URL}/${selectedSheet.filename}`} onLoadSuccess={onDocumentLoadSuccess} className="shadow-2xl">
                                        <div className="flex gap-4">
                                            <div className="relative">
                                                <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={(p) => setPageDimensions(prev => ({...prev, [pageNumber]: {width:p.width, height:p.height}}))} />
                                                {pageDimensions[pageNumber] && <AnnotationCanvas pageNumber={pageNumber} width={pageDimensions[pageNumber].width * scale} height={pageDimensions[pageNumber].height * scale} tool={tool} color={color} size={size} isAnnotating={isAnnotating} annotations={annotations} onAddAnnotation={onAddAnnotation} onRemoveAnnotation={onRemoveAnnotation} showOriginal={showOriginal} />}
                                            </div>
                                            {isDualPage && pageNumber + 1 <= numPages && (
                                                <div className="relative">
                                                    <Page pageNumber={pageNumber + 1} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={(p) => setPageDimensions(prev => ({...prev, [pageNumber + 1]: {width:p.width, height:p.height}}))} />
                                                    {pageDimensions[pageNumber + 1] && <AnnotationCanvas pageNumber={pageNumber + 1} width={pageDimensions[pageNumber + 1].width * scale} height={pageDimensions[pageNumber + 1].height * scale} tool={tool} color={color} size={size} isAnnotating={isAnnotating} annotations={annotations} onAddAnnotation={onAddAnnotation} onRemoveAnnotation={onRemoveAnnotation} showOriginal={showOriginal} />}
                                                </div>
                                            )}
                                        </div>
                                    </Document>
                                ) : (
                                    (selectedSheet.file_url || selectedSheet.filename) ? <img src={selectedSheet.file_url || `${UPLOADS_URL}/${selectedSheet.filename}`} className="max-w-full shadow-lg"/> : <div className="flex flex-col items-center justify-center text-slate-400 h-full"><FileText size={64} /><p className="mt-4">No file attached</p></div>
                                )}
                            </div>


                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} p-6 rounded-full shadow-sm mb-4`}><Music size={48} className={darkMode ? 'text-indigo-400' : 'text-indigo-200'} /></div>
                            <p className={`text-lg font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select a sheet music entry</p>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                    <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8`}>
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
                            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{editingId ? 'Edit Sheet Music' : 'Add New Entry'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className={darkMode ? 'text-slate-400 hover:text-white' : ''}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2 space-y-4">
                                    <div className="relative">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Title * <span className="text-indigo-400 font-normal">(auto-searches MusicBrainz)</span>
                                        </label>
                                        <div className="relative">
                                            <input name="title" value={formData.title} onChange={handleInputChange} required className={`w-full p-2.5 pr-10 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="e.g. Moonlight Sonata"/>
                                            <button 
                                                type="button"
                                                onClick={() => performSearch(formData.title)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                                title="Search MusicBrainz"
                                            >
                                                {isSearching ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                                ) : (
                                                    <Search size={16} />
                                                )}
                                            </button>
                                        </div>

                                        {/* MusicBrainz Search Results Dropdown */}
                                        {showSearchDropdown && (
                                            <div className={`absolute z-20 w-full mt-1 border rounded-lg shadow-xl max-h-80 overflow-y-auto ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                                <div className={`flex items-center justify-between px-3 py-2 border-b sticky top-0 ${darkMode ? 'bg-indigo-900/50 border-slate-600' : 'bg-indigo-50'}`}>
                                                    <span className={`text-xs font-semibold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                                        {isSearching ? 'Searching MusicBrainz...' : `MusicBrainz Results`}
                                                    </span>
                                                    <button type="button" onClick={() => setShowSearchDropdown(false)} className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                                {isSearching ? (
                                                    <div className="p-4 text-center">
                                                        <div className="animate-spin inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                                        <p className={`text-xs mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>Searching music database...</p>
                                                    </div>
                                                ) : searchResults.length > 0 ? (
                                                    searchResults.map((result, idx) => (
                                                        <div key={idx} className={`p-3 border-b last:border-0 ${darkMode ? 'hover:bg-slate-600 border-slate-600' : 'hover:bg-slate-50 border-slate-100'}`}>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{result.title}</div>
                                                                    {result.composer && (
                                                                        <div className={`text-xs mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                                            <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>by</span> {result.composer}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                        {result.year && (
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{result.year}</span>
                                                                        )}
                                                                        {result.album && (
                                                                            <span className={`text-[10px] truncate max-w-[150px] ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{result.album}</span>
                                                                        )}
                                                                    </div>
                                                                    {result.tags && (
                                                                        <div className="text-[10px] text-indigo-400 mt-1">{result.tags}</div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            title: result.metadata?.title || prev.title,
                                                                            composer: result.metadata?.composer || prev.composer,
                                                                            copyrightYear: result.metadata?.copyrightYear || prev.copyrightYear,
                                                                            tags: result.metadata?.tags ? (prev.tags ? prev.tags + ', ' + result.metadata.tags : result.metadata.tags) : prev.tags
                                                                        }));
                                                                        setShowSearchDropdown(false);
                                                                    }}
                                                                    className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap"
                                                                >
                                                                    Apply
                                                                </button>
                                                            </div>
                                                            <a
                                                                href={result.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] text-indigo-500 hover:underline mt-1 inline-block"
                                                            >
                                                                View on MusicBrainz →
                                                            </a>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className={`p-4 text-center text-xs ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                                                        No results found in MusicBrainz database.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Composer</label>
                                            <AutosuggestInput 
                                                name="composer" 
                                                value={formData.composer} 
                                                onChange={handleInputChange} 
                                                className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`} 
                                                placeholder="e.g. Beethoven"
                                                darkMode={darkMode}
                                                apiField="composer"
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Subtitle</label>
                                            <AutosuggestInput 
                                                name="subtitle" 
                                                value={formData.subtitle} 
                                                onChange={handleInputChange} 
                                                className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`} 
                                                placeholder="e.g. Op. 27 No. 2"
                                                darkMode={darkMode}
                                                apiField="subtitle"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Arranger</label>
                                            <AutosuggestInput 
                                                name="arranger" 
                                                value={formData.arranger} 
                                                onChange={handleInputChange} 
                                                className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                darkMode={darkMode}
                                                apiField="arranger"
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Lyricist</label>
                                            <AutosuggestInput 
                                                name="lyricist" 
                                                value={formData.lyricist} 
                                                onChange={handleInputChange} 
                                                className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                darkMode={darkMode}
                                                apiField="lyricist"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Instrument</label>
                                            <select name="instrument" value={formData.instrument} onChange={handleInputChange} className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                                <option value="">Select Instrument</option>
                                                {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Genre</label>
                                            <select name="genre" value={formData.genre} onChange={handleInputChange} className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                                <option value="">Select Genre</option>
                                                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Opus</label>
                                            <AutosuggestInput 
                                                name="opus" 
                                                value={formData.opus} 
                                                onChange={handleInputChange} 
                                                className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                darkMode={darkMode}
                                                apiField="opus"
                                                placeholder="e.g. Op. 55"
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Publisher</label>
                                            <AutosuggestInput 
                                                name="publisher" 
                                                value={formData.publisher} 
                                                onChange={handleInputChange} 
                                                className={`w-full p-2.5 border rounded-lg outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                darkMode={darkMode}
                                                apiField="publisher"
                                                placeholder="e.g. Peters Edition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>File Attachment</label>
                                        {editingId && !formData.file && sheets.find(s => s.id === editingId)?.file_url ? (
                                            <div className={`border-2 border-solid rounded-xl p-4 text-center relative ${darkMode ? 'border-green-700 bg-green-900/30' : 'border-green-200 bg-green-50'}`}>
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <FileText className="text-green-600" size={20}/>
                                                    <span className={`text-xs font-medium truncate max-w-[150px] ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                        {sheets.find(s => s.id === editingId)?.file_name || 'Attached file'}
                                                    </span>
                                                </div>
                                                <p className={`text-[10px] mb-2 ${darkMode ? 'text-green-500' : 'text-green-600'}`}>File already attached</p>
                                                <label className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 cursor-pointer">
                                                    Replace file
                                                    <input type="file" onChange={e => setFormData({...formData, file: e.target.files[0]})} className="hidden"/>
                                                </label>
                                            </div>
                                        ) : (
                                            <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer relative ${darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                <input type="file" onChange={e => setFormData({...formData, file: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                                <Upload className={`mx-auto mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-300'}`} size={24}/>
                                                <span className={`text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formData.file ? formData.file.name : 'Upload PDF/Image'}</span>
                                            </div>
                                        )}
                                        {formData.file && (
                                            <button
                                                type="button"
                                                onClick={handleOcr}
                                                disabled={isOcrLoading}
                                                className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 w-full justify-center"
                                            >
                                                {isOcrLoading ? (
                                                    <span className="animate-pulse">Processing...</span>
                                                ) : (
                                                    <>
                                                        <Search size={12} /> Auto-fill from OCR
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Key</label>
                                            <select name="keySignature" value={formData.keySignature} onChange={handleInputChange} className={`w-full p-2 border rounded-lg text-xs ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                                <option value="">N/A</option>
                                                {KEY_SIGNATURES.map(k => <option key={k} value={k}>{k}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Time Sig.</label>
                                            <select name="timeSignature" value={formData.timeSignature} onChange={handleInputChange} className={`w-full p-2 border rounded-lg text-xs ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                                <option value="">N/A</option>
                                                {TIME_SIGNATURES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>BPM</label>
                                            <input name="tempo" type="number" min="20" max="300" value={formData.tempo} onChange={handleInputChange} className={`w-full p-2 border rounded-lg text-xs ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="e.g. 120"/>
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Level</label>
                                            <select name="difficulty" value={formData.difficulty} onChange={handleInputChange} className={`w-full p-2 border rounded-lg text-xs ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tags (Comma separated)</label>
                                        <input name="tags" value={formData.tags} onChange={handleInputChange} className={`w-full p-2.5 border rounded-lg outline-none text-xs ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900'}`} placeholder="e.g. classical, solo, easy"/>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Folders (select multiple)</label>
                                        <div className={`max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                                            {folders.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 text-center py-2">No folders yet</p>
                                            ) : (
                                                folders.map(f => (
                                                    <label key={f.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-white'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.folderIds.includes(f.id)}
                                                            onChange={() => toggleFolderInForm(f.id)}
                                                            className="w-3.5 h-3.5 rounded text-indigo-600"
                                                        />
                                                        <Folder size={12} style={{ color: f.color || '#64748b' }} />
                                                        <span className={`text-xs truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{f.name}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Media Links Section */}
                            <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Media Links (YouTube, Spotify, etc.)</label>
                                    <button type="button" onClick={addMediaLink} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1">
                                        <Plus size={14} /> Add Link
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formData.mediaLinks.map((link, index) => (
                                        <div key={index} className={`flex gap-2 items-start p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                            <select
                                                value={link.type}
                                                onChange={(e) => updateMediaLink(index, 'type', e.target.value)}
                                                className={`p-2 border rounded text-xs w-24 ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                            >
                                                <option value="youtube">YouTube</option>
                                                <option value="spotify">Spotify</option>
                                                <option value="soundcloud">SoundCloud</option>
                                                <option value="other">Other</option>
                                            </select>
                                            <input
                                                type="url"
                                                value={link.url}
                                                onChange={(e) => updateMediaLink(index, 'url', e.target.value)}
                                                placeholder="https://..."
                                                className={`flex-1 p-2 border rounded text-xs ${darkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900'}`}
                                            />
                                            <input
                                                type="text"
                                                value={link.title}
                                                onChange={(e) => updateMediaLink(index, 'title', e.target.value)}
                                                placeholder="Description (optional)"
                                                className={`w-40 p-2 border rounded text-xs ${darkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900'}`}
                                            />
                                            <button type="button" onClick={() => removeMediaLink(index)} className="p-2 text-red-500 hover:text-red-400">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.mediaLinks.length === 0 && (
                                        <p className="text-[10px] text-slate-400 text-center py-3">No media links added yet</p>
                                    )}
                                </div>
                            </div>

                            <div className={`flex justify-end gap-3 mt-8 pt-6 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-6 py-2 font-bold uppercase tracking-widest text-[10px] ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600'}`}>Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg transition-transform active:scale-95">{editingId ? 'Update Entry' : 'Create Entry'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isBatchProcessing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className={`rounded-2xl shadow-2xl w-full max-w-md p-6 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Batch Uploading...</h3>

                        <div className="mb-4">
                            <div className={`flex justify-between text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span>Progress</span>
                                <span>{batchProgress.current} / {batchProgress.total}</span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>

                        {batchConflict ? (
                            <div className={`border rounded-lg p-4 animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                                <div className={`flex items-center gap-2 mb-2 font-bold text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                                    <Info size={16} />
                                    <span>{batchConflict.type === 'content' ? 'Identical File Detected' : 'Metadata Conflict Detected'}</span>
                                </div>
                                <p className={`text-xs mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {batchConflict.type === 'content' ? (
                                        <>
                                            This file's content matches an existing sheet:
                                            <br/>
                                            <strong>{batchConflict.existing.composer} - {batchConflict.existing.title}</strong>
                                        </>
                                    ) : (
                                        <>
                                            A sheet with similar details already exists:
                                            <br/>
                                            <strong>{batchConflict.item.composer} - {batchConflict.item.title}</strong>
                                            <br/>
                                            <span className="opacity-70">({batchConflict.item.file.name})</span>
                                        </>
                                    )}
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => resolveConflict('skip')}
                                        className={`px-3 py-1.5 border text-xs font-bold rounded ${darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        Skip
                                    </button>
                                    {batchConflict.type !== 'content' && (
                                        <button
                                            onClick={() => resolveConflict('upload')}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow-sm"
                                        >
                                            Upload Anyway
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className={`text-sm text-center animate-pulse ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Processing file {batchProgress.current + 1}...</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Wrap App with AuthProvider and ErrorBoundary
function AppWithProviders() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default AppWithProviders;