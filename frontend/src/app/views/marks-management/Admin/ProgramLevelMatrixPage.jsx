import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../shared/Card';
import api, { fetchAllPages } from '../../../services/api'; // IMPORT ADDED HERE
import { useAuth } from '../../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { BlockSkeleton } from '../shared/SkeletonLoaders';

const ProgramLevelMatrixPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [courseReports, setCourseReports] = useState({});
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [loading, setLoading] = useState(true);

    // --- 1. FETCH ALL DATA ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                // A. Fetch Base Data using RECURSIVE HELPER
                const [fetchedCourses, fetchedPos, fetchedPsos, fetchedMatrix] = await Promise.all([
                    fetchAllPages(`/courses/?department=${deptId}`),
                    fetchAllPages('/pos/'),
                    fetchAllPages('/psos/'),
                    fetchAllPages(`/articulation-matrix/?department=${deptId}`).catch(() => [])
                ]);

                const sortById = (a, b) => {
                    const numA = parseInt((a.id || '').match(/\d+/)?.[0] || 0);
                    const numB = parseInt((b.id || '').match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                const safePos = Array.isArray(fetchedPos) ? [...fetchedPos].sort(sortById) : [];
                const safePsos = Array.isArray(fetchedPsos) ? [...fetchedPsos].sort(sortById) : [];
                const safeCourses = Array.isArray(fetchedCourses) ? fetchedCourses : [];

                setCourses(safeCourses);
                setOutcomes([...safePos, ...safePsos]);

                const mBuilder = {};
                if (Array.isArray(fetchedMatrix)) {
                    fetchedMatrix.forEach(item => {
                        if (item.course && item.matrix) mBuilder[item.course] = item.matrix;
                    });
                }
                setMatrix(mBuilder);

                // B. Fetch Pre-calculated Backend Reports for all courses
                // (Still using api.get because it fetches a single object per course, not a list)
                const reportsMap = {};
                const reportPromises = safeCourses.map(course => 
                    api.get(`/reports/course-attainment/${course.id}/`).catch(() => null)
                );
                
                const reports = await Promise.all(reportPromises);
                
                safeCourses.forEach((course, index) => {
                    const res = reports[index];
                    if (res?.data?.co_attainment) {
                        reportsMap[course.id] = res.data.co_attainment;
                    } else {
                        reportsMap[course.id] = [];
                    }
                });
                
                setCourseReports(reportsMap);

            } catch (error) {
                console.error("Failed to load program data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // --- 2. STREAMLINED ACTUAL ATTAINMENT ---
    const calculateActualAttainment = (course) => {
        const coData = courseReports[course.id] || [];
        const courseMatrix = matrix[course.id] || {};
        const poAttainment = {};

        if (coData.length === 0) return {}; 

        outcomes.forEach(outcome => {
            let weightedSum = 0;
            let weightCount = 0;

            coData.forEach(coItem => {
                const mapping = parseFloat(courseMatrix[coItem.co]?.[outcome.id]);
                if (!isNaN(mapping)) {
                    // Formula: (Mapping * Final_CO_Score_Index) / 3
                    weightedSum += (mapping * coItem.score_index) / 3;
                    weightCount++;
                }
            });

            if (weightCount > 0) {
                poAttainment[outcome.id] = (weightedSum / weightCount).toFixed(2);
            }
        });

        return poAttainment;
    };

    // --- 3. FILTERING ---
    const coursesBySemester = useMemo(() => {
        if (!Array.isArray(courses)) return {};
        
        return courses.reduce((acc, course) => {
            const semester = course.semester || 1; 
            if (!acc[semester]) acc[semester] = [];
            acc[semester].push(course);
            return acc;
        }, {});
    }, [courses]);

    const semesters = useMemo(() => {
        return Object.keys(coursesBySemester).sort((a, b) => Number(a) - Number(b));
    }, [coursesBySemester]);

    const visibleContent = useMemo(() => {
        let entries = Object.entries(coursesBySemester);
        if (selectedSemester !== 'all') {
            entries = entries.filter(([sem]) => sem.toString() === selectedSemester);
        }
        return entries.sort(([semA], [semB]) => Number(semA) - Number(semB));
    }, [selectedSemester, coursesBySemester]);

    if (loading) return <div className="p-6 space-y-6 pb-10"><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /></div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Program Level Attainment Matrix</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Consolidated average attainment for each course based on actual student performance.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Semesters</option>
                        {semesters.map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-8">
                        {visibleContent.length > 0 ? (
                            visibleContent.map(([semester, semesterCourses]) => (
                                <div key={semester}>
                                    <h2 className="text-xl font-semibold text-center text-gray-700 dark:text-gray-200 mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                        Semester {semester}
                                    </h2>
                                    <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                                                        Course Code
                                                    </th>
                                                    {outcomes.map(outcome => (
                                                        <th key={outcome.id} scope="col" className="px-3 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[3rem]">
                                                            {outcome.id}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {semesterCourses.map(course => {
                                                    const attainment = calculateActualAttainment(course);
                                                    
                                                    return (
                                                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                                {course.code}
                                                            </td>
                                                            {outcomes.map(outcome => {
                                                                const val = attainment[outcome.id];
                                                                return (
                                                                    <td key={`${course.id}-${outcome.id}`} className="px-3 py-4 whitespace-nowrap text-center text-sm">
                                                                        <span className={val ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-300 dark:text-gray-600'}>
                                                                            {val || '-'}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-lg">
                                No courses found for the selected semester.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProgramLevelMatrixPage;