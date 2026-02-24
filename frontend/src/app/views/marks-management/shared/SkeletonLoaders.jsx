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

export const StudentReportSkeleton = () => {
    return (
        <div className="p-6 space-y-6 animate-pulse">
            {/* 1. Header & Controls Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-56"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                </div>
            </div>

            {/* 2. Profile Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0"></div>
                        <div className="space-y-2">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    </div>
                    <div className="space-y-2 sm:text-right w-full sm:w-auto">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-56 sm:ml-auto"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 sm:ml-auto"></div>
                    </div>
                </div>
            </div>

            {/* 3. Two Column Layout (Table & Chart) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Left Column: Assessment Performance Table */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Table Header */}
                            <div className="flex justify-between pb-2 border-b dark:border-gray-700">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                            </div>
                            {/* Table Rows */}
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b dark:border-gray-700/50 last:border-0">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-8"></div>
                                    {/* Pill placeholders for CO breakdown */}
                                    <div className="flex gap-2 w-1/4 justify-end">
                                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-14"></div>
                                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-14 hidden sm:block"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: CO Attainment Profile Chart */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-56"></div>
                        </div>
                        <div className="p-6">
                            {/* Bar Chart Area */}
                            <div className="h-56 border-b border-l border-gray-200 dark:border-gray-700 flex items-end justify-around pb-0 pt-4 px-4 mb-8">
                                {[60, 85, 40, 95, 75].map((h, i) => (
                                    <div key={i} className="w-8 sm:w-10 bg-gray-200 dark:bg-gray-700 rounded-t-md" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                            
                            {/* Horizontal Progress Bars Area */}
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 shrink-0"></div>
                                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gray-200 dark:bg-gray-700 w-3/4 rounded-full"></div>
                                        </div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 shrink-0"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export const CoPoAttainmentSkeleton = () => {
    return (
        <div className="p-6 space-y-8 animate-pulse">
            
            {/* 1. Header & Controls Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-3 w-full sm:w-1/2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                    <div className="flex flex-wrap gap-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-64"></div>
                    <div className="h-10 bg-green-200 dark:bg-green-900/40 rounded w-32"></div>
                </div>
            </div>

            {/* 2. Master Attainment Table (The large dense top table) */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                {/* Multi-tier header simulation */}
                <div className="flex h-12 bg-gray-100 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-1/4 sm:w-1/3 border-r border-gray-200 dark:border-gray-700"></div>
                    <div className="flex-1 flex gap-2 items-center justify-around px-4">
                        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-1/6"></div>
                    </div>
                </div>
                {/* Data Rows */}
                <div className="flex flex-col">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex h-12 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="w-1/4 sm:w-1/3 flex items-center px-4 gap-3 border-r border-gray-100 dark:border-gray-700/50">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 shrink-0"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 shrink-0"></div>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full hidden sm:block"></div>
                            </div>
                            <div className="flex-1 flex items-center justify-between px-4">
                                {[...Array(12)].map((_, j) => (
                                    <div key={j} className="h-3 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {/* Bottom Aggregate Rows (Darker Blue/Brown in screenshot) */}
                <div className="flex flex-col bg-gray-50 dark:bg-gray-800/80">
                    {[...Array(4)].map((_, i) => (
                        <div key={`agg-${i}`} className="flex h-10 border-t border-gray-200 dark:border-gray-700">
                            <div className="w-1/4 sm:w-1/3 flex items-center px-4 border-r border-gray-200 dark:border-gray-700">
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                            </div>
                            <div className="flex-1 flex items-center justify-between px-4">
                                {[...Array(12)].map((_, j) => (
                                    <div key={j} className="h-3 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Final CO Attainment Summary */}
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                <div className="space-y-4">
                    <div className="flex justify-between border-b pb-3 dark:border-gray-700">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-4 w-1/6 mx-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        ))}
                    </div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                            <div className="h-4 w-12 mx-2 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            {[...Array(5)].map((_, j) => (
                                <div key={j} className="h-4 w-16 mx-auto bg-gray-100 dark:bg-gray-700/50 rounded"></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. PO-CO Matrices */}
            {[1, 2].map((matrix) => (
                <div key={`matrix-${matrix}`} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                    <div className="h-6 w-72 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="flex justify-between border-b pb-3 dark:border-gray-700">
                        <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        {[...Array(14)].map((_, i) => (
                            <div key={i} className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded hidden sm:block"></div>
                        ))}
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-3 border-b dark:border-gray-700/50 last:border-0">
                            <div className="h-4 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            {[...Array(14)].map((_, j) => (
                                <div key={j} className="h-3 w-4 bg-gray-100 dark:bg-gray-700/50 rounded hidden sm:block"></div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
            
        </div>
    );
};

export const EvaluationResultSkeleton = () => {
    // Generates the 14 columns for PO1-PO12 and PSO1-PSO2
    const cols = Array.from({ length: 14 });
    
    return (
        <div className="p-6 space-y-6 animate-pulse">
            {/* 1. Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 hidden sm:block"></div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                    <div className="h-10 bg-green-200 dark:bg-green-900/40 rounded w-28"></div>
                </div>
            </div>

            {/* 2. Main Data Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-x-auto custom-scrollbar">
                <div className="min-w-[1000px]">
                    
                    {/* Table Header */}
                    <div className="flex items-center px-6 py-4 bg-gray-50 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-700">
                        <div className="w-48 shrink-0">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                        </div>
                        <div className="flex-1 flex justify-between items-center gap-4">
                            {cols.map((_, i) => (
                                <div key={`th-${i}`} className="h-4 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            ))}
                        </div>
                    </div>

                    {/* Table Body (Courses) */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {[...Array(8)].map((_, i) => (
                            <div key={`row-${i}`} className="flex items-center px-6 py-3">
                                <div className="w-48 shrink-0 space-y-1.5">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-24"></div>
                                </div>
                                <div className="flex-1 flex justify-between items-center gap-4">
                                    {cols.map((_, j) => (
                                        <div key={`td-${i}-${j}`} className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table Footer (Summary & Calculations) */}
                    <div className="border-t-2 border-gray-200 dark:border-gray-600">
                        
                        {/* Direct Attainment Row (Yellow) */}
                        <div className="flex items-center px-6 py-4 bg-amber-50/50 dark:bg-amber-900/10 border-b border-gray-100 dark:border-gray-700/50">
                            <div className="w-48 shrink-0">
                                <div className="h-4 bg-amber-200 dark:bg-amber-800/50 rounded w-40"></div>
                            </div>
                            <div className="flex-1 flex justify-between items-center gap-4">
                                {cols.map((_, i) => (
                                    <div key={`da-${i}`} className="h-4 w-8 bg-amber-200 dark:bg-amber-800/50 rounded"></div>
                                ))}
                            </div>
                        </div>

                        {/* Survey Rows */}
                        {[...Array(3)].map((_, i) => (
                            <div key={`surv-${i}`} className="flex items-center px-6 py-3 border-b border-gray-100 dark:border-gray-700/50">
                                <div className="w-48 shrink-0">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                                </div>
                                <div className="flex-1 flex justify-between items-center gap-4">
                                    {cols.map((_, j) => (
                                        <div key={`sd-${i}-${j}`} className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Indirect Attainment Row (Yellow) */}
                        <div className="flex items-center px-6 py-4 bg-amber-50/50 dark:bg-amber-900/10 border-b border-gray-100 dark:border-gray-700/50">
                            <div className="w-48 shrink-0">
                                <div className="h-4 bg-amber-200 dark:bg-amber-800/50 rounded w-40"></div>
                            </div>
                            <div className="flex-1 flex justify-between items-center gap-4">
                                {cols.map((_, i) => (
                                    <div key={`ia-${i}`} className="h-4 w-8 bg-amber-200 dark:bg-amber-800/50 rounded"></div>
                                ))}
                            </div>
                        </div>

                        {/* Weighted Calculations */}
                        {[...Array(2)].map((_, i) => (
                            <div key={`wt-${i}`} className="flex items-center px-6 py-3 border-b border-gray-100 dark:border-gray-700/50">
                                <div className="w-48 shrink-0">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"></div>
                                </div>
                                <div className="flex-1 flex justify-between items-center gap-4">
                                    {cols.map((_, j) => (
                                        <div key={`wtd-${i}-${j}`} className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Final Total Attainment (Green) */}
                        <div className="flex items-center px-6 py-4 bg-green-50/50 dark:bg-green-900/10">
                            <div className="w-48 shrink-0">
                                <div className="h-5 bg-green-300 dark:bg-green-800/60 rounded w-32"></div>
                            </div>
                            <div className="flex-1 flex justify-between items-center gap-4">
                                {cols.map((_, i) => (
                                    <div key={`tot-${i}`} className="h-5 w-8 bg-green-300 dark:bg-green-800/60 rounded"></div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

// 7. Specific Skeleton for the Super Admin Dashboard
export const SuperAdminDashboardSkeleton = () => {
    return (
        <div className="p-6 space-y-8 animate-pulse">
            
            {/* 1. Header Section */}
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                </div>
                {/* Refresh Icon Placeholder */}
                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full mt-1"></div>
            </div>

            {/* 2. Top KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={`kpi-${i}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex justify-between items-center relative overflow-hidden">
                        {/* Simulates the colored left border */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700"></div>
                        
                        <div className="space-y-3">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                        </div>
                        {/* Circle Icon Placeholder */}
                        <div className="h-12 w-12 bg-gray-50 dark:bg-gray-700/50 rounded-full border border-gray-100 dark:border-gray-600"></div>
                    </div>
                ))}
            </div>

            {/* 3. Quick Actions Title */}
            <div className="pt-2">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
            </div>

            {/* 4. Bottom Action Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={`action-${i}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
                        {/* Square Icon Placeholder */}
                        <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        
                        <div className="space-y-2.5">
                            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};