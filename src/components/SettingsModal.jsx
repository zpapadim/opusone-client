import { useState } from 'react';
import { X, Lock, Check, AlertCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../constants';
import { useAuth } from '../context/AuthContext'; // Import useAuth for logout

// AUTH_URL helper - assuming API_URL is .../api/sheets, we want .../api/auth
const AUTH_URL = API_URL.replace('/sheets', '/auth');

const SettingsModal = ({ darkMode, onClose }) => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('account');
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (status.message) setStatus({ type: '', message: '' });
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setStatus({ type: 'error', message: 'New passwords do not match' });
            return;
        }
        if (formData.newPassword.length < 6) {
            setStatus({ type: 'error', message: 'Password must be at least 6 characters' });
            return;
        }

        setIsLoading(true);
        setStatus({ type: '', message: '' });

        try {
            await axios.post(`${AUTH_URL}/change-password`, {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            setStatus({ type: 'success', message: 'Password updated successfully!' });
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setStatus({ 
                type: 'error', 
                message: err.response?.data?.error || 'Failed to update password' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Are you absolutely sure? This cannot be undone.')) return;
        
        setIsLoading(true);
        try {
            await axios.delete(`${AUTH_URL}/delete-account`);
            onClose();
            logout(); // Log out the user
        } catch (err) {
            setStatus({ 
                type: 'error', 
                message: err.response?.data?.error || 'Failed to delete account' 
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Settings</h2>
                    <button onClick={onClose} className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex">
                    {/* Sidebar */}
                    <div className={`w-1/3 border-r p-2 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                        <button
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                activeTab === 'account'
                                    ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700')
                                    : (darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')
                            }`}
                            onClick={() => setActiveTab('account')}
                        >
                            <Lock size={16} /> Security
                        </button>
                        <button
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mt-1 ${
                                activeTab === 'danger'
                                    ? (darkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-700')
                                    : (darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')
                            }`}
                            onClick={() => setActiveTab('danger')}
                        >
                            <AlertCircle size={16} /> Danger Zone
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                        {activeTab === 'account' && (
                            <div>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Change Password
                                </h3>
                                
                                {status.message && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                                        status.type === 'success' 
                                            ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700') 
                                            : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700')
                                    }`}>
                                        {status.type === 'success' ? <Check size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                                        <span>{status.message}</span>
                                    </div>
                                )}

                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleInputChange}
                                            required
                                            className={`w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                            required
                                            minLength={6}
                                            className={`w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            required
                                            minLength={6}
                                            className={`w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'
                                            }`}
                                        />
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            Update Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'danger' && (
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-red-500">
                                    Danger Zone
                                </h3>
                                <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Deleting your account is permanent. All your sheets, annotations, and data will be wiped immediately.
                                </p>
                                
                                {status.message && status.type === 'error' && (
                                    <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm flex items-start gap-2">
                                        <AlertCircle size={16} className="mt-0.5" />
                                        <span>{status.message}</span>
                                    </div>
                                )}

                                {!showDeleteConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full py-3 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Delete My Account
                                    </button>
                                ) : (
                                    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                                        <p className={`text-sm font-bold mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Are you absolutely sure?</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={isLoading}
                                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                {isLoading ? 'Deleting...' : 'Yes, Delete Everything'}
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
