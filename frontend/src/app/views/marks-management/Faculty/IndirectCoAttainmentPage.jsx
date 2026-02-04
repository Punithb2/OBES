import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { courses as mockCourses } from '../data/mockData';
import { useAuth } from 'app/contexts/AuthContext';

const IndirectCoAttainmentPage = () => {
    const { user } = useAuth();

    const assignedCourses = useMemo(() => {
        if (!user) return [];
        return mockCourses.filter(c => c.assignedFacultyId === user.id);
    }, [user]);
    
    const [selectedCourseId, setSelectedCourseId] = useState(assignedCourses[0]?.id ?? '');
    const [coRatings, setCoRatings] = useState({});
    
    // Initialize with mock data
    useEffect(() => {
        const initialRatings = {};
        assignedCourses.forEach(course => {
            initialRatings[course.id] = {};
            course.cos.forEach(co => {
                initialRatings[course.id][co.id] = parseFloat((Math.random() * (2.8 - 2.2) + 2.2).toFixed(2));
            });
        });
        setCoRatings(initialRatings);
    }, [assignedCourses]);
    
    useEffect(() => {
        if (assignedCourses.length > 0 && !assignedCourses.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(assignedCourses[0].id);
        } else if (assignedCourses.length === 0) {
            setSelectedCourseId('');
        }
    }, [assignedCourses, selectedCourseId]);

    const selectedCourse = assignedCourses.find(c => c.id === selectedCourseId);

    const handleRatingChange = (coId, value) => {
        if (!selectedCourseId) return;

        const numericValue = parseFloat(value);
        setCoRatings(prevRatings => ({
            ...prevRatings,
            [selectedCourseId]: {
                ...(prevRatings[selectedCourseId] || {}),
                [coId]: value === '' ? '' : isNaN(numericValue) ? (prevRatings[selectedCourseId]?.[coId] || '') : Math.max(1, Math.min(3, numericValue))
            }
        }));
    };

    const handleSaveChanges = () => {
        alert('Course End Survey ratings saved successfully!');
        console.log('Saved Data:', coRatings[selectedCourseId]);
    };

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
                    className="mt-4 sm:mt-0 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
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
                            Enter the average rating (on a scale of 1-3) for each Course Outcome based on student feedback.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">CO</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40">Rating (1-3)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {selectedCourse.cos.map(co => (
                                        <tr key={co.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{co.id.split('.')[1]}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{co.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="3"
                                                    step="0.01"
                                                    value={coRatings[selectedCourseId]?.[co.id] || ''}
                                                    onChange={(e) => handleRatingChange(co.id, e.target.value)}
                                                    className="w-24 h-10 text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                    aria-label={`Rating for ${co.id}`}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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