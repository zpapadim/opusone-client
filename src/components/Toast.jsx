const Toast = ({ toasts }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] space-y-2">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-300 ${
                        toast.type === 'success' ? 'bg-green-600 text-white' :
                        toast.type === 'error' ? 'bg-red-600 text-white' :
                        toast.type === 'warning' ? 'bg-amber-500 text-white' :
                        'bg-slate-700 text-white'
                    }`}
                >
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            ))}
        </div>
    );
};

export default Toast;
