import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const EvaluationResultPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [surveyData, setSurveyData] = useState({ exitSurvey: {}, employerSurvey: {}, alumniSurvey: {} });
    const [config, setConfig] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            // Ensure user and department exist
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                const [coursesRes, posRes, psosRes, matrixRes, configRes, surveyRes] = await Promise.all([
                    // 1. Fetch Courses (Filtered by Dept)
                    api.get(`/courses/?departmentId=${deptId}`),
                    // 2. Fetch POs
                    api.get('/pos/'),
                    // 3. Fetch PSOs
                    api.get('/psos/'),
                    // 4. Fetch Articulation Matrix (Safe fetch)
                    api.get(`/articulation-matrix/?department=${deptId}`).catch(() => ({ data: {} })),
                    // 5. Fetch Global Config (Safe fetch)
                    api.get('/configurations/global/').catch(() => ({ data: null })),
                    // 6. Fetch Surveys (Safe fetch)
                    api.get(`/surveys/?department=${deptId}`).catch(() => ({ data: {} }))
                ]);

                // Sort Outcomes Naturally (PO1, PO2, PO10...)
                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                setCourses(coursesRes.data);
                setOutcomes([...posRes.data.sort(sortById), ...psosRes.data.sort(sortById)]);
                setMatrix(matrixRes.data || {});
                setConfig(configRes.data);
                
                // If survey data exists, use it. Otherwise default to empty.
                if (surveyRes.data) setSurveyData(surveyRes.data);

            } catch (error) {
                console.error("Failed to load evaluation data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // Calculate Data on render
    const { courseAverages, summaryRows } = useMemo(() => {
        if (!outcomes.length) return { courseAverages: [], summaryRows: [] };

        // 1. Calculate Average Mapping for each Course
        // We iterate through ALL courses. If matrix data is missing, it counts as 0 or skipped.
        const validCourses = courses.map(course => {
            const courseMatrix = matrix[course.id] || {};
            const averages = {};
            
            outcomes.forEach(outcome => {
                let sum = 0;
                let count = 0;
                // Iterate over COs in the matrix
                Object.values(courseMatrix).forEach(coMap => {
                    const val = coMap[outcome.id];
                    if (val) { sum += parseFloat(val); count++; }
                });
                if (count > 0) averages[outcome.id] = sum / count;
            });

            return { course, averages };
        }).sort((a, b) => a.course.semester - b.course.semester);

        // 2. Calculate "Direct Attainment" (Average of all courses)
        const directAttainment = {};
        outcomes.forEach(outcome => {
            let sum = 0;
            let count = 0;
            validCourses.forEach(c => {
                if (c.averages[outcome.id]) {
                    sum += c.averages[outcome.id];
                    count++;
                }
            });
            if (count > 0) directAttainment[outcome.id] = sum / count;
        });

        // 3. Prepare Survey Data
        const exitData = surveyData.exitSurvey || {};
        const employerData = surveyData.employerSurvey || {};
        const alumniData = surveyData.alumniSurvey || {};

        // 4. Calculate Indirect Attainment (Average of surveys)
        const indirectAttainment = {};
        outcomes.forEach(outcome => {
            const v1 = parseFloat(exitData[outcome.id]) || 0;
            const v2 = parseFloat(employerData[outcome.id]) || 0;
            const v3 = parseFloat(alumniData[outcome.id]) || 0;
            
            // Average only non-zero inputs? Or strict average? 
            // Usually, if a survey is missing, we exclude it from the divisor.
            let total = v1 + v2 + v3;
            let divisor = (v1 ? 1 : 0) + (v2 ? 1 : 0) + (v3 ? 1 : 0);
            
            indirectAttainment[outcome.id] = divisor > 0 ? total / divisor : 0;
        });

        // 5. Final Calculation
        // Rules from Config or default 80/20
        const directWeight = (config?.attainmentRules?.finalWeightage?.direct || 80) / 100;
        const indirectWeight = (config?.attainmentRules?.finalWeightage?.indirect || 20) / 100;

        const rowC = {}; // Direct * Weight
        const rowD = {}; // Indirect * Weight
        const totalRow = {};
        const percentRow = {};

        outcomes.forEach(outcome => {
            const a = directAttainment[outcome.id] || 0;
            const b = indirectAttainment[outcome.id] || 0;
            const c = a * directWeight;
            const d = b * indirectWeight;
            const total = c + d;

            rowC[outcome.id] = c;
            rowD[outcome.id] = d;
            totalRow[outcome.id] = total;
            percentRow[outcome.id] = (total / 3) * 100; // Assuming 3 is max scale
        });

        const rows = [
            { label: 'Average', data: directAttainment, bold: true },
            { label: 'Direct Attainment [A]', data: directAttainment, bold: true, bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Program Exit Survey', data: exitData },
            { label: 'Employer Survey', data: employerData },
            { label: 'Alumni Survey', data: alumniData },
            { label: 'Indirect Attainment [B]', data: indirectAttainment, bold: true, bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: `C = A * ${directWeight}`, data: rowC },
            { label: `D = B * ${indirectWeight}`, data: rowD },
            { label: 'Total Attainment [C + D]', data: totalRow, bold: true, bgColor: 'bg-green-50 dark:bg-green-900/20' },
            { label: '%', data: percentRow, bold: true, isPercentage: true, bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
        ];

        return { courseAverages: validCourses, summaryRows: rows };

    }, [courses, outcomes, matrix, surveyData, config]);

    if (loading) return <div className="p-12 text-center text-gray-500">Loading evaluation...</div>;

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Result of Evaluation</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
                A consolidated table of PO/PSO attainment combining direct and indirect assessments.
            </p>

            <Card>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 min-w-[200px]">
                                        COURSE
                                    </th>
                                    {outcomes.map(outcome => (
                                        <th key={outcome.id} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 min-w-[3rem]">
                                            <b>{outcome.id}</b>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {courseAverages.map(({ course, averages }) => (
                                    <tr key={course.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                                            {course.code}
                                        </td>
                                        {outcomes.map(outcome => {
                                            const avg = averages[outcome.id];
                                            const displayValue = avg ? avg.toFixed(2) : '-';
                                            return (
                                                <td key={`${course.id}-${outcome.id}`} className="px-3 py-4 whitespace-nowrap text-center text-sm border-r border-gray-200 dark:border-gray-600">
                                                    <span className={avg ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                                                        {displayValue}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {summaryRows.map((row, i) => (
                                    <tr key={i} className={row.bgColor || ''}>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.bold ? 'font-bold' : 'font-medium'} text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600`}>
                                            {row.label}
                                        </td>
                                        {outcomes.map(outcome => {
                                            const value = row.data[outcome.id];
                                            let displayValue = '-';
                                            if (typeof value === 'number') displayValue = value.toFixed(2);
                                            else if (value && !isNaN(parseFloat(value))) displayValue = parseFloat(value).toFixed(2);

                                            return (
                                                <td key={`${row.label}-${outcome.id}`} className={`px-3 py-3 whitespace-nowrap text-center text-sm ${row.bold ? 'font-bold' : ''} border-r border-gray-200 dark:border-gray-600`}>
                                                    <span className={value ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                                                        {displayValue}{row.isPercentage && value ? '%' : ''}
                                                    </span>
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