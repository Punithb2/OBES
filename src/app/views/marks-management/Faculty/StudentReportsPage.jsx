// src/app/views/marks-management/Faculty/StudentReportsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { FileText } from 'lucide-react'; // Icon for the report button

const StudentReportsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Fetch Faculty Courses
    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            try {
                const res = await api.get(`/courses?assignedFacultyId=${user.id}`);
                setCourses(res.data);
                if (res.data.length > 0) {
                    setSelectedCourseId(res.data[0].id);
                }
            } catch (error) {
                console.error("Failed to load courses", error);
            }
        };
        fetchCourses();
    }, [user]);

    // 2. Fetch Data for Selected Course
    useEffect(() => {
        const fetchCourseData = async () => {
            if (!selectedCourseId) return;
            setLoading(true);
            try {
                // Fetch Students & Marks for this course
                const [studentsRes, marksRes] = await Promise.all([
                    api.get(`/students?courseId=${selectedCourseId}`),
                    api.get(`/marks?courseId=${selectedCourseId}`)
                ]);
                setStudents(studentsRes.data);
                setMarks(marksRes.data);
            } catch (error) {
                console.error("Failed to load student data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourseData();
    }, [selectedCourseId]);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    // 3. Process Data (Simplified to just calculate % for the list view)
    const studentPerformance = useMemo(() => {
        if (!selectedCourse || !students.length) return [];

        return students.map(student => {
            const studentMarks = marks.filter(m => m.studentId === student.id);
            let totalScore = 0;
            let totalMax = 0;

            studentMarks.forEach(record => {
                Object.values(record.scores).forEach(score => {
                    totalScore += parseInt(score) || 0;
                    totalMax += 100; // Simplified assumption for list view preview
                });
            });
            
            const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 * 3 : 0;

            return {
                ...student,
                percentage: Math.min(100, parseFloat(percentage.toFixed(2)))
            };
        });
    }, [selectedCourse, students, marks]);

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Student Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View individual progress reports for students in your courses.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={courses.length === 0}
                    >
                        {courses.length > 0 ? courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        )) : <option>No courses assigned</option>}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-500">Loading student list...</div>
            ) : selectedCourse ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Student List: {selectedCourse.code}</CardTitle>
                        <CardDescription>Click "View Report" to see detailed analytics for a specific student.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">USN</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg. Performance</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {studentPerformance.map(student => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">{student.usn}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                 <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    student.percentage >= 60 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : student.percentage >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {student.percentage}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => navigate(`/faculty/student-reports/${selectedCourseId}/${student.id}`)}
                                                    className="inline-flex items-center px-3 py-1.5 border border-primary-600 text-primary-600 rounded-md text-xs font-medium hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20"
                                                >
                                                    <FileText className="w-3 h-3 mr-1.5" />
                                                    View Report
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                    No course selected.
                </div>
            )}
        </div>
    );
};

export default StudentReportsPage;