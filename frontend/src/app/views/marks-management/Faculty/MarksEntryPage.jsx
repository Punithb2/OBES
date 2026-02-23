import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api, { fetchAllPages } from '../../../services/api'; 
import { Save, Pencil, Lock, Unlock, Check, Download, FileSpreadsheet, TrendingUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- COMPARISON MODAL ---
const ComparisonModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const { student, originalMarks, improvementMarks, targetAssessmentName, config } = data;

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

// --- MAIN COMPONENT ---
const MarksEntryPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('');
  
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [currentStudents, setCurrentStudents] = useState([]); 
  const [marks, setMarks] = useState({}); 
  const [improvementMap, setImprovementMap] = useState({});
  const [improvementMarksList, setImprovementMarksList] = useState([]);
  const [marksMeta, setMarksMeta] = useState({});
  const [editableRows, setEditableRows] = useState({}); 
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null); 
  const fileInputRef = useRef(null);

  // Auto-Save States
  const [saveStatus, setSaveStatus] = useState('saved'); 
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 1. Fetch Assigned Courses
  useEffect(() => {
    const fetchCourses = async () => {
        if (!user) return;
        try {
            const coursesData = await fetchAllPages(`/courses/`);
            const myCourses = coursesData.filter(c => String(c.assigned_faculty) === String(user.id));
            setCourses(myCourses);
            
            if (myCourses.length > 0) {
                setSelectedCourseId(myCourses[0].id);
            }
        } catch (error) {
            console.error("Failed to load courses", error);
        }
    };
    fetchCourses();
  }, [user]);

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
  const assessmentOptions = useMemo(() => selectedCourse?.assessment_tools || [], [selectedCourse]);
  const internalAssessmentOptions = useMemo(() => assessmentOptions.filter(t => t.type === 'Internal Assessment').map(t => t.name), [assessmentOptions]);

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

      const isSEE = tool.type === 'Semester End Exam' || tool.name === 'SEE' || tool.name === 'Semester End Exam';
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
          config.questions = Object.entries(tool.coDistribution || {}).map(([coId, marks]) => ({
              q: coId, co: coId, max: parseInt(marks) || 0
          }));
      }

      return config;
  }, [assessmentOptions, selectedAssessmentName]);

  const getInternalConfig = (assessmentName) => {
      const tool = assessmentOptions.find(t => t.name === assessmentName);
      if (!tool) return { questions: [], total: 0 };
      
      const questions = Object.entries(tool.coDistribution || {}).map(([coId, marks]) => ({
          q: coId, co: coId, max: parseInt(marks) || 0
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
      setComparisonData(null);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
  };

  // 2. Fetch Targeted Students & Targeted Marks Only
  const handleLoadStudents = async (silent = false) => {
    if (!selectedCourseId || !selectedAssessmentName || !currentToolConfig) return;
    if (!silent) setLoading(true);
    
    try {
        const allStudents = await fetchAllPages(`/students/`);
        const students = allStudents.filter(s => s.courses && s.courses.includes(selectedCourseId));
        setCurrentStudents(students);

        const allMarks = await fetchAllPages(`/marks/?course=${selectedCourseId}`);
        const existingMarks = allMarks.filter(m => m.assessment_name === selectedAssessmentName);

        if (!currentToolConfig.isImprovement) {
            const improvementTool = assessmentOptions.find(t => t.type === 'Improvement Test');
            if (improvementTool) {
                const impMarks = allMarks.filter(m => 
                    m.assessment_name === improvementTool.name &&
                    m.improvement_test_for === selectedAssessmentName 
                );
                setImprovementMarksList(impMarks);
            } else {
                setImprovementMarksList([]);
            }
        }

        const initialMarks = {};
        const initialMeta = {};
        const initialMap = {};
        const initialEditable = {};

        existingMarks.forEach(record => {
            initialMarks[record.student] = record.scores || {};
            initialMeta[record.student] = record;
            if (record.improvement_test_for) initialMap[record.student] = record.improvement_test_for;
        });

        students.forEach(student => {
             // If a student doesn't have marks in the DB yet, open their row for editing by default
             if (!initialMarks[student.id] || Object.keys(initialMarks[student.id]).length === 0) {
                 initialMarks[student.id] = {};
                 initialEditable[student.id] = true;
             }
        });

        setMarks(initialMarks);
        setImprovementMap(initialMap);
        setMarksMeta(initialMeta);
        
        if (!silent) {
            setEditableRows(initialEditable);
            setIsTableVisible(true);
        }

    } catch (error) {
        console.error("Failed to load data", error);
        if (!silent) toast.error("Error loading student data.");
    } finally {
        if (!silent) setLoading(false);
    }
  };

  // --- FEATURE 1: AUTO-SAVE DEBOUNCE ---
  useEffect(() => {
      if (!hasUnsavedChanges) return;

      const delayDebounceFn = setTimeout(() => {
          handleSaveChanges(true); // Trigger a silent save
      }, 2000); 

      return () => clearTimeout(delayDebounceFn);
  }, [marks, improvementMap, hasUnsavedChanges]);

  // --- FEATURE 2: SMART KEYBOARD NAVIGATION ---
  const handleKeyDown = (e, rowIndex, colIndex) => {
      let nextInputId = null;

      if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          nextInputId = `mark-${rowIndex + 1}-${colIndex}`; 
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          nextInputId = `mark-${rowIndex - 1}-${colIndex}`; 
      } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextInputId = `mark-${rowIndex}-${colIndex + 1}`; 
      } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nextInputId = `mark-${rowIndex}-${colIndex - 1}`; 
      }

      if (nextInputId) {
          const nextInput = document.getElementById(nextInputId);
          if (nextInput && !nextInput.disabled) {
              nextInput.focus();
              nextInput.select();
          }
      }
  };

  const handleImprovementTargetChange = (studentId, targetName) => {
      setImprovementMap(prev => ({ ...prev, [studentId]: targetName }));
      setMarks(prev => ({ ...prev, [studentId]: {} }));
      setHasUnsavedChanges(true); // Trigger Auto-save
  };

  // --- RESTORED: OPEN COMPARISON MODAL ---
  const openComparisonModal = (student) => {
      const impRecord = improvementMarksList.find(r => r.student === student.id);
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

  // --- FEATURE 3: REAL TIME VALIDATION ---
  const handleMarksChange = (studentId, questionIdentifier, value, dynamicConfig = null) => {
    const newMarks = JSON.parse(JSON.stringify(marks));
    
    if (value === '') {
        if (newMarks[studentId]) delete newMarks[studentId][questionIdentifier];
    } else {
        let numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            if (!newMarks[studentId]) newMarks[studentId] = {};
            newMarks[studentId][questionIdentifier] = numValue;
        }
    }
    
    setMarks(newMarks);
    setHasUnsavedChanges(true); // Trigger Auto-save
  };

  const calculateTotal = (studentId, dynamicConfig = null) => {
      const studentMarks = marks[studentId];
      if (!studentMarks) return 0;
      let total = 0;
      const config = dynamicConfig || currentToolConfig;
      if (config?.questions) {
          config.questions.forEach(q => {
              if (!q.q.startsWith('_')) total += Number(studentMarks[q.q]) || 0;
          });
      }
      return total;
  };

  const toggleEditRow = (studentId) => {
    setEditableRows(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  // Upgraded Save Function
  const handleSaveChanges = async (silent = false) => {
    if (!silent) setLoading(true);
    else setSaveStatus('saving');

    try {
        const promises = currentStudents.map(async (student) => {
            let scores = { ...marks[student.id] };
            let improvementFor = null;
            
            if (currentToolConfig.isImprovement) {
                improvementFor = improvementMap[student.id];
                const existing = marksMeta[student.id];
                if (!improvementFor) {
                    if (existing) await api.delete(`/marks/${existing.id}/`);
                    return; 
                }
            }
            
            const cleanScores = {};
            Object.keys(scores).forEach(key => {
                if (scores[key] !== undefined && scores[key] !== null && scores[key] !== '') {
                    cleanScores[key] = scores[key];
                }
            });

            if (Object.keys(cleanScores).length === 0 && !currentToolConfig.isImprovement) return; 

            const existingRecord = marksMeta[student.id];
            const payload = {
                student: student.id,
                course: selectedCourseId,
                assessment_name: selectedAssessmentName,
                scores: cleanScores,
                improvement_test_for: improvementFor
            };

            const customId = `M_${selectedCourseId}_${student.id}_${selectedAssessmentName.replace(/[^a-zA-Z0-9]/g, '')}`;

            if (existingRecord) {
                await api.patch(`/marks/${existingRecord.id}/`, payload);
            } else {
                await api.post('/marks/', { ...payload, id: customId });
            }
        });

        await Promise.all(promises);
        
        setSaveStatus('saved');
        setHasUnsavedChanges(false);

        // Lock rows on manual save
        if (!silent) {
            toast.success("Marks saved successfully!");
            setEditableRows({}); 
        }
        
        handleLoadStudents(true); 
    } catch (error) {
        console.error("Save failed", error);
        if (!silent) toast.error("Failed to save marks. Check connection.");
        setSaveStatus('error');
    } finally {
        if (!silent) setLoading(false);
    }
  };

  // --- RESTORED: DOWNLOAD TEMPLATE ---
  const handleDownloadTemplate = () => { 
      if (!currentStudents.length) return;
      if (currentToolConfig.isImprovement) {
          toast.error("For Improvement Tests, please enter marks manually.");
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
      link.setAttribute("download", `${selectedCourse?.code || 'Course'}_${selectedAssessmentName}_Template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const handleBulkUpload = (event) => {
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
                if (currentToolConfig.isImprovement && !improvementMap[student.id]) return; 
                if (!newMarks[student.id]) newMarks[student.id] = {};
                
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
        setHasUnsavedChanges(true); // Trigger auto-save on bulk upload
        toast.success(`Successfully updated marks for ${updatedCount} entries.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  // Status UI Element
  const renderSaveStatus = () => {
    if (!isTableVisible) return null;
    if (saveStatus === 'saving') return <span className="flex items-center text-yellow-600 dark:text-yellow-500 text-sm font-bold bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-md"><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Auto-saving...</span>;
    if (saveStatus === 'error') return <span className="flex items-center text-red-600 dark:text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-md"><AlertCircle className="w-4 h-4 mr-1.5" /> Error Saving</span>;
    return <span className="flex items-center text-green-600 dark:text-green-500 text-sm font-bold bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-md"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Saved</span>;
  };

  return (
    <div className="space-y-6 relative">
      <ComparisonModal isOpen={!!comparisonData} onClose={() => setComparisonData(null)} data={comparisonData} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Marks Entry</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Enter marks manually or use keyboard arrows to navigate.</p>
        </div>
        
        {/* ASSURANCE BUTTON & INDICATOR */}
        <div className="flex items-center gap-3">
            {renderSaveStatus()}
            
            {isTableVisible && (
                <button
                    onClick={() => handleSaveChanges(false)}
                    disabled={loading || saveStatus === 'saving'}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                    {loading || saveStatus === 'saving' ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save All</>
                    )}
                </button>
            )}
        </div>
      </div>

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
                    onChange={(e) => setSelectedCourseId(e.target.value)}
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
                         assessmentOptions.map(tool => <option key={tool.name} value={tool.name}>{tool.name}</option>)
                     ) : (
                         <option>No assessments configured</option>
                     )}
                  </select>
               </div>
               
               <div className="sm:col-span-1 flex flex-col gap-3">
                 <button 
                    onClick={() => handleLoadStudents(false)}
                    className="w-full justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={!selectedCourseId || !selectedAssessmentName || loading}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
            <CardContent className="p-0">
              <div className="overflow-y-auto max-h-[65vh] custom-scrollbar border rounded-lg dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="sticky top-0 left-0 z-30 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600 shadow-sm w-32">USN</th>
                      <th scope="col" className="sticky top-0 left-32 z-30 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600 shadow-sm">Student Name</th>
                      
                      {currentToolConfig.isImprovement ? (
                          <>
                           <th scope="col" className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600 w-48 shadow-sm">Improvement For</th>
                           <th scope="col" className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider shadow-sm">Marks</th>
                          </>
                      ) : (
                          currentToolConfig.questions.map(q => (
                             <th key={q.q} scope="col" className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider shadow-sm">
                               {q.q} <span className="font-normal normal-case">[{q.max}M]</span>
                             </th>
                          ))
                      )}

                      <th scope="col" className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600 shadow-sm">
                        Total {currentToolConfig.isImprovement ? '' : <span className="font-normal normal-case">[{currentToolConfig.total}]</span>}
                      </th>
                      <th scope="col" className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600 shadow-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentStudents.map((student, rowIndex) => {
                      const isEditing = editableRows[student.id];
                      
                      if (currentToolConfig.isImprovement) {
                          const targetAssessment = improvementMap[student.id];
                          const isNotWriting = !targetAssessment;
                          
                          const dynamicConfig = targetAssessment ? getInternalConfig(targetAssessment) : null;
                          const total = dynamicConfig ? calculateTotal(student.id, dynamicConfig) : 0;

                          return (
                            <tr key={student.id} className={isEditing ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}>
                                <td className="sticky left-0 bg-white dark:bg-gray-900 px-4 py-4 text-sm font-mono text-gray-700 dark:text-gray-300 border-r dark:border-gray-600 z-10">{student.usn}</td>
                                <td className="sticky left-32 bg-white dark:bg-gray-900 px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600 z-10">{student.name}</td>
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
                                            {dynamicConfig.questions.map((q, colIndex) => {
                                                const currentValue = marks[student.id]?.[q.q] ?? '';
                                                const isInvalid = currentValue !== '' && currentValue > q.max;
                                                
                                                return (
                                                <div key={q.q} className="flex flex-col items-center relative group">
                                                    <span className="text-[9px] text-gray-500 uppercase font-medium">{q.co}</span>
                                                    <input
                                                        id={`mark-${rowIndex}-${colIndex}`}
                                                        type="number"
                                                        min="0"
                                                        disabled={!isEditing}
                                                        value={currentValue}
                                                        onChange={e => handleMarksChange(student.id, q.q, e.target.value, dynamicConfig)}
                                                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                                        className={`w-14 h-8 text-center border rounded-md focus:outline-none focus:ring-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors
                                                            ${isInvalid 
                                                                ? 'border-red-500 bg-red-50 text-red-600 focus:border-red-500 focus:ring-red-500 dark:bg-red-900/20' 
                                                                : 'dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:border-primary-500 focus:ring-primary-500'
                                                            }
                                                        `}
                                                    />
                                                    {isInvalid && (
                                                        <div className="absolute z-40 bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block w-max bg-red-600 text-white text-[10px] font-bold py-1 px-2 rounded shadow-md">
                                                            Max {q.max}
                                                        </div>
                                                    )}
                                                </div>
                                            )})}
                                        </div>
                                    ) : null}
                                </td>
                                <td className="px-4 py-4 text-center font-bold text-gray-800 dark:text-gray-100 border-l dark:border-gray-600">
                                    {isNotWriting ? '-' : total}
                                </td>
                                <td className="px-4 py-4 text-center border-l dark:border-gray-600">
                                    <button 
                                        onClick={() => toggleEditRow(student.id)} 
                                        className={`p-2 rounded-md transition-colors ${
                                            isEditing 
                                            ? "text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30" 
                                            : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
                                        }`}
                                        title={isEditing ? "Click to lock row" : "Click to edit"}
                                    >
                                        {isEditing ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    </button>
                                </td>
                            </tr>
                          );
                      }

                      const impMarkRecord = improvementMarksList.find(r => r.student === student.id);
                      const hasImprovement = !!impMarkRecord;
                      
                      return (
                        <tr key={student.id} className={isEditing ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"}>
                          <td className="sticky left-0 bg-white dark:bg-gray-900 px-4 py-4 text-sm font-mono text-gray-700 dark:text-gray-300 border-r dark:border-gray-600 z-10">{student.usn}</td>
                          <td className="sticky left-32 bg-white dark:bg-gray-900 px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600 z-10">{student.name}</td>
                          
                          {currentToolConfig.questions.map((q, colIndex) => {
                              const currentValue = marks[student.id]?.[q.q] ?? '';
                              const isInvalid = currentValue !== '' && currentValue > q.max;

                              return (
                              <td key={`${student.id}-${q.q}`} className="px-3 py-2 whitespace-nowrap text-center text-sm">
                                  <div className="relative inline-block group">
                                      <input
                                      id={`mark-${rowIndex}-${colIndex}`}
                                      type="number"
                                      min="0"
                                      disabled={!isEditing}
                                      value={currentValue}
                                      onChange={e => handleMarksChange(student.id, q.q, e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                      className={`w-16 h-10 text-center border rounded-md disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 transition-colors font-semibold text-sm
                                            ${isInvalid 
                                                ? 'border-red-500 bg-red-50 text-red-600 focus:border-red-500 focus:ring-red-500 dark:bg-red-900/20' 
                                                : 'dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:border-primary-500 focus:ring-primary-500'
                                            }
                                      `}
                                      />
                                      {/* REAL TIME VALIDATION TOOLTIP */}
                                      {isInvalid && (
                                          <div className="absolute z-40 bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-red-600 text-white text-xs font-bold py-1 px-2 rounded shadow-lg">
                                              Max mark is {q.max}
                                          </div>
                                      )}
                                  </div>
                              </td>
                          )})}

                          <td className="px-4 py-4 text-center font-bold text-gray-800 dark:text-gray-100 border-l dark:border-gray-600">
                            {calculateTotal(student.id)}
                          </td>

                          <td className="px-4 py-4 text-center border-l dark:border-gray-600">
                            <div className="flex justify-center gap-2">
                                {hasImprovement && (
                                    <button
                                        onClick={() => openComparisonModal(student)}
                                        className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-md transition-colors"
                                        title="View Improvement Comparison"
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleEditRow(student.id)}
                                    className={`p-2 rounded-md transition-colors ${
                                        isEditing 
                                        ? "text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30" 
                                        : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
                                    }`}
                                    title={isEditing ? "Click to lock row" : "Click to edit"}
                                >
                                    {isEditing ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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