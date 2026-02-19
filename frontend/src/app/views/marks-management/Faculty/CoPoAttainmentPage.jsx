import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Loader2, AlertCircle } from 'lucide-react';

const CoPoAttainmentPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // --- GLOBAL STATES ---
    const [courses, setCourses] = useState([]);
    const [pos, setPos] = useState([]);
    const [psos, setPsos] = useState([]);
    
    // --- LOCALIZED COURSE STATES ---
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [courseStudents, setCourseStudents] = useState([]);
    const [courseMarks, setCourseMarks] = useState([]);
    const [courseMatrix, setCourseMatrix] = useState({});
    const [reportData, setReportData] = useState(null); // Data from new Python Backend

    // --- 1. INITIAL LOAD (Fetch base structure) ---
    useEffect(() => {
        const fetchBaseData = async () => {
            if (!user) return;
            try {
                const [coursesRes, posRes, psosRes] = await Promise.all([
                    api.get('/courses/'),
                    api.get('/pos/'),
                    api.get('/psos/')
                ]);

                const fetchedCourses = coursesRes.data.results || coursesRes.data;
                const fetchedPos = posRes.data.results || posRes.data;
                const fetchedPsos = psosRes.data.results || psosRes.data;

                const assigned = fetchedCourses.filter(c => String(c.assigned_faculty) === String(user.id));
                setCourses(assigned);
                
                if (assigned.length > 0) setSelectedCourseId(assigned[0].id);

                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };
                setPos(fetchedPos.sort(sortById));
                setPsos(fetchedPsos.sort(sortById));
            } catch (error) {
                console.error("Failed to fetch base data", error);
            }
        };
        fetchBaseData();
    }, [user]);

    const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);

    // --- 2. FETCH SPECIFIC COURSE DATA (The "Slim-Down" Optimization) ---
    useEffect(() => {
        const fetchCourseData = async () => {
            if (!selectedCourseId) return;
            setLoading(true);
            setReportData(null);
            
            try {
                // Fetch filtered marks and backend calculations simultaneously
                const [studentsRes, marksRes, matrixRes, reportRes] = await Promise.all([
                    api.get('/students/'),
                    api.get(`/marks/?course=${selectedCourseId}`), // Strict Filtering
                    api.get('/articulation-matrix/'),
                    api.get(`/reports/course-attainment/${selectedCourseId}/`) // The Python Engine
                ]);

                const allStudents = studentsRes.data.results || studentsRes.data;
                setCourseStudents(allStudents.filter(s => s.courses && s.courses.includes(selectedCourseId)));
                
                setCourseMarks(marksRes.data.results || marksRes.data);
                
                const allMatrices = matrixRes.data.results || matrixRes.data;
                const specificMatrix = allMatrices.find(m => m.course === selectedCourseId);
                setCourseMatrix(specificMatrix ? specificMatrix.matrix : {});

                setReportData(reportRes.data);

            } catch (error) {
                console.error("Failed to fetch course data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourseData();
    }, [selectedCourseId]);

    // --- 3. BUILD DYNAMIC CONFIG FROM SCHEME ---
    const courseConfig = useMemo(() => {
        if (!selectedCourse) return null;

        const settings = selectedCourse.scheme_details?.settings || {};
        // Fallback to Phase 1 JSON schema standard
        const rules = settings.attainment_rules || settings; 

        let levelsDict = rules.attainment_levels || rules.levelThresholds || { level_3: 70, level_2: 60, level_1: 50 };
        const sortedLevels = Object.entries(levelsDict)
            .map(([key, val]) => ({
                level: parseInt(key.replace(/\D/g, '')) || 0, 
                threshold: parseFloat(val) || 0
            }))
            .sort((a, b) => b.threshold - a.threshold);

        const targetLevel = rules.pass_criteria || rules.studentPassThreshold || 50;
        const weightage = rules.weightage || rules.finalWeightage || { direct: 80, indirect: 20 };

        const rawTools = selectedCourse.assessment_tools || [];
        const seeTool = rawTools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE' || t.name === 'Semester End Exam');
        const internalTools = rawTools.filter(t => t !== seeTool && t.type !== 'Improvement Test');
        
        const processTool = (tool) => {
            let parts = Object.entries(tool.coDistribution || {}).map(([coId, max]) => ({
                co: coId, max: parseInt(max) || 0
            }));
            if (parts.length === 0) {
                parts = (selectedCourse.cos || []).map(co => ({ co: co.id, max: tool.maxMarks }));
            }
            return {
                id: tool.name, title: tool.name, type: tool.type,
                total: tool.maxMarks || 0, parts: parts, colSpan: (parts.length * 3) + 1
            };
        };

        const groupedTools = [];
        const processedToolsFlat = []; 
        const buckets = {};

        internalTools.forEach(tool => {
            const match = tool.name.match(/(\d+)/);
            const num = match ? match[1] : 'Other';
            if (!buckets[num]) buckets[num] = [];
            buckets[num].push(tool);
        });

        Object.keys(buckets).sort().forEach(key => {
            const groupTools = buckets[key].map(processTool);
            processedToolsFlat.push(...groupTools);
            groupedTools.push({
                id: `group-${key}`,
                title: key === 'Other' ? 'Other Assessments' : `Internal Assessment ${key}`,
                tools: groupTools,
                groupMax: groupTools.reduce((sum, t) => sum + t.total, 0),
                totalColSpan: groupTools.reduce((sum, t) => sum + t.colSpan, 0)
            });
        });

        const seeCoMap = seeTool?.coDistribution ? Object.keys(seeTool.coDistribution) : (selectedCourse.cos || []).map(c => c.id);

        return {
            targetLevel, sortedLevels, weightage, groupedTools, 
            assessments: processedToolsFlat, 
            see: { total: seeTool?.maxMarks || 100, coMap: seeCoMap, colSpan: 3 },
            schemeName: selectedCourse.scheme_details?.name || 'Default Scheme'
        };
    }, [selectedCourse]);

    // --- 4. CALCULATE RAW STUDENT MATRIX (Blazing fast because courseMarks is small) ---
    const data = useMemo(() => {
        if (!courseStudents.length || !courseConfig) return null;

        const getLevel = (percentage) => {
            if (isNaN(percentage)) return 0;
            const match = courseConfig.sortedLevels.find(l => percentage >= l.threshold);
            return match ? match.level : 0;
        };

        const isStudentAbsent = (val) => ['AB', 'ABSENT', 'A', 'NA', '-'].includes(String(val || '').toUpperCase().trim());

        // STRICT TOTAL CALCULATOR
        const getScoreTotal = (scores, parts) => {
            if (!scores) return 0;
            if (parts && parts.length > 0) {
                return parts.reduce((sum, part) => {
                    const val = scores[part.co];
                    const num = parseFloat(val);
                    return sum + (isNaN(num) ? 0 : num);
                }, 0);
            }
            return Object.entries(scores).reduce((sum, [key, val]) => {
                if (key.startsWith('_')) return sum; 
                const num = parseFloat(val);
                return sum + (isNaN(num) ? 0 : num);
            }, 0);
        };

        // ROBUST MATCHING HELPERS
        const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, ''); 
        const extractNumber = (str) => {
            const match = String(str).match(/(\d+)/);
            return match ? match[1] : null;
        };

        return courseStudents.map(student => {
            const row = { student, assessments: {} };
            const studentMarks = courseMarks.filter(m => m.student === student.id);

            courseConfig.assessments.forEach(assessment => {
                let markRecord = studentMarks.find(m => m.assessment_name === assessment.id);
                let scores = markRecord?.scores || {};
                let isOverridden = false;

                // --- ROBUST IMPROVEMENT CHECK ---
                const improvementRecord = studentMarks.find(m => {
                    const targetNew = m.improvement_test_for;
                    const targetOld = m.scores?._improvementTarget;
                    
                    if (!targetNew && !targetOld) return false;

                    const target = targetNew || targetOld;
                    const currentTitle = assessment.title;

                    // 1. Strict Normalization Match
                    if (normalize(target) === normalize(currentTitle)) return true;

                    // 2. Number + Keyword Match
                    const tNorm = normalize(target);
                    const cNorm = normalize(currentTitle);
                    const isInternal = (s) => s.includes('internal') || s.includes('ia') || s.includes('test');
                    
                    if (isInternal(tNorm) && isInternal(cNorm)) {
                        const tNum = extractNumber(target);
                        const cNum = extractNumber(currentTitle);
                        if (tNum && cNum && tNum === cNum) return true;
                    }
                    return false;
                });

                if (improvementRecord && improvementRecord.scores) {
                    const originalTotal = getScoreTotal(scores, assessment.parts);
                    const impTotal = getScoreTotal(improvementRecord.scores, assessment.parts);

                    if (impTotal > originalTotal) {
                        scores = improvementRecord.scores;
                        isOverridden = true;
                    }
                }

                // --- Process Final Scores into Table Cells ---
                let currentTotal = 0;
                const parts = assessment.parts.map(part => {
                    let rawVal = scores[part.co];
                    
                    if (rawVal === undefined && Object.keys(scores).filter(k => !k.startsWith('_')).length === 1) {
                         const singleVal = Object.values(scores).find(v => !String(v).startsWith('_'));
                         if (singleVal !== undefined) rawVal = singleVal;
                    }

                    const absent = isStudentAbsent(rawVal);
                    const obtained = absent ? 0 : parseFloat(rawVal || 0);
                    if (!absent) currentTotal += obtained;
                    const percentage = part.max > 0 ? (obtained / part.max) * 100 : 0;
                    return {
                        co: part.co, max: part.max, obtained, isAbsent: absent,
                        targetMet: !absent && percentage >= courseConfig.targetLevel,
                        score: getLevel(percentage)         
                    };
                });

                row.assessments[assessment.id] = { total: currentTotal, parts, isOverridden };
            });

            // SEE Processing
            const seeRecord = studentMarks.find(m => m.assessment_name === 'SEE' || m.assessment_name === 'Semester End Exam');
            let seeObtained = 0;
            let seeAbsent = false;
            if (seeRecord && seeRecord.scores) {
                 const rawVals = Object.values(seeRecord.scores);
                 if (rawVals.some(isStudentAbsent)) seeAbsent = true; 
                 else seeObtained = rawVals.reduce((a, b) => a + (parseFloat(b)||0), 0);
            }
            const seePercent = courseConfig.see.total > 0 ? (seeObtained / courseConfig.see.total) * 100 : 0;
            
            row.see = {
                obtained: seeObtained, isAbsent: seeAbsent,
                targetMet: !seeAbsent && seePercent >= courseConfig.targetLevel,
                score: getLevel(seePercent)
            };

            return row;
        });
    }, [courseStudents, courseMarks, courseConfig]);

    // --- 5. CLASS AVERAGE FOOTER SUMMARY ---
    const summary = useMemo(() => {
        if (!data || !courseConfig) return null;
        const s = { assessments: {}, see: { yCount: 0, totalMarks: 0, absentCount: 0 } };
        courseConfig.assessments.forEach(a => {
            s.assessments[a.id] = { parts: a.parts.map(() => ({ yCount: 0, totalMarks: 0, absentCount: 0 })) };
        });
        data.forEach(row => {
            courseConfig.assessments.forEach(a => {
                row.assessments[a.id].parts.forEach((p, idx) => {
                    if (p.isAbsent) s.assessments[a.id].parts[idx].absentCount++;
                    else {
                        s.assessments[a.id].parts[idx].totalMarks += p.obtained;
                        if (p.targetMet) s.assessments[a.id].parts[idx].yCount++;
                    }
                });
            });
            if (row.see.isAbsent) s.see.absentCount++;
            else {
                s.see.totalMarks += row.see.obtained;
                if (row.see.targetMet) s.see.yCount++;
            }
        });
        return s;
    }, [data, courseConfig]);

    // --- 6. BUILD EXPECTED/ACTUAL PO GRID (Using Backend Data!) ---
    const poAttainmentGrid = useMemo(() => {
        if (!reportData || !selectedCourse || !courseMatrix) return null;
        
        const outcomes = [...pos, ...psos]; 
        
        // Build "Expected" using the Articulation Matrix mappings
        const expectedRows = reportData.co_attainment.map(coData => {
            const outcomeValues = {};
            outcomes.forEach(outcome => {
                let val = courseMatrix[coData.co]?.[outcome.id];
                outcomeValues[outcome.id] = (val !== undefined && val !== "" && val !== "-") ? parseFloat(val) : '-';
            });
            return { co: coData.co, values: outcomeValues };
        });

        // Averages for Expected
        const expectedAvg = {};
        outcomes.forEach(outcome => {
            let sum = 0, count = 0;
            expectedRows.forEach(r => {
                if (r.values[outcome.id] !== '-') { sum += r.values[outcome.id]; count++; }
            });
            expectedAvg[outcome.id] = count > 0 ? (sum / count).toFixed(2) : '-';
        });

        // Build "Actual" by multiplying mapping by Backend Score Index
        const normFactor = reportData.scheme_used ? 3 : 3; // From Phase 1 rules
        const actualRows = expectedRows.map((row) => {
             const backendCoData = reportData.co_attainment.find(c => c.co === row.co);
             const coLevel = backendCoData ? backendCoData.score_index : 0;
             const actualValues = {};
             
             outcomes.forEach(outcome => {
                 const mapping = row.values[outcome.id];
                 if (mapping !== '-') {
                     const val = (mapping * coLevel) / normFactor;
                     actualValues[outcome.id] = parseFloat(val.toFixed(2));
                 } else actualValues[outcome.id] = '-';
             });
             return { co: row.co, values: actualValues };
        });

        // Averages for Actual
        const actualAvg = {};
        outcomes.forEach(outcome => {
             let sum = 0, count = 0;
             actualRows.forEach(r => {
                 if (r.values[outcome.id] !== '-') { sum += r.values[outcome.id]; count++; }
             });
             actualAvg[outcome.id] = count > 0 ? (sum / count).toFixed(2) : '-';
        });

        return { outcomes, expectedRows, expectedAvg, actualRows, actualAvg };
    }, [reportData, selectedCourse, courseMatrix, pos, psos]);

    if (loading && !data) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;
    if (!user) return null;

    // --- RENDER HELPERS ---
    const renderTableHeader = () => (
        <thead className="text-center text-xs font-bold text-gray-800 bg-gray-200 dark:bg-gray-800 dark:text-gray-200 uppercase border-b-2 border-gray-400">
            <tr>
                <th rowSpan={3} className="sticky left-0 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-12 align-middle">Sl.No.</th>
                <th rowSpan={3} className="sticky left-12 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-28 align-middle">USN</th>
                <th rowSpan={3} className="sticky left-40 z-20 bg-gray-300 dark:bg-gray-800 border-r border-gray-400 p-2 w-48 align-middle">Name</th>
                {courseConfig?.groupedTools.map(group => (
                    <th key={group.id} colSpan={group.totalColSpan} className="bg-purple-400 dark:bg-purple-900 border-r border-gray-400 py-2 border-b">
                        {group.title} <span className="text-[10px]">({group.groupMax})</span>
                    </th>
                ))}
                <th rowSpan={2} colSpan={3} className="bg-orange-300 dark:bg-orange-900 border-l border-gray-400 align-middle">
                    SEE <span className="text-[10px] block">(Max: {courseConfig?.see?.total})</span>
                </th>
            </tr>
            <tr>
                {courseConfig?.groupedTools.map(group => (
                    <React.Fragment key={group.id}>
                        {group.tools.map(tool => (
                            <th key={tool.id} colSpan={tool.colSpan} className="bg-purple-200 dark:bg-purple-800/50 border-r border-gray-400 py-1 border-b">
                                {tool.type === 'Internal Assessment' ? 'Internal' : tool.title.split(' ').slice(0, 1)} 
                                <span className="text-[9px] ml-1">({tool.total})</span>
                            </th>
                        ))}
                    </React.Fragment>
                ))}
            </tr>
            <tr>
                {courseConfig?.assessments.map(assessment => (
                    <React.Fragment key={assessment.id}>
                        {assessment.parts.map((part, idx) => (
                            <React.Fragment key={`head-${assessment.id}-${idx}`}>
                                <th className="bg-green-100 dark:bg-green-900/30 border-r border-gray-300 px-1 py-1 min-w-[50px]">{part.co} <span className="text-[9px]">({part.max})</span></th>
                                <th className="bg-blue-50 dark:bg-blue-900/50 border-r border-gray-300 px-1 py-1 min-w-[30px]" title="Level">Lvl</th>
                                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1 py-1 min-w-[40px] text-[10px]">Target {'>'} {courseConfig.targetLevel}%</th>
                            </React.Fragment>
                        ))}
                        <th className="bg-blue-100 dark:bg-blue-900 border-r border-gray-300 px-1 py-1 min-w-[40px]">Tot</th>
                    </React.Fragment>
                ))}
                <th className="bg-orange-100 dark:bg-orange-900/30 border-r border-gray-300 px-1 py-1 min-w-[40px]">Obt</th>
                <th className="bg-blue-50 dark:bg-blue-900/50 border-r border-gray-300 px-1 py-1 min-w-[30px]">Lvl</th>
                <th className="bg-yellow-200 dark:bg-yellow-700 border-r border-gray-300 px-1 py-1 min-w-[40px]">Met?</th>
            </tr>
        </thead>
    );

    const renderTableFooter = () => {
        if (!data || !summary) return null;
        const labels = [{ key: 'avgMarks', title: "Class Average" }, { key: 'absentCount', title: "No. of Absents (AB)" }, { key: 'yCount', title: "No. of Students >= Target" }, { key: 'percentage', title: "% Above Target" }, { key: 'level', title: "Attainment Level" }];
        return (
            <tfoot className="bg-blue-100 dark:bg-blue-900/40 font-bold text-xs text-center border-t-2 border-gray-500">
                {labels.map((labelRow, rIdx) => (
                    <tr key={rIdx} className="border-b border-gray-300 dark:border-gray-600">
                        <td colSpan={3} className="sticky left-0 bg-blue-900 text-white border-r border-gray-400 px-2 py-2 text-left">{labelRow.title}</td>
                        {courseConfig.assessments.map(assessment => (
                            <React.Fragment key={assessment.id}>
                                {assessment.parts.map((part, pIdx) => {
                                    const stats = summary.assessments[assessment.id].parts[pIdx];
                                    const totalStudents = data.length || 1;
                                    const attempts = totalStudents - stats.absentCount;
                                    const validAttempts = attempts > 0 ? attempts : 1;
                                    const percent = (stats.yCount / validAttempts) * 100;
                                    let val = '';
                                    if (labelRow.key === 'avgMarks') val = (stats.totalMarks / validAttempts).toFixed(1);
                                    if (labelRow.key === 'absentCount') val = stats.absentCount;
                                    if (labelRow.key === 'yCount') val = stats.yCount;
                                    if (labelRow.key === 'percentage') val = percent.toFixed(1) + '%';
                                    if (labelRow.key === 'level') { const match = courseConfig.sortedLevels.find(l => percent >= l.threshold); val = match ? match.level : 0; }
                                    return (<React.Fragment key={`foot-${assessment.id}-${pIdx}`}><td className="bg-[#8B5A2B] text-white border-r border-gray-300">{val}</td><td className="bg-gray-200 dark:bg-gray-700 border-r border-gray-300"></td><td className="bg-gray-200 dark:bg-gray-700 border-r border-gray-300"></td></React.Fragment>);
                                })}
                                <td></td> 
                            </React.Fragment>
                        ))}
                         <td className="bg-[#8B5A2B] text-white border-r border-gray-300">{(() => { const totalStudents = data.length || 1; const attempts = totalStudents - summary.see.absentCount; const validAttempts = attempts > 0 ? attempts : 1; if (labelRow.key === 'avgMarks') return (summary.see.totalMarks / validAttempts).toFixed(1); if (labelRow.key === 'absentCount') return summary.see.absentCount; return ''; })()}</td>
                         <td className="bg-[#8B5A2B] text-white border-r border-gray-300">{(() => { const totalStudents = data.length || 1; const attempts = totalStudents - summary.see.absentCount; const validAttempts = attempts > 0 ? attempts : 1; const percent = (summary.see.yCount / validAttempts) * 100; if (labelRow.key === 'level') { const match = courseConfig.sortedLevels.find(l => percent >= l.threshold); return match ? match.level : 0; } return ''; })()}</td>
                         <td className="bg-[#8B5A2B] text-white">{(() => { const totalStudents = data.length || 1; const attempts = totalStudents - summary.see.absentCount; const validAttempts = attempts > 0 ? attempts : 1; const percent = (summary.see.yCount / validAttempts) * 100; if (labelRow.key === 'yCount') return summary.see.yCount; if (labelRow.key === 'percentage') return percent.toFixed(1)+'%'; return ''; })()}</td>
                    </tr>
                ))}
            </tfoot>
        );
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">CO-PO Attainment</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500 dark:text-gray-400">Scheme: <span className="font-bold text-primary-600 dark:text-primary-400">{courseConfig?.schemeName || 'Loading...'}</span></p>
                    </div>
                </div>
                <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="block w-full mt-4 sm:mt-0 sm:w-96 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {courses.map(course => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
                    {courses.length === 0 && <option>No courses assigned</option>}
                </select>
            </div>
            
            {loading && <div className="text-sm text-gray-500 flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Refreshing Matrix...</div>}

            {data && courseConfig ? (
                <Card className="w-full overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
                            <table className="min-w-max text-center border-collapse">
                                {renderTableHeader()}
                                <tbody className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {data.map((row, idx) => (
                                        <tr key={row.student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-300 p-2 font-medium">{idx + 1}</td>
                                            <td className="sticky left-12 bg-white dark:bg-gray-900 border-r border-gray-300 p-2 font-mono whitespace-nowrap">{row.student.usn}</td>
                                            <td className="sticky left-40 bg-white dark:bg-gray-900 border-r border-gray-300 p-2 text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[12rem]" title={row.student.name}>{row.student.name}</td>
                                            {courseConfig.assessments.map(assessment => {
                                                const aData = row.assessments[assessment.id];
                                                const overrideClass = aData.isOverridden ? 'bg-yellow-50 dark:bg-yellow-900/20' : '';
                                                return (
                                                    <React.Fragment key={assessment.id}>
                                                        {aData.parts.map((part, pIdx) => (
                                                            <React.Fragment key={`row-${assessment.id}-${pIdx}`}>
                                                                <td className={`border-r border-gray-300 px-1 text-gray-500 ${overrideClass}`}>{part.isAbsent ? 'AB' : part.obtained}</td>
                                                                <td className={`border-r border-gray-300 px-1 font-semibold text-blue-600 dark:text-blue-400 ${overrideClass}`}>{part.isAbsent ? '-' : part.score}</td>
                                                                <td className={`border-r border-gray-300 px-1 font-bold ${part.targetMet ? 'text-green-600' : 'text-red-500'} ${overrideClass}`}>{part.isAbsent ? '-' : (part.targetMet ? 'Y' : 'N')}</td>
                                                            </React.Fragment>
                                                        ))}
                                                        <td className="border-r border-gray-300 px-1 font-bold bg-gray-50 dark:bg-gray-800">{aData.total}</td>
                                                    </React.Fragment>
                                                );
                                            })}
                                            <td className="border-r border-gray-300 px-2">{row.see.isAbsent ? 'AB' : row.see.obtained}</td>
                                            <td className="border-r border-gray-300 px-2 font-semibold text-blue-600 dark:text-blue-400">{row.see.isAbsent ? '-' : row.see.score}</td>
                                            <td className={`border-r border-gray-300 px-2 font-bold ${row.see.targetMet ? 'text-green-600' : 'text-red-500'}`}>{row.see.isAbsent ? '-' : (row.see.targetMet ? 'Y' : 'N')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {renderTableFooter()}
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm mt-4">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium">No Data Available</h3>
                    <p>Please select a course or ensure marks have been entered for this subject.</p>
                </div>
            )}

            {/* --- FINAL BACKEND SUMMARIES --- */}
            {reportData && (
                <div className="mt-8 space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Final CO Attainment Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto border dark:border-gray-600 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-center text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700 font-bold">
                                            <tr>
                                                <th className="px-4 py-3 border-r">Course Outcome (CO)</th>
                                                <th className="px-4 py-3 border-r">CIE Avg Level</th>
                                                <th className="px-4 py-3 border-r">SEE Avg Level</th>
                                                <th className="px-4 py-3 border-r text-primary-600">Direct Attainment (DA)</th>
                                                <th className="px-4 py-3 border-r text-purple-600">Indirect Attainment (IA)</th>
                                                <th className="px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">Final Score Index</th>
                                            </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {reportData.co_attainment.map(row => (
                                            <tr key={row.co} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 border-r font-bold">{row.co}</td>
                                                <td className="px-4 py-3 border-r">{row.cie_level.toFixed(2)}</td>
                                                <td className="px-4 py-3 border-r">{row.see_level.toFixed(2)}</td>
                                                <td className="px-4 py-3 border-r">{row.direct_attainment.toFixed(2)}</td>
                                                <td className="px-4 py-3 border-r">{row.indirect_attainment.toFixed(2)}</td>
                                                <td className="px-4 py-3 font-bold text-lg">{row.score_index.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PO Attainment Tables (Expected vs Actual) */}
                    {poAttainmentGrid && (
                        <div className="grid grid-cols-1 gap-6">
                            {['EXPECTED', 'ACTUAL'].map(type => {
                                const rows = type === 'EXPECTED' ? poAttainmentGrid.expectedRows : poAttainmentGrid.actualRows;
                                const avg = type === 'EXPECTED' ? poAttainmentGrid.expectedAvg : poAttainmentGrid.actualAvg;
                                const colorClass = type === 'EXPECTED' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' : 'bg-green-50 dark:bg-green-900/20 border-green-200';
                                
                                return (
                                    <Card key={type} className={`shadow-sm border ${colorClass}`}>
                                        <CardHeader>
                                            <CardTitle className="text-sm uppercase tracking-wider">{type} Attainment of PO by CO</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-600">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-center text-xs sm:text-sm">
                                                    <thead className="bg-gray-100 dark:bg-gray-700 font-bold">
                                                        <tr>
                                                            <th className="px-2 py-3 border-r w-24">CO</th>
                                                            {poAttainmentGrid.outcomes.map(o => <th key={o.id} className="px-2 py-3 border-r">{o.id}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {rows.map(row => (
                                                            <tr key={row.co}>
                                                                <td className="px-2 py-2 border-r font-bold bg-gray-50 dark:bg-gray-800">{row.co}</td>
                                                                {poAttainmentGrid.outcomes.map(o => (
                                                                    <td key={o.id} className="px-2 py-2 border-r">{row.values[o.id]}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-200 dark:bg-gray-700 font-bold border-t-2 border-gray-400">
                                                        <tr>
                                                            <td className="px-2 py-3 border-r">AVG</td>
                                                            {poAttainmentGrid.outcomes.map(o => (
                                                                <td key={o.id} className="px-2 py-3 border-r text-primary-700 dark:text-primary-300">{avg[o.id]}</td>
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
                </div>
            )}
        </div>
    );
};

export default CoPoAttainmentPage;