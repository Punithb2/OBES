import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { Icons } from '../shared/icons';

// --- 1. COURSE MODAL COMPONENT ---
const CourseModal = ({ isOpen, onClose, onSave, course = null }) => {
    const [formData, setFormData] = useState({ 
        code: '', 
        name: '', 
        semester: 1, 
        credits: 3 
    });

    useEffect(() => {
        if (course) {
            setFormData({ 
                code: course.code, 
                name: course.name, 
                semester: course.semester,
                credits: course.credits
            });
        } else {
            setFormData({ code: '', name: '', semester: 1, credits: 3 });
        }
    }, [course, isOpen]);

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
                        {course ? 'Edit Course' : 'Add New Course'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <Icons.XMark className="h-6 w-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Code</label>
                            <input 
                                required
                                type="text" 
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                placeholder="e.g. 18CS51"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credits</label>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name</label>
                        <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            placeholder="e.g. Management and Entrepreneurship"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
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
                    
                    <div className="flex justify-end space-x-3 mt-6 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
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
const CourseManagement = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const fetchCourses = async () => {
        if (!user || !user.department) return;

        try {
            setLoading(true);
            // Filter by 'departmentId' to match the CourseViewSet logic
            const response = await api.get(`/courses/?departmentId=${user.department}`);
            setCourses(response.data);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [user]);

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
            id: selectedCourse ? selectedCourse.id : formData.code, // Use Code as ID for new courses
            department: user.department // Auto-assign Admin's Department
        };

        try {
            if (selectedCourse) {
                // UPDATE existing
                await api.patch(`/courses/${selectedCourse.id}/`, payload);
            } else {
                // CREATE new
                await api.post('/courses/', payload); 
            }
            
            closeModal();
            fetchCourses(); 
        } catch (error) {
            console.error("Operation failed", error);
            alert("Failed to save course. Course Code must be unique.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this course? This will remove all associated marks.")) {
            try {
                await api.delete(`/courses/${id}/`);
                fetchCourses();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    return (
        <div className="p-6">
            <CourseModal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                onSave={handleSave} 
                course={selectedCourse} 
            />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Manage Courses</CardTitle>
                            <CardDescription>Create and manage courses for your department.</CardDescription>
                        </div>
                        <button 
                            onClick={openAddModal}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Icons.PlusCircle className="h-4 w-4" /> Add Course
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Course Name</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sem</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {courses.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No courses found. Click "Add Course" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        courses.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600 dark:text-primary-400 font-medium">
                                                    {c.code}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {c.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                                    {c.semester}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                                    {c.credits}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button 
                                                        onClick={() => openEditModal(c)}
                                                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-4 font-medium transition-colors"
                                                    >
                                                        <Icons.PencilSquare className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(c.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                                                    >
                                                        <Icons.Trash className="w-5 h-5" />
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

export default CourseManagement;