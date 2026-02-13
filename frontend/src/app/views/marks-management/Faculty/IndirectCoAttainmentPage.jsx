import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Save, AlertCircle } from 'lucide-react';

const IndirectCoAttainmentPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Stores ratings keyed by course ID: { "C101": { "CO1": 2.4, "CO2": 3.0 } }
    const [coRatings, setCoRatings] = useState({});
    
    // Filter courses assigned to the current faculty
    const assignedCourses = useMemo(() => {
        if (!user || !courses.length) return [];
        // Ensure type safety (user.id might be int or string depending on auth provider)
        return courses.filter(c => c.assigned_faculty == user.id);
    }, [user, courses]);
    
    const [selectedCourseId, setSelectedCourseId] = useState('');
    
    // 1. Fetch Courses
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const res = await api.get('/courses/');
                setCourses(res.data);
                
                // Initialize ratings from existing course settings
                const initialRatings = {};
                res.data.forEach(c => {
                    // Check if indirect_attainment exists in settings
                    if (c.settings && c.settings.indirect_attainment) {
                        initialRatings[c.id] = c.settings.indirect_attainment;
                    } else {
                        initialRatings[c.id] = {};
                    }
                });
                setCoRatings(initialRatings);
                
            } catch (error) {
                console.error("Failed to load courses", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchCourses();
    }, [user]);
    
    // 2. Auto-select first course
    useEffect(() => {
        if (assignedCourses.length > 0 && !assignedCourses.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(assignedCourses[0].id);
        } else if (assignedCourses.length === 0) {
            setSelectedCourseId('');
        }
    }, [assignedCourses, selectedCourseId]);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    // 3. Handle Input Change
    const handleRatingChange = (coId, value) => {
        if (!selectedCourseId) return;

        const numericValue = parseFloat(value);
        setCoRatings(prevRatings => ({
            ...prevRatings,
            [selectedCourseId]: {
                ...(prevRatings[selectedCourseId] || {}),
                [coId]: value === '' ? '' : isNaN(numericValue) ? (prevRatings[selectedCourseId]?.[coId] || '') : Math.max(0, Math.min(3, numericValue))
            }
        }));
    };

    // 4. Save Changes to Backend
    const handleSaveChanges = async () => {
        if (!selectedCourse) return;
        
        try {
            // We update the 'settings' field of the course
            // preserving other settings that might exist
            const updatedSettings = {
                ...selectedCourse.settings,
                indirect_attainment: coRatings[selectedCourseId]
            };

            await api.patch(`/courses/${selectedCourseId}/`, {
                settings: updatedSettings
            });

            // Update local courses state to reflect saved settings
            setCourses(prev => prev.map(c => 
                c.id === selectedCourseId ? { ...c, settings: updatedSettings } : c
            ));

            alert('Course End Survey ratings saved successfully!');
        } catch (error) {
            console.error("Failed to save ratings", error);
            alert("Failed to save changes. Please try again.");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading courses...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Indirect CO Attainment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage Course End Survey results to calculate indirect attainment for COs.
                    </p>
                </div>
                <button
                    onClick={handleSaveChanges}
                    disabled={!selectedCourse}
                    className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Course</CardTitle>
                    <CardDescription>Choose the course for which you want to enter survey data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <select
                        id="course-select"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full sm:w-96 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={assignedCourses.length === 0}
                    >
                        {assignedCourses.length > 0 ? assignedCourses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        )) : <option>No courses assigned</option>}
                    </select>
                </CardContent>
            </Card>

            {selectedCourse ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Course End Survey: {selectedCourse.code}</CardTitle>
                        <CardDescription>
                            Enter the average rating (on a scale of 0-3) for each Course Outcome based on student feedback.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedCourse.cos && selectedCourse.cos.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">CO</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40">Rating (0-3)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {selectedCourse.cos.map(co => (
                                            <tr key={co?.id || Math.random()}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {/* FIX: Added Optional Chaining and fallback to prevent undefined 'includes' error */}
                                                    {co?.id && co.id.includes('.') ? co.id.split('.')[1] : (co?.id || 'N/A')}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    {co?.description || 'No description available'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="3"
                                                        step="0.01"
                                                        value={coRatings[selectedCourseId]?.[co?.id] ?? ''}
                                                        onChange={(e) => co?.id && handleRatingChange(co.id, e.target.value)}
                                                        className="w-24 h-10 text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                        aria-label={`Rating for ${co?.id}`}
                                                        disabled={!co?.id}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                                <AlertCircle className="w-10 h-10 mb-2 text-yellow-500" />
                                <p>No Course Outcomes (COs) defined for this course.</p>
                                <p className="text-sm">Please define COs in the Course Management page first.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent>
                        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                            <p>Please select a course to enter indirect attainment data.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default IndirectCoAttainmentPage;