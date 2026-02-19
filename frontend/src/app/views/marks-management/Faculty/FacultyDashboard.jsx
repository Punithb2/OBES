import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';

const FacultyDashboard = () => {
    const { user } = useAuth();
    
    // State for Dashboard Data
    const [stats, setStats] = useState({
        totalAttainment: 0,
        directAttainment: 0,
        indirectAttainment: 0,
        coAttainmentLevel: 0
    });
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [studentCounts, setStudentCounts] = useState({});
    const [coursePerformanceData, setCoursePerformanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courseStats, setCourseStats] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // 1. Fetch data handling pagination
                const [coursesRes, studentsRes, marksRes] = await Promise.all([
                    api.get('/courses/'),
                    api.get('/students/'),
                    api.get('/marks/')
                ]);

                // Extract arrays safely
                const allCourses = coursesRes.data.results || coursesRes.data;
                const allStudents = studentsRes.data.results || studentsRes.data;
                const allMarks = marksRes.data.results || marksRes.data;

                // 2. Filter courses for this faculty
                const myCourses = Array.isArray(allCourses) 
                    ? allCourses.filter(c => String(c.assigned_faculty) === String(user.id))
                    : [];
                
                setAssignedCourses(myCourses);

                if (myCourses.length === 0) {
                    setLoading(false);
                    return;
                }

                // 3. Process Student Counts per Course
                const counts = {};
                const courseStatsData = myCourses.map(course => {
                    const enrolled = Array.isArray(allStudents) 
                        ? allStudents.filter(s => s.courses && s.courses.includes(course.id)).length
                        : 0;
                    counts[course.id] = enrolled;
                    return { ...course, studentsEnrolled: enrolled };
                });
                setStudentCounts(counts);
                setCourseStats(courseStatsData);

                // 4. Calculate Global Metrics (Averaging across all assigned courses)
                let totalDirect = 0;
                let totalIndirect = 0;
                let validCoursesCount = 0;
                let totalCoLevel = 0;
                
                // Prepare array for Recharts Performance Data
                const performanceArray = [];

                for (const course of myCourses) {
                    try {
                        // Use our new Python calculation engine
                        const reportRes = await api.get(`/reports/course-attainment/${course.id}/`);
                        const reportData = reportRes.data;

                        let courseAvgLevel = 0;

                        if (reportData && reportData.co_attainment && reportData.co_attainment.length > 0) {
                            let courseDirectSum = 0;
                            let courseIndirectSum = 0;
                            let courseIndexSum = 0;

                            reportData.co_attainment.forEach(co => {
                                courseDirectSum += co.direct_attainment;
                                courseIndirectSum += co.indirect_attainment;
                                courseIndexSum += co.score_index;
                            });

                            const numCos = reportData.co_attainment.length;
                            
                            // Averages for this specific course
                            const cDirect = courseDirectSum / numCos;
                            const cIndirect = courseIndirectSum / numCos;
                            courseAvgLevel = courseIndexSum / numCos;
                            
                            // Add to global totals
                            totalDirect += cDirect;
                            totalIndirect += cIndirect;
                            totalCoLevel += courseAvgLevel;
                            validCoursesCount++;
                        }
                        
                        // Extract target from settings
                        const settings = course.scheme_details?.settings || {};
                        const rules = settings.attainment_rules || settings;
                        const targetPerc = rules.pass_criteria || 50;

                        // Add to Recharts data array
                        performanceArray.push({
                            name: course.code,
                            target: targetPerc,
                            // Convert Level (0-3) to Percentage (0-100) for the bar chart
                            attained: parseFloat(((courseAvgLevel / 3.0) * 100).toFixed(1))
                        });

                    } catch (err) {
                        // If a course lacks marks, skip it for averages
                        console.warn(`Could not calculate metrics for course ${course.id}`, err);
                    }
                }

                if (validCoursesCount > 0) {
                    const avgDirect = totalDirect / validCoursesCount;
                    const avgIndirect = totalIndirect / validCoursesCount;
                    const avgTotal = totalCoLevel / validCoursesCount;

                    // Calculate Percentage Assuming Max level is 3.0
                    const attainmentPercentage = ((avgTotal / 3.0) * 100).toFixed(0);

                    // FIX: Use setStats instead of setMetrics
                    setStats({
                        totalAttainment: attainmentPercentage,
                        directAttainment: ((avgDirect / 3.0) * 100).toFixed(0),
                        indirectAttainment: ((avgIndirect / 3.0) * 100).toFixed(0),
                        coAttainmentLevel: avgTotal.toFixed(2)
                    });
                }

                // 5. Update Recharts State
                setCoursePerformanceData(performanceArray);

            } catch (error) {
                console.error("Dashboard Load Error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (!user) return null;
    if (loading) return <div className="p-12 flex justify-center items-center h-screen text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    Welcome, {user.display_name || user.username}!
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Here's a summary of your activities and courses.</p>
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Total Attainment</CardTitle>
                        <Icons.Target className="h-5 w-5 text-primary-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalAttainment}%</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Overall Program Attainment</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Direct Attainment</CardTitle>
                        <Icons.Reports className="h-5 w-5 text-primary-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.directAttainment}%</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Based on marks entered</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Indirect Attainment</CardTitle>
                        <Icons.Syllabus className="h-5 w-5 text-primary-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.indirectAttainment}%</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Based on department surveys</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>CO Attainment Level</CardTitle>
                        <Icons.Course className="h-5 w-5 text-primary-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.coAttainmentLevel} / 3</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Average course level</p>
                    </CardContent>
                </Card>
            </div>

            {/* Personalized Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>My Assigned Courses</CardTitle>
                        <CardDescription>An overview of the courses you are teaching this semester.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {assignedCourses.length > 0 ? (
                            <ul className="space-y-4">
                                {assignedCourses.map(course => (
                                    <li key={course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-md mr-4">
                                                <Icons.Course className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-gray-100">{course.code} - {course.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{studentCounts[course.id] || 0} Students</p>
                                            </div>
                                        </div>
                                        <Icons.ChevronRight className="h-5 w-5 text-gray-400" />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8">
                                <Icons.Course className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Courses Assigned</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Contact your department admin to get courses assigned.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Jump directly to your common tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col space-y-3">
                        <a href="/faculty/marks" className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors">
                            <Icons.MarksEntry className="w-5 h-5 mr-2" />
                            Enter Marks
                        </a>
                        <a href="/faculty/articulation" className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <Icons.ArticulationMatrix className="w-5 h-5 mr-2" />
                            Update Articulation
                        </a>
                    </CardContent>
                </Card>
            </div>

             {/* Course Performance Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Course Performance Overview</CardTitle>
                    <CardDescription>Comparison of attainment levels across your assigned courses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {coursePerformanceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={coursePerformanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                        borderRadius: '0.5rem',
                                        border: '1px solid #ccc'
                                    }} 
                                />
                                <Legend />
                                <Bar dataKey="target" fill="#93c5fd" name="Target Attainment (%)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="attained" fill="#1d4ed8" name="Actual Attainment (%)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            No performance data available for your assigned courses.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default FacultyDashboard;