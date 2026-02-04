import React from 'react';

const Card = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '' }) => {
    return (
      <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
        {children}
      </h3>
    );
}

const CardDescription = ({ children, className = '' }) => {
    return (
      <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${className}`}>
        {children}
      </p>
    );
}

const CardContent = ({ children, className = '' }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

// Export both Named and Default to fix "Element type is invalid" errors
export { Card, CardHeader, CardTitle, CardDescription, CardContent };
export default Card;