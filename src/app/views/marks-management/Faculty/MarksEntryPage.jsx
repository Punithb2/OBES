// src/app/views/marks-management/Faculty/MarksEntryPage.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Save, Pencil, Unlock, Check, Download, FileSpreadsheet, TrendingUp } from 'lucide-react';

// --- COMPARISON MODAL (Read Only - Override Removed) ---
const ComparisonModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const { student, originalMarks, improvementMarks, targetAssessmentName, config } = data;

    // Helper to sum scores based on config structure
    const calcTotal = (scores) => {
        return config.questions.reduce((acc, q) => acc + (parseInt(scores?.[q.q] || 0) || 0), 0);
    };

    const origTotal = calcTotal(originalMarks);
    const impTotal = calcTotal(improvementMarks);
    const isImpBetter = impTotal > origTotal;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Improvement Comparison</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{student.name} ({student.usn})</p>
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded mt-2 inline-block">
                        Improving: {targetAssessmentName}
                    </span>
                </div>

                <div className="p-5">
                    <div className="overflow-hidden border rounded-lg dark:border-gray-700">
                        <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Metric</th>
                                    <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-300">Original</th>
                                    <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20">Improvement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {config.questions.map(q => (
                                    <tr key={q.q}>
                                        <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{q.q}</td>
                                        <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                                            {originalMarks?.[q.q] ?? '-'}
                                        </td>
                                        <td className="px-4 py-2 text-center font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/10">
                                            {improvementMarks?.[q.q] ?? '-'}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 dark:bg-gray-700 font-bold border-t-2 border-gray-200 dark:border-gray-600">
                                    <td className="px-4 py-3">Total</td>
                                    <td className="px-4 py-3 text-center">{origTotal}</td>
                                    <td className={`px-4 py-3 text-center ${isImpBetter ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {impTotal}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};


const MarksEntryPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('');
  
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [currentStudents, setCurrentStudents] = useState([]); 
  const [marks, setMarks] = useState({}); 
  const [improvementMap, setImprovementMap] = useState({}); // { studentId: "Internal Assessment 1" }
  const [improvementMarksList, setImprovementMarksList] = useState([]); // Cache for all improvement marks
  const [marksMeta, setMarksMeta] = useState({});
  const [editableRows, setEditableRows] = useState({}); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Modals State
  const [comparisonData, setComparisonData] = useState(null); 

  const fileInputRef = useRef(null);

  // 1. Fetch Assigned Courses
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

  const selectedCourse = useMemo(() => 
    courses.find(c => c.id === selectedCourseId), 
  [courses, selectedCourseId]);

  const assessmentOptions = useMemo(() => {
      return selectedCourse?.assessmentTools || [];
  }, [selectedCourse]);

  // Options for the dropdown inside the Improvement Test table
  const internalAssessmentOptions = useMemo(() => {
      return assessmentOptions.filter(t => t.type === 'Internal Assessment').map(t => t.name);
  }, [assessmentOptions]);

  useEffect(() => {
      if (assessmentOptions.length > 0) {
          setSelectedAssessmentName(assessmentOptions[0].name);
      } else {
          setSelectedAssessmentName('');
      }
      handleSelectionChange();
  }, [selectedCourseId, assessmentOptions]);

  const currentToolConfig = useMemo(() => {
      const tool = assessmentOptions.find(t => t.name === selectedAssessmentName);
      if (!tool) return null;

      const isSEE = tool.type === 'Semester End Exam' || tool.name === 'Semester End Exam';
      const isActivity = tool.type === 'Activity' || tool.name.startsWith('Activity');
      const isImprovement = tool.type === 'Improvement Test';

      let config = {
          total: tool.maxMarks || 0,
          isExternal: false,
          isImprovement: isImprovement,
          questions: []
      };

      if (isSEE) {
          config.isExternal = true;
          config.questions = [{ q: 'External', co: '', max: tool.maxMarks || 100 }];
      } else if (isActivity) {
          config.questions = [{ q: 'Score', co: '-', max: tool.maxMarks || 0 }];
      } else if (!isImprovement) {
          // Standard Internal Assessment columns
          config.questions = Object.entries(tool.coDistribution || {}).map(([coId, marks]) => ({
              q: coId,
              co: coId,
              max: parseInt(marks) || 0
          }));
      }
      // Note: If isImprovement is true, questions are generated dynamically per row

      return config;
  }, [assessmentOptions, selectedAssessmentName]);

  // Helper to get config for a specific internal assessment (used in Improvement table)
  const getInternalConfig = (assessmentName) => {
      const tool = assessmentOptions.find(t => t.name === assessmentName);
      if (!tool) return { questions: [], total: 0 };
      
      const questions = Object.entries(tool.coDistribution || {}).map(([coId, marks]) => ({
          q: coId,
          co: coId,
          max: parseInt(marks) || 0
      }));
      return { questions, total: tool.maxMarks || 0 };
  };

  const handleSelectionChange = () => {
      setIsTableVisible(false);
      setCurrentStudents([]);
      setMarks({});
      setImprovementMap({});
      setMarksMeta({});
      setEditableRows({});
      setShowSuccess(false);
      setComparisonData(null);
  };

  // 2. Fetch Students & Existing Marks
  const handleLoadStudents = async () => {
    if (!selectedCourseId || !selectedAssessmentName || !currentToolConfig) return;
    setLoading(true);
    try {
        const studentsRes = await api.get(`/students?courseId=${selectedCourseId}`);
        const students = studentsRes.data;
        setCurrentStudents(students);

        const marksRes = await api.get(`/marks?courseId=${selectedCourseId}&assessment=${selectedAssessmentName}`);
        const existingMarks = marksRes.data;

        // --- NEW: If this is a STANDARD test, check if any IMPROVEMENT test exists for this course ---
        if (!currentToolConfig.isImprovement) {
            const improvementTool = assessmentOptions.find(t => t.type === 'Improvement Test');
            if (improvementTool) {
                // Fetch ALL marks for the improvement test to check later if a student took it for THIS assessment
                const impMarksRes = await api.get(`/marks?courseId=${selectedCourseId}&assessment=${improvementTool.name}`);
                setImprovementMarksList(impMarksRes.data);
            } else {
                setImprovementMarksList([]);
            }
        }

        const initialMarks = {};
        const initialMeta = {};
        const initialMap = {};
        const initialEditable = {};

        existingMarks.forEach(record => {
            initialMarks[record.studentId] = record.scores || {};
            initialMeta[record.studentId] = record;
            if (record.improvementTarget) {
                initialMap[record.studentId] = record.improvementTarget;
            }
        });

        // Initialize empty rows logic
        students.forEach(student => {
             if (!initialMarks[student.id]) {
                 initialMarks[student.id] = {};
                 initialEditable[student.id] = true;
             }
        });

        setMarks(initialMarks);
        setImprovementMap(initialMap);
        setMarksMeta(initialMeta);
        setEditableRows(initialEditable);
        setIsTableVisible(true);

    } catch (error) {
        console.error("Failed to load data", error);
        alert("Error loading data.");
    } finally {
        setLoading(false);
    }
  };

  // --- Handlers ---
  
  const handleImprovementTargetChange = (studentId, targetName) => {
      setImprovementMap(prev => ({ ...prev, [studentId]: targetName }));
      // Clear existing marks for this student if target changes or is set to empty
      setMarks(prev => {
          const newMarks = { ...prev };
          delete newMarks[studentId]; // Reset marks
          return newMarks;
      });
  };

  const openComparisonModal = (student) => {
      // Find the specific improvement record for this student AND this target assessment
      const impRecord = improvementMarksList.find(r => 
          r.studentId === student.id && 
          r.improvementTarget === selectedAssessmentName
      );

      if (impRecord) {
           setComparisonData({
               student,
               originalMarks: marks[student.id] || {},
               improvementMarks: impRecord.scores || {},
               targetAssessmentName: selectedAssessmentName,
               config: currentToolConfig
           });
      }
  };

  const handleMarksChange = (studentId, questionIdentifier, value, dynamicConfig = null) => {
    const config = dynamicConfig || currentToolConfig;
    const newMarks = JSON.parse(JSON.stringify(marks));
    const max = config.questions.find(q => q.q === questionIdentifier)?.max || config.total;
    
    if (value === '') {
        delete newMarks[studentId][questionIdentifier];
    } else {
        let numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            numValue = Math.max(0, Math.min(numValue, max));
            if (!newMarks[studentId]) newMarks[studentId] = {};
            newMarks[studentId][questionIdentifier] = numValue;
        }
    }
    setMarks(newMarks);
  };

  const calculateTotal = (studentId, dynamicConfig = null) => {
      const studentMarks = marks[studentId];
      if (!studentMarks) return 0;
      let total = 0;
      const config = dynamicConfig || currentToolConfig;
      if (config?.questions) {
          config.questions.forEach(q => {
              total += Number(studentMarks[q.q]) || 0;
          });
      }
      return total;
  };

  const toggleEditRow = (studentId) => {
    setEditableRows(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
        const promises = currentStudents.map(async (student) => {
            const scores = marks[student.id];
            
            // IMPROVEMENT LOGIC: 
            // If it's an improvement test but "Not Writing" is selected, delete any existing record
            if (currentToolConfig.isImprovement) {
                const target = improvementMap[student.id];
                const existing = marksMeta[student.id];

                if (!target) {
                    // Selected "Not Writing" -> Delete if exists
                    if (existing) {
                        await api.delete(`/marks/${existing.id}`);
                    }
                    return; // Skip saving
                }
            }
            
            // Standard check: only save if there are scores or it's a valid improvement mapping
            if (!scores || (Object.keys(scores).length === 0 && !currentToolConfig.isImprovement)) return; 

            const existingRecord = marksMeta[student.id];
            
            const payload = {
                studentId: student.id,
                courseId: selectedCourseId,
                assessment: selectedAssessmentName,
                scores: scores || {},
                // Only save mapping for improvement tests
                improvementTarget: currentToolConfig.isImprovement ? improvementMap[student.id] : undefined 
            };

            if (existingRecord) {
                await api.patch(`/marks/${existingRecord.id}`, payload);
            } else {
                const newId = `M_${selectedCourseId}_${student.id}_${selectedAssessmentName.replace(/\s/g, '')}`;
                await api.post('/marks', { ...payload, id: newId });
            }
        });

        await Promise.all(promises);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        handleLoadStudents(); 
    } catch (error) {
        console.error("Save failed", error);
        alert("Failed to save marks.");
    } finally {
        setLoading(false);
    }
  };

  // --- CSV Handlers ---
  const handleDownloadTemplate = () => {
     if (!currentStudents.length) return;
     
     // Template for Improvement tests is generic since columns vary
     if (currentToolConfig.isImprovement) {
         alert("For Improvement Tests, please enter marks manually or ensure the CSV matches the selected target columns.");
         return;
     }

     const headers = ['USN', 'Name'];
     currentToolConfig.questions.forEach(q => headers.push(`${q.q} (${q.max})`));
     const rows = currentStudents.map(student => {
        const row = [student.usn, student.name];
        currentToolConfig.questions.forEach(q => {
            row.push(marks[student.id]?.[q.q] || '');
        });
        return row.join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedCourse.code}_${selectedAssessmentName}_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = (event) => {
    // ... existing CSV logic, skipping for brevity as it remains mostly same 
    // but should respect the current logic of marks
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        rows.shift();
        const newMarks = { ...marks };
        let updatedCount = 0;
        rows.forEach(row => {
            if (row.length < 3) return;
            const usn = row[0].trim();
            const student = currentStudents.find(s => s.usn === usn);
            if (student) {
                if (currentToolConfig.isImprovement && !improvementMap[student.id]) return; // Skip if Not Writing
                if (!newMarks[student.id]) newMarks[student.id] = {};
                
                // Note: This works for standard tests. For improvement, CSV is tricky due to dynamic cols.
                // Assuming standard test upload:
                if (!currentToolConfig.isImprovement) {
                    currentToolConfig.questions.forEach((q, idx) => {
                        const val = parseInt(row[idx + 2]); 
                        if (!isNaN(val) && val <= q.max) {
                            newMarks[student.id][q.q] = val;
                            updatedCount++;
                        }
                    });
                }
            }
        });
        setMarks(newMarks);
        alert(`Successfully updated marks for ${updatedCount} entries.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 relative">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-5 duration-300">
            <div className="bg-white dark:bg-gray-800 border-l-4 border-green-500 shadow-lg rounded-r-lg flex items-center p-4 min-w-[300px]">
                <Check className="h-6 w-6 text-green-500 mr-3" />
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Success</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Marks saved successfully!</p>
                </div>
            </div>
        </div>
      )}

      <ComparisonModal 
        isOpen={!!comparisonData}
        onClose={() => setComparisonData(null)}
        data={comparisonData}
      />

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Marks Entry</h1>
        
        {isTableVisible && (
             <button
                onClick={handleSaveChanges}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
                {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save All</>}
            </button>
        )}
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course and Assessment</CardTitle>
          <CardDescription>Choose the course and assessment for which you want to enter marks.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
               <div className="sm:col-span-1">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                 <select 
                    value={selectedCourseId}
                    onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={courses.length === 0}
                >
                    {courses.length > 0 ? courses.map(course => (
                      <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    )) : <option>No courses assigned</option>}
                  </select>
               </div>
               <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment</label>
                 <select 
                    value={selectedAssessmentName}
                    onChange={(e) => {
                        setSelectedAssessmentName(e.target.value);
                        handleSelectionChange();
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={assessmentOptions.length === 0}
                >
                     {assessmentOptions.length > 0 ? (
                         assessmentOptions.map(tool => <option key={tool.id} value={tool.name}>{tool.name}</option>)
                     ) : (
                         <option>No assessments configured</option>
                     )}
                  </select>
               </div>
               
               <div className="sm:col-span-1 flex flex-col gap-3">
                 <button 
                    onClick={handleLoadStudents}
                    className="w-full justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!selectedCourseId || !selectedAssessmentName || loading}
                >
                    {loading ? 'Loading...' : 'Load Student List'}
                </button>

                 {isTableVisible && (
                     <div className="flex gap-2">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" />
                        <button onClick={handleDownloadTemplate} className="flex-1 flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700" title="Download CSV Template">
                            <Download className="w-3 h-3 mr-2" /> Template
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium shadow-sm transition-colors" title="Upload Filled CSV">
                            <FileSpreadsheet className="w-3 h-3 mr-2" /> Upload
                        </button>
                     </div>
                 )}
               </div>
            </div>
        </CardContent>
      </Card>

      {/* Marks Table */}
      {isTableVisible && selectedCourse && currentToolConfig && (
        <Card className="mt-6">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{selectedCourse.code} - {selectedCourse.name}</CardTitle>
                        <CardDescription>Entering marks for: <span className="font-semibold text-primary-600 dark:text-primary-400">{selectedAssessmentName}</span></CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">USN</th>
                      <th scope="col" className="sticky left-40 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">Student Name</th>
                      
                      {currentToolConfig.isImprovement ? (
                          <>
                           <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600 w-48">Improvement For</th>
                           <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Marks</th>
                          </>
                      ) : (
                          currentToolConfig.questions.map(q => (
                             <th key={q.q} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                               {q.q} <span className="font-normal normal-case">[{q.max}M]</span>
                             </th>
                          ))
                      )}

                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                        Total {currentToolConfig.isImprovement ? '' : <span className="font-normal normal-case">[{currentToolConfig.total}]</span>}
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentStudents.map(student => {
                      const isEditing = editableRows[student.id];
                      
                      // --- IMPROVEMENT TEST ROW LOGIC ---
                      if (currentToolConfig.isImprovement) {
                          const targetAssessment = improvementMap[student.id];
                          const isNotWriting = !targetAssessment;
                          
                          // If target selected, get its config for columns
                          const dynamicConfig = targetAssessment ? getInternalConfig(targetAssessment) : null;
                          const total = dynamicConfig ? calculateTotal(student.id, dynamicConfig) : 0;

                          return (
                            <tr key={student.id} className={isEditing ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                                <td className="sticky left-0 bg-inherit px-4 py-4 text-sm font-mono text-gray-700 dark:text-gray-300 border-r dark:border-gray-600">{student.usn}</td>
                                <td className="sticky left-40 bg-inherit px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600">{student.name}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-center text-sm border-r dark:border-gray-600">
                                    <select
                                        disabled={!isEditing}
                                        value={targetAssessment || ''}
                                        onChange={(e) => handleImprovementTargetChange(student.id, e.target.value)}
                                        className="w-full text-xs p-1.5 border rounded-md disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Not Writing</option>
                                        {internalAssessmentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-center text-sm">
                                    {isNotWriting ? (
                                        <span className="text-gray-400 italic text-xs">-- Not Writing --</span>
                                    ) : dynamicConfig ? (
                                        <div className="flex gap-2 justify-center">
                                            {dynamicConfig.questions.map(q => (
                                                <div key={q.q} className="flex flex-col items-center">
                                                    <span className="text-[9px] text-gray-500 uppercase font-medium">{q.co}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        disabled={!isEditing}
                                                        max={q.max}
                                                        value={marks[student.id]?.[q.q] ?? ''}
                                                        onChange={e => handleMarksChange(student.id, q.q, e.target.value, dynamicConfig)}
                                                        className="w-12 h-8 text-center border rounded-md disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 transition-colors text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </td>
                                <td className="px-4 py-4 text-center font-bold text-gray-800 dark:text-gray-100 border-l dark:border-gray-600">
                                    {isNotWriting ? '-' : total}
                                </td>
                                <td className="px-4 py-4 text-center border-l dark:border-gray-600">
                                    <button onClick={() => toggleEditRow(student.id)} className={`p-2 rounded-md transition-colors ${isEditing ? "text-green-600 hover:bg-green-50" : "text-gray-500 hover:bg-gray-100"}`}>
                                        {isEditing ? <Unlock className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                    </button>
                                </td>
                            </tr>
                          );
                      }

                      // --- STANDARD ASSESSMENT ROW LOGIC ---
                      // Check for improvement
                      const impMarkRecord = improvementMarksList.find(r => 
                          r.studentId === student.id && 
                          r.improvementTarget === selectedAssessmentName
                      );
                      const hasImprovement = !!impMarkRecord;
                      
                      return (
                        <tr key={student.id} className={isEditing ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                          <td className="sticky left-0 bg-inherit px-4 py-4 text-sm font-mono text-gray-700 dark:text-gray-300 border-r dark:border-gray-600">{student.usn}</td>
                          <td className="sticky left-40 bg-inherit px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600">{student.name}</td>
                          
                          {currentToolConfig.questions.map(q => (
                              <td key={`${student.id}-${q.q}`} className="px-3 py-2 whitespace-nowrap text-center text-sm">
                                  <input
                                  type="number"
                                  min="0"
                                  disabled={!isEditing}
                                  max={q.max}
                                  value={marks[student.id]?.[q.q] ?? ''}
                                  onChange={e => handleMarksChange(student.id, q.q, e.target.value)}
                                  className="w-16 h-10 text-center border rounded-md disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                  />
                              </td>
                          ))}

                          <td className="px-4 py-4 text-center font-bold text-gray-800 dark:text-gray-100 border-l dark:border-gray-600">
                            {calculateTotal(student.id)}
                          </td>

                          {/* ACTIONS */}
                          <td className="px-4 py-4 text-center border-l dark:border-gray-600">
                            <div className="flex justify-center gap-2">
                                {/* Only show compare button if Improvement Exists for this specific assessment */}
                                {hasImprovement && (
                                    <button
                                        onClick={() => openComparisonModal(student)}
                                        className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-mdBS transition-colors"
                                        title="View Improvement Comparison"
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleEditRow(student.id)}
                                    className={`p-2 rounded-md transition-colors ${
                                        isEditing 
                                        ? "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30" 
                                        : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                    }`}
                                    title={isEditing ? "Finish Editing" : "Edit Marks"}
                                >
                                    {isEditing ? <Unlock className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarksEntryPage;