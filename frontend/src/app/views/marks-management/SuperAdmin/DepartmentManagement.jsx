import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api, { fetchAllPages } from '../../../services/api'; 
import { Icons } from '../shared/icons';
import { Loader2 } from 'lucide-react'; 
import ConfirmationModal from '../shared/ConfirmationModal';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../shared/SkeletonLoaders';

// --- DEPARTMENT MODAL COMPONENT ---
const DepartmentModal = ({ isOpen, onClose, onSave, department = null }) => {
    const [formData, setFormData] = useState({ id: '', name: '', description: '' });

    useEffect(() => {
        if (department) {
            setFormData({ id: department.id, name: department.name, description: department.description || '' });
        } else {
            setFormData({ id: '', name: '', description: '' });
        }
    }, [department, isOpen]);

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
                        {department ? 'Edit Department' : 'Add New Department'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <Icons.XMark className="h-6 w-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Department Code (ID) <span className="text-red-500">*</span></label>
                        <input required type="text" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value.toUpperCase().replace(/\s+/g, '')})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm font-mono uppercase" placeholder="e.g. CSE" disabled={!!department} />
                        {!department && <p className="text-xs text-gray-500 mt-1">Unique identifier. Cannot be changed later.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Department Name <span className="text-red-500">*</span></label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" placeholder="e.g. Computer Science and Engineering" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm resize-none custom-scrollbar" placeholder="Optional description..." />
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6 pt-2 border-t dark:border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm transition-colors">Save Department</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, idToDelete: null });

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const fetchedData = await fetchAllPages('/departments/');
            setDepartments(Array.isArray(fetchedData) ? fetchedData : []);
        } catch (error) {
            console.error("Failed to fetch departments", error);
            toast.error("Failed to load departments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDepartments(); }, []);

    const openAddModal = () => { setSelectedDepartment(null); setIsModalOpen(true); };
    const openEditModal = (dept) => { setSelectedDepartment(dept); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setSelectedDepartment(null); };

    const handleSave = async (formData) => {
        const isEdit = !!selectedDepartment;
        const savePromise = isEdit 
            ? api.patch(`/departments/${selectedDepartment.id}/`, formData)
            : api.post('/departments/', formData);

        // 2. TOAST PROMISE FOR SAVING
        toast.promise(savePromise, {
            loading: 'Saving department...',
            success: 'Department saved successfully!',
            error: 'Failed to save. Ensure Department Code is unique.'
        }).then(() => {
            closeModal();
            fetchDepartments();
        }).catch(err => console.error(err));
    };

    const openDeleteModal = (id) => {
        setDeleteModal({ isOpen: true, idToDelete: id });
    };

    const confirmDelete = async () => {
        // 3. TOAST PROMISE FOR DELETING
        toast.promise(
            api.delete(`/departments/${deleteModal.idToDelete}/`),
            {
                loading: 'Deleting department...',
                success: 'Department deleted successfully.',
                error: 'Failed to delete. It may contain existing courses or users.'
            }
        ).then(() => {
            fetchDepartments();
        }).finally(() => {
            setDeleteModal({ isOpen: false, idToDelete: null });
        });
    };

    return (
        <div className="p-6 space-y-6">
            <DepartmentModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSave} department={selectedDepartment} />

            {deleteModal.isOpen && (
                <ConfirmationModal 
                    title="Delete Department"
                    message="Are you sure you want to delete this department? This is a destructive action and may fail if courses or users are still assigned to it."
                    theme="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, idToDelete: null })}
                />
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Manage Departments</CardTitle>
                            <CardDescription>Add and configure academic departments for the institution.</CardDescription>
                        </div>
                        <button onClick={openAddModal} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                            <Icons.PlusCircle className="h-4 w-4" /> Add Department
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <TableSkeleton rows={10} columns={3} />
                    ) : (
                        // 4. ADDED STICKY HEADER WRAPPER
                        <div className="overflow-y-auto max-h-[70vh] border rounded-lg dark:border-gray-700 custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider shadow-sm">Code</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider shadow-sm">Department Name</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider shadow-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {departments.length === 0 ? (
                                        <tr><td colSpan="3" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No departments found. Click "Add Department" to create one.</td></tr>
                                    ) : (
                                        departments.map(dept => (
                                            <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600 dark:text-primary-400 font-bold">{dept.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{dept.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => openEditModal(dept)} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 transition-colors"><Icons.PencilSquare className="w-5 h-5" /></button>
                                                        <button onClick={() => openDeleteModal(dept.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 transition-colors"><Icons.Trash className="w-5 h-5" /></button>
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

export default DepartmentManagement;