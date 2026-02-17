import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import { Icons } from '../shared/icons';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { X, AlertCircle, CheckCircle, Plus, Link as LinkIcon, Save, Trash2, Loader2 } from 'lucide-react';

// --- CUSTOM MODAL COMPONENT (Preserved) ---
const CustomModal = ({ isOpen, onClose, config }) => {
    if (!isOpen) return null;

    const { title, message, type, onConfirm, confirmText = "Confirm", confirmColor = "bg-primary-600" } = config;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 transform transition-all scale-100 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {type === 'error' && <AlertCircle className="text-red-500 w-5 h-5" />}
                        {type === 'success' && <CheckCircle className="text-green-500 w-5 h-5" />}
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>
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
                                onClick={() => { onConfirm(); onClose(); }}
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

// --- NEW COMPONENT: ADD TOOL MODAL ---
const AddToolModal = ({ isOpen, onClose, onAdd, existingTools = [] }) => {
    const [selectedAssessment, setSelectedAssessment] = useState('');
    const [linkedComponent, setLinkedComponent] = useState('Assignment'); // Default to Assignment

    useEffect(() => {
        if (isOpen) {
            setSelectedAssessment('');
            setLinkedComponent('Assignment');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Calculate the next Internal Assessment Number automatically
    const existingIAs = existingTools.filter(t => t.type === 'Internal Assessment');
    const nextIANumber = existingIAs.length + 1;

    // Define Options (Generic IA)
    const baseOptions = [
        { id: 'IA', label: 'Internal Assessment', type: 'internal' },
        { id: 'SEE', label: 'Semester End Exam', type: 'see' },
        { id: 'Impr', label: 'Improvement Test', type: 'improvement' }
    ];

    // Filter out restricted tools
    const availableOptions = baseOptions.filter(opt => {
        if (opt.id === 'SEE' && existingTools.some(t => t.type === 'Semester End Exam')) return false;
        return true;
    });

    const isInternal = selectedAssessment === 'IA';

    const handleSubmit = () => {
        if (!selectedAssessment) return;

        const selectedOpt = baseOptions.find(o => o.id === selectedAssessment);
        const toolsToAdd = [];

        // 1. Generate Main Tool Name (Auto-Numbered if IA)
        let mainToolName = selectedOpt.label;
        let subType = 'Other';

        if (isInternal) {
            mainToolName = `Internal Assessment ${nextIANumber}`;
            subType = nextIANumber.toString();
        }

        const mainTool = {
            id: Date.now().toString(),
            name: mainToolName,
            type: selectedOpt.type === 'see' ? 'Semester End Exam' : 
                  selectedOpt.type === 'improvement' ? 'Improvement Test' : 'Internal Assessment',
            subType: subType,
            maxMarks: 0, 
            weightage: 0, 
            coDistribution: {}
        };
        toolsToAdd.push(mainTool);

        // 2. Add Compulsory Linked Component (For IAs)
        if (isInternal) {
            const linkName = `${linkedComponent} ${nextIANumber}`; // e.g. "Assignment 1"

            toolsToAdd.push({
                id: (Date.now() + 1).toString(),
                name: linkName,
                type: linkedComponent, // 'Assignment' or 'Activity'
                subType: nextIANumber.toString(),
                maxMarks: 0,
                weightage: 0,
                coDistribution: {}
            });
        }

        onAdd(toolsToAdd);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 transform scale-100 transition-all">
                <div className="flex justify-between items-center mb-5 border-b dark:border-gray-700 pb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary-600" /> Add Assessment Tool
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="space-y-6">
                    {/* 1. Assessment Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Assessment Type</label>
                        <select 
                            value={selectedAssessment}
                            onChange={(e) => setSelectedAssessment(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium p-2.5"
                        >
                            <option value="">-- Choose Assessment --</option>
                            {availableOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                            {availableOptions.length === 0 && <option disabled>All standard assessments added</option>}
                        </select>
                        {isInternal && (
                            <p className="text-xs text-primary-600 mt-1 dark:text-primary-400 font-medium">
                                Will be added as: <strong>Internal Assessment {nextIANumber}</strong>
                            </p>
                        )}
                    </div>

                    {/* 2. Linked Component (Compulsory for IAs) */}
                    {isInternal && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 animate-in slide-in-from-top-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">
                                <LinkIcon className="w-4 h-4" /> Linked Component (Compulsory)
                            </label>
                            
                            <select 
                                value={linkedComponent}
                                onChange={(e) => setLinkedComponent(e.target.value)}
                                className="w-full rounded-md border-blue-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="Assignment">Assignment</option>
                                <option value="Activity">Activity</option>
                            </select>
                            
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                This will link <strong>{linkedComponent} {nextIANumber}</strong> to the assessment.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit}
                            disabled={!selectedAssessment}
                            className="px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                        >
                            Confirm & Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const FacultyConfigurationPage = () => {
    const { user } = useAuth();
    
    // --- 1. Course Selection Logic ---
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [activeTab, setActiveTab] = useState('cos'); 
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- 2. Configuration State ---
    const [coDefinitions, setCoDefinitions] = useState([]);
    const [courseSettings, setCourseSettings] = useState({
        targetThreshold: 60,
        courseType: 'Theory',
    });
    const [assessmentTools, setAssessmentTools] = useState([]);

    // --- 3. UI Modal State ---
    const [uiModal, setUiModal] = useState({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
        onConfirm: null
    });
    const [isAddToolModalOpen, setIsAddToolModalOpen] = useState(false);

    const showModal = (type, title, message, onConfirm = null, confirmText = "Confirm", confirmColor = "bg-primary-600") => {
        setUiModal({ isOpen: true, type, title, message, onConfirm, confirmText, confirmColor });
    };

    const closeModal = () => setUiModal(prev => ({ ...prev, isOpen: false }));

    // Fetch courses on mount
    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const res = await api.get('/courses/');
                const myCourses = res.data.filter(c => String(c.assigned_faculty) === String(user.id));
                setCourses(myCourses);
                if (myCourses.length > 0 && !selectedCourseId) {
                    setSelectedCourseId(myCourses[0].id);
                }
            } catch (error) {
                console.error("Failed to load courses", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

    const assignedCourses = useMemo(() => {
        if (!user || !courses.length) return [];
        return courses; 
    }, [user, courses]);

    const selectedCourse = useMemo(() => 
        courses.find(c => c.id === selectedCourseId), 
    [courses, selectedCourseId]);

    // Load Configuration
    useEffect(() => {
        if (!selectedCourse) return;

        setCoDefinitions(selectedCourse.cos || []);
        setCourseSettings(selectedCourse.settings || { targetThreshold: 60, courseType: 'Theory' });
        
        // Ensure tools have valid IDs
        const tools = (selectedCourse.assessment_tools || []).map(t => ({
            ...t,
            id: t.id || Math.random().toString(36).substr(2, 9)
        }));
        setAssessmentTools(tools);
    }, [selectedCourse]);

    // --- CO Handlers ---
    const addCo = () => {
        const nextNum = coDefinitions.length + 1;
        setCoDefinitions([...coDefinitions, { 
            id: `CO${nextNum}`, 
            description: '', 
            modules: '', 
            kLevel: 'K1' 
        }]);
    };

    const removeCo = (id) => {
        showModal(
            'confirm',
            'Delete Course Outcome?',
            'This will delete the CO and remove it from all assessment distributions. This action cannot be undone.',
            () => {
                setCoDefinitions(prev => prev.filter(co => co.id !== id));
                setAssessmentTools(tools => tools.map(t => {
                    const newDist = { ...t.coDistribution };
                    delete newDist[id];
                    return { ...t, coDistribution: newDist };
                }));
            },
            'Delete',
            'bg-red-600'
        );
    };

    const updateCo = (idx, field, value) => {
        const updated = [...coDefinitions];
        updated[idx][field] = value;
        setCoDefinitions(updated);
    };

    // --- Tool Handlers ---
    const handleToolsAdded = (newTools) => {
        setAssessmentTools(prev => [...prev, ...newTools]);
        showModal('success', 'Tools Added', `${newTools.length} assessment tool(s) added successfully.`);
    };

    const removeTool = (id) => {
        showModal(
            'confirm',
            'Remove Assessment Tool?',
            'Are you sure? All entered marks for this tool will be unlinked.',
            () => {
                setAssessmentTools(prev => prev.filter(t => t.id !== id));
            },
            'Remove',
            'bg-red-600'
        );
    };

    const updateToolMeta = (id, field, value) => {
        setAssessmentTools(tools => tools.map(t => {
            if (t.id !== id) return t;
            // Prevent negative values
            if ((field === 'maxMarks' || field === 'weightage') && typeof value === 'number') {
                return { ...t, [field]: Math.max(0, value) };
            }
            return { ...t, [field]: value };
        }));
    };

    const updateToolCoDistribution = (toolId, coId, marks) => {
        // Prevent negative values
        let markValue = parseInt(marks) || 0;
        if (markValue < 0) markValue = 0;

        setAssessmentTools(tools => tools.map(t => {
            if (t.id !== toolId) return t;
            const newDist = { ...t.coDistribution };
            if (markValue > 0) newDist[coId] = markValue;
            else delete newDist[coId];
            return { ...t, coDistribution: newDist };
        }));
    };

    const handleSave = async () => {
        if (!selectedCourseId) return;

        const errors = [];
        assessmentTools.forEach(tool => {
            if (tool.type !== 'Semester End Exam' && tool.type !== 'Activity' && tool.type !== 'Improvement Test') {
                const allocated = Object.values(tool.coDistribution || {}).reduce((a, b) => a + b, 0);
                if (allocated !== tool.maxMarks) {
                    errors.push(<li key={tool.id}><strong>{tool.name}</strong>: Allocated {allocated} marks, but Max Marks is {tool.maxMarks}</li>);
                }
            }
        });

        if (errors.length > 0) {
            showModal('error', 'Configuration Errors', <ul className="list-disc pl-5 space-y-1">{errors}</ul>);
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                cos: coDefinitions,
                settings: courseSettings,
                assessment_tools: assessmentTools
            };

            await api.patch(`/courses/${selectedCourseId}/`, payload);
            
            // Update local courses state
            setCourses(prev => prev.map(c => c.id === selectedCourseId ? { ...c, ...payload } : c));
            showModal('success', 'Saved Successfully', `Configuration for ${selectedCourse?.code} has been updated.`);
        } catch (error) {
            console.error("Failed to save configuration", error);
            showModal('error', 'Save Failed', 'There was an error saving your configuration.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;
    if (loading && courses.length === 0) return <div className="p-12 text-center text-gray-500">Loading courses...</div>;

    return (
        <div className="p-6 space-y-6 pb-20">
            
            {/* --- MODALS --- */}
            <CustomModal isOpen={uiModal.isOpen} onClose={closeModal} config={uiModal} />
            
            <AddToolModal 
                isOpen={isAddToolModalOpen} 
                onClose={() => setIsAddToolModalOpen(false)}
                onAdd={handleToolsAdded}
                existingTools={assessmentTools}
            />

            {/* Header & Course Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Configuration</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 font-medium">Manage COs, Modules, and Assessment Planning.</p>
                </div>
                <div className="flex gap-3">
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={courses.length === 0}
                    >
                        {courses.length > 0 ? courses.map(c => (
                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        )) : <option>No courses assigned</option>}
                    </select>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || !selectedCourse}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isSaving ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>}
                        Save Changes
                    </button>
                </div>
            </div>

            {selectedCourse ? (
                <>
                    {/* Navigation Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button onClick={() => setActiveTab('cos')} className={`${activeTab === 'cos' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors`}>1. CO & Syllabus Definition</button>
                            <button onClick={() => setActiveTab('assessments')} className={`${activeTab === 'assessments' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors`}>2. Assessment & Scaling Plan</button>
                        </nav>
                    </div>

                    {/* --- TAB 1: CO MANAGEMENT --- */}
                    {activeTab === 'cos' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>1. Course Outcomes (COs)</CardTitle>
                                        <button onClick={addCo} className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-bold dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300 transition-colors">
                                            <Icons.PlusCircle className="h-4 w-4" /> Add CO
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-20 dark:text-gray-200">ID</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase dark:text-gray-200">CO Description</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-48 dark:text-gray-200">Modules Covered</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-32 dark:text-gray-200">Bloom's Level</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase w-20 dark:text-gray-200">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {coDefinitions.map((co, idx) => (
                                                    <tr key={idx} className="bg-white dark:bg-gray-800">
                                                        <td className="px-4 py-3 align-top">
                                                            <input value={co.id} onChange={(e) => updateCo(idx, 'id', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-bold text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <textarea rows={2} value={co.description} onChange={(e) => updateCo(idx, 'description', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" placeholder="Enter CO statement..."/>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                             <input value={co.modules} onChange={(e) => updateCo(idx, 'modules', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. Module 1, 2"/>
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <select value={co.kLevel} onChange={(e) => updateCo(idx, 'kLevel', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                                                {['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map(k => <option key={k} value={k}>{k}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 align-top text-right">
                                                            <button onClick={() => removeCo(co.id)} className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30" title="Delete CO">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader><CardTitle>Global Course Parameters</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Course Type</label>
                                            <select 
                                                value={courseSettings.courseType}
                                                onChange={(e) => setCourseSettings({...courseSettings, courseType: e.target.value})}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            >
                                                <option value="Theory">Theory Only</option>
                                                <option value="Integrated">Integrated (Theory + Lab)</option>
                                                <option value="Lab">Laboratory Only</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Student Pass Threshold (%)</label>
                                            <input 
                                                type="number" 
                                                min="0" max="100"
                                                value={courseSettings.targetThreshold}
                                                onChange={(e) => setCourseSettings({...courseSettings, targetThreshold: parseInt(e.target.value)})}
                                                className="w-full rounded-md border-gray-300 shadow-sm font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* --- TAB 2: ASSESSMENT PLANNING --- */}
                    {activeTab === 'assessments' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assessment Tools & Scaling</h2>
                                <button 
                                    onClick={() => setIsAddToolModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> Add Tool
                                </button>
                            </div>

                            <div className="grid gap-6">
                                {assessmentTools.map((tool) => {
                                    const isSEE = tool.type === 'Semester End Exam';
                                    const isActivity = tool.type === 'Activity';
                                    const isAssignment = tool.type === 'Assignment';
                                    const isImprovement = tool.type === 'Improvement Test';
                                    
                                    const showMapping = !isSEE && !isActivity && !isImprovement;
                                    const allocated = Object.values(tool.coDistribution || {}).reduce((a, b) => a + b, 0);
                                    const isBalanced = showMapping ? allocated === tool.maxMarks : true;
                                    
                                    return (
                                        <Card key={tool.id} className={`transition-all border-l-4 ${!isBalanced ? 'border-amber-400 dark:border-amber-600' : 'border-l-primary-600'}`}>
                                            <CardContent className="p-4 sm:p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                    
                                                    {/* Left: Tool Details */}
                                                    <div className="md:col-span-4 space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Tool Name</label>
                                                            <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded border border-gray-200 dark:border-gray-600">
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white">{tool.name}</span>
                                                                <span className="text-[10px] bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-500">{tool.type}</span>
                                                            </div>
                                                        </div>

                                                        {/* Marks Configuration */}
                                                        <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Max Marks</label>
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    value={tool.maxMarks}
                                                                    onChange={(e) => updateToolMeta(tool.id, 'maxMarks', parseInt(e.target.value))}
                                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm font-bold text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-primary-600 uppercase mb-1 dark:text-primary-400">Weightage %</label>
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    value={tool.weightage}
                                                                    onChange={(e) => updateToolMeta(tool.id, 'weightage', parseInt(e.target.value))}
                                                                    className="block w-full rounded-md border-primary-300 shadow-sm text-sm font-bold text-primary-700 bg-primary-50 dark:bg-gray-800 dark:border-primary-500 dark:text-white"
                                                                />
                                                            </div>
                                                        </div>

                                                        <button 
                                                            onClick={() => removeTool(tool.id)}
                                                            className="text-red-600 hover:text-red-800 font-bold text-xs w-full text-left pl-1 dark:text-red-400 flex items-center gap-1 mt-2"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Remove Tool
                                                        </button>
                                                    </div>

                                                    {/* Right: CO Distribution */}
                                                    <div className="md:col-span-8 border-l border-gray-200 dark:border-gray-700 pl-0 md:pl-6 pt-4 md:pt-0">
                                                        {!showMapping ? (
                                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                                                <Icons.MarksEntry className="w-10 h-10 mb-2 opacity-50" />
                                                                <p className="text-sm font-medium">Direct Mark Entry</p>
                                                                <p className="text-xs">No CO mapping required for this tool.</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-between items-center mb-3">
                                                                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                        CO Distribution (Total: {tool.maxMarks})
                                                                    </h3>
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${isBalanced ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
                                                                        {allocated} / {tool.maxMarks} Allocated
                                                                    </span>
                                                                </div>
                                                                
                                                                {coDefinitions.length === 0 ? (
                                                                    <div className="text-center py-4 text-sm text-gray-500 italic bg-gray-50 rounded border border-dashed border-gray-300">
                                                                        No COs defined. Go to "CO & Syllabus Definition" tab first.
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                                        {coDefinitions.map((co) => (
                                                                            <div key={co.id} className="relative group">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs font-bold text-gray-700 text-center mb-1 dark:text-gray-400">
                                                                                        {co.id}
                                                                                    </span>
                                                                                    <input 
                                                                                        type="number"
                                                                                        min="0"
                                                                                        placeholder="-"
                                                                                        value={tool.coDistribution?.[co.id] || ''}
                                                                                        onChange={(e) => updateToolCoDistribution(tool.id, co.id, e.target.value)}
                                                                                        className={`block w-full text-center rounded-md text-sm font-bold focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white ${
                                                                                            (tool.coDistribution?.[co.id] > 0) 
                                                                                                ? 'border-primary-400 bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100' 
                                                                                                : 'border-gray-300 text-gray-900 dark:border-gray-600'
                                                                                        }`}
                                                                                    />
                                                                                    {co.modules && (
                                                                                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                                                                                            {co.modules}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                
                                                                {!isBalanced && (
                                                                    <p className="text-xs font-semibold text-amber-700 mt-2 dark:text-amber-500 flex items-center gap-1">
                                                                        <AlertCircle className="w-3 h-3" /> Allocation must sum to exactly {tool.maxMarks}.
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                                
                                {assessmentTools.length === 0 && (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                                        <p className="text-gray-500 mb-3">No assessment tools defined.</p>
                                        <button 
                                            onClick={() => setIsAddToolModalOpen(true)}
                                            className="text-primary-600 font-bold hover:underline"
                                        >
                                            + Add your first tool
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 text-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow font-medium">
                    Select a course to begin configuration.
                </div>
            )}
        </div>
    );
};

export default FacultyConfigurationPage;