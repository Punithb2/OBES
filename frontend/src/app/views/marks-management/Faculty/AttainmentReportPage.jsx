import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; // IMPORT ADDED HERE
import { Loader2, AlertCircle, Download } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import html2canvas from 'html2canvas'; 
import jsPDF from 'jspdf';             

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const AttainmentReportPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false); 
  
  // States
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  // Data from our new optimized API
  const [reportData, setReportData] = useState(null);
  const [gradeDistribution, setGradeDistribution] = useState(null);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  // 1. Fetch Assigned Courses
  useEffect(() => {
    const fetchCourses = async () => {
        if (!user) return;
        try {
            // RECURSIVE FETCH IMPLEMENTED HERE
            const coursesData = await fetchAllPages('/courses/');
            const assigned = Array.isArray(coursesData) 
                ? coursesData.filter(c => String(c.assigned_faculty) === String(user.id))
                : [];
            setCourses(assigned);
            
            if (assigned.length > 0) setSelectedCourseId(assigned[0].id);
        } catch (error) {
            console.error("Failed to load courses", error);
        }
    };
    fetchCourses();
  }, [user]);

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);

  // 2. Fetch Slimmed-Down Analytics Data
  useEffect(() => {
      if (!selectedCourseId) return;

      const fetchAnalytics = async () => {
          setLoading(true);
          setReportData(null);
          try {
              // A. Fetch the Heavy Math from the Backend RPC Endpoint
              const reportRes = await api.get(`/reports/course-attainment/${selectedCourseId}/`);
              setReportData(reportRes.data);

              // B. Fetch ONLY filtered marks for the Grade Distribution Pie Chart
              // RECURSIVE FETCH IMPLEMENTED HERE
              const [allStudents, marks] = await Promise.all([
                  fetchAllPages('/students/'), 
                  fetchAllPages(`/marks/?course=${selectedCourseId}`)
              ]);
              
              const courseStudents = Array.isArray(allStudents) 
                  ? allStudents.filter(s => s.courses && s.courses.includes(selectedCourseId))
                  : [];
              
              setTotalStudentsCount(courseStudents.length);

              calculateGrades(courseStudents, Array.isArray(marks) ? marks : []);

          } catch (error) {
              console.error("Failed to load analytics", error);
          } finally {
              setLoading(false);
          }
      };

      fetchAnalytics();
  }, [selectedCourseId]);

  // Calculate Simple Grade Distribution for Pie Chart
  const calculateGrades = (students, marks) => {
      if (!selectedCourse) return;
      
      const tools = selectedCourse.assessment_tools || [];
      let maxMarks = 0;
      tools.forEach(t => maxMarks += (t.maxMarks || 0));

      const dist = { distinction: 0, firstClass: 0, secondClass: 0, pass: 0, fail: 0 };

      students.forEach(student => {
          let obtained = 0;
          const studentMarks = marks.filter(m => m.student === student.id);
          
          studentMarks.forEach(record => {
              if (record.scores && !record.improvement_test_for) { 
                  obtained += Object.values(record.scores).reduce((a, b) => a + (parseInt(b)||0), 0);
              }
          });
          
          const percentage = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
          if (percentage >= 70) dist.distinction++;
          else if (percentage >= 60) dist.firstClass++;
          else if (percentage >= 50) dist.secondClass++;
          else if (percentage >= 40) dist.pass++;
          else dist.fail++;
      });
      setGradeDistribution(dist);
  };

  // 3. Map Backend Data to Charts
  const chartConfig = useMemo(() => {
      if (!reportData || !gradeDistribution) return null;

      const gradePieData = {
          labels: ['Distinction (>=70%)', 'First Class (60-70%)', 'Second Class (50-60%)', 'Pass (40-50%)', 'Fail (<40%)'],
          datasets: [{
              data: [
                  gradeDistribution.distinction, 
                  gradeDistribution.firstClass, 
                  gradeDistribution.secondClass, 
                  gradeDistribution.pass, 
                  gradeDistribution.fail
              ],
              backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'],
              borderWidth: 1,
          }]
      };

      const coBarData = {
          labels: reportData.co_attainment.map(co => co.co.includes('.') ? co.co.split('.')[1] : co.co),
          datasets: [
              {
                  label: 'Target (3.0)',
                  data: reportData.co_attainment.map(() => 100), 
                  backgroundColor: 'rgba(229, 231, 235, 0.5)',
                  borderColor: 'rgba(209, 213, 219, 1)',
                  borderWidth: 1,
              },
              {
                  label: 'Attained %',
                  data: reportData.co_attainment.map(co => (co.score_index / 3) * 100),
                  backgroundColor: 'rgba(59, 130, 246, 0.9)',
                  borderColor: 'rgba(37, 99, 235, 1)',
                  borderWidth: 1,
              }
          ]
      };

      const poBarData = {
          labels: reportData.po_attainment.map(p => p.po),
          datasets: [{
              label: 'PO Attainment (Target 3.0)',
              data: reportData.po_attainment.map(p => p.attained),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderRadius: 4,
          }]
      };

      return { gradePieData, coBarData, poBarData };
  }, [reportData, gradeDistribution]);

  // --- NEW: EXPORT TO PDF FUNCTION ---
  const handleExportToPDF = async () => {
    const element = document.getElementById('analytics-report'); 
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
        pdf.save(`${selectedCourse?.code || 'Course'}_Analytics_Report.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        setExporting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Course Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Visual attainment and grade distribution.</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <select 
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="block w-full sm:w-72 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={loading || exporting}
            >
            {courses.map(course => (
                <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
            ))}
            {courses.length === 0 && <option>No courses assigned</option>}
            </select>

            <button 
                onClick={handleExportToPDF}
                disabled={!selectedCourse || loading || exporting || !reportData}
                className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-50 whitespace-nowrap"
                title="Export Dashboard to PDF"
            >
                {exporting ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export PDF'}</span>
            </button>
        </div>
      </div>

      {loading ? (
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
          </div>
      ) : selectedCourse && reportData && chartConfig ? (
        
        <div id="analytics-report" className="space-y-6 bg-transparent dark:bg-gray-900 pb-4">
          
           <Card>
              <CardContent className="pt-6">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
                      <div className="flex flex-col p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-blue-600 dark:text-blue-300">Total Students</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalStudentsCount}</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-green-600 dark:text-green-300">Pass Percentage</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                            {totalStudentsCount > 0 
                                ? (((totalStudentsCount - gradeDistribution.fail) / totalStudentsCount) * 100).toFixed(1) 
                                : 0}%
                          </dd>
                      </div>
                      <div className="flex flex-col p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-purple-600 dark:text-purple-300">Distinctions</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{gradeDistribution.distinction}</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <dt className="text-sm font-medium text-orange-600 dark:text-orange-300">PO Attainment Avg</dt>
                          <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                             {reportData.po_attainment.length > 0
                                 ? (reportData.po_attainment.reduce((a, b) => a + b.attained, 0) / reportData.po_attainment.length).toFixed(2)
                                 : 0}
                          </dd>
                      </div>
                  </dl>
              </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        </div>
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