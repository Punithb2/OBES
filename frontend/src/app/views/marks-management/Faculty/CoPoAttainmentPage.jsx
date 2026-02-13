import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Loader2, AlertCircle } from 'lucide-react';

const CoPoAttainmentPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // --- DATA STATES ---
    const [courses, setCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allMarks, setAllMarks] = useState([]);
    const [pos, setPos] = useState([]);
    const [psos, setPsos] = useState([]);
    const [matrixMap, setMatrixMap] = useState({});

    const [selectedCourseId, setSelectedCourseId] = useState('');

    // --- 1. FETCH ALL REQUIRED DATA ---
    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [coursesRes, studentsRes, marksRes, posRes, psosRes, matrixRes] = await Promise.all([
                    api.get('/courses/'),
                    api.get('/students/'),
                    api.get('/marks/'),
                    api.get('/pos/'),
                    api.get('/psos/'),
                    // FIX: Updated URL to 'articulation-matrix' (kebab-case) to match backend
                    api.get('/articulation-matrix/')
                ]);

                setCourses(coursesRes.data);
                setAllStudents(studentsRes.data);
                setAllMarks(marksRes.data);
                
                // Sort Outcomes
                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };
                setPos(posRes.data.sort(sortById));
                setPsos(psosRes.data.sort(sortById));

                // Process Matrix into a Map: { courseId: { coId: { poId: val } } }
                const mBuilder = {};
                const matrixData = Array.isArray(matrixRes.data) ? matrixRes.data : []; 
                matrixData.forEach(item => {
                    // Item structure: { course: "C101", matrix: {...} }
                    if (item.course && item.matrix) {
                        mBuilder[item.course] = item.matrix;
                    }
                });
                setMatrixMap(mBuilder);

            } catch (error) {
                console.error("Failed to fetch attainment data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [user]);

    // --- 2. FILTER & SELECT COURSE ---
    const assignedCourses = useMemo(() => {
        if (!user || !courses.length) return [];
        // Filter by assigned_faculty ID (ensure string comparison)
        return courses.filter(c => String(c.assigned_faculty) === String(user.id));
    }, [user, courses]);

    useEffect(() => {
        if (assignedCourses.length > 0 && !assignedCourses.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(assignedCourses[0].id);
        } else if (assignedCourses.length === 0) {
            setSelectedCourseId('');
        }
    }, [assignedCourses]);

    const selectedCourse = useMemo(() => 
        courses.find(c => c.id === selectedCourseId), 
    [courses, selectedCourseId]);

    // --- 3. BUILD DYNAMIC CONFIG FROM BACKEND DATA ---
    const courseConfig = useMemo(() => {
        if (!selectedCourse) return null;

        // Default thresholds
        const targetLevel = 50; // Pass percentage
        const attainmentThresholds = [
             { threshold: 80, level: 3 },
             { threshold: 70, level: 2 },
             { threshold: 60, level: 1 },
             { threshold: 0, level: 0 },
        ];

        // Process Assessment Tools
        const tools = selectedCourse.assessment_tools || [];
        
        // Separate SEE from Internal Assessments
        const seeTool = tools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE' || t.name === 'Semester End Exam');
        const internalTools = tools.filter(t => t !== seeTool && t.type !== 'Improvement Test');

        // Transform Internal Tools into "Parts" structure
        const assessments = internalTools.map(tool => {
            const parts = Object.entries(tool.coDistribution || {}).map(([coId, max]) => ({
                co: coId,
                max: parseInt(max) || 0
            }));
            
            return {
                id: tool.name, // Using name as ID for simplicity
                title: tool.name,
                total: tool.maxMarks || 0,
                parts: parts
            };
        });

        // Config for SEE
        const seeConfig = {
            total: seeTool?.maxMarks || 100,
            // If SEE has CO distribution, use keys, otherwise assume all COs map roughly
            coMap: seeTool?.coDistribution ? Object.keys(seeTool.coDistribution) : (selectedCourse.cos || []).map(c => c.id) 
        };

        return {
            targetLevel,
            attainmentThresholds,
            assessments,
            see: seeConfig
        };
    }, [selectedCourse]);

    // --- 4. CALCULATE ATTAINMENT DATA ---
    const data = useMemo(() => {
        if (!selectedCourseId || !courseConfig) return null;

        // Filter students for this course
        const students = allStudents.filter(s => s.courses && s.courses.includes(selectedCourseId));

        return students.map(student => {
            const row = { student, assessments: {} };

            // Process Internal Assessments
            courseConfig.assessments.forEach(assessment => {
                // Find marks record for this student + assessment
                const markRecord = allMarks.find(m => 
                    m.student === student.id && 
                    m.course === selectedCourseId && 
                    m.assessment_name === assessment.id
                );

                const scores = markRecord?.scores || {};
                let currentTotal = 0;

                const parts = assessment.parts.map(part => {
                    const obtained = parseFloat(scores[part.co] || 0);
                    currentTotal += obtained;

                    // Calculate Attainment Level (0 or 3 based on Target Met)
                    const targetScore = (part.max * courseConfig.targetLevel) / 100;
                    const targetMet = obtained >= targetScore;
                    
                    return {
                        co: part.co,
                        max: part.max,
                        obtained: obtained,
                        targetMet: targetMet,
                        score: targetMet ? 3 : 0 // Contribution to attainment
                    };
                });

                row.assessments[assessment.id] = {
                    total: currentTotal,
                    parts: parts
                };
            });

            // Process SEE
            const seeRecord = allMarks.find(m => 
                m.student === student.id && 
                m.course === selectedCourseId && 
                (m.assessment_name === 'SEE' || m.assessment_name === 'Semester End Exam')
            );
            
            let seeObtained = 0;
            if (seeRecord && seeRecord.scores) {
                 // Sum all values in scores or look for 'External'
                 seeObtained = Object.values(seeRecord.scores).reduce((a, b) => a + (parseFloat(b)||0), 0);
            }
            
            const seeTarget = (courseConfig.see.total * courseConfig.targetLevel) / 100;
            row.see = {
                obtained: seeObtained,
                targetMet: seeObtained >= seeTarget,
                score: seeObtained >= seeTarget ? 3 : 0
            };

            return row;
        });
    }, [selectedCourseId, allStudents, allMarks, courseConfig]);

    // --- 5. SUMMARIZE DATA (Column Counts) ---
    const summary = useMemo(() => {
        if (!data || !courseConfig) return null;

        const s = { assessments: {}, see: { yCount: 0 } };

        // Initialize counters
        courseConfig.assessments.forEach(assessment => {
            s.assessments[assessment.id] = { parts: [] };
            assessment.parts.forEach((_, idx) => {
                s.assessments[assessment.id].parts[idx] = { yCount: 0 };
            });
        });

        // Aggregate
        data.forEach(row => {
            courseConfig.assessments.forEach(assessment => {
                row.assessments[assessment.id].parts.forEach((p, idx) => {
                    if (p.targetMet) s.assessments[assessment.id].parts[idx].yCount++;
                });
            });
            if (row.see.targetMet) s.see.yCount++;
        });

        return s;
    }, [data, courseConfig]);

    // --- 6. FINAL ATTAINMENT CALCULATION ---
    const finalAttainmentData = useMemo(() => {
        if (!data || !summary || !courseConfig || !selectedCourse) return null;

        const totalStudents = data.length || 1; // Prevent div by zero
        const coStats = {};
        
        // Collect all unique COs
        const allCos = new Set();
        courseConfig.assessments.forEach(a => a.parts.forEach(p => allCos.add(p.co)));
        // Add COs from course definition to ensure we cover everything even if not assessed internally
        (selectedCourse.cos || []).forEach(c => allCos.add(c.id));

        // Initialize
        const seePercent = (summary.see.yCount / totalStudents) * 100;
        // Calculate SEE Level using thresholds
        const seeLevel = courseConfig.attainmentThresholds.find(t => seePercent >= t.threshold)?.level || 0;

        allCos.forEach(co => {
            coStats[co] = { 
                ciePercents: [],
                seeLevel: seeLevel // Simplified: SEE applies to all mapped COs equally in this model
            };
        });

        // Aggregate CIE Percentages per CO
        courseConfig.assessments.forEach(assessment => {
            assessment.parts.forEach((part, idx) => {
                const stats = summary.assessments[assessment.id].parts[idx];
                const percent = (stats.yCount / totalStudents) * 100;
                if (coStats[part.co]) {
                    coStats[part.co].ciePercents.push(percent);
                }
            });
        });

        // Get Indirect Attainment from Course Settings
        const indirectMap = selectedCourse.settings?.indirect_attainment || {};

        // Build Rows
        const rows = Array.from(allCos).sort().map(co => {
            const stats = coStats[co];
            
            // Average CIE Percentage
            const cieAvgPercent = stats.ciePercents.length 
                ? stats.ciePercents.reduce((a, b) => a + b, 0) / stats.ciePercents.length 
                : 0;

            // Determine CIE Level
            const cieLevel = courseConfig.attainmentThresholds.find(t => cieAvgPercent >= t.threshold)?.level || 0;

            // Direct Attainment
            const directAttainment = (cieLevel + stats.seeLevel) / 2;

            // Indirect Attainment
            const indirectAttainment = parseFloat(indirectMap[co] || 3); 

            // Final Score Index (80% Direct + 20% Indirect)
            const scoreIndex = (0.8 * directAttainment) + (0.2 * indirectAttainment);

            return {
                co,
                ciePercent: cieAvgPercent,
                cieLevel,
                seeLevel: stats.seeLevel,
                direct: directAttainment,
                indirect: indirectAttainment,
                scoreIndex
            };
        });

        const avgRow = {
            co: 'AVERAGE',
            ciePercent: rows.reduce((s, r) => s + r.ciePercent, 0) / rows.length,
            cieLevel: rows.reduce((s, r) => s + r.cieLevel, 0) / rows.length,
            seeLevel: rows.reduce((s, r) => s + r.seeLevel, 0) / rows.length,
            direct: rows.reduce((s, r) => s + r.direct, 0) / rows.length,
            indirect: rows.reduce((s, r) => s + r.indirect, 0) / rows.length,
            scoreIndex: rows.reduce((s, r) => s + r.scoreIndex, 0) / rows.length,
        };

        return { rows, avgRow };
    }, [data, summary, courseConfig, selectedCourse]);

    // --- 7. PO ATTAINMENT CALCULATION ---
    const poAttainmentData = useMemo(() => {
        if (!finalAttainmentData || !selectedCourse || !matrixMap[selectedCourseId]) return null;
        
        const { rows: coRows } = finalAttainmentData;
        const courseMatrix = matrixMap[selectedCourseId]; 
        const outcomes = [...pos, ...psos]; 

        // 1. EXPECTED (Mapping Average)
        const expectedRows = coRows.map(row => {
            const outcomeValues = {};
            outcomes.forEach(outcome => {
                let val = courseMatrix[row.co]?.[outcome.id];
                
                // Fallback for ID mismatch (e.g. CO1 vs C101.1)
                if (val === undefined) {
                     const coIndex = parseInt(row.co.replace(/\D/g, '')) - 1;
                     if (selectedCourse.cos && selectedCourse.cos[coIndex]) {
                         val = courseMatrix[selectedCourse.cos[coIndex].id]?.[outcome.id];
                     }
                }

                outcomeValues[outcome.id] = val !== undefined && val !== "" ? parseFloat(val) : '-';
            });
            return { co: row.co, values: outcomeValues };
        });

        // Average Expected
        const expectedAvg = {};
        outcomes.forEach(outcome => {
            let sum = 0, count = 0;
            expectedRows.forEach(r => {
                if (r.values[outcome.id] !== '-') {
                    sum += r.values[outcome.id];
                    count++;
                }
            });
            expectedAvg[outcome.id] = count > 0 ? (sum / count).toFixed(2) : '-';
        });

        // 2. ACTUAL (Calculated)
        const actualRows = expectedRows.map((row, idx) => {
             const coLevel = coRows[idx].scoreIndex; 
             const actualValues = {};
             
             outcomes.forEach(outcome => {
                 const mapping = row.values[outcome.id];
                 if (mapping !== '-') {
                     // Formula: (MappingLevel * CO_Attainment) / 3
                     const val = (mapping * coLevel) / 3;
                     actualValues[outcome.id] = parseFloat(val.toFixed(2));
                 } else {
                     actualValues[outcome.id] = '-';
                 }
             });
             return { co: row.co, values: actualValues };
        });

         const actualAvg = {};
         outcomes.forEach(outcome => {
             let sum = 0, count = 0;
             actualRows.forEach(r => {
                 if (r.values[outcome.id] !== '-') {
                     sum += r.values[outcome.id];
                     count++;
                 }
             });
             actualAvg[outcome.id] = count > 0 ? (sum / count).toFixed(2) : '-';
         });

        return { outcomes, expectedRows, expectedAvg, actualRows, actualAvg };

    }, [finalAttainmentData, selectedCourse, selectedCourseId, matrixMap, pos, psos]);

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;
    if (!user) return null;

    // --- RENDER HELPERS ---
    
    const renderTableHeader = () => (
        <thead className="text-center text-xs font-bold text-gray-800 bg-gray-200 dark:bg-gray-800 dark:text-gray-200 uppercase border-b-2 border-gray-400">
            <tr>
                <th rowSpan={2} className="sticky left-0 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-12">Sl.No.</th>
                <th rowSpan={2} className="sticky left-12 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-28">USN</th>
                <th rowSpan={2} className="sticky left-40 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-48">Name</th>
                
                {courseConfig?.assessments.map(assessment => (
                    <th key={assessment.id} colSpan={assessment.parts.length * 3 + 1} className="bg-purple-300 dark:bg-purple-900 border-r border-gray-400 py-2">
                        {assessment.title} ({assessment.total})
                    </th>
                ))}
                <th colSpan={3} className="bg-orange-300 dark:bg-orange-900 border-l border-gray-400">SEE ({courseConfig?.see?.total})</th>
            </tr>
            <tr>
                {courseConfig?.assessments.map(assessment => (
                    <React.Fragment key={assessment.id}>
                        {assessment.parts.map((part, idx) => (
                            <React.Fragment key={`head-${assessment.id}-${idx}`}>
                                <th className="bg-green-100 dark:bg-green-900/30 border-r border-gray-300 px-1">{part.co}({part.max})</th>
                                <th className="bg-white dark:bg-gray-700 border-r border-gray-300 px-1">Lvl</th>
                                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1">{'>'}50%</th>
                            </React.Fragment>
                        ))}
                        <th className="bg-blue-100 dark:bg-blue-900 border-r border-gray-300 px-1">Tot</th>
                    </React.Fragment>
                ))}
                <th className="bg-orange-100 dark:bg-orange-900/30 border-r border-gray-300 px-1">Obt</th>
                <th className="bg-white dark:bg-gray-700 border-r border-gray-300 px-1">Lvl</th>
                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1">Met</th>
            </tr>
        </thead>
    );

    const renderTableFooter = () => {
        if (!data || !summary) return null;
        const totalStudents = data.length || 1;
        const labels = [
            { key: 'yCount', title: "Number of 'Y's" },
            { key: 'percentage', title: "% Above Target" },
            { key: 'level', title: "Attainment Level" }
        ];

        return (
            <tfoot className="bg-blue-100 dark:bg-blue-900/40 font-bold text-xs text-center border-t-2 border-gray-500">
                {labels.map((labelRow, rIdx) => (
                    <tr key={rIdx} className="border-b border-gray-300 dark:border-gray-600">
                        <td colSpan={3} className="sticky left-0 bg-blue-900 text-white border-r border-gray-400 px-2 py-2 text-left">
                            {labelRow.title}
                        </td>
                        {courseConfig.assessments.map(assessment => (
                            <React.Fragment key={assessment.id}>
                                {assessment.parts.map((part, pIdx) => {
                                    const stats = summary.assessments[assessment.id].parts[pIdx];
                                    const percent = (stats.yCount / totalStudents) * 100;
                                    const level = courseConfig.attainmentThresholds.find(t => percent >= t.threshold)?.level || 0;
                                    
                                    let val = '';
                                    if (labelRow.key === 'yCount') val = stats.yCount;
                                    if (labelRow.key === 'percentage') val = percent.toFixed(1) + '%';
                                    if (labelRow.key === 'level') val = level;

                                    return (
                                        <React.Fragment key={`foot-${assessment.id}-${pIdx}`}>
                                            <td></td><td></td>
                                            <td className="bg-[#8B5A2B] text-white border-r border-gray-300">{val}</td>
                                        </React.Fragment>
                                    );
                                })}
                                <td></td>
                            </React.Fragment>
                        ))}
                         <td></td><td></td>
                         <td className="bg-[#8B5A2B] text-white">
                            {labelRow.key === 'yCount' && summary.see.yCount}
                            {labelRow.key === 'percentage' && ((summary.see.yCount/totalStudents)*100).toFixed(1)+'%'}
                            {labelRow.key === 'level' && (courseConfig.attainmentThresholds.find(t => ((summary.see.yCount/totalStudents)*100) >= t.threshold)?.level || 0)}
                         </td>
                    </tr>
                ))}
            </tfoot>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">CO-PO Attainment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Consolidated attainment report based on Internal Assessments, SEE, and Indirect Feedback.
                    </p>
                </div>
                <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="block w-full mt-4 sm:mt-0 sm:w-96 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    {assignedCourses.map(course => (
                        <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    ))}
                    {assignedCourses.length === 0 && <option>No courses assigned</option>}
                </select>
            </div>
            
            {/* Main Data Table */}
            {data && courseConfig ? (
                <Card className="w-full overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="min-w-max text-center border-collapse">
                                {renderTableHeader()}
                                <tbody className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {data.map((row, idx) => (
                                        <tr key={row.student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-300 p-2 font-medium">{idx + 1}</td>
                                            <td className="sticky left-12 bg-white dark:bg-gray-900 border-r border-gray-300 p-2 font-mono whitespace-nowrap">{row.student.usn}</td>
                                            <td className="sticky left-40 bg-white dark:bg-gray-900 border-r border-gray-300 p-2 text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[12rem]">{row.student.name}</td>
                                            
                                            {courseConfig.assessments.map(assessment => {
                                                const aData = row.assessments[assessment.id];
                                                return (
                                                    <React.Fragment key={assessment.id}>
                                                        {aData.parts.map((part, pIdx) => (
                                                            <React.Fragment key={`row-${assessment.id}-${pIdx}`}>
                                                                <td className="border-r border-gray-300 px-1 text-gray-500">{part.obtained}</td>
                                                                <td className="border-r border-gray-300 px-1 font-semibold">{part.score}</td>
                                                                <td className={`border-r border-gray-300 px-1 font-bold ${part.targetMet ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {part.targetMet ? 'Y' : 'N'}
                                                                </td>
                                                            </React.Fragment>
                                                        ))}
                                                        <td className="border-r border-gray-300 px-1 font-bold bg-gray-50 dark:bg-gray-800">{aData.total}</td>
                                                    </React.Fragment>
                                                );
                                            })}
                                            <td className="border-r border-gray-300 px-2">{row.see.obtained}</td>
                                            <td className="border-r border-gray-300 px-2">{row.see.score}</td>
                                            <td className={`border-r border-gray-300 px-2 font-bold ${row.see.targetMet ? 'text-green-600' : 'text-red-500'}`}>
                                                {row.see.targetMet ? 'Y' : 'N'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {renderTableFooter()}
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium">No Data Available</h3>
                    <p>Please select a course to view attainment data. Ensure assessments and marks are entered.</p>
                </div>
            )}

            {/* Final Summaries */}
            {finalAttainmentData && (
                <>
                    <Card>
                        <CardHeader><CardTitle>Final CO Attainment Summary</CardTitle></CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-center text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700 font-bold">
                                            <tr>
                                                <th className="px-4 py-2 border-r">CO</th>
                                                <th className="px-4 py-2 border-r">CIE %</th>
                                                <th className="px-4 py-2 border-r">CIE Level</th>
                                                <th className="px-4 py-2 border-r">SEE Level</th>
                                                <th className="px-4 py-2 border-r">Direct Attainment</th>
                                                <th className="px-4 py-2 border-r">Indirect Attainment</th>
                                                <th className="px-4 py-2 bg-green-100 dark:bg-green-900/30">Final Score Index</th>
                                            </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {finalAttainmentData.rows.map(row => (
                                            <tr key={row.co}>
                                                <td className="px-4 py-2 border-r font-bold">{row.co}</td>
                                                <td className="px-4 py-2 border-r">{row.ciePercent.toFixed(1)}%</td>
                                                <td className="px-4 py-2 border-r">{row.cieLevel}</td>
                                                <td className="px-4 py-2 border-r">{row.seeLevel}</td>
                                                <td className="px-4 py-2 border-r">{row.direct.toFixed(2)}</td>
                                                <td className="px-4 py-2 border-r">{row.indirect.toFixed(2)}</td>
                                                <td className="px-4 py-2 font-bold">{row.scoreIndex.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                     <tfoot className="bg-orange-100 dark:bg-orange-900/30 font-bold">
                                        <tr>
                                            <td className="px-4 py-2 border-r">AVERAGE</td>
                                            <td className="px-4 py-2 border-r">{finalAttainmentData.avgRow.ciePercent.toFixed(1)}%</td>
                                            <td className="px-4 py-2 border-r">{finalAttainmentData.avgRow.cieLevel.toFixed(2)}</td>
                                            <td className="px-4 py-2 border-r">{finalAttainmentData.avgRow.seeLevel.toFixed(2)}</td>
                                            <td className="px-4 py-2 border-r">{finalAttainmentData.avgRow.direct.toFixed(2)}</td>
                                            <td className="px-4 py-2 border-r">{finalAttainmentData.avgRow.indirect.toFixed(2)}</td>
                                            <td className="px-4 py-2">{finalAttainmentData.avgRow.scoreIndex.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PO Attainment Tables */}
                    {poAttainmentData && (
                        <div className="space-y-6">
                            {['EXPECTED', 'ACTUAL'].map(type => {
                                const rows = type === 'EXPECTED' ? poAttainmentData.expectedRows : poAttainmentData.actualRows;
                                const avg = type === 'EXPECTED' ? poAttainmentData.expectedAvg : poAttainmentData.actualAvg;
                                const colorClass = type === 'EXPECTED' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30';
                                
                                return (
                                    <Card key={type}>
                                        <CardHeader>
                                            <CardTitle className="text-sm uppercase">{type} Attainment of PO by Attainment of CO</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-center text-xs sm:text-sm">
                                                    <thead className={colorClass + " font-bold"}>
                                                        <tr>
                                                            <th className="px-2 py-2 border-r w-24">CO</th>
                                                            {poAttainmentData.outcomes.map(o => <th key={o.id} className="px-2 py-2 border-r">{o.id}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {rows.map(row => (
                                                            <tr key={row.co}>
                                                                <td className="px-2 py-2 border-r font-bold bg-gray-50 dark:bg-gray-800">{row.co}</td>
                                                                {poAttainmentData.outcomes.map(o => (
                                                                    <td key={o.id} className="px-2 py-2 border-r">{row.values[o.id]}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold">
                                                        <tr>
                                                            <td className="px-2 py-2 border-r">AVG</td>
                                                            {poAttainmentData.outcomes.map(o => (
                                                                <td key={o.id} className="px-2 py-2 border-r">{avg[o.id]}</td>
                                                            ))}
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CoPoAttainmentPage;