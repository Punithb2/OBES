import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../shared/Card';
import api, { fetchAllPages } from '../../../services/api'; 
import { Loader2, Filter, Building2, Search, Download } from 'lucide-react'; 
import * as XLSX from 'xlsx-js-style'; 

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
    const [matrix, setMatrix] = useState({});
    const [surveyData, setSurveyData] = useState({ exit_survey: {}, employer_survey: {}, alumni_survey: {} });
    
    // Store backend-calculated CO reports for each course
    const [courseReports, setCourseReports] = useState({});

    // --- 1. INITIAL LOAD (Departments & Schemes) ---
    useEffect(() => {
        const fetchInitData = async () => {
            try {
                const [fetchedDepts, fetchedSchemes] = await Promise.all([
                    fetchAllPages('/departments/'),
                    fetchAllPages('/schemes/')
                ]);

                setDepartments(Array.isArray(fetchedDepts) ? fetchedDepts : []);
                setSchemes(Array.isArray(fetchedSchemes) ? fetchedSchemes : []);
                
                if (Array.isArray(fetchedSchemes) && fetchedSchemes.length > 0) {
                    setSelectedSchemeId(fetchedSchemes[0].id);
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
                const [fetchedCourses, fetchedPos, fetchedPsos, fetchedMatrix, fetchedSurveys] = await Promise.all([
                    fetchAllPages(`/courses/?department=${selectedDeptId}`),
                    fetchAllPages('/pos/'),
                    fetchAllPages('/psos/'),
                    fetchAllPages(`/articulation-matrix/?department=${selectedDeptId}`).catch(() => []),
                    fetchAllPages(`/surveys/?department=${selectedDeptId}`).catch(() => [])
                ]);

                // Sort Outcomes
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

                if (Array.isArray(fetchedSurveys) && fetchedSurveys.length > 0) {
                    setSurveyData(fetchedSurveys[0]);
                } else {
                    setSurveyData({ exit_survey: {}, employer_survey: {}, alumni_survey: {} });
                }

                // Process Matrix
                const mBuilder = {};
                if (Array.isArray(fetchedMatrix)) {
                    fetchedMatrix.forEach(item => {
                        if (item.course && item.matrix) {
                            mBuilder[item.course] = item.matrix;
                        }
                    });
                }
                setMatrix(mBuilder);

                // Fetch Pre-calculated Backend Reports for the selected department's courses
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
                console.error("Failed to load department data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeptData();
    }, [selectedDeptId]);

    // --- 3. STREAMLINED CALCULATION ENGINE ---
    const calculateData = useMemo(() => {
        if (!selectedDeptId || !courses.length || !outcomes.length) return { courseRows: [], summaryRows: [] };

        // 1. Map Course COs to POs using the Backend Report
        const courseRows = courses.map(course => {
            const coData = courseReports[course.id] || [];
            const courseMatrix = matrix[course.id] || {};
            const poAttainment = {};

            const courseSchemeRules = course.scheme_details?.settings || {};
            const normFactor = courseSchemeRules.po_calculation?.normalization_factor || 3;

            // Multiply Backend Final Score Index by Articulation Matrix Mapping
            outcomes.forEach(outcome => {
                let wSum = 0, wCount = 0;
                coData.forEach(coItem => {
                    const mapVal = parseFloat(courseMatrix[coItem.co]?.[outcome.id]);
                    if (!isNaN(mapVal)) {
                        wSum += (mapVal * coItem.score_index) / normFactor;
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

        // 4. Final Summary based on REFERENCE SCHEME
        const refScheme = schemes.find(s => String(s.id) === String(selectedSchemeId));
        const refRules = refScheme?.settings || {};
        
        const wDirectProgram = (refRules.weightage?.direct ?? 80) / 100;
        const wIndirectProgram = (refRules.weightage?.indirect ?? 20) / 100;

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

    }, [selectedDeptId, courses, outcomes, matrix, surveyData, schemes, selectedSchemeId, courseReports]);

    // --- 4. EXPORT TO EXCEL ---
    const handleExportToExcel = () => {
        if (!calculateData || calculateData.courseRows.length === 0) {
            alert("No data available to export.");
            return;
        }

        const selectedDept = departments.find(d => String(d.id) === String(selectedDeptId));
        const deptName = selectedDept ? selectedDept.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Department';

        const headerStyle = {
            font: { bold: true, color: { rgb: "000000" }, sz: 11 },
            fill: { fgColor: { rgb: "E2E8F0" } }, 
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "94A3B8" } },
                bottom: { style: "thin", color: { rgb: "94A3B8" } },
                left: { style: "thin", color: { rgb: "94A3B8" } },
                right: { style: "thin", color: { rgb: "94A3B8" } }
            }
        };

        const dataStyle = {
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "E2E8F0" } },
                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                left: { style: "thin", color: { rgb: "E2E8F0" } },
                right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
        };

        const highlightStyle = {
            font: { bold: true },
            fill: { fgColor: { rgb: "FEF08A" } }, 
            ...dataStyle
        };

        const finalRowStyle = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "DCFCE7" } }, 
            ...dataStyle
        };

        const excelData = [];
        const headerRow = ["COMPONENT", ...outcomes.map(o => o.id)];
        excelData.push(headerRow);

        calculateData.courseRows.forEach(({ course, attainment }) => {
            const row = [`${course.code}`];
            outcomes.forEach(o => {
                const val = attainment[o.id];
                row.push(val ? val.toFixed(2) : '-');
            });
            excelData.push(row);
        });

        calculateData.summaryRows.forEach((summaryRow) => {
            const row = [summaryRow.label];
            outcomes.forEach(o => {
                const val = summaryRow.data[o.id];
                if (val !== undefined && val !== null && !isNaN(val)) {
                    row.push(typeof val === 'number' ? val.toFixed(2) : parseFloat(val).toFixed(2));
                } else {
                    row.push('-');
                }
            });
            excelData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelData);

        for (let R = 0; R < excelData.length; ++R) {
            for (let C = 0; C < excelData[R].length; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellRef]) continue;

                if (R === 0) {
                    ws[cellRef].s = headerStyle;
                } else if (R >= calculateData.courseRows.length + 1) {
                    const summaryLabel = excelData[R][0];
                    if (summaryLabel.includes('[A]') || summaryLabel.includes('[B]')) {
                        ws[cellRef].s = highlightStyle;
                    } else if (summaryLabel.includes('Total Attainment')) {
                        ws[cellRef].s = finalRowStyle;
                    } else {
                        ws[cellRef].s = { ...dataStyle, font: { bold: C === 0 } }; 
                    }
                } else {
                    ws[cellRef].s = { ...dataStyle, alignment: { horizontal: C === 0 ? "left" : "center" } };
                }
            }
        }

        const wscols = [{ wch: 40 }];
        outcomes.forEach(() => wscols.push({ wch: 10 }));
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Department Attainment");
        XLSX.writeFile(wb, `${deptName}_Attainment_Report.xlsx`);
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Department Attainment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and analyze Consolidated Evaluation Results for any department.
                    </p>
                </div>

                {/* CONTROLS BAR: FIXED ALIGNMENT */}
                <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 items-end">
                    
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Department</label>
                        <div className="relative">
                            {/* Centered icon vertically */}
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select 
                                value={selectedDeptId}
                                onChange={(e) => setSelectedDeptId(e.target.value)}
                                className="pl-10 h-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">-- Choose Department --</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Summary Logic (Weights)</label>
                        <div className="relative">
                            {/* Centered icon vertically */}
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select 
                                value={selectedSchemeId}
                                onChange={(e) => setSelectedSchemeId(e.target.value)}
                                className="pl-10 h-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                disabled={!selectedDeptId}
                            >
                                {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="w-full md:w-auto">
                        <button 
                            onClick={handleExportToExcel}
                            disabled={!calculateData || calculateData.courseRows.length === 0}
                            className="flex items-center justify-center h-10 w-full px-5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm disabled:opacity-50 whitespace-nowrap"
                            title="Export to Excel"
                        >
                            <Download className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
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
            ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500">No course data found for this department.</p>
                </div>
            )}
        </div>
    );
};

export default DepartmentAttainmentPage;