// src/app/views/marks-management/Faculty/StudentIndividualReportPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import api from '../../../services/api';
import { ArrowLeft, Download, Award, TrendingUp, AlertCircle, ChevronDown } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const StudentIndividualReportPage = () => {
    const { courseId, studentId } = useParams();
    const navigate = useNavigate();
    const componentRef = useRef(null);

    const [student, setStudent] = useState(null);
    const [course, setCourse] = useState(null);
    const [department, setDepartment] = useState(null); // New state for Department Name
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [chartView, setChartView] = useState('assessment');

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Student_Report_${studentId}`,
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Basic Data
                const [studentRes, courseRes, marksRes] = await Promise.all([
                    api.get(`/students?id=${studentId}`),
                    api.get(`/courses?id=${courseId}`),
                    api.get(`/marks?courseId=${courseId}&studentId=${studentId}`)
                ]);

                setStudent(studentRes.data[0]);
                setCourse(courseRes.data[0]);
                setMarks(marksRes.data);

                // 2. Fetch Department Name if course exists
                if (courseRes.data[0]?.departmentId) {
                    const deptRes = await api.get(`/departments?id=${courseRes.data[0].departmentId}`);
                    setDepartment(deptRes.data[0]);
                }

            } catch (error) {
                console.error("Failed to load report data", error);
            } finally {
                setLoading(false);
            }
        };

        if (courseId && studentId) fetchData();
    }, [courseId, studentId]);

    const reportData = useMemo(() => {
        if (!course || !marks) return null;

        const assessmentData = [];
        let totalObtained = 0;
        let totalMax = 0;

        const coList = course.cos ? course.cos.map(c => c.id) : [];

        const seenTools = new Set();
        const uniqueTools = (course.assessmentTools || []).filter(tool => {
            const isDuplicate = seenTools.has(tool.name);
            seenTools.add(tool.name);
            return !isDuplicate;
        });

        const getPreciseScore = (scoreRecord, tool) => {
            if (!scoreRecord || !scoreRecord.scores) return 0;
            let validKeys = [];
            if (tool.type === 'Semester End Exam') validKeys = ['External'];
            else if (tool.type === 'Activity') validKeys = ['Score'];
            else validKeys = Object.keys(tool.coDistribution || {});

            return validKeys.reduce((sum, key) => {
                const val = parseInt(scoreRecord.scores[key]);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
        };

        const findImprovementScore = (targetName) => {
            const impTestRecord = marks.find(m => 
                (m.assessment === 'Improvement Test' || m.assessment.startsWith('Improvement')) && 
                m.improvementTarget === targetName
            );
            if (!impTestRecord) return null;
            const targetTool = uniqueTools.find(t => t.name === targetName);
            if (!targetTool) return 0;
            return getPreciseScore(impTestRecord, targetTool);
        };

        const standardTools = uniqueTools.filter(t => t.type !== 'Improvement Test');

        standardTools.forEach(tool => {
            const record = marks.find(m => m.assessment === tool.name);
            const originalScore = getPreciseScore(record, tool);
            const improvementScore = findImprovementScore(tool.name);
            
            const finalScore = originalScore; 

            const coBreakdown = {};
            coList.forEach(coId => {
                if (tool.coDistribution && tool.coDistribution[coId] !== undefined) {
                    coBreakdown[coId] = record?.scores?.[coId] ?? '-';
                } else {
                    coBreakdown[coId] = ''; 
                }
            });

            assessmentData.push({
                name: tool.name,
                type: tool.type,
                obtained: finalScore, 
                original: originalScore,
                improvement: improvementScore,
                max: tool.maxMarks,
                percentage: tool.maxMarks > 0 ? (finalScore / tool.maxMarks) * 100 : 0,
                coBreakdown,
                coDistribution: tool.coDistribution
            });

            totalObtained += finalScore;
            totalMax += tool.maxMarks;
        });

        const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        
        const iaData = assessmentData.filter(d => d.type === 'Internal Assessment');

        let chartLabels = [];
        let chartValues = [];
        let pieLabels = [];
        let pieValues = [];

        if (chartView === 'assessment') {
            chartLabels = iaData.map(d => d.name);
            chartValues = iaData.map(d => d.percentage);
            pieLabels = iaData.map(d => d.name);
            pieValues = iaData.map(d => d.obtained);
        } else {
            const coStats = {}; 
            iaData.forEach(row => {
                Object.entries(row.coDistribution || {}).forEach(([coId, maxMarks]) => {
                    if (!coStats[coId]) coStats[coId] = { obtained: 0, max: 0 };
                    const obtained = parseInt(row.coBreakdown[coId]);
                    const max = parseInt(maxMarks);
                    if (!isNaN(obtained)) coStats[coId].obtained += obtained;
                    if (!isNaN(max)) coStats[coId].max += max;
                });
            });
            const sortedCos = Object.keys(coStats).sort();
            chartLabels = sortedCos;
            chartValues = sortedCos.map(co => {
                const { obtained, max } = coStats[co];
                return max > 0 ? (obtained / max) * 100 : 0;
            });
            pieLabels = chartLabels;
            pieValues = sortedCos.map(co => coStats[co].obtained);
        }

        const barChartData = {
            labels: chartLabels,
            datasets: [{
                label: chartView === 'assessment' ? 'Score (%)' : 'CO Attainment (%)',
                data: chartValues,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderRadius: 4,
            }],
        };

        const pieChartData = {
            labels: pieLabels,
            datasets: [{
                data: pieValues,
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
                borderWidth: 0,
            }],
        };

        return { 
            assessmentData, 
            totalObtained, 
            totalMax, 
            overallPercentage, 
            barChartData, 
            pieChartData,
            coList 
        };
    }, [course, marks, chartView]);

    if (loading) return <div className="p-12 text-center">Loading Report...</div>;
    if (!student || !course) return <div className="p-12 text-center">Data not found.</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
                >
                    <Download className="w-4 h-4" /> Export PDF / Print
                </button>
            </div>

            <div ref={componentRef} className="space-y-6 p-4 bg-white dark:bg-gray-900 print:p-8 print:bg-white" id="printable-report">
                
                {/* --- 1. UPDATED HEADER WITH LOGOS --- */}
                <div className="hidden print:flex justify-between items-center mb-6 border-b pb-4">
                 {/* Left Logo */}
                  <div className="w-24 h-24 flex items-center justify-center">
                      <img 
                          src="https://kssem.edu.in/img/logo.jpg" // PASTE YOUR LINK HERE
                          alt="KS Group Logo" 
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => { e.target.style.display='none'; }} 
                       />
                   </div>

                    {/* Center Title */}
                    <div className="text-center flex-1 px-4">
                        <h1 className="text-xl font-bold uppercase tracking-wide">
                            Department of {department ? department.name : course.departmentId}
                        </h1>
                        <h2 className="text-lg font-medium text-gray-700 mt-1">Individual Student Assessment Report</h2>
                        <p className="text-sm text-gray-500 mt-1">Academic Year 2023-2024</p>
                    </div>

                    {/* Right Logo */}
                    <div className="w-24 h-24 flex items-center justify-center">
                        <img 
                            src="https://vtu.ac.in/wp-content/uploads/2019/03/vtul-291x300.png" // PASTE YOUR LINK HERE
                            alt="KSSEM Logo" 
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => { e.target.style.display='none'; }}
                        />
                        </div>
                    </div>

                <Card className="border-t-4 border-t-primary-600 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{student.name}</h1>
                                <p className="text-gray-500 font-mono text-lg">{student.usn}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                    Course: <span className="font-bold">{course.code} - {course.name}</span>
                                </p>
                            </div>
                            <div className="mt-4 md:mt-0 text-right">
                                <div className="inline-flex flex-col items-end">
                                    <span className="text-sm text-gray-500 uppercase tracking-wider">Overall Performance</span>
                                    <span className={`text-3xl font-extrabold ${reportData.overallPercentage >= 60 ? 'text-green-600' : reportData.overallPercentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {reportData.overallPercentage.toFixed(2)}%
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {reportData.totalObtained} / {reportData.totalMax} Total Marks
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Internal Assessment Analysis</CardTitle>
                            <div className="relative print:hidden">
                                <select
                                    value={chartView}
                                    onChange={(e) => setChartView(e.target.value)}
                                    className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-xs rounded-md focus:ring-primary-500 focus:border-primary-500 block w-full p-1.5 pr-6 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                >
                                    <option value="assessment">By Assessment</option>
                                    <option value="co">By COs</option>
                                </select>
                                <ChevronDown className="absolute right-1.5 top-2 w-3 h-3 text-gray-500 pointer-events-none" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex justify-center">
                                <Bar 
                                    data={reportData.barChartData} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: { y: { beginAtZero: true, max: 100 } }
                                    }} 
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Score Contribution (IA Only)</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="h-64 flex justify-center">
                                <Doughnut 
                                    data={reportData.pieChartData} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'right' } }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="print:shadow-none print:border-none">
                    <CardHeader className="print:hidden">
                        <CardTitle>Detailed Marks Statement</CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-0">
                        <div className="overflow-x-auto border rounded-lg dark:border-gray-700 print:border-gray-300">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase border-r print:text-black">Assessment</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Max</th>
                                        {reportData.coList.map(co => (
                                            <th key={co} className="px-3 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">
                                                {co}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Orig</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Imp</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Final</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase print:text-black">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {reportData.assessmentData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 print:hover:bg-transparent">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white border-r">{row.name}</td>
                                            <td className="px-4 py-3 text-center text-gray-500 border-r">{row.max}</td>
                                            {reportData.coList.map(co => (
                                                <td key={co} className="px-3 py-3 text-center text-gray-700 border-r dark:text-gray-300">
                                                    {row.coBreakdown[co] !== '' ? row.coBreakdown[co] : ''}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center text-gray-800 border-r">{row.original}</td>
                                            <td className="px-4 py-3 text-center text-gray-500 border-r">
                                                {row.improvement !== null ? (
                                                    <span className="text-purple-600 font-medium">{row.improvement}</span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-white border-r">
                                                {row.obtained} 
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                    row.percentage >= 40 ? 'bg-green-100 text-green-800 print:text-green-800' : 'bg-red-100 text-red-800 print:text-red-800'
                                                }`}>
                                                    {row.percentage >= 40 ? 'PASS' : 'FAIL'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300">
                                        <td className="px-4 py-3 border-r">TOTAL</td>
                                        <td className="px-4 py-3 text-center border-r">{reportData.totalMax}</td>
                                        {reportData.coList.map(co => <td key={co} className="border-r"></td>)}
                                        <td className="px-4 py-3 text-center border-r">-</td>
                                        <td className="px-4 py-3 text-center border-r">-</td>
                                        <td className="px-4 py-3 text-center text-primary-700">{reportData.totalObtained}</td>
                                        <td className="px-4 py-3 text-center">
                                            {reportData.overallPercentage.toFixed(2)}%
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="hidden print:block mt-12 pt-8 border-t border-gray-300 text-center text-xs text-gray-500">
                    <div className="flex justify-between px-8 mb-8">
                        <div><p>____________________</p><p>Faculty Signature</p></div>
                        <div><p>____________________</p><p>HOD Signature</p></div>
                        <div><p>____________________</p><p>Principal Signature</p></div>
                    </div>
                    <p>Generated by OBE Management System on {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

export default StudentIndividualReportPage;
