import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import ConfirmationModal from '../shared/ConfirmationModal';
import api from '../../../services/api';

// --- 1. COURSE MODAL COMPONENT ---
const CourseModal = ({ isOpen, onClose, onSave, course = null }) => {
    const [formData, setFormData] = useState({ code: '', name: '', semester: 1, credits: 4 });

    // Populate form on open
    useEffect(() => {
        if (course) {
            setFormData({ 
                code: course.code, 
                name: course.name, 
                semester: course.semester, 
                credits: course.credits || 4 
            });
        } else {
            setFormData({ code: '', name: '', semester: 1, credits: 4 });
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
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Code</label>
                        <input 
                            type="text" 
                            required 
                            value={formData.code} 
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" 
                            placeholder="e.g., CS301" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name</label>
                        <input 
                            type="text" 
                            required 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" 
                            placeholder="e.g., Data Structures" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="8" 
                                required 
                                value={formData.semester} 
                                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credits</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="6" 
                                required 
                                value={formData.credits} 
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm" 
                            />
                        </div>
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

// --- 2. MAIN COURSE MANAGEMENT COMPONENT ---
const CourseManagement = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, course: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, courseId: null });

    // 1. READ: Fetch Courses
    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/courses');
            // Sort by semester, then by code
            const sortedCourses = response.data.sort((a, b) => 
                a.semester - b.semester || a.code.localeCompare(b.code)
            );
            setCourses(sortedCourses);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    // 2. CREATE / UPDATE
    const handleSave = async (courseData) => {
        try {
            if (modal.course) {
                // Edit existing
                await api.patch(`/courses/${modal.course.id}`, courseData);
            } else {
                // Add new (generate a custom ID format C<timestamp>)
                const newCourse = { 
                    ...courseData, 
                    id: `C${Date.now()}`, 
                    cos: [], 
                    assignedFacultyId: null 
                };
                await api.post('/courses', newCourse);
            }
            fetchCourses(); // Refresh list
            setModal({ isOpen: false, course: null });
        } catch (error) {
            console.error("Failed to save course", error);
            alert("Error saving course. Please try again.");
        }
    };

    // 3. DELETE
    const confirmDelete = async () => {
        if (!deleteModal.courseId) return;
        
        try {
            await api.delete(`/courses/${deleteModal.courseId}`);
            fetchCourses(); // Refresh list
            setDeleteModal({ isOpen: false, courseId: null });
        } catch (error) {
            console.error("Failed to delete course", error);
            alert("Error deleting course.");
        }
    };

    return (
        <div className="p-6">
            <CourseModal 
                isOpen={modal.isOpen} 
                onClose={() => setModal({ isOpen: false, course: null })} 
                onSave={handleSave} 
                course={modal.course} 
            />
            
            {deleteModal.isOpen && (
                <ConfirmationModal 
                    onConfirm={confirmDelete} 
                    onCancel={() => setDeleteModal({ isOpen: false, courseId: null })} 
                    title="Delete Course" 
                    message="Are you sure you want to delete this course? This will remove all associated data." 
                />
            )}

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Manage Courses</CardTitle>
                            <CardDescription>Add, edit, and manage courses offered by the department.</CardDescription>
                        </div>
                        <button 
                            onClick={() => setModal({ isOpen: true, course: null })} 
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                                        {/* Added Credits Column */}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {courses.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No courses available. Click "Add Course" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        courses.map(course => (
                                            <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">
                                                    {course.code}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {course.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {course.semester}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {course.credits}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button 
                                                        onClick={() => setModal({ isOpen: true, course })} 
                                                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-4 font-medium transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeleteModal({ isOpen: true, courseId: course.id })} 
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

export default CourseManagement;