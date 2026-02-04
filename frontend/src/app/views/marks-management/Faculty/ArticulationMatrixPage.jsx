// src/app/views/marks-management/Faculty/ArticulationMatrixPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { X, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

// --- CUSTOM MODAL COMPONENT ---
const CustomModal = ({ isOpen, onClose, config }) => {
    if (!isOpen) return null;

    const { title, message, type, onConfirm, confirmText = "Confirm", confirmColor = "bg-primary-600" } = config;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all scale-100 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {type === 'error' && <AlertCircle className="text-red-500 w-5 h-5" />}
                        {type === 'success' && <CheckCircle className="text-green-500 w-5 h-5" />}
                        {type === 'confirm' && <Trash2 className="text-red-500 w-5 h-5" />}
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
                    {message}
                </div>

                {/* Footer */}
                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    {type === 'confirm' ? (
                        <>
                            <button 
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => { if(onConfirm) onConfirm(); onClose(); }}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors ${confirmColor} hover:opacity-90`}
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm transition-colors"
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ArticulationMatrixPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data States
  const [courses, setCourses] = useState([]);
  const [pos, setPos] = useState([]);
  const [psos, setPsos] = useState([]);
  const [articulationMatrix, setArticulationMatrix] = useState({});

  // Comparison States (for dirty check)
  const [initialData, setInitialData] = useState({ courses: [], matrix: {} });

  const [isDirty, setIsDirty] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [syllabusFile, setSyllabusFile] = useState(null);
  
  // UI Modal State
  const [uiModal, setUiModal] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null
  });

  const showModal = (type, title, message, onConfirm = null, confirmText = "Confirm", confirmColor = "bg-primary-600") => {
    setUiModal({ isOpen: true, type, title, message, onConfirm, confirmText, confirmColor });
  };

  const closeModal = () => setUiModal(prev => ({ ...prev, isOpen: false }));

  // 1. Fetch Data
  useEffect(() => {
      const fetchData = async () => {
          if (!user) return;
          try {
              setLoading(true);
              const [coursesRes, posRes, psosRes, matrixRes] = await Promise.all([
                  api.get(`/courses?assignedFacultyId=${user.id}`),
                  api.get('/pos'),
                  api.get('/psos'),
                  api.get('/articulationMatrix')
              ]);

              setCourses(coursesRes.data);
              setPos(posRes.data);
              setPsos(psosRes.data);
              setArticulationMatrix(matrixRes.data);

              // Set initial state for dirty checking
              setInitialData({
                  courses: JSON.stringify(coursesRes.data),
                  matrix: JSON.stringify(matrixRes.data)
              });

              if (coursesRes.data.length > 0) {
                  setSelectedCourseId(coursesRes.data[0].id);
              }
          } catch (error) {
              console.error("Failed to load articulation data", error);
          } finally {
              setLoading(false);
          }
      };

      fetchData();
  }, [user]);
  
  // 2. Dirty Check
  useEffect(() => {
    const coursesChanged = JSON.stringify(courses) !== initialData.courses;
    const matrixChanged = JSON.stringify(articulationMatrix) !== initialData.matrix;
    setIsDirty(coursesChanged || matrixChanged);
  }, [courses, articulationMatrix, initialData]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const allOutcomes = useMemo(() => [...pos, ...psos], [pos, psos]);

  // Calculate Averages
  const outcomeAverages = useMemo(() => {
    if (!selectedCourse) return {};
    const courseMatrix = articulationMatrix[selectedCourse.id];
    if (!courseMatrix) return {};

    const averages = {};
    allOutcomes.forEach(outcome => {
        let sum = 0;
        let count = 0;
        // Use optional chaining for COs in case they are undefined
        (selectedCourse.cos || []).forEach(co => {
            const value = courseMatrix[co.id]?.[outcome.id];
            if (value && value > 0) {
                sum += value;
                count++;
            }
        });
        if (count > 0) {
            averages[outcome.id] = sum / count;
        }
    });
    return averages;
  }, [selectedCourse, articulationMatrix, allOutcomes]);


  // Handlers
  const handleMatrixChange = (coId, outcomeId, value) => {
    if (!selectedCourse) return;

    const correlation = parseInt(value, 10);
    // Allow empty string to clear, otherwise clamp 1-3
    const newCorrelation = (value === '' || isNaN(correlation)) ? '' : Math.max(1, Math.min(3, correlation));

    setArticulationMatrix(prevMatrix => {
        const courseMatrix = prevMatrix[selectedCourse.id] || {};
        const coMatrix = courseMatrix[coId] || {};

        return {
            ...prevMatrix,
            [selectedCourse.id]: {
                ...courseMatrix,
                [coId]: {
                    ...coMatrix,
                    [outcomeId]: newCorrelation,
                },
            },
        };
    });
  };

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            setSyllabusFile(event.target.files[0]);
        } else {
            setSyllabusFile(null);
        }
    };

    const handleGenerateMatrix = () => {
        if (!selectedCourse || !syllabusFile) return;

        // Mock AI Generation
        const courseMatrix = {};
        (selectedCourse.cos || []).forEach(co => {
            const coMatrix = {};
            const numMappings = Math.floor(Math.random() * 4) + 2;
            const shuffledOutcomes = [...allOutcomes].sort(() => 0.5 - Math.random());

            for (let i = 0; i < numMappings; i++) {
                if (i < shuffledOutcomes.length) {
                    const outcome = shuffledOutcomes[i];
                    coMatrix[outcome.id] = Math.floor(Math.random() * 3) + 1;
                }
            }
            courseMatrix[co.id] = coMatrix;
        });

        setArticulationMatrix(prevMatrix => ({
            ...prevMatrix,
            [selectedCourse.id]: courseMatrix,
        }));
        
        setSyllabusFile(null);
        showModal('success', 'AI Generation Complete', 'The articulation matrix has been populated based on the uploaded syllabus.');
    };

  const handleAddCo = () => {
    if (!selectedCourse) return;
    const currentCos = selectedCourse.cos || [];
    const nextNum = currentCos.length + 1;
    
    const newCoId = `${selectedCourse.id}.${nextNum}`; 
    
    const newCo = {
        id: newCoId,
        description: 'New Course Outcome',
        kLevel: 'K1'
    };

    const newCourses = courses.map(course => 
        course.id === selectedCourseId ? { ...course, cos: [...currentCos, newCo] } : course
    );
    setCourses(newCourses);
  };
  
  const handleDeleteCo = (coId) => {
      showModal(
          'confirm',
          'Delete Course Outcome?',
          'Are you sure you want to delete this outcome? This will remove all associated CO-PO/PSO mappings. This action cannot be undone.',
          () => confirmDelete(coId),
          'Delete',
          'bg-red-600'
      );
  };

  const confirmDelete = async (outcomeId) => {
    if (selectedCourse) {
        // 1. Remove from Courses state
        const newCourses = courses.map(course => 
            course.id === selectedCourseId ? { ...course, cos: course.cos.filter(co => co.id !== outcomeId) } : course
        );
        setCourses(newCourses);

        // 2. Remove from Matrix state
        setArticulationMatrix(prev => {
            const newMatrix = { ...prev };
            if (newMatrix[selectedCourseId]) {
                const newCourseMatrix = { ...newMatrix[selectedCourseId] };
                delete newCourseMatrix[outcomeId];
                newMatrix[selectedCourseId] = newCourseMatrix;
            }
            return newMatrix;
        });
    }
  };

  const handleSaveChanges = async () => {
      if (!selectedCourse) return;

      try {
          await api.patch(`/courses/${selectedCourse.id}`, {
              cos: selectedCourse.cos
          });

          await api.patch(`/articulationMatrix`, {
              [selectedCourse.id]: articulationMatrix[selectedCourse.id]
          });

          // Reset dirty state
          setInitialData({
              courses: JSON.stringify(courses),
              matrix: JSON.stringify(articulationMatrix)
          });
          
          showModal('success', 'Saved Successfully', 'Articulation matrix and course outcomes have been saved.');
      } catch (error) {
          console.error("Failed to save changes", error);
          showModal('error', 'Save Failed', 'There was an error saving your changes. Please try again.');
      }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Matrix...</div>;

  return (
    <div className="space-y-6">
      
      {/* UI MODAL */}
      <CustomModal isOpen={uiModal.isOpen} onClose={closeModal} config={uiModal} />

      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">CO-PO/PSO Articulation Matrix</h1>
      <Card>
        <CardHeader>
           <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-grow">
                  <CardTitle>Course Articulation</CardTitle>
                  <CardDescription>Mapping of Course Outcomes (COs) to Program Outcomes (POs) and Program Specific Outcomes (PSOs).</CardDescription>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <select
                    id="course-select"
                    value={selectedCourseId}
                    onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        setSyllabusFile(null); 
                    }}
                    className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    ))}
                  </select>
                   <div className="flex gap-2 justify-end">
                    <button
                        onClick={handleSaveChanges}
                        disabled={!isDirty}
                        className="px-4 py-2 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        Save Changes
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <div className="flex-shrink-0">
                        <span className="font-semibold text-sm text-primary-700 dark:text-primary-200">✨ Generate with AI</span>
                    </div>
                    <div className="flex-grow text-xs text-primary-600 dark:text-primary-300">
                        Upload your syllabus file (.pdf, .docx) and let AI populate the articulation matrix for you.
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                        <input
                            type="file"
                            id="syllabus-upload"
                            accept=".pdf,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label htmlFor="syllabus-upload" className="cursor-pointer text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 truncate max-w-xs">
                           {syllabusFile ? syllabusFile.name : 'Choose a file...'}
                        </label>
                        <button
                            onClick={handleGenerateMatrix}
                            disabled={!syllabusFile || !selectedCourse}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Generate
                        </button>
                    </div>
                </div>
              </div>
           </div>
        </CardHeader>
        <CardContent>
          {selectedCourse ? (
            <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">
                      COs
                    </th>
                    {allOutcomes.map(outcome => (
                      <th key={outcome.id} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {outcome.id}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(selectedCourse.cos || []).map(co => (
                    <tr key={co.id}>
                      <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600 w-64">
                        <div className="font-bold">{co.id.includes('.') ? co.id.split('.')[1] : co.id}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={co.description}>{co.description}</div>
                      </td>
                      {allOutcomes.map(outcome => (
                        <td key={outcome.id} className="px-3 py-4 whitespace-nowrap text-center text-sm">
                          <input
                            type="text"
                            value={articulationMatrix[selectedCourse.id]?.[co.id]?.[outcome.id] || ''}
                            onChange={(e) => handleMatrixChange(co.id, outcome.id, e.target.value)}
                            className="w-10 h-10 text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                          <button onClick={() => handleDeleteCo(co.id)} className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                              <Icons.Trash2 className="h-4 w-4" />
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 dark:border-gray-600">
                  <tr className="bg-red-50 dark:bg-red-900/20">
                    <td className="sticky left-0 bg-red-50 dark:bg-red-900/20 px-4 py-4 text-sm font-bold text-gray-900 dark:text-white border-r dark:border-gray-600">
                      AVERAGE
                    </td>
                    {allOutcomes.map(outcome => {
                      const avg = outcomeAverages[outcome.id];
                      const displayValue = avg ? (avg % 1 === 0 ? avg.toString() : avg.toFixed(1)) : '-';
                      return (
                        <td key={`avg-${outcome.id}`} className="px-3 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-800 dark:text-gray-100">
                          {displayValue}
                        </td>
                      );
                    })}
                    <td className="px-3 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4">
                <button onClick={handleAddCo} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">
                    <Icons.PlusCircle className="h-4 w-4" /> Add Course Outcome (CO)
                </button>
            </div>
          </>
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                Please select a course to view its articulation matrix.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticulationMatrixPage;