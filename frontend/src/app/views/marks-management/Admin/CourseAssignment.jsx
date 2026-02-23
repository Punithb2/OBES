import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; 
import { Icons } from '../shared/icons';
import toast from 'react-hot-toast'; // 1. IMPORT TOAST
import { TableSkeleton } from '../shared/SkeletonLoaders';

// --- Assignment Modal Component ---
const AssignmentModal = ({ isOpen, onClose, course, allFaculty, onSave }) => {
    const [assignments, setAssignments] = useState([]);
    const [newFacultyId, setNewFacultyId] = useState('');
    const [newRole, setNewRole] = useState('Lecturer');

    useEffect(() => {
        if (course) {
            // Load existing assignments from course settings
            let initialAssignments = [];
            
            if (course.settings?.assigned_team) {
                initialAssignments = course.settings.assigned_team;
            } else if (course.assigned_faculty) {
                initialAssignments = [{ facultyId: course.assigned_faculty, role: 'Course Coordinator' }];
            }
            setAssignments(initialAssignments);
        } else {
            setAssignments([]);
        }
        setNewFacultyId('');
        setNewRole('Lecturer');
    }, [course, isOpen]);

    if (!isOpen || !course) return null;

    const handleAdd = () => {
        if (!newFacultyId) return;
        
        const isAlreadyAssigned = assignments.some(a => String(a.facultyId) === String(newFacultyId)); 
        if (isAlreadyAssigned) {
            // 2. REPLACED ALERT WITH TOAST
            toast.error("This faculty member is already assigned to this course.");
            return;
        }

        setAssignments([...assignments, { facultyId: newFacultyId, role: newRole }]);
        setNewFacultyId('');
    };

    const handleRemove = (index) => {
        const updated = assignments.filter((_, i) => i !== index);
        setAssignments(updated);
    };

    const handleSave = (e) => {
        e.preventDefault();
        onSave(course.id, assignments);
    };

    const getFacultyName = (id) => {
        const f = allFaculty.find(u => String(u.id) === String(id));
        return f ? (f.display_name || f.username) : 'Unknown';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manage Course Team</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{course.code} - {course.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <Icons.XMark className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* List Existing Assignments */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg border dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Faculty</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Role</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {assignments.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No faculty assigned yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignments.map((item, idx) => (
                                        <tr key={`${item.facultyId}-${idx}`} className="bg-white dark:bg-gray-800">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {getFacultyName(item.facultyId)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-800">
                                                    {item.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleRemove(idx)} className="text-red-600 hover:text-red-800 dark:text-red-400">
                                                    <Icons.Trash className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Add New Assignment */}
                    <div className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 dark:bg-gray-700/20 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                        <div className="w-full sm:flex-1">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Select Faculty</label>
                            <select 
                                value={newFacultyId} 
                                onChange={(e) => setNewFacultyId(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">-- Choose Faculty --</option>
                                {allFaculty.map(f => (
                                    <option key={f.id} value={f.id}>{f.display_name || f.username}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Role</label>
                            <select 
                                value={newRole} 
                                onChange={(e) => setNewRole(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option>Course Coordinator</option>
                                <option>Lecturer</option>
                                <option>Lab Instructor</option>
                                <option>Tutor</option>
                            </select>
                        </div>
                        <button 
                            onClick={handleAdd}
                            disabled={!newFacultyId}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-4 border-t dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const CourseAssignment = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, courseId: null });

    const fetchData = async () => {
        if (!user || !user.department) return;
        
        try {
            setLoading(true);
            const deptId = user.department;

            const [fetchedFaculty, fetchedCourses] = await Promise.all([
                fetchAllPages(`/users/?role=faculty&department=${deptId}`),
                fetchAllPages(`/courses/?department=${deptId}`)
            ]);
            
            setFaculty(Array.isArray(fetchedFaculty) ? fetchedFaculty : []);

            const sortedCourses = Array.isArray(fetchedCourses) 
                ? [...fetchedCourses].sort((a, b) => a.semester - b.semester || (a.code || '').localeCompare(b.code || ''))
                : [];
                
            setCourses(sortedCourses);
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load course assignments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user]);

    const handleSaveAssignments = async (courseId, assignedTeam) => {
        const courseToUpdate = courses.find(c => String(c.id) === String(courseId));
        
        const updatedSettings = {
            ...(courseToUpdate.settings || {}),
            assigned_team: assignedTeam
        };

        const primaryFaculty = assignedTeam.length > 0 ? assignedTeam[0].facultyId : null;

        const savePromise = api.patch(`/courses/${courseId}/`, { 
            settings: updatedSettings,
            assigned_faculty: primaryFaculty 
        });

        // 3. REPLACED ALERT WITH TOAST.PROMISE
        toast.promise(savePromise, {
            loading: 'Saving team assignments...',
            success: 'Assignments updated successfully!',
            error: 'Failed to update assignments. Please try again.'
        }).then(() => {
            // Update local state smoothly
            setCourses(prev => prev.map(c => 
                String(c.id) === String(courseId) ? { ...c, settings: updatedSettings, assigned_faculty: primaryFaculty } : c
            ));
            setModal({ isOpen: false, courseId: null });
        }).catch(error => {
            console.error("Failed to save assignments", error);
        });
    };

    const getFacultyName = (id) => {
        const f = faculty.find(u => String(u.id) === String(id));
        return f ? (f.display_name || f.username) : 'Unknown';
    };

    const renderAssignedFacultyCell = (course) => {
        let assignments = course.settings?.assigned_team || [];
        
        if (assignments.length === 0 && course.assigned_faculty) {
            assignments = [{ facultyId: course.assigned_faculty, role: 'Coordinator' }];
        }

        if (assignments.length === 0) {
            return <span className="text-gray-400 italic text-xs">Unassigned</span>;
        }

        return (
            <div className="flex flex-col gap-1">
                {assignments.map((a, i) => (
                    <div key={i} className="flex items-center text-xs">
                        <Icons.UserGroup className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white mr-1">
                            {getFacultyName(a.facultyId)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                            ({a.role})
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6">
            <AssignmentModal 
                isOpen={modal.isOpen} 
                onClose={() => setModal({ isOpen: false, courseId: null })}
                course={courses.find(c => String(c.id) === String(modal.courseId))}
                allFaculty={faculty}
                onSave={handleSaveAssignments}
            />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Course Faculty Assignment</CardTitle>
                            <CardDescription>Assign multiple faculties and roles to courses.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <TableSkeleton rows={10} columns={4} />
                    ) : (
                        // 4. ADDED STICKY HEADER WRAPPER LOGIC (max-h-[70vh] overflow-y-auto)
                        <div className="overflow-y-auto max-h-[70vh] border rounded-lg dark:border-gray-700 custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        {/* 5. ADDED STICKY CLASSES TO TH Elements */}
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24 shadow-sm">Code</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-64 shadow-sm">Course Name</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider shadow-sm">Assigned Team</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32 shadow-sm">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {courses.map(course => (
                                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300 align-top">
                                                {course.code}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white align-top">
                                                {course.name}
                                                <div className="text-xs font-normal text-gray-500 mt-0.5">Sem: {course.semester}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm align-top">
                                                {renderAssignedFacultyCell(course)}
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                <button 
                                                    onClick={() => setModal({ isOpen: true, courseId: course.id })}
                                                    className="inline-flex items-center px-3 py-1.5 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 text-xs font-medium transition-colors dark:hover:bg-primary-900/30"
                                                >
                                                    <Icons.PencilSquare className="w-3 h-3 mr-1.5" />
                                                    Assign Team
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CourseAssignment;