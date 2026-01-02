import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../constants';

const AutosuggestInput = ({ 
    name, 
    value, 
    onChange, 
    placeholder, 
    className, 
    darkMode,
    apiField // The field name to send to the API (e.g., 'composer')
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/api/suggestions`, {
                params: { field: apiField || name, q: query }
            });
            setSuggestions(res.data);
            setShowSuggestions(true);
        } catch (err) {
            console.error('Failed to fetch suggestions', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(e); // Propagate change to parent
        fetchSuggestions(newValue);
    };

    const handleSelectSuggestion = (suggestion) => {
        // Create a synthetic event to pass to the parent's onChange handler
        const syntheticEvent = {
            target: {
                name: name,
                value: suggestion
            }
        };
        onChange(syntheticEvent);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                name={name}
                value={value}
                onChange={handleInputChange}
                className={className}
                placeholder={placeholder}
                autoComplete="off"
                onFocus={() => value && value.length >= 2 && setShowSuggestions(true)}
            />
            
            {showSuggestions && (
                <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto ${
                    darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'
                }`}>
                    {isLoading ? (
                         <div className={`px-3 py-2 text-xs italic ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className={`px-3 py-2 cursor-pointer text-xs ${
                                    darkMode 
                                        ? 'text-slate-200 hover:bg-slate-600' 
                                        : 'text-slate-700 hover:bg-slate-100'
                                }`}
                                onClick={() => handleSelectSuggestion(suggestion)}
                            >
                                {suggestion}
                            </div>
                        ))
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default AutosuggestInput;
