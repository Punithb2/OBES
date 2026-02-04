import React from 'react';
import { Icons } from './icons'; // Updated path
import { useAuth } from '../auth/AuthContext'; // Updated path

const MainLayout = ({ user, navItems, activePageId, onNavItemClick, children }) => {
    const { logout } = useAuth();
    const activePage = navItems.find(item => item.id === activePageId);

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
                <div className="h-16 flex items-center justify-center px-4 border-b dark:border-gray-700">
                    <Icons.Target className="h-8 w-8 text-primary-600" />
                    <h1 className="ml-2 text-xl font-bold text-gray-800 dark:text-white">OBE System</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavItemClick(item.id)}
                            className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${activePageId === item.id
                                ? 'bg-primary-500 text-white shadow'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t dark:border-gray-700">
                     <div className="flex items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-4">
                        <div className="flex-shrink-0">
                           <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                                <span className="font-bold text-primary-600 dark:text-primary-300">{user.name.charAt(0)}</span>
                           </div>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors duration-200"
                    >
                        <Icons.LogOut className="w-5 h-5 mr-2" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="sticky top-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg z-10 border-b dark:border-gray-700 h-16 flex items-center px-6 justify-between">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 capitalize">
                        {activePage?.label}
                    </h2>
                </header>
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;