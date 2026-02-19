import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Loader2, User, BookOpen, Printer } from 'lucide-react';
import { useLocation } from 'react-router-dom'; 
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StudentIndividualReportPage = () => {
    const { user } = useAuth();
    const location = useLocation(); 
    const [loading, setLoading] = useState(true);

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
                // Fetch all required data
                const [coursesRes, studentsRes, marksRes] = await Promise.all([
                    api.get('/courses/'),
                    api.get('/students/'),
                    api.get('/marks/') 
                ]);

                // Safely extract data from Django's paginated responses
                const fetchedCourses = coursesRes.data.results || coursesRes.data;
                const fetchedStudents = studentsRes.data.results || studentsRes.data;
                const fetchedMarks = marksRes.data.results || marksRes.data;

                // Filter courses for the logged-in faculty
                const myCourses = Array.isArray(fetchedCourses)
                    ? fetchedCourses.filter(c => String(c.assigned_faculty) === String(user.id))
                    : [];

                setCourses(myCourses);
                
                // FIX: Use the correct state setter names
                setAllStudents(Array.isArray(fetchedStudents) ? fetchedStudents : []);
                setAllMarks(Array.isArray(fetchedMarks) ? fetchedMarks : []);

                // Auto-select course if available
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

    // 2. Filter Courses
    const assignedCourses = useMemo(() => {
        if (!user || !courses.length) return [];
        return courses.filter(c => String(c.assigned_faculty) === String(user.id));
    }, [user, courses]);

    // 3. Filter Students for Course (FIXED WITH STRING MATCHING)
    const courseStudents = useMemo(() => {
        if (!selectedCourseId) return [];
        return allStudents.filter(s => 
            s.courses && s.courses.map(String).includes(String(selectedCourseId))
        );
    }, [selectedCourseId, allStudents]);

    // Auto-select course (Priority to Location State)
    useEffect(() => {
        if (location.state?.courseId && assignedCourses.some(c => String(c.id) === String(location.state.courseId))) {
            setSelectedCourseId(String(location.state.courseId));
        } else if (assignedCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(String(assignedCourses[0].id));
        }
    }, [assignedCourses, location.state]); 

    // Auto-select student (Priority to Location State)
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

    // 4. Generate Report Data
    const reportData = useMemo(() => {
        if (!selectedCourse || !selectedStudent) return null;

        const tools = selectedCourse.assessment_tools || [];
        const studentMarks = allMarks.filter(m => String(m.student) === String(selectedStudent.id) && String(m.course) === String(selectedCourseId));

        const assessments = tools.map(tool => {
            const record = studentMarks.find(m => m.assessment_name === tool.name);
            const scores = record?.scores || {};
            
            // Ignore metadata keys like _improvementTarget
            const totalObtained = Object.entries(scores).reduce((sum, [key, val]) => {
                if (key.startsWith('_')) return sum;
                return sum + (parseInt(val) || 0);
            }, 0);
            
            const breakdown = [];
            if (tool.coDistribution) {
                Object.entries(tool.coDistribution).forEach(([coId, max]) => {
                    breakdown.push({
                        label: coId,
                        max: parseInt(max),
                        obtained: parseInt(scores[coId] || 0)
                    });
                });
            } else {
                breakdown.push({
                    label: 'Total',
                    max: tool.maxMarks,
                    obtained: totalObtained
                });
            }

            return {
                name: tool.name,
                type: tool.type,
                max: tool.maxMarks,
                obtained: totalObtained,
                breakdown
            };
        });

        const cos = selectedCourse.cos || [];
        const coPerformance = cos.map(co => {
            const coIdString = typeof co === 'string' ? co : co.id;
            let coTotalMax = 0;
            let coTotalObtained = 0;

            tools.forEach(tool => {
                if (tool.coDistribution && tool.coDistribution[coIdString]) {
                    const record = studentMarks.find(m => m.assessment_name === tool.name);
                    const max = parseInt(tool.coDistribution[coIdString]);
                    const obtained = parseInt(record?.scores?.[coIdString] || 0);
                    
                    coTotalMax += max;
                    coTotalObtained += obtained;
                }
            });

            const percentage = coTotalMax > 0 ? (coTotalObtained / coTotalMax) * 100 : 0;
            return {
                co: coIdString,
                percentage: percentage
            };
        });

        return { assessments, coPerformance };

    }, [selectedCourse, selectedStudent, allMarks, selectedCourseId]);

    const chartData = useMemo(() => {
        if (!reportData) return null;

        return {
            labels: reportData.coPerformance.map(item => item.co.includes('.') ? item.co.split('.')[1] : item.co),
            datasets: [{
                label: 'Student Attainment %',
                data: reportData.coPerformance.map(item => item.percentage),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderRadius: 4,
            }]
        };
    }, [reportData]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center print:hidden">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Individual Student Report</h1>
                
                <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select 
                        value={selectedCourseId}
                        onChange={(e) => {
                            setSelectedCourseId(e.target.value);
                            setSelectedStudentId(''); 
                        }}
                        className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        {assignedCourses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                    </select>

                    <select 
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:w-64"
                        disabled={!courseStudents.length}
                    >
                        {courseStudents.map(s => <option key={s.id} value={s.id}>{s.usn} - {s.name}</option>)}
                        {!courseStudents.length && <option>No students</option>}
                    </select>

                    <button 
                        onClick={handlePrint}
                        className="flex items-center justify-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Print
                    </button>
                </div>
            </div>

            {selectedCourse && selectedStudent && reportData ? (
                <div className="space-y-6">
                    {/* Header Info */}
                    <Card className="print:shadow-none print:border-gray-300">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                        <User className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedStudent.name}</h2>
                                        <p className="text-sm text-gray-500 font-mono">{selectedStudent.usn}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedCourse.name}</h3>
                                    <p className="text-sm text-gray-500">{selectedCourse.code} | {selectedCourse.credits} Credits</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Assessment Table */}
                        <div className="lg:col-span-2">
                            <Card className="h-full print:shadow-none print:border-gray-300">
                                <CardHeader>
                                    <CardTitle>Assessment Performance</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Assessment</th>
                                                    <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase">Max</th>
                                                    <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase">Obtained</th>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Breakdown (COs)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {reportData.assessments.map((tool, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{tool.name}</td>
                                                        <td className="px-4 py-3 text-center text-gray-500">{tool.max}</td>
                                                        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{tool.obtained}</td>
                                                        <td className="px-4 py-3 text-gray-500">
                                                            <div className="flex flex-wrap gap-2">
                                                                {tool.breakdown.map((b, i) => (
                                                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
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

                        {/* Chart */}
                        <div className="lg:col-span-1">
                            <Card className="h-full print:shadow-none print:border-gray-300">
                                <CardHeader>
                                    <CardTitle>CO Attainment Profile</CardTitle>
                                    <CardDescription>Performance percentage per CO.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64">
                                        <Bar 
                                            data={chartData} 
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                scales: {
                                                    y: { beginAtZero: true, max: 100 }
                                                },
                                                plugins: { legend: { display: false } }
                                            }}
                                        />
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {reportData.coPerformance.map(co => (
                                            <div key={co.co} className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    {co.co.includes('.') ? co.co.split('.')[1] : co.co}
                                                </span>
                                                <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500 rounded-full" 
                                                        style={{ width: `${co.percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-gray-500">{co.percentage.toFixed(0)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium">Select a Student</h3>
                    <p className="text-gray-500">Please select a course and student to generate the report.</p>
                </div>
            )}
        </div>
    );
};

export default StudentIndividualReportPage;