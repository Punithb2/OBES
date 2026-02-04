import React from 'react';

export const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => {
  return <div className={`border-b pb-4 mb-4 dark:border-gray-700 ${className}`}>{children}</div>;
};

export const CardTitle = ({ children, className = '' }) => {
    return <h3 className={`text-lg font-semibold text-gray-800 dark:text-gray-100 ${className}`}>{children}</h3>;
}

export const CardDescription = ({ children, className = '' }) => {
    return <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>;
}

export const CardContent = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};