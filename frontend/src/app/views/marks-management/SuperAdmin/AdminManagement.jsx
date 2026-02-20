import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api, { fetchAllPages } from '../../../services/api'; // IMPORT ADDED HERE
import { Icons } from '../shared/icons';
import ConfirmationModal from '../shared/ConfirmationModal';

// --- Admin Modal ---
const AdminModal = ({ isOpen, onClose, onSave, admin = null, departments = [] }) => {
    const [formData, setFormData] = useState({ name: '', email: '', departmentId: '' });

    useEffect(() => {
        if (admin) {
            setFormData({ name: admin.name || admin.display_name || '', email: admin.email, departmentId: admin.department });
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
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, idToDelete: null });

    const fetchData = async () => {
        try {
            setLoading(true);
            // RECURSIVE FETCH IMPLEMENTED HERE
            const [fetchedAdmins, fetchedDepts] = await Promise.all([
                fetchAllPages('/users/?role=admin'), 
                fetchAllPages('/departments/')
            ]);
            
            setAdmins(Array.isArray(fetchedAdmins) ? fetchedAdmins : []);
            setDepartments(Array.isArray(fetchedDepts) ? fetchedDepts : []);

        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async (data) => {
        // Map form data to Django serializer fields
        const payload = { 
            username: data.email,
            email: data.email,
            display_name: data.name,
            role: 'admin',
            department: data.departmentId
        };
        
        try {
            if (modal.admin) {
                await api.patch(`/users/${modal.admin.id}/`, payload);
            } else {
                await api.post('/users/', { ...payload, password: 'password123' }); // Set default password
            }
            setModal({ isOpen: false, admin: null });
            fetchData();
        } catch (error) {
            console.error("Failed to save admin", error);
            alert("Failed to save admin. The email might already exist.");
        }
    };

    const openDeleteModal = (id) => {
        setDeleteModal({ isOpen: true, idToDelete: id });
    };

    const confirmDelete = async () => {
        try { 
            await api.delete(`/users/${deleteModal.idToDelete}/`); 
            fetchData(); 
        } 
        catch (error) { console.error(error); }
        finally {
            setDeleteModal({ isOpen: false, idToDelete: null });
        }
    };

    const getDeptName = (id) => departments.find(d => String(d.id) === String(id))?.name || 'Unknown';

    return (
        <div className="p-6">
            <AdminModal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, admin: null })} onSave={handleSave} admin={modal.admin} departments={departments} />
            
            {deleteModal.isOpen && (
                <ConfirmationModal 
                    title="Delete Admin"
                    message="Are you sure you want to delete this admin? They will lose access to the system."
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, idToDelete: null })}
                />
            )}

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
                    {loading ? <div className="text-center py-8 text-gray-500">Loading...</div> : (
                        <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
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
                                    {admins.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No admins found. Click "Add Admin" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        admins.map(admin => (
                                            <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {admin.display_name || admin.username}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {admin.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {getDeptName(admin.department)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => setModal({ isOpen: true, admin })} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 mr-4">Edit</button>
                                                    <button onClick={() => openDeleteModal(admin.id)} className="text-red-600 hover:text-red-800 dark:text-red-400">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminManagement;