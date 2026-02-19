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
    const [matrix, setMatrix] = useState({});
    const [surveyData, setSurveyData] = useState({ exit_survey: {}, employer_survey: {}, alumni_survey: {} });
    
    // NEW: Store backend-calculated CO reports for each course
    const [courseReports, setCourseReports] = useState({});
    
    // UI State
    const [selectedSchemeId, setSelectedSchemeId] = useState('');

    // --- 1. FETCH ALL DATA ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                // A. Fetch Base Configuration Data (Notice: We removed /students/ and /marks/!)
                const [coursesRes, schemesRes, posRes, psosRes, matrixRes, surveyRes] = await Promise.all([
                    api.get(`/courses/?department=${deptId}`),
                    api.get('/schemes/'), 
                    api.get('/pos/'),
                    api.get('/psos/'),
                    api.get(`/articulation-matrix/?department=${deptId}`).catch(() => ({ data: { results: [] } })),
                    api.get(`/surveys/?department=${deptId}`).catch(() => ({ data: { results: [] } })) 
                ]);

                // Safely extract paginated responses
                const safeCourses = coursesRes.data.results || coursesRes.data || [];
                const safeSchemes = schemesRes.data.results || schemesRes.data || [];
                const safePos = posRes.data.results || posRes.data || [];
                const safePsos = psosRes.data.results || psosRes.data || [];
                const safeMatrix = matrixRes.data.results || matrixRes.data || [];
                const safeSurveys = surveyRes.data.results || surveyRes.data || [];

                // Sort Outcomes numerically
                const sortById = (a, b) => {
                    const numA = parseInt((a.id || '').match(/\d+/)?.[0] || 0);
                    const numB = parseInt((b.id || '').match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                const sortedPos = Array.isArray(safePos) ? [...safePos].sort(sortById) : [];
                const sortedPsos = Array.isArray(safePsos) ? [...safePsos].sort(sortById) : [];

                setCourses(safeCourses);
                setSchemes(safeSchemes);
                setOutcomes([...sortedPos, ...sortedPsos]);

                if (safeSchemes.length > 0) setSelectedSchemeId(safeSchemes[0].id);
                if (safeSurveys.length > 0) setSurveyData(safeSurveys[0]);

                // Process Articulation Matrix
                const mBuilder = {};
                safeMatrix.forEach(item => {
                    if (item.course && item.matrix) mBuilder[item.course] = item.matrix;
                });
                setMatrix(mBuilder);

                // B. DYNAMICALLY FETCH PRE-CALCULATED REPORTS FOR ALL COURSES
                const reportsMap = {};
                const reportPromises = safeCourses.map(course => 
                    api.get(`/reports/course-attainment/${course.id}/`).catch(() => null)
                );
                
                const reports = await Promise.all(reportPromises);
                
                safeCourses.forEach((course, index) => {
                    const res = reports[index];
                    // Save the 'co_attainment' array (which contains direct, indirect, and final score_index)
                    if (res && res.data && res.data.co_attainment) {
                        reportsMap[course.id] = res.data.co_attainment;
                    } else {
                        reportsMap[course.id] = [];
                    }
                });
                
                setCourseReports(reportsMap);

            } catch (error) {
                console.error("Failed to load evaluation data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // --- 2. STREAMLINED CALCULATION ENGINE ---
    const calculateData = useMemo(() => {
        if (!courses.length || !outcomes.length) return { courseRows: [], summaryRows: [] };

        // 1. Map Course COs to POs using the Backend Report
        const courseRows = courses.map(course => {
            const coData = courseReports[course.id] || [];
            const courseMatrix = matrix[course.id] || {};
            const poAttainment = {};

            // Multiply Backend Final Score Index by Articulation Matrix Mapping
            outcomes.forEach(outcome => {
                let wSum = 0, wCount = 0;
                coData.forEach(coItem => {
                    const mapVal = parseFloat(courseMatrix[coItem.co]?.[outcome.id]);
                    if (!isNaN(mapVal)) {
                        // Formula: (Mapping Value * Backend CO Attainment) / 3
                        wSum += (mapVal * coItem.score_index) / 3;
                        wCount++;
                    }
                });
                if (wCount > 0) poAttainment[outcome.id] = wSum / wCount;
            });

            return { course, attainment: poAttainment };
        }).sort((a, b) => (a.course.code || '').localeCompare(b.course.code || ''));

        // 2. Average PO Attainment across all courses
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

        // 3. Extract Survey Data (Indirect)
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

        // 4. Final Program Weightage (Based on Selected Reference Scheme)
        const refScheme = schemes.find(s => String(s.id) === String(selectedSchemeId));
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
                label: `Weighted Direct [C = A * ${(wDirectProgram * 100).toFixed(0)}%]`, 
                data: rowC 
            },
            { 
                label: `Weighted Indirect [D = B * ${(wIndirectProgram * 100).toFixed(0)}%]`, 
                data: rowD 
            },
            { label: 'Total Attainment [C + D]', data: totalRow, bold: true, bg: 'bg-green-50 dark:bg-green-900/20' },
        ];

        return { courseRows, summaryRows };

    }, [courses, outcomes, matrix, surveyData, schemes, selectedSchemeId, courseReports]);


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
                        {schemes.length === 0 && <option value="">No Schemes Available</option>}
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
                                            if (val !== undefined && val !== null && !isNaN(val)) {
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