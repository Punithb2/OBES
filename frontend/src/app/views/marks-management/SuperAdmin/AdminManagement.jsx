import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api from '../../../services/api';
import { Icons } from '../shared/icons';

// --- Admin Modal ---
const AdminModal = ({ isOpen, onClose, onSave, admin = null, departments = [] }) => {
    const [formData, setFormData] = useState({ name: '', email: '', departmentId: '' });

    useEffect(() => {
        if (admin) {
            setFormData({ name: admin.name, email: admin.email, departmentId: admin.departmentId });
        } else {
            setFormData({ name: '', email: '', departmentId: departments[0]?.id || '' });
        }
    }, [admin, isOpen, departments]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {admin ? 'Edit Admin' : 'Add New Admin'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                        <select 
                            required 
                            value={formData.departmentId} 
                            onChange={e => setFormData({...formData, departmentId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Department</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
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

const AdminManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, admin: null });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, deptRes] = await Promise.all([
                api.get('/users?role=admin'),
                api.get('/departments')
            ]);
            setAdmins(usersRes.data);
            setDepartments(deptRes.data);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (data) => {
        const payload = { ...data, role: 'admin' };
        try {
            if (modal.admin) {
                await api.patch(`/users/${modal.admin.id}`, payload);
            } else {
                await api.post('/users', { ...payload, id: `U${Date.now()}` });
            }
            setModal({ isOpen: false, admin: null });
            fetchData();
        } catch (error) {
            console.error("Failed to save admin", error);
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Delete this admin?")) {
            try { await api.delete(`/users/${id}`); fetchData(); } 
            catch (error) { console.error(error); }
        }
    };

    const getDeptName = (id) => departments.find(d => d.id === id)?.name || 'Unknown';

    return (
        <div className="p-6">
            <AdminModal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, admin: null })} onSave={handleSave} admin={modal.admin} departments={departments} />
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Manage Admins (HODs)</CardTitle>
                            <CardDescription>Assign departmental admins and manage their access.</CardDescription>
                        </div>
                        <button 
                            onClick={() => setModal({ isOpen: true, admin: null })}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2"
                        >
                            <Icons.PlusCircle className="h-4 w-4" /> Add Admin
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="text-center py-8">Loading...</div> : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Department</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {admins.map(admin => (
                                    <tr key={admin.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{admin.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{admin.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{getDeptName(admin.departmentId)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => setModal({ isOpen: true, admin })} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 mr-4">Edit</button>
                                            <button onClick={() => handleDelete(admin.id)} className="text-red-600 hover:text-red-800 dark:text-red-400">Delete</button>
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

export default AdminManagement;