import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Download, Loader2, Search, Filter, Eye } from 'lucide-react'; // Added Eye
import { useNavigate } from 'react-router-dom'; // Added useNavigate

const StudentReportsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate(); // Hook for navigation
    const [loading, setLoading] = useState(true);

    // Data States
    const [courses, setCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allMarks, setAllMarks] = useState([]);
    
    // UI States
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [coursesRes, studentsRes, marksRes] = await Promise.all([
                    api.get('/courses/'),
                    api.get('/students/'),
                    api.get('/marks/')
                ]);
                setCourses(coursesRes.data);
                setAllStudents(studentsRes.data);
                setAllMarks(marksRes.data);
            } catch (error) {
                console.error("Failed to fetch report data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // 2. Filter Courses for Faculty
    const assignedCourses = useMemo(() => {
        if (!user || !courses.length) return [];
        return courses.filter(c => String(c.assigned_faculty) === String(user.id));
    }, [user, courses]);

    // Auto-select course
    useEffect(() => {
        if (assignedCourses.length > 0 && !assignedCourses.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(assignedCourses[0].id);
        } else if (assignedCourses.length === 0) {
            setSelectedCourseId('');
        }
    }, [assignedCourses, selectedCourseId]);

    const selectedCourse = useMemo(() => 
        courses.find(c => c.id === selectedCourseId), 
    [courses, selectedCourseId]);

    // 3. Process Student Data
    const reportData = useMemo(() => {
        if (!selectedCourseId || !selectedCourse) return [];

        const students = allStudents.filter(s => s.courses && s.courses.includes(selectedCourseId));
        const tools = selectedCourse.assessment_tools || [];
        const seeTool = tools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE');
        
        let maxCie = 0;
        let maxSee = seeTool ? (seeTool.maxMarks || 100) : 100;
        tools.forEach(t => {
            if (t !== seeTool && t.type !== 'Improvement Test') {
                maxCie += (t.maxMarks || 0);
            }
        });
        const maxTotal = maxCie + maxSee;

        return students.map(student => {
            const studentMarks = allMarks.filter(m => m.student === student.id && m.course === selectedCourseId);
            
            let cieObtained = 0;
            let seeObtained = 0;

            tools.forEach(tool => {
                const record = studentMarks.find(m => m.assessment_name === tool.name);
                if (record && record.scores) {
                    const score = Object.values(record.scores).reduce((a, b) => a + (parseInt(b)||0), 0);
                    
                    if (tool === seeTool) {
                        seeObtained += score;
                    } else if (tool.type !== 'Improvement Test') {
                        cieObtained += score;
                    }
                }
            });

            const total = cieObtained + seeObtained;
            const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            const result = percentage >= 40 ? 'PASS' : 'FAIL';

            return {
                id: student.id,
                usn: student.usn,
                name: student.name,
                cie: cieObtained,
                see: seeObtained,
                total: total,
                percentage: percentage.toFixed(1),
                result: result,
                maxCie,
                maxSee,
                maxTotal
            };
        });
    }, [selectedCourse, allStudents, allMarks, selectedCourseId]);

    const filteredData = useMemo(() => {
        return reportData.filter(row => 
            row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.usn.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [reportData, searchTerm]);

    const handleExport = () => {
        if (!filteredData.length) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + "USN,Name,CIE Obtained,SEE Obtained,Total,Percentage,Result\n"
            + filteredData.map(r => `${r.usn},${r.name},${r.cie},${r.see},${r.total},${r.percentage}%,${r.result}`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedCourse.code}_Student_Report.csv`);
        document.body.appendChild(link);
        link.click();
    };

    // Navigation Handler
    const handleViewIndividualReport = (studentId) => {
        navigate('/faculty/reports/individual', { 
            state: { 
                courseId: selectedCourseId, 
                studentId: studentId 
            } 
        });
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Student Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Consolidated marks sheet and performance overview.</p>
                </div>
                <div className="mt-4 sm:mt-0 flex gap-2">
                    <select 
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        {assignedCourses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        ))}
                        {assignedCourses.length === 0 && <option>No courses assigned</option>}
                    </select>
                </div>
            </div>

            {selectedCourse ? (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <CardTitle>{selectedCourse.code} - Class List</CardTitle>
                            <div className="flex w-full sm:w-auto gap-2">
                                <div className="relative flex-grow sm:flex-grow-0">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by Name or USN..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                    />
                                </div>
                                <button 
                                    onClick={handleExport}
                                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4 mr-2" /> Export
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">USN</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            CIE <span className="text-gray-400">({reportData[0]?.maxCie || 0})</span>
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            SEE <span className="text-gray-400">({reportData[0]?.maxSee || 0})</span>
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Total <span className="text-gray-400">({reportData[0]?.maxTotal || 0})</span>
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Percentage</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Result</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredData.length > 0 ? filteredData.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{student.usn}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white">{student.cie}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white">{student.see}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-white">{student.total}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">{student.percentage}%</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    student.result === 'PASS' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                    {student.result}
                                                </span>
                                            </td>
                                            {/* ACTION BUTTON */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleViewIndividualReport(student.id)}
                                                    className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                                                    title="View Individual Report"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                                No students found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                    <Filter className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <h3 className="text-lg font-medium">Select a Course</h3>
                    <p>Please select a course to view the student report.</p>
                </div>
            )}
        </div>
    );
};

export default StudentReportsPage;