import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import ConfirmationModal from '../shared/ConfirmationModal';
import api from '../../../services/api';

const OutcomesManagement = () => {
    const [pos, setPos] = useState([]);
    const [psos, setPsos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, outcomeId: null, type: null });

    // 1. Fetch Data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [posRes, psosRes] = await Promise.all([
                api.get('/pos'),
                api.get('/psos')
            ]);
            // Optional: Sort by ID if needed (e.g., PO1, PO2...)
            setPos(posRes.data);
            setPsos(psosRes.data);
        } catch (error) {
            console.error("Failed to load outcomes", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Add Handlers (Auto-Generate ID)
    const handleAddPo = async () => {
        try {
            // Logic to find next ID: PO + (current length + 1)
            // You could also parse the highest number from existing IDs for robustness
            const nextNum = pos.length + 1;
            const newPo = { 
                id: `PO${nextNum}`, 
                description: 'New Program Outcome' 
            };
            await api.post('/pos', newPo);
            fetchData();
        } catch (error) {
            console.error("Failed to add PO", error);
        }
    };

    const handleAddPso = async () => {
        try {
            const nextNum = psos.length + 1;
            const newPso = { 
                id: `PSO${nextNum}`, 
                description: 'New Program Specific Outcome' 
            };
            await api.post('/psos', newPso);
            fetchData();
        } catch (error) {
            console.error("Failed to add PSO", error);
        }
    };

    // 3. Edit Handlers (Inline Edit with Auto-Save on Blur)
    
    // Updates local state immediately for smooth typing
    const handleDescriptionChange = (id, newDescription, type) => {
        if (type === 'po') {
            setPos(prev => prev.map(item => item.id === id ? { ...item, description: newDescription } : item));
        } else {
            setPsos(prev => prev.map(item => item.id === id ? { ...item, description: newDescription } : item));
        }
    };

    // Sends update to server when user clicks away
    const handleDescriptionBlur = async (id, newDescription, type) => {
        try {
            const endpoint = type === 'po' ? '/pos' : '/psos';
            await api.patch(`${endpoint}/${id}`, { description: newDescription });
        } catch (error) {
            console.error(`Failed to update ${type.toUpperCase()}`, error);
            // Optional: You could add a toast notification for error here
        }
    };

    // 4. Delete Handlers
    const requestDeleteOutcome = (id, type) => {
        setDeleteConfirmation({ isOpen: true, outcomeId: id, type });
    };

    const confirmDelete = async () => {
        const { outcomeId, type } = deleteConfirmation;
        if (!outcomeId) return;

        try {
            const endpoint = type === 'po' ? '/pos' : '/psos';
            await api.delete(`${endpoint}/${outcomeId}`);
            fetchData();
            setDeleteConfirmation({ isOpen: false, outcomeId: null, type: null });
        } catch (error) {
            console.error("Failed to delete outcome", error);
            alert("Failed to delete outcome. It might be in use.");
        }
    };

    return (
        <div className="p-6 space-y-6">
            {deleteConfirmation.isOpen && (
                <ConfirmationModal 
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirmation({ isOpen: false, outcomeId: null, type: null })}
                    title={`Delete ${deleteConfirmation.type === 'po' ? 'Program Outcome' : 'PSO'}`}
                    message="Are you sure you want to delete this outcome? This action cannot be undone."
                />
            )}
            
            {/* PO Section */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Manage Program Outcomes (POs)</CardTitle>
                            <CardDescription>Define the POs for the department.</CardDescription>
                        </div>
                        <button 
                            onClick={handleAddPo}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                        >
                           <Icons.PlusCircle className="h-4 w-4" /> Add PO
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="text-center py-4">Loading...</div> : (
                        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {pos.map(po => (
                                        <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{po.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                <input 
                                                    type="text"
                                                    value={po.description}
                                                    onChange={(e) => handleDescriptionChange(po.id, e.target.value, 'po')}
                                                    onBlur={(e) => handleDescriptionBlur(po.id, e.target.value, 'po')}
                                                    className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none transition-colors py-1"
                                                    placeholder="Enter description..."
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button 
                                                    onClick={() => requestDeleteOutcome(po.id, 'po')} 
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* PSO Section */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Manage Program Specific Outcomes (PSOs)</CardTitle>
                        <button 
                            onClick={handleAddPso}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                        >
                           <Icons.PlusCircle className="h-4 w-4" /> Add PSO
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="text-center py-4">Loading...</div> : (
                        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {psos.map(pso => (
                                        <tr key={pso.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{pso.id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                 <input 
                                                    type="text"
                                                    value={pso.description}
                                                    onChange={(e) => handleDescriptionChange(pso.id, e.target.value, 'pso')}
                                                    onBlur={(e) => handleDescriptionBlur(pso.id, e.target.value, 'pso')}
                                                    className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none transition-colors py-1"
                                                    placeholder="Enter description..."
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button 
                                                    onClick={() => requestDeleteOutcome(pso.id, 'pso')} 
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OutcomesManagement;