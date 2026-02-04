import React, { useState, useMemo, useEffect } from 'react';
import { courses as mockCourses, studentsByCourse, articulationMatrix, pos, psos } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';

// --- CONFIGURATION FOR EXCEL-LIKE STRUCTURE ---
const EXCEL_CONFIG = {
    'C001': {
        targetLevel: 50, // 50% marks required to pass
        attainmentThresholds: [
            { threshold: 80, level: 3 },
            { threshold: 70, level: 2 },
            { threshold: 60, level: 1 },
            { threshold: 0, level: 0 },
        ],
        assessments: [
            {
                id: 'ia1',
                title: 'IA1(30+10)',
                iaTotal: 30,
                assignTotal: 15,
                assignScaled: 10,
                parts: [
                    { co: 'CO1', iaMax: 20, assignMax: 10, assignScaled: 6.67 },
                    { co: 'CO2', iaMax: 10, assignMax: 5, assignScaled: 3.33 }
                ]
            },
            {
                id: 'ia2',
                title: 'IA2(30+10)',
                iaTotal: 30,
                assignTotal: 15,
                assignScaled: 10,
                parts: [
                    { co: 'CO2', iaMax: 10, assignMax: 5, assignScaled: 3.33 },
                    { co: 'CO3', iaMax: 20, assignMax: 10, assignScaled: 6.67 }
                ]
            },
            {
                id: 'ia3',
                title: 'IA3(30+10)',
                iaTotal: 30,
                assignTotal: 20, // As seen in image 3
                assignScaled: 10,
                parts: [
                    { co: 'CO4', iaMax: 20, assignMax: 10, assignScaled: 5 },
                    { co: 'CO5', iaMax: 10, assignMax: 10, assignScaled: 5 }
                ]
            }
        ],
        see: {
            total: 60,
            target: 35, // Usually different for SEE
            coMap: ['CO1', 'CO2', 'CO3', 'CO4', 'CO5']
        }
    }
};

// Default config for other courses
const DEFAULT_CONFIG = EXCEL_CONFIG['C001'];

const generateExcelData = (students, config) => {
    return students.map(student => {
        const row = { student, assessments: {} };

        config.assessments.forEach(assessment => {
            const iaData = {};
            let currentIaTotal = 0;
            const assignData = {};
            let currentAssignTotal = 0;

            // Generate Part Data
            const partData = assessment.parts.map(part => {
                // Random marks generation
                const iaObtained = Math.floor(Math.random() * (part.iaMax + 1));
                const assignObtained = Math.floor(Math.random() * (part.assignMax + 1));
                
                currentIaTotal += iaObtained;
                currentAssignTotal += assignObtained;

                // Scores (1-3) based on if they met target % of MAX marks for that specific part
                const iaScore = iaObtained >= (part.iaMax * config.targetLevel / 100) ? 3 : 0;
                const assignScore = assignObtained >= (part.assignMax * config.targetLevel / 100) ? 3 : 0;

                return {
                    co: part.co,
                    iaMax: part.iaMax,
                    iaObtained,
                    iaScore,
                    iaTargetMet: iaObtained >= (part.iaMax * config.targetLevel / 100),
                    
                    assignMax: part.assignMax,
                    assignObtained,
                    assignScaledMax: part.assignScaled,
                    assignScaledObtained: (assignObtained / part.assignMax) * part.assignScaled,
                    assignScore,
                    assignTargetMet: assignObtained >= (part.assignMax * config.targetLevel / 100),
                };
            });

            row.assessments[assessment.id] = {
                iaTotal: currentIaTotal,
                assignTotal: currentAssignTotal,
                assignScaledTotal: (currentAssignTotal / assessment.assignTotal) * assessment.assignScaled,
                parts: partData
            };
        });

        // SEE Data
        const seeObtained = Math.floor(Math.random() * (config.see.total - 20)) + 20;
        row.see = {
            obtained: seeObtained,
            score: seeObtained >= (config.see.total * config.targetLevel / 100) ? 3 : 0,
            targetMet: seeObtained >= (config.see.total * config.targetLevel / 100)
        };

        return row;
    });
};

const CoPoAttainmentPage = () => {
    const { user } = useAuth();

    const assignedCourses = useMemo(() => {
        if (!user) return [];
        return mockCourses.filter(c => c.assignedFacultyId === user.id);
    }, [user]);

    const [selectedCourseId, setSelectedCourseId] = useState(assignedCourses[0]?.id ?? '');

    useEffect(() => {
        if (assignedCourses.length > 0 && !assignedCourses.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(assignedCourses[0].id);
        } else if (assignedCourses.length === 0) {
            setSelectedCourseId('');
        }
    }, [assignedCourses, selectedCourseId]);

    const selectedCourse = assignedCourses.find(c => c.id === selectedCourseId);
    const courseConfig = EXCEL_CONFIG[selectedCourseId] || DEFAULT_CONFIG;
    
    const data = useMemo(() => {
        if (!selectedCourseId) return null;
        const students = studentsByCourse[selectedCourseId] || [];
        return generateExcelData(students, courseConfig);
    }, [selectedCourseId, courseConfig]);

    // Calculate Main Table Summaries
    const summary = useMemo(() => {
        if (!data) return null;
        const s = { assessments: {}, see: {} };

        // Initialize
        courseConfig.assessments.forEach(assessment => {
            s.assessments[assessment.id] = { parts: [] };
            assessment.parts.forEach((_, idx) => {
                s.assessments[assessment.id].parts[idx] = {
                    iaYCount: 0,
                    assignYCount: 0,
                    iaScoreSum: 0,
                    assignScoreSum: 0
                };
            });
        });
        s.see = { yCount: 0, scoreSum: 0 };

        // Tally
        data.forEach(row => {
            courseConfig.assessments.forEach(assessment => {
                row.assessments[assessment.id].parts.forEach((p, idx) => {
                    if (p.iaTargetMet) s.assessments[assessment.id].parts[idx].iaYCount++;
                    if (p.assignTargetMet) s.assessments[assessment.id].parts[idx].assignYCount++;
                    s.assessments[assessment.id].parts[idx].iaScoreSum += p.iaScore; 
                    s.assessments[assessment.id].parts[idx].assignScoreSum += p.assignScore;
                });
            });
            if (row.see.targetMet) s.see.yCount++;
            s.see.scoreSum += row.see.score;
        });

        return s;
    }, [data, courseConfig]);

    // --- NEW CALCULATION FOR SUMMARY TABLE ---
    const finalAttainmentData = useMemo(() => {
        if (!data || !summary || !courseConfig) return null;

        const totalStudents = data.length;
        const coStats = {};
        
        // Initialize set of all COs found in the config
        const allCos = new Set();
        courseConfig.assessments.forEach(a => a.parts.forEach(p => allCos.add(p.co)));
        courseConfig.see.coMap.forEach(co => allCos.add(co));
        
        // Initialize stats object for each CO
        allCos.forEach(co => {
            coStats[co] = { 
                cieValues: [], 
                seeValue: (summary.see.yCount / totalStudents) * 100 
            };
        });

        // Aggregate CIE values
        courseConfig.assessments.forEach(assessment => {
            assessment.parts.forEach((part, idx) => {
                const stats = summary.assessments[assessment.id].parts[idx];
                const co = part.co;
                const iaPercent = (stats.iaYCount / totalStudents) * 100;
                const assignPercent = (stats.assignYCount / totalStudents) * 100;
                coStats[co].cieValues.push(iaPercent);
                coStats[co].cieValues.push(assignPercent);
            });
        });

        // Calculate averages
        const rows = Array.from(allCos).sort().map(co => {
            const stats = coStats[co];
            const cieAverage = stats.cieValues.length ? stats.cieValues.reduce((a, b) => a + b, 0) / stats.cieValues.length : 0;
            const seeValue = stats.seeValue;
            const directAttainment = (cieAverage + seeValue) / 2;

            let level = 0;
            if (directAttainment >= 60) level = 3;
            else if (directAttainment >= 50) level = 2;
            else if (directAttainment >= 40) level = 1;

            const indirectAttainment = 3; 
            const scoreIndex = (0.8 * level) + (0.2 * indirectAttainment);

            return {
                co,
                cie: cieAverage,
                see: seeValue,
                direct: directAttainment,
                level: level,
                indirect: indirectAttainment,
                scoreIndex: scoreIndex
            };
        });

        const avgRow = {
            co: 'AVERAGE',
            cie: rows.reduce((s, r) => s + r.cie, 0) / rows.length,
            see: rows.reduce((s, r) => s + r.see, 0) / rows.length,
            direct: rows.reduce((s, r) => s + r.direct, 0) / rows.length,
            level: rows.reduce((s, r) => s + r.level, 0) / rows.length,
            indirect: rows.reduce((s, r) => s + r.indirect, 0) / rows.length,
            scoreIndex: rows.reduce((s, r) => s + r.scoreIndex, 0) / rows.length,
        };

        return { rows, avgRow };

    }, [data, summary, courseConfig]);

    // --- CALCULATION FOR PO ATTAINMENT TABLES ---
    const poAttainmentData = useMemo(() => {
        if (!finalAttainmentData || !selectedCourse || !articulationMatrix[selectedCourseId]) return null;
        
        const { rows: coRows } = finalAttainmentData;
        const courseMatrix = articulationMatrix[selectedCourseId]; // Structure: { [coId]: { [poId]: value } }
        const outcomes = [...pos, ...psos]; // Array of outcome objects { id: 'PO1', ... }

        // 1. EXPECTED (Mapping Level)
        const expectedRows = coRows.map(row => {
            // Find the actual CO ID in the matrix based on the simplified "CO1" name
            // Assuming mockCourses COs are generated sequentially 1..5 matching CO1..CO5
            const coIndex = parseInt(row.co.replace('CO', '')) - 1;
            const fullCoId = selectedCourse.cos[coIndex]?.id;
            
            const outcomeValues = {};
            outcomes.forEach(outcome => {
                outcomeValues[outcome.id] = courseMatrix[fullCoId]?.[outcome.id] || '-';
            });

            return { co: row.co, values: outcomeValues };
        });

        // Calculate Expected Averages
        const expectedAvg = {};
        outcomes.forEach(outcome => {
            let sum = 0;
            let count = 0;
            expectedRows.forEach(r => {
                const val = r.values[outcome.id];
                if (val !== '-' && typeof val === 'number') {
                    sum += val;
                    count++;
                }
            });
            expectedAvg[outcome.id] = count > 0 ? (sum / count).toFixed(1) : '-';
        });

        // 2. ACTUAL (Calculated)
        // Formula: Actual = ExpectedMapping * (CO_Attainment_Level / 3)
        const actualRows = expectedRows.map((row, idx) => {
             const coLevel = coRows[idx].scoreIndex; // Using Score Index Level
             const actualValues = {};
             
             outcomes.forEach(outcome => {
                 const mapping = row.values[outcome.id];
                 if (mapping !== '-' && typeof mapping === 'number') {
                     // Calculate actual and format
                     const val = (mapping * (coLevel / 3)).toFixed(2);
                     actualValues[outcome.id] = parseFloat(val);
                 } else {
                     actualValues[outcome.id] = '-';
                 }
             });
             return { co: row.co, values: actualValues };
        });

         // Calculate Actual Averages
         const actualAvg = {};
         outcomes.forEach(outcome => {
             let sum = 0;
             let count = 0;
             actualRows.forEach(r => {
                 const val = r.values[outcome.id];
                 if (val !== '-' && typeof val === 'number') {
                     sum += val;
                     count++;
                 }
             });
             actualAvg[outcome.id] = count > 0 ? (sum / count).toFixed(2) : '-';
         });

        return { outcomes, expectedRows, expectedAvg, actualRows, actualAvg };

    }, [finalAttainmentData, selectedCourse, selectedCourseId]);


    if (!user) return null;

    const renderTableHeader = () => (
        <thead className="text-center text-xs font-bold text-gray-800 bg-gray-200 dark:bg-gray-800 dark:text-gray-200 uppercase border-b-2 border-gray-400">
            <tr>
                <th rowSpan={3} className="sticky left-0 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-12">Sl.No.</th>
                <th rowSpan={3} className="sticky left-12 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-28">USN</th>
                <th rowSpan={3} className="sticky left-40 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-48">Name</th>
                
                {courseConfig.assessments.map(assessment => (
                    <th key={assessment.id} colSpan={1 + (assessment.parts.length * 3) + 2 + (assessment.parts.length * 4)} className="bg-purple-300 dark:bg-purple-900 border-r border-gray-400 py-2">
                        {assessment.title}
                    </th>
                ))}
                <th colSpan={3} className="bg-orange-300 dark:bg-orange-900 border-l border-gray-400">EXTERNAL MARKS</th>
            </tr>
            <tr>
                {courseConfig.assessments.map(assessment => (
                    <React.Fragment key={assessment.id}>
                        <th rowSpan={2} className="bg-green-100 dark:bg-green-900/30 border-r border-gray-300 px-2">IA({assessment.iaTotal})</th>
                        {assessment.parts.map((part, idx) => (
                            <React.Fragment key={`ia-${idx}`}>
                                <th className="bg-green-100 dark:bg-green-900/30 border-r border-gray-300 px-1">{part.co}({part.iaMax})</th>
                                <th className="bg-white dark:bg-gray-700 border-r border-gray-300 px-1">Scores</th>
                                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1">Target 50%</th>
                            </React.Fragment>
                        ))}
                        <th rowSpan={2} className="bg-yellow-300 dark:bg-yellow-800 border-r border-gray-300 px-2">Assgn({assessment.assignTotal})</th>
                        <th rowSpan={2} className="bg-yellow-300 dark:bg-yellow-800 border-r border-gray-300 px-2">Assgn({assessment.assignScaled})</th>
                        {assessment.parts.map((part, idx) => (
                            <React.Fragment key={`assign-${idx}`}>
                                <th className="bg-yellow-100 dark:bg-yellow-900/30 border-r border-gray-300 px-1">{part.co}({part.assignMax})</th>
                                <th className="bg-yellow-100 dark:bg-yellow-900/30 border-r border-gray-300 px-1">{part.co}({part.assignScaled})</th>
                                <th className="bg-white dark:bg-gray-700 border-r border-gray-300 px-1">Scores</th>
                                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1">Target 50%</th>
                            </React.Fragment>
                        ))}
                    </React.Fragment>
                ))}
                <th className="bg-orange-100 dark:bg-orange-900/30 border-r border-gray-300 px-1">SEE ({courseConfig.see.total})</th>
                <th className="bg-white dark:bg-gray-700 border-r border-gray-300 px-1">Scores</th>
                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1">Target</th>
            </tr>
            <tr className="h-0"></tr>
        </thead>
    );

    const renderTableFooter = () => {
        if (!data || !summary) return null;
        const totalStudents = data.length;
        const labels = [
            { key: 'yCount', title: "Number of 'Y's" },
            { key: 'yCount', title: "Score index & Nos Y's" },
            { key: 'percentage', title: "%" },
            { key: 'attainment', title: "CO ATTAINMENT" },
            { key: 'score', title: "CO SCORE" }
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
                                <td></td>
                                {assessment.parts.map((part, pIdx) => {
                                    const stats = summary.assessments[assessment.id].parts[pIdx];
                                    const count = stats.iaYCount;
                                    const percent = (count / totalStudents) * 100;
                                    const level = courseConfig.attainmentThresholds.find(t => percent >= t.threshold)?.level || 0;
                                    let val = '';
                                    if (labelRow.key === 'yCount') val = count;
                                    if (labelRow.key === 'percentage') val = percent.toFixed(1);
                                    if (labelRow.key === 'attainment') val = percent.toFixed(1);
                                    if (labelRow.key === 'score') val = level;
                                    return (
                                        <React.Fragment key={`footer-ia-${pIdx}`}>
                                            <td></td><td></td>
                                            <td className="bg-[#8B5A2B] text-white border-r border-gray-300">{val}</td>
                                        </React.Fragment>
                                    );
                                })}
                                <td></td><td></td>
                                {assessment.parts.map((part, pIdx) => {
                                    const stats = summary.assessments[assessment.id].parts[pIdx];
                                    const count = stats.assignYCount;
                                    const percent = (count / totalStudents) * 100;
                                    const level = courseConfig.attainmentThresholds.find(t => percent >= t.threshold)?.level || 0;
                                    let val = '';
                                    if (labelRow.key === 'yCount') val = count;
                                    if (labelRow.key === 'percentage') val = percent.toFixed(1);
                                    if (labelRow.key === 'attainment') val = percent.toFixed(1);
                                    if (labelRow.key === 'score') val = level;
                                    return (
                                        <React.Fragment key={`footer-assign-${pIdx}`}>
                                            <td></td><td></td><td></td>
                                            <td className="bg-[#8B5A2B] text-white border-r border-gray-300">{val}</td>
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                         <td></td><td></td>
                         <td className="bg-[#8B5A2B] text-white">
                            {labelRow.key === 'yCount' && summary.see.yCount}
                            {labelRow.key === 'percentage' && ((summary.see.yCount/totalStudents)*100).toFixed(1)}
                            {labelRow.key === 'score' && (summary.see.yCount/totalStudents) >= 0.6 ? 3 : 2}
                         </td>
                    </tr>
                ))}
            </tfoot>
        );
    };

    const renderFinalSummaryTable = () => {
        if (!finalAttainmentData) return null;
        const { rows, avgRow } = finalAttainmentData;

        return (
            <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-center text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 font-bold text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="bg-green-100 dark:bg-green-900/30 px-4 py-3 border-r border-gray-200 dark:border-gray-600 w-20">CO</th>
                            <th className="bg-green-100 dark:bg-green-900/30 px-4 py-3 border-r border-gray-200 dark:border-gray-600">CIE</th>
                            <th className="bg-white dark:bg-gray-800 px-4 py-3 border-r border-gray-200 dark:border-gray-600">SEE</th>
                            <th className="bg-green-100 dark:bg-green-900/30 px-4 py-3 border-r border-gray-200 dark:border-gray-600">DIRECT ATTAINMENT</th>
                            <th className="bg-green-100 dark:bg-green-900/30 px-4 py-3 border-r border-gray-200 dark:border-gray-600">LEVEL</th>
                            <th className="bg-white dark:bg-gray-800 px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                                INDIRECT ATTAINMENT <br/> <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Course end survey</span>
                            </th>
                            <th className="bg-green-100 dark:bg-green-900/30 px-4 py-3 font-bold">SCORE INDEX LEVEL</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-white">
                        {rows.map((row) => (
                            <tr key={row.co} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="bg-green-100 dark:bg-green-900/30 px-4 py-3 border-r border-gray-200 dark:border-gray-600 font-bold">{row.co}</td>
                                <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">{row.cie.toFixed(2)}</td>
                                <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">{row.see.toFixed(2)}</td>
                                <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">{row.direct.toFixed(2)}</td>
                                <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">{row.level}</td>
                                <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">{row.indirect}</td>
                                <td className="px-4 py-3">{row.scoreIndex.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-orange-100 dark:bg-orange-900/30 font-bold text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-600">
                        <tr>
                            <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">AVERAGE</td>
                            <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">{avgRow.cie.toFixed(2)}</td>
                            <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">{avgRow.see.toFixed(2)}</td>
                            <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">{avgRow.direct.toFixed(2)}</td>
                            <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">{avgRow.level.toFixed(2)}</td>
                            <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">{avgRow.indirect.toFixed(2)}</td>
                            <td className="px-4 py-3">{avgRow.scoreIndex.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    // --- RENDER FUNCTION FOR PO ATTAINMENT TABLES ---
    const renderPoAttainmentTables = () => {
        if (!poAttainmentData) return null;
        const { outcomes, expectedRows, expectedAvg, actualRows, actualAvg } = poAttainmentData;

        const renderSinglePoTable = (title, rows, avg) => (
             <div className="overflow-x-auto border dark:border-gray-600 rounded-lg mb-8">
                 <div className="bg-green-100 dark:bg-green-900/30 p-2 text-center font-bold text-gray-800 dark:text-white border-b dark:border-gray-600 uppercase">
                     PO ATTAINMENT THROUGH CO ATTAINMENT
                 </div>
                 <div className="bg-green-100 dark:bg-green-900/30 p-2 text-center font-bold text-gray-800 dark:text-white border-b dark:border-gray-600 uppercase text-sm">
                     {title}
                 </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-center text-sm">
                    <thead className="bg-orange-100 dark:bg-orange-900/30 font-bold text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-600 w-20">CO's</th>
                            {outcomes.map(o => (
                                <th key={o.id} className="px-2 py-2 border-r border-gray-200 dark:border-gray-600">{o.id}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-white">
                        {rows.map(row => (
                            <tr key={row.co} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="bg-orange-100 dark:bg-orange-900/30 px-4 py-2 border-r border-gray-200 dark:border-gray-600 font-bold">{row.co}</td>
                                {outcomes.map(o => (
                                    <td key={o.id} className="px-2 py-2 border-r border-gray-200 dark:border-gray-600">
                                        {row.values[o.id]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-red-100 dark:bg-red-900/30 font-bold text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-600">
                        <tr>
                            <td className="px-4 py-2 border-r border-gray-300 dark:border-gray-600">AVERAGE</td>
                            {outcomes.map(o => (
                                <td key={o.id} className="px-2 py-2 border-r border-gray-300 dark:border-gray-600">
                                    {avg[o.id]}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        );

        return (
            <div className="mt-8">
                {renderSinglePoTable("EXPECTED ATTAINMENT OF PO BY ATTAINMENT OF CO", expectedRows, expectedAvg)}
                {renderSinglePoTable("ACTUAL ATTAINMENT OF PO BY ATTAINMENT OF CO", actualRows, actualAvg)}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">CO-PO Attainment Calculation</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed attainment report based on the official Excel template.</p>
                </div>
                <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="block w-full mt-4 sm:mt-0 sm:w-96 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    {assignedCourses.map(course => (
                        <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    ))}
                </select>
            </div>
            
            <Card className="w-full overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[60vh]">
                        {data ? (
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
                                                    <td className="border-r border-gray-300 px-2 font-bold">{aData.iaTotal}</td>
                                                    {aData.parts.map((part, pIdx) => (
                                                        <React.Fragment key={`ia-row-${pIdx}`}>
                                                            <td className="border-r border-gray-300 px-1 text-gray-500">{part.iaObtained}</td>
                                                            <td className="border-r border-gray-300 px-1 font-semibold">{part.iaScore}</td>
                                                            <td className={`border-r border-gray-300 px-1 font-bold ${part.iaTargetMet ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>
                                                                {part.iaTargetMet ? 'Y' : 'N'}
                                                            </td>
                                                        </React.Fragment>
                                                    ))}

                                                    <td className="border-r border-gray-300 px-2 font-semibold">{aData.assignTotal}</td>
                                                    <td className="border-r border-gray-300 px-2 font-bold">{aData.assignScaledTotal.toFixed(1)}</td>

                                                    {aData.parts.map((part, pIdx) => (
                                                        <React.Fragment key={`assign-row-${pIdx}`}>
                                                            <td className="border-r border-gray-300 px-1 text-gray-500">{part.assignObtained}</td>
                                                            <td className="border-r border-gray-300 px-1 text-gray-500">{part.assignScaledObtained.toFixed(2)}</td>
                                                            <td className="border-r border-gray-300 px-1 font-semibold">{part.assignScore}</td>
                                                            <td className={`border-r border-gray-300 px-1 font-bold ${part.assignTargetMet ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>
                                                                {part.assignTargetMet ? 'Y' : 'N'}
                                                            </td>
                                                        </React.Fragment>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                        <td className="border-r border-gray-300 px-2">{row.see.obtained}</td>
                                        <td className="border-r border-gray-300 px-2">{row.see.score}</td>
                                        <td className={`border-r border-gray-300 px-2 font-bold ${row.see.targetMet ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>
                                            {row.see.targetMet ? 'Y' : 'N'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {renderTableFooter()}
                        </table>
                        ) : (
                            <div className="p-12 text-center text-gray-500">Select a course to generate the attainment table.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* SUMMARY AND PO ATTAINMENT CARDS */}
            <Card>
                <CardHeader>
                    <CardTitle>Attainment Reports</CardTitle>
                    <CardDescription>Consolidated Course and Program outcome attainment.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderFinalSummaryTable()}
                    {renderPoAttainmentTables()}
                </CardContent>
            </Card>
        </div>
    );
};

export default CoPoAttainmentPage;