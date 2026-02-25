import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; 
import { Loader2, User, BookOpen, Download, Trophy, Target, TrendingUp, AlertTriangle } from 'lucide-react'; 
import { useLocation } from 'react-router-dom'; 
import { StudentReportSkeleton } from '../shared/SkeletonLoaders';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import html2canvas from 'html2canvas'; 
import jsPDF from 'jspdf';             

// Register advanced ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler);

const StudentIndividualReportPage = () => {
    const { user } = useAuth();
    const location = useLocation(); 
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false); 

    // Data States
    const [courses, setCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allMarks, setAllMarks] = useState([]);

    // Selection States
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [fetchedCourses, fetchedStudents, fetchedMarks] = await Promise.all([
                    fetchAllPages('/courses/'),
                    fetchAllPages('/students/'),
                    fetchAllPages('/marks/') 
                ]);

                const myCourses = Array.isArray(fetchedCourses)
                    ? fetchedCourses.filter(c => String(c.assigned_faculty) === String(user.id))
                    : [];

                setCourses(myCourses);
                setAllStudents(Array.isArray(fetchedStudents) ? fetchedStudents : []);
                setAllMarks(Array.isArray(fetchedMarks) ? fetchedMarks : []);

                if (myCourses.length > 0 && !selectedCourseId) {
                    setSelectedCourseId(myCourses[0].id);
                }
            } catch (error) {
                console.error("Failed to load report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // 2. Filter Courses & Students
    const assignedCourses = useMemo(() => {
        if (!user || !courses.length) return [];
        return courses.filter(c => String(c.assigned_faculty) === String(user.id));
    }, [user, courses]);

    const courseStudents = useMemo(() => {
        if (!selectedCourseId) return [];
        return allStudents.filter(s => 
            s.courses && s.courses.map(String).includes(String(selectedCourseId))
        );
    }, [selectedCourseId, allStudents]);

    // Auto-select logic
    useEffect(() => {
        if (location.state?.courseId && assignedCourses.some(c => String(c.id) === String(location.state.courseId))) {
            setSelectedCourseId(String(location.state.courseId));
        } else if (assignedCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(String(assignedCourses[0].id));
        }
    }, [assignedCourses, location.state]); 

    useEffect(() => {
        if (location.state?.studentId && String(location.state?.courseId) === String(selectedCourseId)) {
             if (courseStudents.some(s => String(s.id) === String(location.state.studentId))) {
                 setSelectedStudentId(String(location.state.studentId));
                 return; 
             }
        }
        if (courseStudents.length > 0 && !selectedStudentId) {
            setSelectedStudentId(String(courseStudents[0].id));
        } else if (courseStudents.length === 0) {
            setSelectedStudentId('');
        }
    }, [courseStudents, location.state, selectedCourseId]);

    const selectedCourse = courses.find(c => String(c.id) === String(selectedCourseId));
    const selectedStudent = courseStudents.find(s => String(s.id) === String(selectedStudentId));

    // --- 3. ADVANCED REPORT DATA CALCULATION ---
    const reportData = useMemo(() => {
        if (!selectedCourse || !selectedStudent) return null;

        const tools = selectedCourse.assessment_tools || [];
        const courseMarksFiltered = allMarks.filter(m => String(m.course) === String(selectedCourseId));
        const studentMarks = courseMarksFiltered.filter(m => String(m.student) === String(selectedStudent.id));

        let grandTotalMax = 0;
        let grandTotalObtained = 0;
        let classGrandTotalObtained = 0;
        let classGrandTotalAttempts = 0;

        const assessments = tools.map(tool => {
            const record = studentMarks.find(m => m.assessment_name === tool.name);
            const scores = record?.scores || {};
            
            // Calculate Student Total for this tool
            const totalObtained = Object.entries(scores).reduce((sum, [key, val]) => {
                if (key.startsWith('_') || String(val).toUpperCase() === 'AB') return sum;
                return sum + (parseFloat(val) || 0);
            }, 0);
            
            grandTotalMax += tool.maxMarks || 0;
            grandTotalObtained += totalObtained;

            // Calculate Class Average for this tool
            const toolAllMarks = courseMarksFiltered.filter(m => m.assessment_name === tool.name);
            let classToolTotal = 0;
            let validStudents = 0;
            
            toolAllMarks.forEach(m => {
                let sTot = 0;
                let attempted = false; // FIXED TYPO HERE
                Object.entries(m.scores || {}).forEach(([k, v]) => {
                    if (!k.startsWith('_') && String(v).toUpperCase() !== 'AB') {
                        sTot += (parseFloat(v) || 0);
                        attempted = true; // FIXED TYPO HERE
                    }
                });
                if (attempted) {
                    classToolTotal += sTot;
                    validStudents++;
                    classGrandTotalObtained += sTot;
                }
            });
            classGrandTotalAttempts += validStudents ? 1 : 0; 
            
            const classAvg = validStudents > 0 ? (classToolTotal / validStudents) : 0;

            const breakdown = [];
            if (tool.coDistribution) {
                Object.entries(tool.coDistribution).forEach(([coId, max]) => {
                    breakdown.push({
                        label: coId,
                        max: parseInt(max),
                        obtained: parseFloat(scores[coId] || 0)
                    });
                });
            } else {
                breakdown.push({ label: 'Total', max: tool.maxMarks, obtained: totalObtained });
            }

            return {
                name: tool.name,
                type: tool.type,
                max: tool.maxMarks,
                obtained: totalObtained,
                classAvg: parseFloat(classAvg.toFixed(1)),
                breakdown
            };
        });

        // CO Performance
        const cos = selectedCourse.cos || [];
        const coPerformance = cos.map(co => {
            const coIdString = typeof co === 'string' ? co : co.id;
            let coTotalMax = 0;
            let coTotalObtained = 0;

            tools.forEach(tool => {
                if (tool.coDistribution && tool.coDistribution[coIdString]) {
                    const record = studentMarks.find(m => m.assessment_name === tool.name);
                    const max = parseInt(tool.coDistribution[coIdString]);
                    const rawVal = record?.scores?.[coIdString];
                    const obtained = String(rawVal).toUpperCase() === 'AB' ? 0 : parseFloat(rawVal || 0);
                    
                    coTotalMax += max;
                    coTotalObtained += obtained;
                }
            });

            return {
                co: coIdString.includes('.') ? coIdString.split('.')[1] : coIdString,
                percentage: coTotalMax > 0 ? (coTotalObtained / coTotalMax) * 100 : 0
            };
        });

        // Metrics calculations
        const overallPercentage = grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(1) : 0;
        const avgClassPercentage = (classGrandTotalAttempts > 0 && grandTotalMax > 0) ? 
            (((classGrandTotalObtained / classGrandTotalAttempts) / grandTotalMax) * 100).toFixed(1) : 0;
            
        const strongestCO = [...coPerformance].sort((a, b) => b.percentage - a.percentage)[0];
        const weakestCO = [...coPerformance].sort((a, b) => a.percentage - b.percentage)[0];

        return { 
            assessments, 
            coPerformance, 
            metrics: {
                totalObtained: grandTotalObtained,
                totalMax: grandTotalMax,
                overallPercentage,
                vsClass: (overallPercentage - avgClassPercentage).toFixed(1),
                strongestCO,
                weakestCO
            }
        };

    }, [selectedCourse, selectedStudent, allMarks, selectedCourseId]);

    // --- 4. CHART CONFIGURATIONS ---
    const comparisonChartData = useMemo(() => {
        if (!reportData) return null;
        return {
            labels: reportData.assessments.map(a => a.type === 'Internal Assessment' ? a.name.replace('Internal Assessment', 'IA') : a.name),
            datasets: [
                {
                    label: 'Student Marks',
                    data: reportData.assessments.map(a => a.obtained),
                    backgroundColor: 'rgba(59, 130, 246, 0.85)', // Blue
                    borderRadius: 4,
                },
                {
                    label: 'Class Average',
                    data: reportData.assessments.map(a => a.classAvg),
                    backgroundColor: 'rgba(209, 213, 219, 0.8)', // Gray
                    borderRadius: 4,
                }
            ]
        };
    }, [reportData]);

    const radarChartData = useMemo(() => {
        if (!reportData) return null;
        return {
            labels: reportData.coPerformance.map(co => co.co),
            datasets: [{
                label: 'CO Mastery %',
                data: reportData.coPerformance.map(co => co.percentage),
                backgroundColor: 'rgba(16, 185, 129, 0.2)', // Green tinted
                borderColor: 'rgba(16, 185, 129, 1)',
                pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
            }]
        };
    }, [reportData]);

    const handleExportToPDF = async () => {
        const element = document.getElementById('individual-report'); 
        if (!element) return;

        setExporting(true);
        try {
            const originalBg = element.style.backgroundColor;
            element.style.backgroundColor = '#ffffff'; 

            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            element.style.backgroundColor = originalBg;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${selectedStudent.usn}_${selectedCourse.code}_Report.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <StudentReportSkeleton />;

    return (
        <div className="space-y-6 pb-10">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Advanced Student Analytics</h1>
                
                <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select 
                        value={selectedCourseId}
                        onChange={(e) => {
                            setSelectedCourseId(e.target.value);
                            setSelectedStudentId(''); 
                        }}
                        className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={exporting}
                    >
                        {assignedCourses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                    </select>

                    <select 
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:w-64"
                        disabled={!courseStudents.length || exporting}
                    >
                        {courseStudents.map(s => <option key={s.id} value={s.id}>{s.usn} - {s.name}</option>)}
                        {!courseStudents.length && <option>No students</option>}
                    </select>

                    <button 
                        onClick={handleExportToPDF}
                        disabled={!selectedCourse || !selectedStudent || !reportData || exporting}
                        className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-bold shadow-sm disabled:opacity-50 whitespace-nowrap"
                        title="Export Report to PDF"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 sm:mr-2" />}
                        <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export PDF'}</span>
                    </button>
                </div>
            </div>

            {selectedCourse && selectedStudent && reportData ? (
                <div id="individual-report" className="space-y-6 bg-transparent dark:bg-gray-900 p-1">
                    
                    {/* Header Info */}
                    <Card className="shadow-sm border-l-4 border-l-primary-500">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400">
                                        <User className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedStudent.name}</h2>
                                        <p className="text-sm text-gray-500 font-mono font-medium">{selectedStudent.usn}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{selectedCourse.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium">{selectedCourse.code} | Semester {selectedCourse.semester}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Overall Grade</p>
                                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.metrics.overallPercentage}%</h4>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${reportData.metrics.vsClass >= 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}`}>
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Vs. Class Average</p>
                                    <h4 className={`text-2xl font-bold ${reportData.metrics.vsClass >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {reportData.metrics.vsClass > 0 ? '+' : ''}{reportData.metrics.vsClass}%
                                    </h4>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 rounded-lg">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Strongest CO</p>
                                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.metrics.strongestCO?.co || 'N/A'}</h4>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 rounded-lg">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Focus Area</p>
                                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.metrics.weakestCO?.co || 'N/A'}</h4>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className="h-full shadow-sm">
                                <CardHeader>
                                    <CardTitle>Comparative Assessment Timeline</CardTitle>
                                    <CardDescription>Student scores compared to the overall class average.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-72 w-full">
                                        <Bar 
                                            data={comparisonChartData} 
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                scales: { y: { beginAtZero: true } },
                                                plugins: { legend: { position: 'top' } }
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <Card className="h-full shadow-sm">
                                <CardHeader>
                                    <CardTitle>CO Mastery Radar</CardTitle>
                                    <CardDescription>Multi-dimensional view of outcome attainment.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center items-center h-72">
                                    <div className="w-full h-full pb-4">
                                        <Radar 
                                            data={radarChartData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                scales: {
                                                    r: {
                                                        angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                                                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                                                        pointLabels: { font: { size: 12, weight: 'bold' } },
                                                        ticks: { backdropColor: 'transparent', display: false },
                                                        min: 0,
                                                        max: 100
                                                    }
                                                },
                                                plugins: { legend: { display: false } }
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* TABLE & PROGRESS BARS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card className="h-full shadow-sm">
                                <CardHeader>
                                    <CardTitle>Detailed Assessment Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th className="px-6 py-4 text-left font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Assessment</th>
                                                    <th className="px-6 py-4 text-center font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Obtained / Max</th>
                                                    <th className="px-6 py-4 text-left font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">CO Breakdown</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-900">
                                                {reportData.assessments.map((tool, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{tool.name}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">{tool.obtained}</span>
                                                            <span className="text-gray-400 text-xs ml-1">/ {tool.max}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {tool.breakdown.map((b, i) => (
                                                                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                        {b.label}: {b.obtained}/{b.max}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1">
                            <Card className="h-full shadow-sm">
                                <CardHeader>
                                    <CardTitle>CO Goal Progress</CardTitle>
                                    <CardDescription>Granular view of outcome completion.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-5 mt-2">
                                        {reportData.coPerformance.map(co => (
                                            <div key={co.co} className="relative pt-1">
                                                <div className="flex mb-2 items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded-md text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                            {co.co}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold inline-block text-gray-700 dark:text-gray-300">
                                                            {co.percentage.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700 shadow-inner">
                                                    <div style={{ width: `${co.percentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Select a Student</h3>
                    <p className="text-gray-500 font-medium mt-1">Please select a course and student from the dropdowns above to generate the advanced analytics report.</p>
                </div>
            )}
        </div>
    );
};

export default StudentIndividualReportPage;