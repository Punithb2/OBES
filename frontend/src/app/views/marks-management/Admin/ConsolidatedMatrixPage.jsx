import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api, { fetchAllPages } from '../../../services/api'; 
import { useAuth } from '../../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { BlockSkeleton } from '../shared/SkeletonLoaders';

const ConsolidatedMatrixPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]); 
    const [matrix, setMatrix] = useState({});
    const [courseReports, setCourseReports] = useState({});
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [loading, setLoading] = useState(true);

    // --- 1. FETCH ALL REQUIRED DATA ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

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

                const matrixMap = {};
                if (Array.isArray(fetchedMatrix)) {
                    fetchedMatrix.forEach(item => {
                        if (item.course && item.matrix) matrixMap[item.course] = item.matrix;
                    });
                }
                setMatrix(matrixMap);

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
                console.error("Failed to load consolidated data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // --- 2. STREAMLINED CALCULATION ---
    const calculateCourseAttainment = (course) => {
        const coData = courseReports[course.id] || [];
        const courseMatrix = matrix[course.id] || {}; 

        if (coData.length === 0) return null;

        const poAttainment = {};
        outcomes.forEach(outcome => {
            let weightedSum = 0;
            let weightCount = 0;

            coData.forEach(coItem => {
                const mapping = parseFloat(courseMatrix[coItem.co]?.[outcome.id]);
                if (!isNaN(mapping)) {
                    weightedSum += (mapping * coItem.score_index) / 3;
                    weightCount++;
                }
            });

            if (weightCount > 0) {
                poAttainment[outcome.id] = (weightedSum / weightCount).toFixed(2);
            }
        });

        return { poAttainment };
    };

    // --- 3. FILTERING & RENDERING ---
    const semesters = [...new Set(courses.map(c => c.semester))].sort((a, b) => a - b);

    const filteredCourses = selectedSemester === 'all'
        ? courses
        : courses.filter(course => course.semester.toString() === selectedSemester);

    if (loading) return <div className="p-6 space-y-6 pb-10"><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /></div>

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Consolidated Attainment Matrix</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Consolidated PO/PSO attainment based on student marks.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="block w-full sm:w-56 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Semesters</option>
                        {semesters.map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredCourses.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                    No courses found for the selected semester.
                </div>
            ) : (
                filteredCourses.map(course => {
                    const calculatedData = calculateCourseAttainment(course);
                    const coIds = (course.cos && course.cos.length > 0) ? course.cos.map(c => c.id) : [];

                    return (
                        <Card key={course.id} className="overflow-hidden mb-6">
                            <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700 py-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">{course.code} - {course.name}</CardTitle>
                                        <CardDescription>Semester {course.semester} • Credits: {course.credits}</CardDescription>
                                    </div>
                                    {/* The "Calculated Live" / "No Marks Data" badges have been removed from here */}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-100 dark:bg-gray-800">
                                            <tr>
                                                <th className="sticky left-0 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600 z-10 w-24">
                                                    COs
                                                </th>
                                                {outcomes.map(outcome => (
                                                    <th key={outcome.id} className="px-3 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[3rem]">
                                                        {outcome.id}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {coIds.map(coId => (
                                                <tr key={coId}>
                                                    <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600 z-10">
                                                        {coId.includes('.') ? coId.split('.').pop() : coId}
                                                    </td>
                                                    {outcomes.map(outcome => {
                                                        const mappingVal = matrix[course.id]?.[coId]?.[outcome.id];
                                                        return (
                                                            <td key={outcome.id} className="px-3 py-2 whitespace-nowrap text-center text-xs text-gray-400">
                                                                {mappingVal || '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t-2 border-gray-300 dark:border-gray-600">
                                            <tr className="bg-blue-50 dark:bg-blue-900/20">
                                                <td className="sticky left-0 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm font-bold text-blue-800 dark:text-blue-100 border-r dark:border-gray-600 z-10">
                                                    ATTAINMENT
                                                </td>
                                                {outcomes.map(outcome => {
                                                    const val = calculatedData?.poAttainment?.[outcome.id];
                                                    return (
                                                        <td key={`att-${course.id}-${outcome.id}`} className="px-3 py-3 whitespace-nowrap text-center text-sm font-bold text-blue-700 dark:text-blue-200">
                                                            {val || '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
};

export default ConsolidatedMatrixPage;