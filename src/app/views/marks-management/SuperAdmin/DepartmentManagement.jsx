import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api from '../../../services/api';
import { Icons } from '../shared/icons';

// --- Department Modal ---
const DeptModal = ({ isOpen, onClose, onSave, dept = null }) => {
    const [formData, setFormData] = useState({ id: '', name: '' });

    useEffect(() => {
        if (dept) {
            setFormData(dept);
        } else {
            setFormData({ id: '', name: '' });
        }
    }, [dept, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {dept ? 'Edit Department' : 'Add Department'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department ID</label>
                        <input 
                            required
                            type="text" 
                            disabled={!!dept} // ID cannot be changed after creation
                            value={formData.id}
                            onChange={e => setFormData({...formData, id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                            placeholder="e.g. D04"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department Name</label>
                        <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="e.g. Civil Engineering"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, dept: null });

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDepartments(); }, []);

    const handleSave = async (data) => {
        try {
            if (modal.dept) {
                await api.patch(`/departments/${modal.dept.id}`, data);
            } else {
                await api.post('/departments', data);
            }
            setModal({ isOpen: false, dept: null });
            fetchDepartments();
        } catch (error) {
            console.error("Failed to save department", error);
            alert("Error saving department. ID must be unique.");
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Delete this department? Ensure no users/courses are assigned to it first.")) {
            try {
                await api.delete(`/departments/${id}`);
                fetchDepartments();
            } catch (error) { console.error(error); }
        }
    };

    return (
        <div className="p-6">
            <DeptModal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, dept: null })} onSave={handleSave} dept={modal.dept} />
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Manage Departments</CardTitle>
                            <CardDescription>Add, edit, or remove academic departments.</CardDescription>
                        </div>
                        <button 
                            onClick={() => setModal({ isOpen: true, dept: null })}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2"
                        >
                            <Icons.PlusCircle className="h-4 w-4" /> Add Department
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="text-center py-8">Loading...</div> : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Department Name</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {departments.map(dept => (
                                    <tr key={dept.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">{dept.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{dept.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => setModal({ isOpen: true, dept })} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 mr-4">Edit</button>
                                            <button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:text-red-800 dark:text-red-400">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DepartmentManagement;