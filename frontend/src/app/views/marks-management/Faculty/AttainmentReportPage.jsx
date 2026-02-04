// src/app/views/marks-management/Faculty/AttainmentReportPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
// Restore mock data for POs and Summary until real calculation logic is added
import { poAttainmentData, attainmentSummary } from '../data/mockData'; 
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
);

const AttainmentReportPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);

  // 1. Fetch Courses
  useEffect(() => {
    const fetchCourses = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const res = await api.get(`/courses?assignedFacultyId=${user.id}`);
            setCourses(res.data);
            if (res.data.length > 0) {
                setSelectedCourseId(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to load courses", error);
        } finally {
            setLoading(false);
        }
    };
    fetchCourses();
  }, [user]);

  // 2. Fetch Course Data
  useEffect(() => {
      const fetchCourseData = async () => {
          if (!selectedCourseId) return;
          try {
              const [studentsRes, marksRes] = await Promise.all([
                  api.get(`/students?courseId=${selectedCourseId}`),
                  api.get(`/marks?courseId=${selectedCourseId}`)
              ]);
              setStudents(studentsRes.data);
              setMarks(marksRes.data);
          } catch (error) {
              console.error("Failed to load course data", error);
          }
      };
      fetchCourseData();
  }, [selectedCourseId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // 3. Process Data for Charts
  const chartsData = useMemo(() => {
      if (!selectedCourse || !students.length) return null;

      // --- A. Student Performance Distribution (Pie Chart) ---
      const distribution = {
          distinction: 0, // >= 75%
          firstClass: 0,  // 60-74%
          secondClass: 0, // 50-59%
          pass: 0,        // 40-49%
          fail: 0         // < 40%
      };

      let courseMaxMarks = 0;
      const validTools = (selectedCourse.assessmentTools || []).filter(t => t.type !== 'Improvement Test');
      validTools.forEach(t => courseMaxMarks += t.maxMarks);

      students.forEach(student => {
          let totalObtained = 0;
          validTools.forEach(tool => {
              const record = marks.find(m => m.studentId === student.id && m.assessment === tool.name);
              let score = 0;
              if (record && record.scores) {
                  const validKeys = tool.type === 'Semester End Exam' ? ['External'] : Object.keys(tool.coDistribution || {});
                  score = validKeys.reduce((sum, key) => sum + (parseInt(record.scores[key]) || 0), 0);
              }
              totalObtained += score;
          });

          const percentage = courseMaxMarks > 0 ? (totalObtained / courseMaxMarks) * 100 : 0;

          if (percentage >= 75) distribution.distinction++;
          else if (percentage >= 60) distribution.firstClass++;
          else if (percentage >= 50) distribution.secondClass++;
          else if (percentage >= 40) distribution.pass++;
          else distribution.fail++;
      });

      const gradePieData = {
          labels: ['Distinction (>75%)', 'First Class (60-75%)', 'Second Class (50-60%)', 'Pass (40-50%)', 'Fail (<40%)'],
          datasets: [
              {
                  data: [
                      distribution.distinction, 
                      distribution.firstClass, 
                      distribution.secondClass, 
                      distribution.pass, 
                      distribution.fail
                  ],
                  backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'],
                  borderWidth: 1,
              }
          ]
      };

      // --- B. CO Attainment (Bar Chart - Target vs Attained) ---
      const coList = selectedCourse.cos || [];
      const coAttainmentValues = coList.map(co => {
          let totalCoScore = 0;
          let totalCoMax = 0;
          validTools.forEach(tool => {
              if (tool.coDistribution && tool.coDistribution[co.id]) {
                  const maxForCo = tool.coDistribution[co.id];
                  const toolMarks = marks.filter(m => m.assessment === tool.name);
                  toolMarks.forEach(m => {
                      totalCoScore += parseInt(m.scores?.[co.id]) || 0;
                      totalCoMax += maxForCo;
                  });
              }
          });
          return totalCoMax > 0 ? (totalCoScore / totalCoMax) * 100 : 0;
      });

      const coBarData = {
          labels: coList.map(c => c.id), // e.g. "CO1", "CO2"
          datasets: [
              {
                  label: 'Target Level',
                  data: coList.map(() => selectedCourse.settings?.targetThreshold || 60), // Gray Bar
                  backgroundColor: 'rgba(229, 231, 235, 1)', // gray-200
                  borderColor: 'rgba(209, 213, 219, 1)',
                  borderWidth: 1,
                  barPercentage: 0.6,
                  categoryPercentage: 0.8
              },
              {
                  label: 'Attained Level',
                  data: coAttainmentValues, // Blue Bar
                  backgroundColor: 'rgba(59, 130, 246, 0.9)', // blue-500
                  borderColor: 'rgba(37, 99, 235, 1)',
                  borderWidth: 1,
                  barPercentage: 0.6,
                  categoryPercentage: 0.8
              }
          ]
      };

      // --- C. PO Attainment (Mock Data) ---
      const poLabels = poAttainmentData.slice(0, 6).map(d => d.name);
      const poBarData = {
          labels: poLabels,
          datasets: [
              {
                  label: 'PO Attainment',
                  data: poAttainmentData.slice(0, 6).map(d => d.attained),
                  backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
                  borderRadius: 4,
              }
          ]
      };

      return { gradePieData, coBarData, poBarData };
  }, [selectedCourse, students, marks]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Course Reports & Analytics</h1>
      
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option>2023-2024</option>
        </select>
        <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option>Semester 3</option>
        </select>
        <select 
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={courses.length === 0}
        >
          {courses.length > 0 ? courses.map(course => (
            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
          )) : <option>No courses assigned</option>}
        </select>
      </div>
      
      {selectedCourse && chartsData ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 1. CO Attainment Bar Chart (Target vs Attained) */}
              <Card>
                <CardHeader>
                  <CardTitle>Course Outcome (CO) Attainment</CardTitle>
                  <CardDescription>Comparison of Target vs. Attained levels for each CO.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <Bar 
                        data={chartsData.coBarData} 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: { beginAtZero: true, max: 100, title: { display: true, text: 'Attainment %' } },
                                x: { grid: { display: false } }
                            },
                            plugins: {
                                legend: { position: 'top' }
                            }
                        }} 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Student Grade Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Grade Distribution</CardTitle>
                  <CardDescription>Overview of student performance based on overall percentage.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 flex justify-center">
                    <Pie 
                        data={chartsData.gradePieData} 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'right' }
                            }
                        }}
                    />
                  </div>
                </CardContent>
              </Card>
          </div>
          
          {/* 3. PO Attainment */}
          <Card>
            <CardHeader>
              <CardTitle>Program Outcome (PO) Attainment</CardTitle>
              <CardDescription>Contribution of {selectedCourse.code} to the overall Program Outcomes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                 <Bar 
                    data={chartsData.poBarData} 
                    options={{
                        indexAxis: 'y', // Horizontal Bar Chart
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { beginAtZero: true, max: 100 }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }} 
                />
              </div>
            </CardContent>
          </Card>
          
          {/* 4. Consolidated Evaluation Summary */}
          <Card>
              <CardHeader>
                  <CardTitle>Consolidated Evaluation</CardTitle>
                  <CardDescription>Final attainment scores combining direct and indirect assessments.</CardDescription>
              </CardHeader>
              <CardContent>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Attainment</dt>
                          <dd className="mt-1 text-2xl font-bold tracking-tight text-primary-600 dark:text-primary-400">{attainmentSummary.totalAttainment}%</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Direct Attainment (CIE+SEE)</dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{attainmentSummary.directAttainment}%</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Indirect Attainment (Survey)</dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{attainmentSummary.indirectAttainment}%</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Students Reached Target</dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{attainmentSummary.studentsReachedTarget} / {attainmentSummary.totalStudents}</dd>
                      </div>
                  </dl>
              </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <p>No courses assigned to you.</p>
              <p className="text-sm">Please select a course to view reports, or contact your admin.</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default AttainmentReportPage;
