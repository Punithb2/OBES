import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../shared/Card';
import api from '../../../services/api';

const ProgramLevelMatrixPage = () => {
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [coursesRes, posRes, psosRes, matrixRes] = await Promise.all([
                    api.get('/courses'),
                    api.get('/pos'),
                    api.get('/psos'),
                    api.get('/articulationMatrix')
                ]);
                setCourses(coursesRes.data);
                setOutcomes([...posRes.data, ...psosRes.data]);
                setMatrix(matrixRes.data);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Group courses by semester
    const coursesBySemester = useMemo(() => {
        return courses.reduce((acc, course) => {
            // Only include courses that have matrix data
            if (!matrix[course.id]) return acc; 
            
            const semester = course.semester;
            if (!acc[semester]) {
                acc[semester] = [];
            }
            acc[semester].push(course);
            return acc;
        }, {});
    }, [courses, matrix]);

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

    const calculateAverages = (course) => {
        const courseMatrix = matrix[course.id];
        if (!courseMatrix) return {};

        const averages = {};
        outcomes.forEach(outcome => {
            let sum = 0;
            let count = 0;
            // Iterate over all COs in the matrix for this course
            Object.values(courseMatrix).forEach(coMap => {
                const value = coMap[outcome.id];
                if (value && value > 0) {
                    sum += value;
                    count++;
                }
            });
            if (count > 0) {
                averages[outcome.id] = sum / count;
            }
        });
        return averages;
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading report...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Program Level CO-PO & PSO Matrix</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        A consolidated view of the average attainment for each course across all semesters.
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
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                        Mapping of CO_PO & PSO Matrix
                                                    </th>
                                                    {outcomes.map(outcome => (
                                                        <th key={outcome.id} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                            {outcome.id}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {semesterCourses.map(course => {
                                                    const averages = calculateAverages(course);
                                                    return (
                                                        <tr key={course.id}>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                                {course.code}
                                                            </td>
                                                            {outcomes.map(outcome => {
                                                                const avg = averages[outcome.id];
                                                                const displayValue = avg ? avg.toFixed(2) : '-';
                                                                return (
                                                                    <td key={`${course.id}-${outcome.id}`} className="px-3 py-4 whitespace-nowrap text-center text-sm">
                                                                        <span className={avg ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                                                                            {displayValue}
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
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                No courses with articulation data found.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProgramLevelMatrixPage;