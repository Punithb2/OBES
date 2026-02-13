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

                // Process Matrix
                const mBuilder = {};
                const matrixData = Array.isArray(matrixRes.data) ? matrixRes.data : []; 
                matrixData.forEach(item => {
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

    // --- 3. BUILD DYNAMIC CONFIG FROM SCHEME ---
    const courseConfig = useMemo(() => {
        if (!selectedCourse) return null;

        const settings = selectedCourse.scheme_details?.settings || {};
        const rules = settings.attainment_rules || {}; 

        // --- A. DYNAMIC THRESHOLD PARSING ---
        let levelsDict = rules.levelThresholds;
        if (!levelsDict || Object.keys(levelsDict).length === 0) {
            levelsDict = { level3: 70, level2: 60, level1: 50 };
        }

        const sortedLevels = Object.entries(levelsDict)
            .map(([key, val]) => ({
                level: parseInt(key.replace(/\D/g, '')) || 0, 
                threshold: parseFloat(val) || 0
            }))
            .sort((a, b) => b.threshold - a.threshold);

        // --- B. OTHER SETTINGS ---
        const targetLevel = rules.studentPassThreshold !== undefined ? parseFloat(rules.studentPassThreshold) : 50;

        // Weightage Logic - Ensure Valid Defaults
        const weightage = rules.finalWeightage || { direct: 80, indirect: 20 };

        // Process Assessment Tools
        const tools = selectedCourse.assessment_tools || [];
        const seeTool = tools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE' || t.name === 'Semester End Exam');
        const internalTools = tools.filter(t => t !== seeTool && t.type !== 'Improvement Test');

        // Transform Internal Tools
        const assessments = internalTools.map(tool => {
            const parts = Object.entries(tool.coDistribution || {}).map(([coId, max]) => ({
                co: coId,
                max: parseInt(max) || 0
            }));
            
            return {
                id: tool.name, 
                title: tool.name,
                total: tool.maxMarks || 0,
                parts: parts
            };
        });

        // --- FIX: ROBUST SEE MAPPING LOGIC ---
        // If coDistribution is missing OR EMPTY keys, use ALL COs from the course.
        const seeDistributionKeys = seeTool?.coDistribution ? Object.keys(seeTool.coDistribution) : [];
        const seeCoMap = seeDistributionKeys.length > 0 
            ? seeDistributionKeys 
            : (selectedCourse.cos || []).map(c => c.id);

        const seeConfig = {
            total: seeTool?.maxMarks || 100,
            coMap: seeCoMap
        };

        return {
            targetLevel,
            sortedLevels,
            weightage,
            assessments,
            see: seeConfig,
            schemeName: selectedCourse.scheme_details?.name || 'Default Scheme'
        };
    }, [selectedCourse]);

    // --- 4. CALCULATE ATTAINMENT DATA ---
    const data = useMemo(() => {
        if (!selectedCourseId || !courseConfig) return null;

        const students = allStudents.filter(s => s.courses && s.courses.includes(selectedCourseId));

        const getLevel = (percentage) => {
            if (isNaN(percentage)) return 0;
            const match = courseConfig.sortedLevels.find(l => percentage >= l.threshold);
            return match ? match.level : 0;
        };

        return students.map(student => {
            const row = { student, assessments: {} };

            // Process Internal Assessments
            courseConfig.assessments.forEach(assessment => {
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

                    const percentage = part.max > 0 ? (obtained / part.max) * 100 : 0;
                    const level = getLevel(percentage);
                    
                    return {
                        co: part.co,
                        max: part.max,
                        obtained: obtained,
                        targetMet: percentage >= courseConfig.targetLevel,
                        score: level         
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
                 seeObtained = Object.values(seeRecord.scores).reduce((a, b) => a + (parseFloat(b)||0), 0);
            }
            
            const seePercent = courseConfig.see.total > 0 ? (seeObtained / courseConfig.see.total) * 100 : 0;
            
            row.see = {
                obtained: seeObtained,
                targetMet: seePercent >= courseConfig.targetLevel,
                score: getLevel(seePercent)
            };

            return row;
        });
    }, [selectedCourseId, allStudents, allMarks, courseConfig]);

    // --- 5. SUMMARIZE DATA ---
    const summary = useMemo(() => {
        if (!data || !courseConfig) return null;

        const s = { assessments: {}, see: { yCount: 0 } };

        courseConfig.assessments.forEach(assessment => {
            s.assessments[assessment.id] = { parts: [] };
            assessment.parts.forEach((_, idx) => {
                s.assessments[assessment.id].parts[idx] = { yCount: 0 };
            });
        });

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

        const coStats = {};
        
        const allCos = new Set();
        courseConfig.assessments.forEach(a => a.parts.forEach(p => allCos.add(p.co)));
        (selectedCourse.cos || []).forEach(c => allCos.add(c.id));

        allCos.forEach(co => {
            coStats[co] = { cieLevels: [], seeLevels: [] };
        });

        data.forEach(row => {
            // Collect SEE Level
            if (row.see) {
                 // Map SEE score to ALL COs in the map (which now defaults to ALL if empty)
                 courseConfig.see.coMap.forEach(coId => {
                     if (coStats[coId]) coStats[coId].seeLevels.push(row.see.score);
                 });
            }

            // Collect CIE Levels
            courseConfig.assessments.forEach(assessment => {
                const studentAssessment = row.assessments[assessment.id];
                if (studentAssessment && studentAssessment.parts) {
                    studentAssessment.parts.forEach(studentPart => {
                        if (coStats[studentPart.co]) {
                            coStats[studentPart.co].cieLevels.push(studentPart.score);
                        }
                    });
                }
            });
        });

        const indirectMap = selectedCourse.settings?.indirect_attainment || {};
        
        const wDirect = parseFloat(courseConfig.weightage?.direct) || 80;
        const wIndirect = parseFloat(courseConfig.weightage?.indirect) || 20;

        const rows = Array.from(allCos).sort().map(co => {
            const stats = coStats[co];
            
            // Average of Student Levels for CIE
            const cieAvg = stats.cieLevels.length 
                ? stats.cieLevels.reduce((a, b) => a + b, 0) / stats.cieLevels.length 
                : 0;

            // Average of Student Levels for SEE
            const seeAvg = stats.seeLevels.length 
                ? stats.seeLevels.reduce((a, b) => a + b, 0) / stats.seeLevels.length 
                : 0;

            const directAttainment = (cieAvg + seeAvg) / 2;
            
            let indirectVal = 3;
            if (indirectMap[co] !== undefined) {
                const parsed = parseFloat(indirectMap[co]);
                if (!isNaN(parsed)) indirectVal = parsed;
            }

            const scoreIndex = ((wDirect / 100) * directAttainment) + ((wIndirect / 100) * indirectVal);

            return {
                co,
                cieLevel: cieAvg, 
                seeLevel: seeAvg, 
                direct: directAttainment,
                indirect: indirectVal,
                scoreIndex
            };
        });

        const rowCount = rows.length || 1; 

        const avgRow = {
            co: 'AVERAGE',
            cieLevel: rows.length ? rows.reduce((s, r) => s + r.cieLevel, 0) / rowCount : 0,
            seeLevel: rows.length ? rows.reduce((s, r) => s + r.seeLevel, 0) / rowCount : 0,
            direct: rows.length ? rows.reduce((s, r) => s + r.direct, 0) / rowCount : 0,
            indirect: rows.length ? rows.reduce((s, r) => s + r.indirect, 0) / rowCount : 0,
            scoreIndex: rows.length ? rows.reduce((s, r) => s + r.scoreIndex, 0) / rowCount : 0,
        };

        return { rows, avgRow };
    }, [data, summary, courseConfig, selectedCourse]);

    // --- 7. PO ATTAINMENT ---
    const poAttainmentData = useMemo(() => {
        if (!finalAttainmentData || !selectedCourse || !matrixMap[selectedCourseId]) return null;
        
        const { rows: coRows } = finalAttainmentData;
        const courseMatrix = matrixMap[selectedCourseId]; 
        const outcomes = [...pos, ...psos]; 

        const expectedRows = coRows.map(row => {
            const outcomeValues = {};
            outcomes.forEach(outcome => {
                let val = courseMatrix[row.co]?.[outcome.id];
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

        const actualRows = expectedRows.map((row, idx) => {
             const coLevel = coRows[idx].scoreIndex; 
             const actualValues = {};
             outcomes.forEach(outcome => {
                 const mapping = row.values[outcome.id];
                 if (mapping !== '-') {
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
                                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1">{'>'}{courseConfig.targetLevel}%</th>
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
        
        const labels = [
            { key: 'yCount', title: "Number of 'Y's" },
            { key: 'percentage', title: "% Above Pass" },
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
                                    const totalStudents = data.length || 1;
                                    let val = '';
                                    if (labelRow.key === 'yCount') val = stats.yCount;
                                    if (labelRow.key === 'percentage') val = ((stats.yCount / totalStudents) * 100).toFixed(1) + '%';
                                    
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
                            {labelRow.key === 'percentage' && ((summary.see.yCount / (data.length || 1))*100).toFixed(1)+'%'}
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
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500 dark:text-gray-400">
                            Scheme: <span className="font-bold text-primary-600 dark:text-primary-400">{courseConfig?.schemeName || 'Loading...'}</span>
                        </p>
                        {courseConfig && (
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border dark:bg-gray-700 dark:text-gray-300">
                                    Pass: {courseConfig.targetLevel}%
                                </span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border dark:bg-gray-700 dark:text-gray-300">
                                    Levels: {courseConfig.sortedLevels.map(l => `L${l.level}>${l.threshold}%`).join(', ')}
                                </span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border dark:bg-gray-700 dark:text-gray-300">
                                    Weights: {courseConfig.weightage.direct}% Direct / {courseConfig.weightage.indirect}% Indirect
                                </span>
                            </div>
                        )}
                    </div>
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
                                                <th className="px-4 py-2 border-r">CIE Avg Level</th>
                                                <th className="px-4 py-2 border-r">SEE Avg Level</th>
                                                <th className="px-4 py-2 border-r">Direct Attainment</th>
                                                <th className="px-4 py-2 border-r">Indirect Attainment</th>
                                                <th className="px-4 py-2 bg-green-100 dark:bg-green-900/30">Final Score Index</th>
                                            </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {finalAttainmentData.rows.map(row => (
                                            <tr key={row.co}>
                                                <td className="px-4 py-2 border-r font-bold">{row.co}</td>
                                                <td className="px-4 py-2 border-r">{row.cieLevel.toFixed(2)}</td>
                                                <td className="px-4 py-2 border-r">{row.seeLevel.toFixed(2)}</td>
                                                <td className="px-4 py-2 border-r">{row.direct.toFixed(2)}</td>
                                                <td className="px-4 py-2 border-r">{row.indirect.toFixed(2)}</td>
                                                <td className="px-4 py-2 font-bold">{row.scoreIndex.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                     <tfoot className="bg-orange-100 dark:bg-orange-900/30 font-bold">
                                        <tr>
                                            <td className="px-4 py-2 border-r">AVERAGE</td>
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