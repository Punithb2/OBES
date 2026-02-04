import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import api from '../../../services/api';

const DepartmentAttainmentPage = () => {
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    
    // Data States
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [surveyData, setSurveyData] = useState({ exitSurvey: {}, employerSurvey: {}, alumniSurvey: {} });
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Initial Data (Departments, Outcomes, Global Config, Full Matrix)
    useEffect(() => {
        const fetchGlobals = async () => {
            try {
                const [deptRes, posRes, psosRes, matrixRes, configRes] = await Promise.all([
                    api.get('/departments'),
                    api.get('/pos'),
                    api.get('/psos'),
                    api.get('/articulationMatrix'),
                    api.get('/configurations/global')
                ]);

                setDepartments(deptRes.data);
                setOutcomes([...posRes.data, ...psosRes.data]);
                setMatrix(matrixRes.data);
                setConfig(configRes.data);
                
                if (deptRes.data.length > 0) {
                    setSelectedDepartmentId(deptRes.data[0].id);
                }
            } catch (error) {
                console.error("Failed to load global data", error);
            }
        };
        fetchGlobals();
    }, []);

    // 2. Fetch Department Specific Data (Courses, Survey) when selection changes
    useEffect(() => {
        const fetchDeptData = async () => {
            if (!selectedDepartmentId) return;
            
            setLoading(true);
            try {
                // Fetch courses for this department
                const coursesRes = await api.get(`/courses?departmentId=${selectedDepartmentId}`);
                setCourses(coursesRes.data);

                // Fetch survey data for this department (handle 404 if missing)
                try {
                    const surveyRes = await api.get(`/surveys/${selectedDepartmentId}`);
                    setSurveyData(surveyRes.data);
                } catch (err) {
                    setSurveyData({ exitSurvey: {}, employerSurvey: {}, alumniSurvey: {} });
                }

            } catch (error) {
                console.error("Failed to load department data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeptData();
    }, [selectedDepartmentId]);

    // 3. Calculation Logic (Memoized)
    const attainmentData = useMemo(() => {
        if (!courses.length || !outcomes.length) return null;

        // A. Calculate Direct Attainment (Average of CO-PO mappings for dept courses)
        const calculateCourseAverage = (course) => {
            const courseMatrix = matrix[course.id];
            if (!courseMatrix) return {}; // Skip courses without mapping

            const averages = {};
            outcomes.forEach(outcome => {
                let sum = 0;
                let count = 0;
                Object.values(courseMatrix).forEach(coMap => {
                    const val = coMap[outcome.id];
                    if (val && val > 0) {
                        sum += val;
                        count++;
                    }
                });
                if (count > 0) averages[outcome.id] = sum / count;
            });
            return averages;
        };

        const courseAverages = courses.map(course => ({
            course,
            averages: calculateCourseAverage(course),
        })).sort((a, b) => a.course.semester - b.course.semester || a.course.code.localeCompare(b.course.code));

        const averageData = {};
        outcomes.forEach(outcome => {
            let sum = 0;
            let count = 0;
            courseAverages.forEach(ca => {
                if (ca.averages[outcome.id]) {
                    sum += ca.averages[outcome.id];
                    count++;
                }
            });
            if (count > 0) averageData[outcome.id] = sum / count;
        });

        // B. Prepare Indirect Attainment (Surveys)
        const exitData = surveyData.exitSurvey || {};
        const employerData = surveyData.employerSurvey || {};
        const alumniData = surveyData.alumniSurvey || {};

        const indirectAttainment = {};
        outcomes.forEach(outcome => {
            const v1 = parseFloat(exitData[outcome.id]) || 0;
            const v2 = parseFloat(employerData[outcome.id]) || 0;
            const v3 = parseFloat(alumniData[outcome.id]) || 0;
            
            let total = v1 + v2 + v3;
            let divisor = (v1 ? 1 : 0) + (v2 ? 1 : 0) + (v3 ? 1 : 0);
            
            indirectAttainment[outcome.id] = divisor > 0 ? total / divisor : 0;
        });

        // C. Final Calculation using Config Weights
        const directWeight = (config?.attainmentRules?.finalWeightage?.direct || 80) / 100;
        const indirectWeight = (config?.attainmentRules?.finalWeightage?.indirect || 20) / 100;

        const cRow = {};
        const dRow = {};
        const totalAttainment = {};
        const percentage = {};

        outcomes.forEach(outcome => {
            const a = averageData[outcome.id] || 0;
            const b = indirectAttainment[outcome.id] || 0;
            const c = a * directWeight;
            const d = b * indirectWeight;
            const total = c + d;
            
            cRow[outcome.id] = c;
            dRow[outcome.id] = d;
            totalAttainment[outcome.id] = total;
            percentage[outcome.id] = (total / 3) * 100;
        });
        
        const summaryRows = [
            { label: 'Average', data: averageData, bold: true },
            { label: 'Direct Attainment [A]', data: averageData, bold: true, bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Program Exit Survey', data: exitData },
            { label: 'Employer Survey', data: employerData },
            { label: 'Alumni Survey', data: alumniData },
            { label: 'Indirect Attainment [B]', data: indirectAttainment, bold: true, bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: `C=A*${directWeight}`, data: cRow },
            { label: `D=B*${indirectWeight}`, data: dRow },
            { label: 'Total attainment [C+D]', data: totalAttainment, bold: true, bgColor: 'bg-green-50 dark:bg-green-900/20' },
            { label: '%', data: percentage, bold: true, isPercentage: true, bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
        ];

        return { allOutcomes: outcomes, courseAverages, summaryRows };
    }, [courses, outcomes, matrix, surveyData, config]);

    const selectedDepartment = departments.find(d => d.id === selectedDepartmentId);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Department Attainment Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
                View the consolidated "Result of Evaluation" for each academic department.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle>Select Department</CardTitle>
                    <CardDescription>Choose a department to view its attainment report.</CardDescription>
                </CardHeader>
                <CardContent>
                    <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="block w-full sm:w-96 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        aria-label="Select a department"
                    >
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {loading ? (
                <div className="text-center py-10">Loading data...</div>
            ) : selectedDepartment && attainmentData ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Result of Evaluation for {selectedDepartment.name}</CardTitle>
                        <CardDescription>Consolidated table of PO/PSO attainment combining direct and indirect assessments.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                         <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                            COURSE
                                        </th>
                                        {attainmentData.allOutcomes.map(outcome => (
                                            <th key={outcome.id} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                                <b>{outcome.id}</b>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {attainmentData.courseAverages.map(({ course, averages }) => (
                                        <tr key={course.id}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                                                {course.code}
                                            </td>
                                            {attainmentData.allOutcomes.map(outcome => {
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
                                    {attainmentData.summaryRows.map(row => (
                                        <tr key={row.label} className={row.bgColor}>
                                            <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.bold ? 'font-bold' : 'font-medium'} text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600`}>
                                                {row.label}
                                            </td>
                                            {attainmentData.allOutcomes.map(outcome => {
                                                const value = row.data[outcome.id];
                                                // Formatting logic
                                                let displayValue = '-';
                                                if (typeof value === 'number') displayValue = value.toFixed(2);
                                                else if (value && !isNaN(parseFloat(value))) displayValue = parseFloat(value).toFixed(2);

                                                return (
                                                    <td key={`${row.label}-${outcome.id}`} className={`px-3 py-3 whitespace-nowrap text-center text-sm ${row.bold ? 'font-bold' : ''} border-r border-gray-200 dark:border-gray-600`}>
                                                        <span className={value || value === 0 ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
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
            ) : (
                <div className="text-center py-10 text-gray-500">No data available for this department.</div>
            )}
        </div>
    );
};

export default DepartmentAttainmentPage;