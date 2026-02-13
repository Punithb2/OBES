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

  useEffect(() => {
    const fetchDashboardData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Fetch All Required Data in Parallel
            // Note: The 'surveys' endpoint does not exist in your backend URLs yet, 
            // so we catch the error to prevent the dashboard from breaking.
            const [coursesRes, studentsRes, marksRes, configRes, surveyRes] = await Promise.all([
                api.get(`/courses?assignedFacultyId=${user.id}`), // Assigned courses
                api.get('/students'),                             // All students
                api.get('/marks'),                                // All marks
                api.get('/configurations/global'),                // Config
                // FIX: Used user.department instead of user.departmentId
                api.get(`/surveys/${user.department}`).catch(() => ({ data: {} })) 
            ]);

            const courses = coursesRes.data;
            const allStudents = studentsRes.data;
            const allMarks = marksRes.data;
            const config = configRes.data;
            const survey = surveyRes.data;

            setAssignedCourses(courses);

            // 2. Calculate Student Counts
            const counts = {};
            courses.forEach(c => {
                // FIX: Student model has 'courses' (Many-to-Many array), not 'courseId'
                counts[c.id] = allStudents.filter(s => s.courses && s.courses.includes(c.id)).length;
            });
            setStudentCounts(counts);

            // 3. Calculate Course Performance (Direct Attainment)
            const performance = courses.map(course => {
                const courseMarks = allMarks.filter(m => m.courseId === course.id);
                
                if (courseMarks.length === 0) {
                    return {
                        name: course.code,
                        target: config?.attainmentRules?.studentPassThreshold || 60,
                        attained: 0
                    };
                }

                // Calculate average percentage score
                let totalScore = 0;
                let count = 0;
                courseMarks.forEach(record => {
                    if (record.scores) {
                        Object.values(record.scores).forEach(val => {
                            totalScore += parseInt(val) || 0;
                            count++;
                        });
                    }
                });

                const avgScore = count > 0 ? totalScore / count : 0;
                const maxMarksEstimate = avgScore > 25 ? 100 : (avgScore > 12 ? 20 : 15);
                const attainedPercent = (avgScore / maxMarksEstimate) * 100;

                return {
                    name: course.code,
                    target: config?.attainmentRules?.studentPassThreshold || 60,
                    attained: Math.min(100, Math.round(attainedPercent))
                };
            });
            setCoursePerformanceData(performance);

            // 4. Calculate Aggregate Metrics
            const avgDirect = performance.length > 0 
                ? performance.reduce((acc, curr) => acc + curr.attained, 0) / performance.length 
                : 0;

            let surveyTotal = 0;
            let surveyCount = 0;
            ['exitSurvey', 'employerSurvey', 'alumniSurvey'].forEach(type => {
                const ratings = survey[type] || {};
                Object.values(ratings).forEach(val => {
                    surveyTotal += parseFloat(val) || 0;
                    surveyCount++;
                });
            });
            const avgSurveyRating = surveyCount > 0 ? surveyTotal / surveyCount : 0;
            const avgIndirectPercent = (avgSurveyRating / 3) * 100;

            const wDirect = (config?.attainmentRules?.finalWeightage?.direct || 80) / 100;
            const wIndirect = (config?.attainmentRules?.finalWeightage?.indirect || 20) / 100;
            const total = (avgDirect * wDirect) + (avgIndirectPercent * wIndirect);

            setStats({
                totalAttainment: Math.round(total),
                directAttainment: Math.round(avgDirect),
                indirectAttainment: Math.round(avgIndirectPercent),
                coAttainmentLevel: (avgDirect / 100 * 3).toFixed(1)
            });

        } catch (error) {
            console.error("Dashboard Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    fetchDashboardData();
  }, [user]);

  if (!user) return null;
  if (loading) return <div className="p-12 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="space-y-6">
      <div>
        {/* FIX: Used user.display_name (or username) instead of user.name.split */}
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
                  <Bar dataKey="target" fill="#93c5fd" name="Target" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attained" fill="#1d4ed8" name="Attained" radius={[4, 4, 0, 0]} />
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