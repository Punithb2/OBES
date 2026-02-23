import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; // IMPORT ADDED HERE
import { Loader2, Save, AlertCircle, CheckCircle, X } from 'lucide-react';
import { TableSkeleton } from '../shared/SkeletonLoaders';

// --- CUSTOM MODAL ---
const CustomModal = ({ isOpen, onClose, config }) => {
    if (!isOpen) return null;
    const { title, message, type } = config;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {type === 'error' && <AlertCircle className="text-red-500 w-5 h-5" />}
                        {type === 'success' && <CheckCircle className="text-green-500 w-5 h-5" />}
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 text-sm text-gray-600 dark:text-gray-300">{message}</div>
                <div className="p-4 border-t dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

const IndirectCoAttainmentPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [surveyValues, setSurveyValues] = useState({});

    const [uiModal, setUiModal] = useState({ isOpen: false, type: 'alert', title: '', message: '' });
    const showModal = (type, title, message) => setUiModal({ isOpen: true, type, title, message });
    const closeModal = () => setUiModal(prev => ({ ...prev, isOpen: false }));

    // 1. Fetch Courses and safely extract settings
    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // RECURSIVE FETCH IMPLEMENTED HERE
                const fetchedCourses = await fetchAllPages('/courses/');
                
                // Safely handle filtering
                const myCourses = Array.isArray(fetchedCourses) 
                    ? fetchedCourses.filter(c => String(c.assigned_faculty) === String(user.id))
                    : [];

                // Initialize state mapped strictly by String IDs
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
                showModal('error', 'Error', 'Failed to load courses from the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

    const selectedCourse = useMemo(() => 
        courses.find(c => String(c.id) === String(selectedCourseId)), 
    [courses, selectedCourseId]);

    // 2. Handlers
    const handleRatingChange = (coId, value) => {
        let numVal = value;
        if (value !== '') {
            numVal = parseFloat(value);
            if (isNaN(numVal) || numVal < 0) numVal = 0;
            if (numVal > 3) numVal = 3; // Max rating is 3.0
        }

        setSurveyValues(prev => ({
            ...prev,
            [String(selectedCourseId)]: {
                ...(prev[String(selectedCourseId)] || {}),
                [coId]: value === '' ? '' : numVal
            }
        }));
    };

    const handleSave = async () => {
        if (!selectedCourse) return;
        setIsSaving(true);
        try {
            const courseDataToSave = surveyValues[String(selectedCourseId)] || {};
            
            // Merge with existing settings so we don't overwrite Admin attainment rules
            const payload = {
                settings: {
                    ...(selectedCourse.settings || {}),
                    indirect_attainment: courseDataToSave
                }
            };

            await api.patch(`/courses/${selectedCourseId}/`, payload);
            
            // Update local state to reflect successful save
            setCourses(courses.map(c => 
                String(c.id) === String(selectedCourseId) ? { ...c, settings: payload.settings } : c
            ));

            showModal('success', 'Saved Successfully', 'Course End Survey ratings have been updated.');
        } catch (error) {
            console.error("Failed to save", error);
            showModal('error', 'Save Failed', 'There was an error saving your ratings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-6 space-y-6 pb-10"><TableSkeleton rows={8} columns={3} /></div>;

    return (
        <div className="space-y-6 pb-10">
            <CustomModal isOpen={uiModal.isOpen} onClose={closeModal} config={uiModal} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Indirect CO Attainment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Course End Survey (CES) data entry.</p>
                </div>
                
                <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select 
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(String(e.target.value))}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        ))}
                        {courses.length === 0 && <option>No courses assigned</option>}
                    </select>
                    
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !selectedCourse}
                        className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Ratings
                    </button>
                </div>
            </div>

            {selectedCourse ? (
                <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                        <CardTitle>Course End Survey: {selectedCourse.code}</CardTitle>
                        <CardDescription>Enter the average rating (on a scale of 0-3) for each Course Outcome based on student feedback.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-white dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24 border-r dark:border-gray-700">CO</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40 border-l dark:border-gray-700">Rating (0-3)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                    {(selectedCourse.cos || []).map(co => (
                                        <tr key={co.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white border-r dark:border-gray-700">
                                                {co.id.includes('.') ? co.id.split('.').pop() : co.id}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                {co.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center border-l dark:border-gray-700">
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    max="3"
                                                    step="0.1"
                                                    value={surveyValues[String(selectedCourseId)]?.[co.id] ?? ''}
                                                    onChange={(e) => handleRatingChange(co.id, e.target.value)}
                                                    className="w-20 text-center rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold"
                                                    placeholder="0.0"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {(!selectedCourse.cos || selectedCourse.cos.length === 0) && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No Course Outcomes defined for this subject. Please add them in the Course Configuration.
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