import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ConsolidatedMatrixPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allMarks, setAllMarks] = useState([]);
    const [outcomes, setOutcomes] = useState([]); 
    const [matrix, setMatrix] = useState({});
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [loading, setLoading] = useState(true);

    // --- 1. FETCH ALL REQUIRED DATA ---
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
                    // FIX: Use correct URL 'articulation-matrix'
                    api.get(`/articulation-matrix/?department=${deptId}`).catch(() => ({ data: [] }))
                ]);

                // Sort POs/PSOs numerically
                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                setCourses(coursesRes.data);
                setAllStudents(studentsRes.data);
                setAllMarks(marksRes.data);
                setOutcomes([...posRes.data.sort(sortById), ...psosRes.data.sort(sortById)]);

                // Process Matrix Data
                const matrixMap = {};
                const matrixData = Array.isArray(matrixRes.data) ? matrixRes.data : [];
                matrixData.forEach(item => {
                    if (item.course && item.matrix) {
                        matrixMap[item.course] = item.matrix;
                    }
                });
                setMatrix(matrixMap);

            } catch (error) {
                console.error("Failed to load consolidated data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // --- 2. CALCULATION LOGIC ---
    const calculateCourseAttainment = (course) => {
        const tools = course.assessment_tools || course.assessmentTools || [];
        
        // Filter Data for this specific course
        const courseStudents = allStudents.filter(s => s.courses && s.courses.includes(course.id));
        const courseMarks = allMarks.filter(m => m.course === course.id);
        const courseMatrix = matrix[course.id] || {}; 

        // If no data, return null to show "No Data" state
        if (courseStudents.length === 0 || courseMarks.length === 0) return null;

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

        // B. Calculate Final CO Levels
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

        // C. Calculate PO Attainment
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

        return { coLevels, poAttainment };
    };

    // --- 3. FILTERING & RENDERING ---
    const semesters = [...new Set(courses.map(c => c.semester))].sort((a, b) => a - b);

    const filteredCourses = selectedSemester === 'all'
        ? courses
        : courses.filter(course => course.semester.toString() === selectedSemester);

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Consolidated Attainment Matrix</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Live calculated PO/PSO attainment based on student marks.
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
                    const isCalculated = !!calculatedData;
                    
                    // Use calculated COs if available, else course COs, else fallback
                    const coIds = (course.cos && course.cos.length > 0) ? course.cos.map(c => c.id) : [];

                    return (
                        <Card key={course.id} className="overflow-hidden mb-6">
                            <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700 py-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">{course.code} - {course.name}</CardTitle>
                                        <CardDescription>Semester {course.semester} • Credits: {course.credits}</CardDescription>
                                    </div>
                                    {isCalculated ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                            Calculated Live
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                            No Marks Data
                                        </span>
                                    )}
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
                                            {/* Show CO Rows with Mapping (Optional context) */}
                                            {coIds.map(coId => (
                                                <tr key={coId}>
                                                    <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600 z-10">
                                                        {coId}
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
                                                    // Display Calculated Attainment
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