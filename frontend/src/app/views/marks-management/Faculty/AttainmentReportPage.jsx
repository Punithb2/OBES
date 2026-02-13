import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Loader2, AlertCircle } from 'lucide-react';
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
  
  // Data States
  const [courses, setCourses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allMarks, setAllMarks] = useState([]);
  const [matrixMap, setMatrixMap] = useState({});
  const [pos, setPos] = useState([]);
  const [psos, setPsos] = useState([]);

  const [selectedCourseId, setSelectedCourseId] = useState('');

  // 1. Fetch All Required Data
  useEffect(() => {
    const fetchAllData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [coursesRes, studentsRes, marksRes, matrixRes, posRes, psosRes] = await Promise.all([
                api.get('/courses/'),
                api.get('/students/'),
                api.get('/marks/'),
                api.get('/articulation-matrix/'),
                api.get('/pos/'),
                api.get('/psos/')
            ]);

            setCourses(coursesRes.data);
            setAllStudents(studentsRes.data);
            setAllMarks(marksRes.data);
            setPos(posRes.data);
            setPsos(psosRes.data);

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
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };
    fetchAllData();
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

  // 3. Process Data for Analytics
  const analyticsData = useMemo(() => {
      if (!selectedCourseId || !selectedCourse) return null;

      // Filter Students & Marks
      const students = allStudents.filter(s => s.courses && s.courses.includes(selectedCourseId));
      const courseMarks = allMarks.filter(m => m.course === selectedCourseId);
      
      // Get Assessment Tools
      const tools = selectedCourse.assessment_tools || [];
      const seeTool = tools.find(t => t.type === 'Semester End Exam' || t.name === 'SEE');
      const internalTools = tools.filter(t => t !== seeTool && t.type !== 'Improvement Test');
      
      // Calculate Max Marks for Course
      let courseMaxMarks = 0;
      internalTools.forEach(t => courseMaxMarks += (t.maxMarks || 0));
      if (seeTool) courseMaxMarks += (seeTool.maxMarks || 0);

      // --- A. Grade Distribution ---
      const distribution = { distinction: 0, firstClass: 0, secondClass: 0, pass: 0, fail: 0 };
      
      students.forEach(student => {
          let totalObtained = 0;
          
          // Internal Marks
          internalTools.forEach(tool => {
              const record = courseMarks.find(m => m.student === student.id && m.assessment_name === tool.name);
              if (record && record.scores) {
                  // Sum all CO scores
                  totalObtained += Object.values(record.scores).reduce((a, b) => a + (parseInt(b)||0), 0);
              }
          });

          // SEE Marks
          if (seeTool) {
              const record = courseMarks.find(m => m.student === student.id && (m.assessment_name === seeTool.name || m.assessment_name === 'SEE'));
              if (record && record.scores) {
                  totalObtained += Object.values(record.scores).reduce((a, b) => a + (parseInt(b)||0), 0);
              }
          }

          const percentage = courseMaxMarks > 0 ? (totalObtained / courseMaxMarks) * 100 : 0;
          
          if (percentage >= 70) distribution.distinction++;
          else if (percentage >= 60) distribution.firstClass++;
          else if (percentage >= 50) distribution.secondClass++;
          else if (percentage >= 40) distribution.pass++;
          else distribution.fail++;
      });

      // --- B. CO Attainment Calculation ---
      const coList = selectedCourse.cos || [];
      const coStats = {}; 
      const totalStudents = students.length || 1;
      
      // Thresholds
      const targetLevel = 50; // Pass percentage
      const thresholds = [
           { threshold: 80, level: 3 },
           { threshold: 70, level: 2 },
           { threshold: 60, level: 1 },
           { threshold: 0, level: 0 },
      ];

      // 1. Calculate SEE Level (Course Wide)
      let seePassedCount = 0;
      if (seeTool) {
          students.forEach(student => {
              const record = courseMarks.find(m => m.student === student.id && (m.assessment_name === seeTool.name || m.assessment_name === 'SEE'));
              if (record && record.scores) {
                  const score = Object.values(record.scores).reduce((a, b) => a + (parseInt(b)||0), 0);
                  if (score >= (seeTool.maxMarks * targetLevel / 100)) seePassedCount++;
              }
          });
      }
      const seePercent = (seePassedCount / totalStudents) * 100;
      const seeLevel = thresholds.find(t => seePercent >= t.threshold)?.level || 0;

      // 2. Calculate CIE Level per CO
      coList.forEach(co => {
          // Safety check for CO ID
          if (!co || !co.id) return;

          let coTotalAttempts = 0;
          let coPassedAttempts = 0;

          internalTools.forEach(tool => {
              const coMax = parseInt(tool.coDistribution?.[co.id] || 0);
              if (coMax > 0) {
                  students.forEach(student => {
                      const record = courseMarks.find(m => m.student === student.id && m.assessment_name === tool.name);
                      const score = parseInt(record?.scores?.[co.id] || 0);
                      
                      coTotalAttempts++;
                      if (score >= (coMax * targetLevel / 100)) coPassedAttempts++;
                  });
              }
          });

          const ciePercent = coTotalAttempts > 0 ? (coPassedAttempts / coTotalAttempts) * 100 : 0;
          const cieLevel = thresholds.find(t => ciePercent >= t.threshold)?.level || 0;
          
          // Indirect Attainment (Survey)
          const indirectVal = parseFloat(selectedCourse.settings?.indirect_attainment?.[co.id] || 3);
          
          // Direct = (CIE + SEE) / 2
          const directVal = (cieLevel + seeLevel) / 2;
          
          // Final = 80% Direct + 20% Indirect
          const finalVal = (0.8 * directVal) + (0.2 * indirectVal);

          coStats[co.id] = {
              cieLevel,
              seeLevel,
              direct: directVal,
              indirect: indirectVal,
              final: finalVal,
              // Percentage for Chart (Scaled to 100)
              chartValue: (finalVal / 3) * 100 
          };
      });

      // --- C. PO Attainment Calculation ---
      const matrix = matrixMap[selectedCourseId] || {};
      const outcomes = [...pos, ...psos];
      const poAttainment = [];

      outcomes.forEach(outcome => {
          let weightedSum = 0;
          let weightCount = 0;

          coList.forEach(co => {
              if (!co || !co.id) return;
              const mapping = parseFloat(matrix[co.id]?.[outcome.id]);
              if (!isNaN(mapping)) {
                  // Actual PO = (Mapping * CO_Final_Level) / 3
                  const coLevel = coStats[co.id]?.final || 0;
                  const actual = (mapping * coLevel) / 3;
                  
                  weightedSum += actual;
                  weightCount++;
              }
          });

          const avgAttainment = weightCount > 0 ? (weightedSum / weightCount) : 0;
          if (weightCount > 0) {
              poAttainment.push({
                  id: outcome.id,
                  name: outcome.id, // e.g. PO1
                  attained: avgAttainment, // Scale 0-3
                  chartValue: (avgAttainment / 3) * 100 // Scale 0-100%
              });
          }
      });

      return { 
          distribution, 
          coStats, 
          coList, 
          poAttainment, 
          totalStudents: students.length,
          studentsReachedTarget: distribution.distinction + distribution.firstClass + distribution.secondClass // Approx metric
      };
  }, [selectedCourse, allStudents, allMarks, matrixMap, pos, psos]);

  // --- CHART DATA PREPARATION ---
  const chartConfig = useMemo(() => {
      if (!analyticsData) return null;

      // 1. Grade Pie
      const gradePieData = {
          labels: ['Distinction (>=70%)', 'First Class (60-70%)', 'Second Class (50-60%)', 'Pass (40-50%)', 'Fail (<40%)'],
          datasets: [{
              data: [
                  analyticsData.distribution.distinction, 
                  analyticsData.distribution.firstClass, 
                  analyticsData.distribution.secondClass, 
                  analyticsData.distribution.pass, 
                  analyticsData.distribution.fail
              ],
              backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'],
              borderWidth: 1,
          }]
      };

      // 2. CO Bar
      const coBarData = {
          // FIX: Added optional chaining and fallback to prevent crash if c.id is undefined
          labels: analyticsData.coList.map(c => (c?.id && c.id.includes('.')) ? c.id.split('.')[1] : (c?.id || 'Unknown')),
          datasets: [
              {
                  label: 'Target (3.0)',
                  data: analyticsData.coList.map(() => 100), // 100% represents Level 3
                  backgroundColor: 'rgba(229, 231, 235, 0.5)',
                  borderColor: 'rgba(209, 213, 219, 1)',
                  borderWidth: 1,
              },
              {
                  label: 'Attained %',
                  // FIX: Added optional chaining for c.id access
                  data: analyticsData.coList.map(c => (c?.id ? (analyticsData.coStats[c.id]?.chartValue || 0) : 0)),
                  backgroundColor: 'rgba(59, 130, 246, 0.9)',
                  borderColor: 'rgba(37, 99, 235, 1)',
                  borderWidth: 1,
              }
          ]
      };

      // 3. PO Bar
      const poBarData = {
          labels: analyticsData.poAttainment.map(p => p.id),
          datasets: [{
              label: 'PO Attainment (Target 3.0)',
              data: analyticsData.poAttainment.map(p => p.attained),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderRadius: 4,
          }]
      };

      return { gradePieData, coBarData, poBarData };
  }, [analyticsData]);


  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Course Analytics</h1>
        
        <select 
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="block mt-4 sm:mt-0 w-full sm:w-72 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {assignedCourses.map(course => (
            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
          ))}
          {assignedCourses.length === 0 && <option>No courses assigned</option>}
        </select>
      </div>
      
      {selectedCourse && analyticsData && chartConfig ? (
        <>
          {/* Summary Cards */}
           <Card>
              <CardContent className="pt-6">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
                      <div className="flex flex-col p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-blue-600 dark:text-blue-300">Total Students</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalStudents}</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-green-600 dark:text-green-300">Pass Percentage</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                            {analyticsData.totalStudents > 0 
                                ? (((analyticsData.totalStudents - analyticsData.distribution.fail)/analyticsData.totalStudents)*100).toFixed(1) 
                                : 0}%
                          </dd>
                      </div>
                      <div className="flex flex-col p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-purple-600 dark:text-purple-300">Distinctions</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.distribution.distinction}</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-orange-600 dark:text-orange-300">PO Attainment Avg</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                             {(analyticsData.poAttainment.reduce((a,b)=>a+b.attained,0) / (analyticsData.poAttainment.length||1)).toFixed(2)}
                          </dd>
                      </div>
                  </dl>
              </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 1. CO Attainment */}
              <Card>
                <CardHeader>
                  <CardTitle>CO Attainment (Target vs Actual)</CardTitle>
                  <CardDescription>Final attainment level percentage (Direct + Indirect).</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <Bar 
                        data={chartConfig.coBarData} 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: { beginAtZero: true, max: 100, title: { display: true, text: 'Attainment %' } },
                                x: { grid: { display: false } }
                            }
                        }} 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Grade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Grade Distribution</CardTitle>
                  <CardDescription>Performance breakdown based on total marks.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 flex justify-center">
                    <Pie 
                        data={chartConfig.gradePieData} 
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
          
          {/* 3. PO Attainment */}
          <Card>
            <CardHeader>
              <CardTitle>Program Outcome (PO) Attainment</CardTitle>
              <CardDescription>Attainment levels (Scale 0-3) for Program Outcomes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                 <Bar 
                    data={chartConfig.poBarData} 
                    options={{
                        indexAxis: 'y', // Horizontal
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { x: { beginAtZero: true, max: 3 } }
                    }} 
                />
              </div>
            </CardContent>
          </Card>
          
        </>
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
               <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
               <p>Select a course to view analytics.</p>
               <p className="text-sm">Ensure data is entered in Marks Entry and Articulation Matrix.</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default AttainmentReportPage;