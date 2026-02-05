import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const ConsolidatedMatrixPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]); 
    const [matrix, setMatrix] = useState({});
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                const [coursesRes, posRes, psosRes, matrixRes] = await Promise.all([
                    api.get(`/courses/?departmentId=${deptId}`),
                    api.get('/pos/'),
                    api.get('/psos/'),
                    // If endpoint fails (404), return empty object so page doesn't crash
                    api.get(`/articulation-matrix/?department=${deptId}`).catch(() => ({ data: {} })) 
                ]);

                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                setCourses(coursesRes.data);
                setOutcomes([...posRes.data.sort(sortById), ...psosRes.data.sort(sortById)]);
                setMatrix(matrixRes.data || {});

            } catch (error) {
                console.error("Failed to load matrix data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const semesters = [...new Set(courses.map(c => c.semester))].sort((a, b) => a - b);

    const filteredCourses = selectedSemester === 'all'
        ? courses
        : courses.filter(course => course.semester.toString() === selectedSemester);

    if (loading) return <div className="p-12 text-center text-gray-500">Loading matrix data...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Consolidation of CO-PO & CO-PSO</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Review the detailed CO-level articulation for each course in your department.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <select
                        id="semester-filter"
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
                    // FIX: Default to empty object if no data exists, DO NOT hide the course
                    const courseMatrix = matrix[course.id] || {}; 
                    
                    // Mock COs for display if none exist (usually 5 COs per course)
                    const coIds = Object.keys(courseMatrix).length > 0 
                        ? Object.keys(courseMatrix) 
                        : ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];

                    const displayCos = coIds.map((id, index) => ({
                        id: id,
                        description: `Course Outcome ${index + 1}`
                    }));

                    const outcomeAverages = {};
                    outcomes.forEach(outcome => {
                        let sum = 0;
                        let count = 0;
                        displayCos.forEach(co => {
                            const value = courseMatrix[co.id]?.[outcome.id];
                            if (value && value > 0) {
                                sum += parseFloat(value);
                                count++;
                            }
                        });
                        if (count > 0) {
                            outcomeAverages[outcome.id] = sum / count;
                        }
                    });

                    return (
                        <Card key={course.id}>
                            <CardHeader>
                                <CardTitle>{course.code} - {course.name}</CardTitle>
                                <CardDescription>Articulation Matrix (Semester {course.semester})</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600 z-10 w-32">
                                                    COs
                                                </th>
                                                {outcomes.map(outcome => (
                                                    <th key={outcome.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[3rem]">
                                                        {outcome.id}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {displayCos.map(co => (
                                                <tr key={co.id}>
                                                    <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600 z-10">
                                                        <div className="font-bold">{co.id}</div>
                                                    </td>
                                                    {outcomes.map(outcome => {
                                                        const val = courseMatrix[co.id]?.[outcome.id];
                                                        return (
                                                            <td key={outcome.id} className="px-3 py-4 whitespace-nowrap text-center text-sm font-semibold">
                                                                <span className={val ? 'text-gray-800 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600'}>
                                                                    {val || '-'}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t-2 border-gray-300 dark:border-gray-600">
                                            <tr className="bg-red-50 dark:bg-red-900/20">
                                                <td className="sticky left-0 bg-red-50 dark:bg-red-900/20 px-4 py-4 text-sm font-bold text-gray-900 dark:text-white border-r dark:border-gray-600 z-10">
                                                    AVERAGE
                                                </td>
                                                {outcomes.map(outcome => {
                                                    const avg = outcomeAverages[outcome.id];
                                                    const displayValue = avg ? (avg % 1 === 0 ? avg.toString() : avg.toFixed(1)) : '-';
                                                    return (
                                                        <td key={`avg-${course.id}-${outcome.id}`} className="px-3 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-800 dark:text-gray-100">
                                                            {displayValue}
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