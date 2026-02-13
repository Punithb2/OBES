import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../shared/Card';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProgramLevelMatrixPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allMarks, setAllMarks] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [loading, setLoading] = useState(true);

    // --- 1. FETCH ALL DATA ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                const [coursesRes, studentsRes, marksRes, posRes, psosRes, matrixRes] = await Promise.all([
                    api.get(`/courses/?departmentId=${deptId}`),
                    api.get('/students/'),
                    api.get('/marks/'),
                    api.get('/pos/'),
                    api.get('/psos/'),
                    // FIX: Correct URL 'articulation-matrix' (kebab-case)
                    api.get(`/articulation-matrix/?department=${deptId}`).catch(() => ({ data: [] }))
                ]);

                // Sort Outcomes
                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                setCourses(coursesRes.data);
                setAllStudents(studentsRes.data);
                setAllMarks(marksRes.data);
                setOutcomes([...posRes.data.sort(sortById), ...psosRes.data.sort(sortById)]);

                // Build Matrix Map
                const mBuilder = {};
                const matrixData = Array.isArray(matrixRes.data) ? matrixRes.data : [];
                matrixData.forEach(item => {
                    if (item.course && item.matrix) {
                        mBuilder[item.course] = item.matrix;
                    }
                });
                setMatrix(mBuilder);

            } catch (error) {
                console.error("Failed to load program data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // --- 2. CALCULATE ACTUAL ATTAINMENT ---
    const calculateActualAttainment = (course) => {
        const courseStudents = allStudents.filter(s => s.courses && s.courses.includes(course.id));
        const courseMarks = allMarks.filter(m => m.course === course.id);
        const courseMatrix = matrix[course.id] || {};

        if (courseStudents.length === 0 || courseMarks.length === 0) return {}; 

        const tools = course.assessment_tools || course.assessmentTools || [];
        const seeTool = tools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE' || t.name === 'Semester End Exam');
        const internalTools = tools.filter(t => t !== seeTool && t.type !== 'Improvement Test');

        // Thresholds
        const targetLevel = 50; 
        const thresholds = [
             { threshold: 80, level: 3 },
             { threshold: 70, level: 2 },
             { threshold: 60, level: 1 },
             { threshold: 0, level: 0 },
        ];

        // A. Calculate SEE Level
        let seePassedCount = 0;
        if (seeTool) {
            courseStudents.forEach(student => {
                const record = courseMarks.find(m => m.student === student.id && (m.assessment_name === seeTool.name || m.assessment_name === 'SEE'));
                if (record && record.scores) {
                    const score = Object.values(record.scores).reduce((a, b) => a + (parseInt(b)||0), 0);
                    if (score >= (seeTool.maxMarks * targetLevel / 100)) seePassedCount++;
                }
            });
        }
        const seePercent = (seePassedCount / (courseStudents.length || 1)) * 100;
        const seeLevel = thresholds.find(t => seePercent >= t.threshold)?.level || 0;

        // B. Calculate CO Levels
        const coLevels = {};
        const cos = course.cos || [];
        
        cos.forEach(co => {
            let coTotalAttempts = 0;
            let coPassedAttempts = 0;

            internalTools.forEach(tool => {
                const coMax = parseInt(tool.coDistribution?.[co.id] || 0);
                if (coMax > 0) {
                    courseStudents.forEach(student => {
                        const record = courseMarks.find(m => m.student === student.id && m.assessment_name === tool.name);
                        const score = parseInt(record?.scores?.[co.id] || 0);
                        coTotalAttempts++;
                        if (score >= (coMax * targetLevel / 100)) coPassedAttempts++;
                    });
                }
            });

            const ciePercent = coTotalAttempts > 0 ? (coPassedAttempts / coTotalAttempts) * 100 : 0;
            const cieLevel = thresholds.find(t => ciePercent >= t.threshold)?.level || 0;
            
            const indirectVal = parseFloat(course.settings?.indirect_attainment?.[co.id] || 3);
            const directVal = (cieLevel + seeLevel) / 2;
            
            // Final CO Attainment
            coLevels[co.id] = (0.8 * directVal) + (0.2 * indirectVal);
        });

        // C. Calculate PO Attainment (Weighted Average)
        const poAttainment = {};
        outcomes.forEach(outcome => {
            let weightedSum = 0;
            let weightCount = 0;

            cos.forEach(co => {
                const mapping = parseFloat(courseMatrix[co.id]?.[outcome.id]);
                if (!isNaN(mapping)) {
                    // Actual = (Mapping * Final_CO_Level) / 3
                    const coVal = coLevels[co.id] || 0;
                    const actual = (mapping * coVal) / 3;
                    weightedSum += actual;
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
        return courses.reduce((acc, course) => {
            const semester = course.semester;
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

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;

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
                                                    // Calculate Actual Attainment
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