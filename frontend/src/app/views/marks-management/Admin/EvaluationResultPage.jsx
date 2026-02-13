import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { Loader2, Filter } from 'lucide-react';

const EvaluationResultPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [courses, setCourses] = useState([]);
    const [schemes, setSchemes] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allMarks, setAllMarks] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [surveyData, setSurveyData] = useState({ exit_survey: {}, employer_survey: {}, alumni_survey: {} });
    
    // UI State
    const [selectedSchemeId, setSelectedSchemeId] = useState('');

    // --- 1. FETCH ALL DATA ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                const [coursesRes, schemesRes, studentsRes, marksRes, posRes, psosRes, matrixRes, surveyRes] = await Promise.all([
                    api.get(`/courses/?departmentId=${deptId}`),
                    api.get('/schemes/'), // Fetch all schemes
                    api.get('/students/'),
                    api.get('/marks/'),
                    api.get('/pos/'),
                    api.get('/psos/'),
                    api.get(`/articulation-matrix/?department=${deptId}`).catch(() => ({ data: [] })),
                    api.get(`/surveys/?department=${deptId}`).catch(() => ({ data: [] })) 
                ]);

                // Sort Outcomes
                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                setCourses(coursesRes.data);
                setSchemes(schemesRes.data);
                
                // Default to the first available scheme for summary calculation
                if (schemesRes.data.length > 0) {
                    setSelectedSchemeId(schemesRes.data[0].id);
                }

                setAllStudents(studentsRes.data);
                setAllMarks(marksRes.data);
                setOutcomes([...posRes.data.sort(sortById), ...psosRes.data.sort(sortById)]);

                if (surveyRes.data && surveyRes.data.length > 0) {
                    setSurveyData(surveyRes.data[0]);
                }

                // Process Matrix
                const mBuilder = {};
                const matrixData = Array.isArray(matrixRes.data) ? matrixRes.data : [];
                matrixData.forEach(item => {
                    if (item.course && item.matrix) {
                        mBuilder[item.course] = item.matrix;
                    }
                });
                setMatrix(mBuilder);

            } catch (error) {
                console.error("Failed to load evaluation data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // --- 2. CALCULATION ENGINE ---
    const calculateData = useMemo(() => {
        if (!courses.length || !outcomes.length) return { courseRows: [], summaryRows: [] };

        const getCourseAttainment = (course) => {
            const courseStudents = allStudents.filter(s => s.courses && s.courses.includes(course.id));
            const courseMarks = allMarks.filter(m => m.course === course.id);
            const courseMatrix = matrix[course.id] || {};

            if (courseStudents.length === 0 || courseMarks.length === 0) return {};

            // --- DYNAMIC: Get Rules from Course's Scheme ---
            const settings = course.scheme_details?.settings || {};
            const rules = settings.attainment_rules || {};
            
            // 1. Thresholds
            const targetLevel = rules.studentPassThreshold || 50; // Default 50%
            const lThresholds = rules.levelThresholds || { level3: 70, level2: 60, level1: 50 };
            const thresholds = [
                { threshold: lThresholds.level3, level: 3 },
                { threshold: lThresholds.level2, level: 2 },
                { threshold: lThresholds.level1, level: 1 },
                { threshold: 0, level: 0 }
            ];

            // 2. Weightage (Direct vs Indirect for Course)
            const wDirect = (rules.finalWeightage?.direct || 80) / 100;
            const wIndirect = (rules.finalWeightage?.indirect || 20) / 100;

            const tools = course.assessment_tools || [];
            const seeTool = tools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE' || t.name === 'Semester End Exam');
            const internalTools = tools.filter(t => t !== seeTool && t.type !== 'Improvement Test');
            
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
            (course.cos || []).forEach(co => {
                let coTotal = 0, coPassed = 0;
                internalTools.forEach(tool => {
                    if (tool.coDistribution?.[co.id]) {
                        courseStudents.forEach(student => {
                            const record = courseMarks.find(m => m.student === student.id && m.assessment_name === tool.name);
                            const score = parseInt(record?.scores?.[co.id] || 0);
                            coTotal++;
                            if (score >= (parseInt(tool.coDistribution[co.id]) * targetLevel / 100)) coPassed++;
                        });
                    }
                });
                const cieLevel = thresholds.find(t => ((coTotal > 0 ? (coPassed/coTotal)*100 : 0) >= t.threshold))?.level || 0;
                
                // Course Internal Attainment Split
                const indirectVal = parseFloat(course.settings?.indirect_attainment?.[co.id] || 3);
                const directVal = (cieLevel + seeLevel) / 2;
                
                // DYNAMIC SPLIT APPLIED HERE
                coLevels[co.id] = (wDirect * directVal) + (wIndirect * indirectVal);
            });

            // C. Map to POs
            const poAttainment = {};
            outcomes.forEach(outcome => {
                let wSum = 0, wCount = 0;
                (course.cos || []).forEach(co => {
                    const mapVal = parseFloat(courseMatrix[co.id]?.[outcome.id]);
                    if (!isNaN(mapVal)) {
                        wSum += (mapVal * (coLevels[co.id] || 0)) / 3;
                        wCount++;
                    }
                });
                if (wCount > 0) poAttainment[outcome.id] = wSum / wCount;
            });

            return poAttainment;
        };

        const courseRows = courses.map(course => ({
            course,
            attainment: getCourseAttainment(course)
        })).sort((a, b) => a.course.code.localeCompare(b.course.code));

        const directAttainment = {};
        outcomes.forEach(outcome => {
            let sum = 0, count = 0;
            courseRows.forEach(row => {
                if (row.attainment[outcome.id] !== undefined) {
                    sum += row.attainment[outcome.id];
                    count++;
                }
            });
            if (count > 0) directAttainment[outcome.id] = sum / count;
        });

        // --- C. Extract Survey Data ---
        const exitData = surveyData.exit_survey || {};
        const employerData = surveyData.employer_survey || {};
        const alumniData = surveyData.alumni_survey || {};

        const indirectAttainment = {};
        outcomes.forEach(outcome => {
            const v1 = parseFloat(exitData[outcome.id]) || 0;
            const v2 = parseFloat(employerData[outcome.id]) || 0;
            const v3 = parseFloat(alumniData[outcome.id]) || 0;
            
            let total = v1 + v2 + v3;
            let divisor = (v1 ? 1 : 0) + (v2 ? 1 : 0) + (v3 ? 1 : 0);
            
            indirectAttainment[outcome.id] = divisor > 0 ? total / divisor : 0;
        });

        // --- D. Final Program Weightage (Based on Selected Reference Scheme) ---
        const refScheme = schemes.find(s => s.id === selectedSchemeId);
        const refRules = refScheme?.settings?.attainment_rules || {};
        const wDirectProgram = (refRules.finalWeightage?.direct || 80) / 100;
        const wIndirectProgram = (refRules.finalWeightage?.indirect || 20) / 100;

        const rowC = {}; 
        const rowD = {};
        const totalRow = {};

        outcomes.forEach(o => {
            const id = o.id;
            const dir = directAttainment[id] || 0;
            const ind = indirectAttainment[id] || 0;
            
            rowC[id] = dir * wDirectProgram;
            rowD[id] = ind * wIndirectProgram;
            totalRow[id] = rowC[id] + rowD[id];
        });

        const summaryRows = [
            { label: 'Direct Attainment (Avg of Courses) [A]', data: directAttainment, bold: true, bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Program Exit Survey', data: exitData },
            { label: 'Employer Survey', data: employerData },
            { label: 'Alumni Survey', data: alumniData },
            { label: 'Indirect Attainment (Avg of Surveys) [B]', data: indirectAttainment, bold: true, bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { 
                label: `weighted Direct [C = A * ${(wDirectProgram * 100).toFixed(0)}%]`, 
                data: rowC 
            },
            { 
                label: `weighted Indirect [D = B * ${(wIndirectProgram * 100).toFixed(0)}%]`, 
                data: rowD 
            },
            { label: 'Total Attainment [C + D]', data: totalRow, bold: true, bg: 'bg-green-50 dark:bg-green-900/20' },
        ];

        return { courseRows, summaryRows };

    }, [courses, outcomes, allStudents, allMarks, matrix, surveyData, schemes, selectedSchemeId]);


    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Result of Evaluation</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Final Program Attainment calculated from Course Performance and Stakeholder Surveys.
                    </p>
                </div>
                
                {/* Reference Scheme Selector */}
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border shadow-sm">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase">Summary Logic:</span>
                    <select 
                        value={selectedSchemeId}
                        onChange={(e) => setSelectedSchemeId(e.target.value)}
                        className="text-sm font-bold border-none focus:ring-0 cursor-pointer bg-transparent text-primary-700 dark:text-primary-400"
                    >
                        {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600 min-w-[180px]">
                                        COMPONENT
                                    </th>
                                    {outcomes.map(outcome => (
                                        <th key={outcome.id} className="px-3 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600 min-w-[4rem]">
                                            {outcome.id}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                
                                {/* COURSE ROWS */}
                                {calculateData.courseRows.map(({ course, attainment }) => (
                                    <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 border-r border-gray-300 dark:border-gray-600">
                                            <div className="flex flex-col">
                                                <span className="font-bold">{course.code}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {course.scheme_details?.name ? course.scheme_details.name.substring(0,15)+'...' : 'Default'}
                                                </span>
                                            </div>
                                        </td>
                                        {outcomes.map(outcome => (
                                            <td key={outcome.id} className="px-3 py-2 whitespace-nowrap text-center text-sm border-r border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                                                {attainment[outcome.id] ? attainment[outcome.id].toFixed(2) : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {/* SUMMARY ROWS */}
                                {calculateData.summaryRows.map((row, idx) => (
                                    <tr key={idx} className={row.bg || ''}>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.bold ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'} border-r border-gray-300 dark:border-gray-600 border-t`}>
                                            {row.label}
                                        </td>
                                        {outcomes.map(outcome => {
                                            const val = row.data[outcome.id];
                                            let display = '-';
                                            if (val !== undefined && val !== null) {
                                                display = typeof val === 'number' ? val.toFixed(2) : parseFloat(val).toFixed(2);
                                            }
                                            
                                            return (
                                                <td key={outcome.id} className={`px-3 py-3 whitespace-nowrap text-center text-sm ${row.bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'} border-r border-gray-300 dark:border-gray-600 border-t`}>
                                                    {display}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}

                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default EvaluationResultPage;