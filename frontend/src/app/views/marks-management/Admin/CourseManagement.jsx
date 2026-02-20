import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; // IMPORT ADDED HERE
import { Icons } from '../shared/icons';
import { Loader2 } from 'lucide-react'; 
import ConfirmationModal from '../shared/ConfirmationModal';

// --- 1. COURSE MODAL COMPONENT ---
const CourseModal = ({ isOpen, onClose, onSave, course = null, schemes = [] }) => {
    const [formData, setFormData] = useState({ 
        code: '', 
        name: '', 
        semester: 1, 
        credits: 3,
        scheme: '' 
    });

    useEffect(() => {
        if (course) {
            setFormData({ 
                code: course.code, 
                name: course.name, 
                semester: course.semester,
                credits: course.credits,
                scheme: course.scheme || '' 
            });
        } else {
            setFormData({ 
                code: '', 
                name: '', 
                semester: 1, 
                credits: 3, 
                scheme: schemes.length > 0 ? schemes[0].id : '' 
            });
        }
    }, [course, isOpen, schemes]);

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
                        {course ? 'Edit Course' : 'Add New Course'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <Icons.XMark className="h-6 w-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Course Code <span className="text-red-500">*</span></label>
                            <input 
                                required
                                type="text" 
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm font-mono uppercase"
                                placeholder="e.g. 18CS51"
                                disabled={!!course}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Credits <span className="text-red-500">*</span></label>
                            <input 
                                required
                                type="number" 
                                min="1"
                                max="10"
                                value={formData.credits}
                                onChange={e => setFormData({...formData, credits: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Course Name <span className="text-red-500">*</span></label>
                        <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            placeholder="e.g. Machine Learning"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Academic Scheme <span className="text-red-500">*</span></label>
                        <select 
                            required
                            value={formData.scheme}
                            onChange={e => setFormData({...formData, scheme: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        >
                            <option value="">-- Select Scheme --</option>
                            {schemes.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Determines calculation rules (Pass criteria, Attainment Levels).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Semester <span className="text-red-500">*</span></label>
                        <select 
                            value={formData.semester}
                            onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        >
                            {[1,2,3,4,5,6,7,8].map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6 pt-2 border-t dark:border-gray-700">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm transition-colors"
                        >
                            Save Course
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- 2. MAIN COMPONENT ---
const CourseManagement = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, idToDelete: null });

    // Fetch Data
    const fetchData = async () => {
        if (!user || !user.department) return;

        try {
            setLoading(true);
            // RECURSIVE FETCH IMPLEMENTED HERE
            const [fetchedCourses, fetchedSchemes] = await Promise.all([
                fetchAllPages(`/courses/?department=${user.department}`),
                fetchAllPages('/schemes/')
            ]);
            
            setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
            setSchemes(Array.isArray(fetchedSchemes) ? fetchedSchemes : []);

        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const getSchemeName = (schemeId) => {
        const s = schemes.find(sc => String(sc.id) === String(schemeId));
        return s ? s.name : <span className="text-red-400 italic font-bold text-xs">Not Assigned</span>;
    };

    const openAddModal = () => {
        setSelectedCourse(null);
        setIsModalOpen(true);
    };

    const openEditModal = (course) => {
        setSelectedCourse(course);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedCourse(null);
    };

    const handleSave = async (formData) => {
        const payload = {
            ...formData,
            id: selectedCourse ? selectedCourse.id : formData.code, 
            department: user.department 
        };

        try {
            if (selectedCourse) {
                await api.patch(`/courses/${selectedCourse.id}/`, payload);
            } else {
                await api.post('/courses/', payload); 
            }
            
            closeModal();
            fetchData(); 
        } catch (error) {
            console.error("Operation failed", error);
            alert("Failed to save course. Ensure Course Code is unique.");
        }
    };

    const openDeleteModal = (id) => {
        setDeleteModal({ isOpen: true, idToDelete: id });
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/courses/${deleteModal.idToDelete}/`);
            fetchData();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete course.");
        } finally {
            setDeleteModal({ isOpen: false, idToDelete: null });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <CourseModal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                onSave={handleSave} 
                course={selectedCourse} 
                schemes={schemes}
            />

            {deleteModal.isOpen && (
                <ConfirmationModal 
                    title="Delete Course"
                    message="Are you sure you want to delete this course? This will completely remove all associated marks and attainment data. This action cannot be undone."
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, idToDelete: null })}
                />
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Manage Courses</CardTitle>
                            <CardDescription>Create and manage courses for your department. Assign schemes to define calculation logic.</CardDescription>
                        </div>
                        <button 
                            onClick={openAddModal}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Icons.PlusCircle className="h-4 w-4" /> Add Course
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12 text-primary-600">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Course Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Scheme</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Sem</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {courses.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No courses found. Click "Add Course" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        courses.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600 dark:text-primary-400 font-bold">
                                                    {c.code}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                                    {c.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {getSchemeName(c.scheme)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {c.semester}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {c.credits}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-3">
                                                        <button 
                                                            onClick={() => openEditModal(c)}
                                                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                                                            title="Edit Course"
                                                        >
                                                            <Icons.PencilSquare className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => openDeleteModal(c.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                            title="Delete Course"
                                                        >
                                                            <Icons.Trash className="w-5 h-5" />
                                                        </button>
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

export default CourseManagement;