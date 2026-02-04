import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { Icons } from '../shared/icons';

// --- 1. NEW FACULTY MODAL COMPONENT ---
const FacultyModal = ({ isOpen, onClose, onSave, faculty = null }) => {
    const [formData, setFormData] = useState({ name: '', email: '' });

    // Reset form when modal opens or faculty to edit changes
    useEffect(() => {
        if (faculty) {
            setFormData({ name: faculty.name, email: faculty.email });
        } else {
            setFormData({ name: '', email: '' });
        }
    }, [faculty, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {faculty ? 'Edit Faculty' : 'Add New Faculty'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            placeholder="e.g. Dr. John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input 
                            required
                            type="email" 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            placeholder="e.g. john.doe@university.edu"
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- 2. MAIN COMPONENT ---
const FacultyManagement = () => {
    const { user } = useAuth();
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState(null); // Null for add, Object for edit

    const fetchFaculty = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/users?role=faculty&departmentId=${user?.departmentId}`);
            setFaculty(response.data);
        } catch (error) {
            console.error("Failed to fetch faculty", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchFaculty();
    }, [user]);

    // Handle Open/Close Modal
    const openAddModal = () => {
        setSelectedFaculty(null);
        setIsModalOpen(true);
    };

    const openEditModal = (facultyMember) => {
        setSelectedFaculty(facultyMember);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedFaculty(null);
    };

    // Handle Save (Create or Update)
    const handleSave = async (formData) => {
        const payload = {
            ...formData,
            role: 'faculty',
            departmentId: user.departmentId
        };

        try {
            if (selectedFaculty) {
                // UPDATE existing
                await api.patch(`/users/${selectedFaculty.id}`, payload);
            } else {
                // CREATE new
                await api.post('/users', { ...payload, id: `U${Date.now()}` }); 
            }
            
            closeModal();
            fetchFaculty(); // Refresh list
        } catch (error) {
            console.error("Operation failed", error);
            alert("Failed to save faculty member.");
        }
    };

    // Handle Delete
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this faculty member?")) {
            try {
                await api.delete(`/users/${id}`);
                fetchFaculty();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    return (
        <div className="p-6">
            {/* 3. RENDER MODAL */}
            <FacultyModal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                onSave={handleSave} 
                faculty={selectedFaculty} 
            />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Manage Faculty</CardTitle>
                            <CardDescription>Add, edit, or remove faculty members from your department.</CardDescription>
                        </div>
                        <button 
                            onClick={openAddModal}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Icons.PlusCircle className="h-4 w-4" /> Add Faculty
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {faculty.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No faculty members found. Click "Add Faculty" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        faculty.map(f => (
                                            <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {f.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {f.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button 
                                                        onClick={() => openEditModal(f)}
                                                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-4 font-medium transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(f.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                                                    >
                                                        Delete
                                                    </button>
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

export default FacultyManagement;