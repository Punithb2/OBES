import React from 'react';

const ConfirmationModal = ({ 
    onConfirm, 
    onCancel, 
    title = "Confirm Action", 
    message, 
    confirmText = "Delete", 
    isAlert = false, // If true, hides the Cancel button
    theme = "danger" // "danger" (red), "primary" (blue), or "success" (green)
}) => {
    
    // Determine button colors based on the theme
    let buttonStyles = "bg-red-600 hover:bg-red-700 focus:ring-red-500";
    if (theme === "primary") buttonStyles = "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500";
    if (theme === "success") buttonStyles = "bg-green-600 hover:bg-green-700 focus:ring-green-500";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 transition-opacity backdrop-blur-sm" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {message || "Are you sure you want to perform this action? This cannot be undone."}
                    </p>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    {!isAlert && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors shadow-sm ${buttonStyles}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;