// Use environment variable for production, fallback to localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URL = `${API_BASE}/api/sheets`;
export const OCR_URL = `${API_BASE}/api/ocr`;
export const FOLDERS_URL = `${API_BASE}/api/folders`;
export const UPLOADS_URL = `${API_BASE}/uploads`;

export const INSTRUMENTS = [
    "Piano", "Violin", "Viola", "Cello", "Double Bass", "Flute", "Clarinet", "Oboe",
    "Bassoon", "Trumpet", "Trombone", "French Horn", "Tuba", "Guitar", "Voice",
    "Choir", "Organ", "Percussion", "Saxophone", "Harp", "Full Orchestra",
    "String Quartet", "Chamber Ensemble"
];

export const GENRES = [
    "Classical", "Baroque", "Romantic", "Contemporary", "Jazz", "Pop", "Rock",
    "Folk", "Religious/Sacred", "Film/TV", "Musical Theater", "Traditional", "World Music"
];

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Professional"];

export const KEY_SIGNATURES = [
    "C", "G", "D", "A", "E", "B", "F#", "F", "Bb", "Eb", "Ab", "Db", "Gb",
    "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"
];

export const TIME_SIGNATURES = [
    "4/4", "3/4", "2/4", "6/8", "2/2", "3/8", "9/8", "12/8", "5/4", "7/8", "5/8", "6/4"
];
