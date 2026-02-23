import React from 'react';

// 1. A generic Table Skeleton (Perfect for Management Pages)
export const TableSkeleton = ({ rows = 5, columns = 5 }) => {
    return (
        <div className="overflow-x-auto border rounded-lg dark:border-gray-700 w-full animate-pulse">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        {[...Array(columns)].map((_, i) => (
                            <th key={i} className="px-6 py-4">
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700/50">
                    {[...Array(rows)].map((_, rIdx) => (
                        <tr key={rIdx}>
                            {[...Array(columns)].map((_, cIdx) => (
                                <td key={cIdx} className="px-6 py-4">
                                    <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${cIdx === 0 ? 'w-3/4' : 'w-1/2'}`}></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// 2. A Dashboard Card Skeleton (Perfect for the Faculty Dashboard)
export const DashboardCardSkeleton = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
        </div>
    );
};

// 3. A Block Skeleton (For text areas or random content)
export const BlockSkeleton = ({ className = "h-32" }) => {
    return (
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${className}`}></div>
    );
};