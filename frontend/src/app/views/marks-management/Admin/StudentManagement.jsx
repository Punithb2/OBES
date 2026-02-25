import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; 
import { Icons } from '../shared/icons';
import { Loader2, Upload, Download, Trash2, Pencil } from 'lucide-react'; 
import toast from 'react-hot-toast';
import { TableSkeleton } from '../shared/SkeletonLoaders';
import ConfirmationModal from '../shared/ConfirmationModal';

// --- STUDENT EDIT MODAL ---
const StudentModal = ({ isOpen, onClose, onSave, student = null }) => {
    const [formData, setFormData] = useState({ usn: '', name: '' });

    useEffect(() => {
        if (student) {
            setFormData({ usn: student.usn || student.id, name: student.name });
        } else {
            setFormData({ usn: '', name: '' });
        }
    }, [student, isOpen]);

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
                        Edit Student
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                        <Icons.XMark className="h-6 w-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">USN</label>
                        <input 
                            disabled 
                            type="text" 
                            value={formData.usn} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 sm:text-sm font-mono" 
                        />
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">USN cannot be changed. Delete and re-add if incorrect.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Student Name <span className="text-red-500">*</span></label>
                        <input 
                            required 
                            type="text" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm focus:ring-primary-500 focus:border-primary-500" 
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6 pt-4 border-t dark:border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm transition-colors">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const StudentManagement = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Edit & Delete State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, idToDelete: null });

    const fileInputRef = useRef(null);

    // Fetch Courses
    useEffect(() => {
        const fetchCourses = async () => {
            if (!user || !user.department) return;
            try {
                const fetchedCourses = await fetchAllPages(`/courses/?department=${user.department}`);
                const safeCourses = Array.isArray(fetchedCourses) ? fetchedCourses : [];
                setCourses(safeCourses);
                if (safeCourses.length > 0) setSelectedCourseId(safeCourses[0].id);
            } catch (error) {
                console.error("Failed to load courses");
            }
        };
        fetchCourses();
    }, [user]);

    // Fetch Students
    const fetchStudents = async () => {
        if (!selectedCourseId) return;
        try {
            setLoading(true);
            const fetchedStudents = await fetchAllPages(`/students/?course=${selectedCourseId}`);
            setStudents(Array.isArray(fetchedStudents) ? fetchedStudents : []);
        } catch (error) {
            console.error("Failed to fetch students");
            toast.error("Failed to load enrolled students.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [selectedCourseId]);

    // Handlers for Edit
    const openEditModal = (student) => {
        setSelectedStudent(student);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedStudent(null);
    };

    const handleEditSave = async (formData) => {
        if (!selectedStudent) return;
        
        toast.promise(
            api.patch(`/students/${selectedStudent.id}/`, { name: formData.name }),
            {
                loading: 'Updating student...',
                success: 'Student updated successfully!',
                error: 'Failed to update student.',
            }
        ).then(() => {
            closeEditModal();
            fetchStudents();
        }).catch(err => console.error(err));
    };

    // Handlers for Delete
    const openDeleteModal = (id) => {
        setDeleteModal({ isOpen: true, idToDelete: id });
    };

    const confirmDelete = async () => {
        toast.promise(
            api.delete(`/students/${deleteModal.idToDelete}/`),
            {
                loading: 'Deleting student...',
                success: 'Student removed successfully.',
                error: 'Failed to delete student.',
            }
        ).then(() => {
            fetchStudents();
        }).catch(err => console.error(err))
        .finally(() => {
            setDeleteModal({ isOpen: false, idToDelete: null });
        });
    };

    // Handle CSV Download
    const handleDownloadTemplate = () => {
        const csvContent = "USN,Name\n1KG22CS001,Alice Johnson\n1KG22CS002,Bob Smith";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Student_Roster_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle Bulk Upload
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !selectedCourseId) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('course_id', selectedCourseId);

        setIsUploading(true);
        try {
            const response = await api.post('/students/bulk_upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success(response.data.message || "Students uploaded successfully!");
            fetchStudents(); 
        } catch (error) {
            console.error("Upload failed", error);
            toast.error(error.response?.data?.error || "Failed to upload students.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="p-6 space-y-6">
            <StudentModal isOpen={isEditModalOpen} onClose={closeEditModal} onSave={handleEditSave} student={selectedStudent} />

            {deleteModal.isOpen && (
                <ConfirmationModal 
                    title="Delete Student"
                    message="Are you sure you want to remove this student? This will completely delete their profile and all associated marks from the system. This action cannot be undone."
                    theme="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, idToDelete: null })}
                />
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Students Management</CardTitle>
                            <CardDescription>Enroll students into courses via CSV bulk upload or manage existing students.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 items-end mb-6">
                        <div className="w-full sm:flex-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Select Course to Manage</label>
                            <select 
                                value={selectedCourseId} 
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
                                disabled={courses.length === 0}
                            >
                                {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleDownloadTemplate} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-bold shadow-sm transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600">
                                <Download className="w-4 h-4 mr-2" /> Template
                            </button>
                            
                            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button 
                                onClick={() => fileInputRef.current.click()} 
                                disabled={isUploading || !selectedCourseId}
                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-bold shadow-sm transition-colors"
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                {isUploading ? "Uploading..." : "Upload Students CSV"}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <TableSkeleton rows={8} columns={3} />
                    ) : (
                        <div className="overflow-y-auto max-h-[60vh] border rounded-lg dark:border-gray-700 custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase shadow-sm">USN</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase shadow-sm">Student Name</th>
                                        {/* Added Actions Column Header */}
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase shadow-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {students.length === 0 ? (
                                        <tr><td colSpan="3" className="px-6 py-12 text-center text-sm text-gray-500 font-medium">No students enrolled in this course. Upload the Student List.</td></tr>
                                    ) : (
                                        students.map(s => (
                                            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600 dark:text-primary-400 font-bold">{s.usn}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{s.name}</td>
                                                {/* Added Actions Buttons */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-3">
                                                        <button 
                                                            onClick={() => openEditModal(s)} 
                                                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 transition-colors"
                                                            title="Edit Student Name"
                                                        >
                                                            <Pencil className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => openDeleteModal(s.id)} 
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 transition-colors"
                                                            title="Delete Student"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
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

export default StudentManagement;