import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api, { fetchAllPages } from '../../../services/api'; 
import { Icons } from '../shared/icons';
import { Loader2 } from 'lucide-react'; 
import ConfirmationModal from '../shared/ConfirmationModal';
import toast from 'react-hot-toast'; // 1. IMPORT TOAST
import { TableSkeleton } from '../shared/SkeletonLoaders';

// --- ADMIN MODAL COMPONENT ---
const AdminModal = ({ isOpen, onClose, onSave, adminUser = null, departments = [] }) => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', department: '' });

    useEffect(() => {
        if (adminUser) {
            setFormData({ 
                name: adminUser.display_name || adminUser.username, 
                email: adminUser.email, 
                password: '',
                department: adminUser.department || ''
            });
        } else {
            setFormData({ name: '', email: '', password: '', department: '' });
        }
    }, [adminUser, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {adminUser ? 'Edit Department Admin' : 'Add Department Admin'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <Icons.XMark className="h-6 w-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" placeholder="e.g. Jane Doe" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email (Login) <span className="text-red-500">*</span></label>
                        <input required type="email" disabled={!!adminUser} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm disabled:opacity-50" placeholder="e.g. admin@college.edu" />
                    </div>

                    {!adminUser && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Initial Password <span className="text-red-500">*</span></label>
                            <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" placeholder="Set a strong password" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Assign to Department <span className="text-red-500">*</span></label>
                        <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm">
                            <option value="">-- Select Department --</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
                        </select>
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6 pt-2 border-t dark:border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm transition-colors">Save Admin</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const AdminManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, idToDelete: null });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [fetchedAdmins, fetchedDepts] = await Promise.all([
                fetchAllPages('/users/?role=admin'),
                fetchAllPages('/departments/')
            ]);
            
            setAdmins(Array.isArray(fetchedAdmins) ? fetchedAdmins : []);
            setDepartments(Array.isArray(fetchedDepts) ? fetchedDepts : []);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to load admin list.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openAddModal = () => { setSelectedAdmin(null); setIsModalOpen(true); };
    const openEditModal = (adminUser) => { setSelectedAdmin(adminUser); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setSelectedAdmin(null); };

    const handleSave = async (formData) => {
        const payload = {
            username: formData.email,
            email: formData.email,
            display_name: formData.name,
            role: 'admin',
            department: formData.department
        };

        if (!selectedAdmin && formData.password) {
            payload.password = formData.password;
        }

        const isEdit = !!selectedAdmin;
        const savePromise = isEdit 
            ? api.patch(`/users/${selectedAdmin.id}/`, payload)
            : api.post('/users/', payload);

        // 2. TOAST PROMISE FOR SAVING
        toast.promise(savePromise, {
            loading: 'Saving admin details...',
            success: 'Department Admin saved successfully!',
            error: 'Failed to save. Ensure email is unique.'
        }).then(() => {
            closeModal();
            fetchData();
        }).catch(err => console.error(err));
    };

    const openDeleteModal = (id) => {
        setDeleteModal({ isOpen: true, idToDelete: id });
    };

    const confirmDelete = async () => {
        // 3. TOAST PROMISE FOR DELETING
        toast.promise(
            api.delete(`/users/${deleteModal.idToDelete}/`),
            {
                loading: 'Removing admin...',
                success: 'Admin removed successfully.',
                error: 'Failed to delete admin.'
            }
        ).then(() => {
            fetchData();
        }).finally(() => {
            setDeleteModal({ isOpen: false, idToDelete: null });
        });
    };

    const getDeptName = (deptId) => {
        const d = departments.find(x => String(x.id) === String(deptId));
        return d ? d.name : <span className="text-gray-400 italic">Unknown</span>;
    };

    return (
        <div className="p-6 space-y-6">
            <AdminModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSave} adminUser={selectedAdmin} departments={departments} />

            {deleteModal.isOpen && (
                <ConfirmationModal 
                    title="Remove Admin"
                    message="Are you sure you want to remove this administrator? They will lose access to the system."
                    theme="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, idToDelete: null })}
                />
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Manage Department Admins</CardTitle>
                            <CardDescription>Assign administrative users to manage specific departments.</CardDescription>
                        </div>
                        <button onClick={openAddModal} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                            <Icons.PlusCircle className="h-4 w-4" /> Add Admin
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <TableSkeleton rows={10} columns={4} />
                    ) : (
                        // 4. ADDED STICKY HEADER WRAPPER
                        <div className="overflow-y-auto max-h-[70vh] border rounded-lg dark:border-gray-700 custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider shadow-sm">Name</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider shadow-sm">Email</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider shadow-sm">Assigned Department</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider shadow-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {admins.length === 0 ? (
                                        <tr><td colSpan="4" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No admins found. Click "Add Admin" to create one.</td></tr>
                                    ) : (
                                        admins.map(admin => (
                                            <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{admin.display_name || admin.username}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{admin.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                                                        {getDeptName(admin.department)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => openEditModal(admin)} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 transition-colors"><Icons.PencilSquare className="w-5 h-5" /></button>
                                                        <button onClick={() => openDeleteModal(admin.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 transition-colors"><Icons.Trash className="w-5 h-5" /></button>
                                                    </div>
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