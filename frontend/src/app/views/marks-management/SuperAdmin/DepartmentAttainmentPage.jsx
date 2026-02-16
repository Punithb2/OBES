import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import api from '../../../services/api';
import { Loader2, Filter, Building2, Search } from 'lucide-react';

const DepartmentAttainmentPage = () => {
    const [loading, setLoading] = useState(false);
    
    // UI State
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedSchemeId, setSelectedSchemeId] = useState('');

    // Data States
    const [courses, setCourses] = useState([]);
    const [schemes, setSchemes] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allMarks, setAllMarks] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [surveyData, setSurveyData] = useState({ exit_survey: {}, employer_survey: {}, alumni_survey: {} });

    // --- 1. INITIAL LOAD (Departments & Schemes) ---
    useEffect(() => {
        const fetchInitData = async () => {
            try {
                const [deptRes, schemesRes] = await Promise.all([
                    api.get('/departments/'),
                    api.get('/schemes/')
                ]);
                setDepartments(deptRes.data);
                setSchemes(schemesRes.data);
                
                // Default to first scheme for summary logic
                if (schemesRes.data.length > 0) {
                    setSelectedSchemeId(schemesRes.data[0].id);
                }
            } catch (error) {
                console.error("Failed to load initial data", error);
            }
        };
        fetchInitData();
    }, []);

    // --- 2. FETCH DEPARTMENT DATA (On Selection) ---
    useEffect(() => {
        if (!selectedDeptId) return;

        const fetchDeptData = async () => {
            setLoading(true);
            try {
                const [coursesRes, studentsRes, marksRes, posRes, psosRes, matrixRes, surveyRes] = await Promise.all([
                    api.get(`/courses/?departmentId=${selectedDeptId}`),
                    api.get('/students/'), // Ideally filter by dept on backend
                    api.get('/marks/'),    // Ideally filter by dept on backend
                    api.get('/pos/'),
                    api.get('/psos/'),
                    api.get(`/articulation-matrix/?department=${selectedDeptId}`).catch(() => ({ data: [] })),
                    api.get(`/surveys/?department=${selectedDeptId}`).catch(() => ({ data: [] }))
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

                if (surveyRes.data && surveyRes.data.length > 0) {
                    setSurveyData(surveyRes.data[0]);
                } else {
                    setSurveyData({ exit_survey: {}, employer_survey: {}, alumni_survey: {} });
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
                console.error("Failed to load department data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeptData();
    }, [selectedDeptId]);

    // --- 3. CALCULATION ENGINE (Identical to Admin Page) ---
    const calculateData = useMemo(() => {
        if (!selectedDeptId || !courses.length || !outcomes.length) return { courseRows: [], summaryRows: [] };

        const getCourseAttainment = (course) => {
            const courseStudents = allStudents.filter(s => s.courses && s.courses.includes(course.id));
            const courseMarks = allMarks.filter(m => m.course === course.id);
            const courseMatrix = matrix[course.id] || {};

            if (courseStudents.length === 0 || courseMarks.length === 0) return {};

            // --- DYNAMIC RULES FROM COURSE SCHEME ---
            const settings = course.scheme_details?.settings || {};
            const rules = settings.attainment_rules || {};
            
            // 1. Thresholds
            const lThresholds = rules.levelThresholds || { level3: 70, level2: 60, level1: 50 };
            const thresholds = [
                { threshold: parseFloat(lThresholds.level3), level: 3 },
                { threshold: parseFloat(lThresholds.level2), level: 2 },
                { threshold: parseFloat(lThresholds.level1), level: 1 },
                { threshold: 0, level: 0 }
            ];
            
            const targetLevel = rules.studentPassThreshold !== undefined ? parseFloat(rules.studentPassThreshold) : 50;

            // 2. Weights
            const wDirect = (rules.finalWeightage?.direct || 80) / 100;
            const wIndirect = (rules.finalWeightage?.indirect || 20) / 100;

            const tools = course.assessment_tools || [];
            const seeTool = tools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE' || t.name === 'Semester End Exam');
            const internalTools = tools.filter(t => t !== seeTool && t.type !== 'Improvement Test');
            
            // A. SEE Calculation
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

            // B. CIE Calculation
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
                
                const indirectVal = parseFloat(course.settings?.indirect_attainment?.[co.id] || 3);
                const directVal = (cieLevel + seeLevel) / 2;
                
                coLevels[co.id] = (wDirect * directVal) + (wIndirect * indirectVal);
            });

            // C. PO Mapping
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

        // Surveys
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

        // Final Summary based on REFERENCE SCHEME
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

    }, [selectedDeptId, courses, outcomes, allStudents, allMarks, matrix, surveyData, schemes, selectedSchemeId]);

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Department Attainment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and analyze Consolidated Evaluation Results for any department.
                    </p>
                </div>

                {/* CONTROLS BAR */}
                <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 items-center">
                    
                    {/* Department Selector */}
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Department</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select 
                                value={selectedDeptId}
                                onChange={(e) => setSelectedDeptId(e.target.value)}
                                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">-- Choose Department --</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Reference Scheme Selector */}
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Summary Logic (Weights)</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select 
                                value={selectedSchemeId}
                                onChange={(e) => setSelectedSchemeId(e.target.value)}
                                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={!selectedDeptId}
                            >
                                {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                 <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>
            ) : !selectedDeptId ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-500">No Department Selected</h3>
                    <p className="text-gray-400 mt-1">Please select a department above to view the evaluation results.</p>
                </div>
            ) : calculateData.courseRows.length > 0 ? (
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
            ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500">No course data found for this department.</p>
                </div>
            )}
        </div>
    );
};

export default DepartmentAttainmentPage;