import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; 
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { TableSkeleton } from '../shared/SkeletonLoaders';
import toast from 'react-hot-toast'; // 1. IMPORT TOAST

const IndirectCoAttainmentPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [surveyValues, setSurveyValues] = useState({});

    // 1. Fetch Courses
    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const fetchedCourses = await fetchAllPages('/courses/');
                const myCourses = Array.isArray(fetchedCourses) ? fetchedCourses.filter(c => String(c.assigned_faculty) === String(user.id)) : [];

                const initialVals = {};
                myCourses.forEach(c => {
                    const settings = c.settings || {};
                    initialVals[String(c.id)] = settings.indirect_attainment || {};
                });

                setCourses(myCourses);
                setSurveyValues(initialVals);
                
                if (myCourses.length > 0) setSelectedCourseId(String(myCourses[0].id));
            } catch (error) {
                console.error("Failed to load courses", error);
                toast.error('Failed to load courses from the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

    const selectedCourse = useMemo(() => courses.find(c => String(c.id) === String(selectedCourseId)), [courses, selectedCourseId]);

    // 2. Handlers
    const handleRatingChange = (coId, value) => {
        let numVal = value;
        if (value !== '') {
            numVal = parseFloat(value);
            if (isNaN(numVal) || numVal < 0) numVal = 0;
            if (numVal > 3) numVal = 3; 
        }

        setSurveyValues(prev => ({
            ...prev, [String(selectedCourseId)]: { ...(prev[String(selectedCourseId)] || {}), [coId]: value === '' ? '' : numVal }
        }));
    };

    const handleSave = async () => {
        if (!selectedCourse) return;
        
        const courseDataToSave = surveyValues[String(selectedCourseId)] || {};
        const payload = { settings: { ...(selectedCourse.settings || {}), indirect_attainment: courseDataToSave } };

        // 2. TOAST PROMISE FOR SAVING
        const savePromise = api.patch(`/courses/${selectedCourseId}/`, payload).then(() => {
            setCourses(courses.map(c => String(c.id) === String(selectedCourseId) ? { ...c, settings: payload.settings } : c));
        });

        toast.promise(savePromise, {
            loading: 'Saving ratings...',
            success: 'Course End Survey ratings updated!',
            error: 'Failed to save ratings.'
        });
    };

    if (loading) return <div className="p-6 space-y-6 pb-10"><div className="w-64 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8"></div><TableSkeleton rows={8} columns={3} /></div>;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Indirect CO Attainment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Course End Survey (CES) data entry.</p>
                </div>
                
                <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select 
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(String(e.target.value))}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        ))}
                    </select>
                    
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !selectedCourse}
                        className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-bold shadow-sm"
                    >
                        <Save className="w-4 h-4 mr-2" /> Save Ratings
                    </button>
                </div>
            </div>

            {selectedCourse ? (
                <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                        <CardTitle>Course End Survey: {selectedCourse.code}</CardTitle>
                        <CardDescription>Enter the average rating (on a scale of 0-3) for each Course Outcome.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* 3. STICKY HEADER */}
                        <div className="overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                                <thead className="bg-white dark:bg-gray-800">
                                    <tr>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24 border-r dark:border-gray-700 shadow-sm">CO</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider shadow-sm">Description</th>
                                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40 border-l dark:border-gray-700 shadow-sm">Rating (0-3)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {(selectedCourse.cos || []).map(co => (
                                        <tr key={co.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white border-r dark:border-gray-700">
                                                {co.id.includes('.') ? co.id.split('.').pop() : co.id}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                {co.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center border-l dark:border-gray-700">
                                                <input 
                                                    type="number" min="0" max="3" step="0.1"
                                                    value={surveyValues[String(selectedCourseId)]?.[co.id] ?? ''}
                                                    onChange={(e) => handleRatingChange(co.id, e.target.value)}
                                                    className="w-20 text-center rounded-md border-gray-300 shadow-sm focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-bold"
                                                    placeholder="0.0"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {(!selectedCourse.cos || selectedCourse.cos.length === 0) && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                No Course Outcomes defined. Add them in the Course Configuration.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium">Select a Course</h3>
                    <p>Please select a course to enter Indirect CO Attainment data.</p>
                </div>
            )}
        </div>
    );
};

export default IndirectCoAttainmentPage;