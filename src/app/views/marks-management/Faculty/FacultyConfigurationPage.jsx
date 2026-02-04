// src/app/views/marks-management/Faculty/FacultyConfigurationPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { X, AlertCircle, CheckCircle } from 'lucide-react'; // Added Icons for Modal

const TOOL_TYPES = ['Internal Assessment', 'Assignment', 'Semester End Exam', 'Activity', 'Improvement Test'];
const SUB_TYPES = ['1', '2', '3', 'Other'];

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
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
                    {/* Render message directly if string, or as component if JSX */}
                    {typeof message === 'string' ? <p>{message}</p> : message}
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

const FacultyConfigurationPage = () => {
    const { user } = useAuth();
    
    // --- 1. Course Selection Logic ---
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [activeTab, setActiveTab] = useState('cos'); 
    const [loading, setLoading] = useState(true);

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
        type: 'alert', // 'alert' (info/error), 'confirm' (action)
        title: '',
        message: '',
        onConfirm: null
    });

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

    // Load Configuration
    useEffect(() => {
        if (!selectedCourseId) return;

        const course = courses.find(c => c.id === selectedCourseId);
        if (course) {
            setCoDefinitions(course.cos || []);
            setCourseSettings(course.settings || { targetThreshold: 60, courseType: 'Theory' });
            
            const parsedTools = (course.assessmentTools || []).map(tool => {
                let type = 'Internal Assessment';
                let subType = 'Other';
                let customName = tool.name;
                let linkedAssessment = '';

                if (tool.name === 'Semester End Exam') {
                    type = 'Semester End Exam';
                    subType = ''; 
                } else if (tool.name.startsWith('Improvement Test')) {
                    type = 'Improvement Test';
                    // Parse linked assessment from name like "Improvement Test (Internal Assessment 1)"
                    const match = tool.name.match(/\((.*?)\)/);
                    if (match) linkedAssessment = match[1]; 
                } else if (tool.name.startsWith('Activity')) {
                    type = 'Activity';
                    customName = tool.name.replace('Activity - ', '');
                } else if (tool.name.startsWith('Internal Assessment')) {
                    type = 'Internal Assessment';
                    const part = tool.name.replace('Internal Assessment ', '');
                    if (SUB_TYPES.includes(part)) {
                        subType = part;
                        customName = '';
                    }
                } else if (tool.name.startsWith('Assignment')) {
                    type = 'Assignment';
                    const part = tool.name.replace('Assignment ', '');
                    if (SUB_TYPES.includes(part)) {
                        subType = part;
                        customName = '';
                    }
                }

                return { ...tool, type, subType, customName, linkedAssessment };
            });

            setAssessmentTools(parsedTools);
        }
    }, [selectedCourseId, courses]);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    // --- Handlers: CO Management ---
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

    // --- Handlers: Assessment Tools ---
    const addTool = () => {
        // Prevent duplicate default tool
        let nextNum = 1;
        while (assessmentTools.some(t => t.name === `Internal Assessment ${nextNum}`)) {
            nextNum++;
        }
        let subType = nextNum <= 3 ? String(nextNum) : 'Other';
        let name = nextNum <= 3 ? `Internal Assessment ${nextNum}` : `Internal Assessment Other`;

        const newId = Date.now().toString();
        setAssessmentTools([
            ...assessmentTools, 
            { 
                id: newId, 
                name: name, 
                type: 'Internal Assessment',
                subType: subType,
                customName: '',
                linkedAssessment: '',
                maxMarks: 0, 
                weightage: 0, 
                coDistribution: {} 
            }
        ]);
    };

    const removeTool = (id) => {
        showModal(
            'confirm',
            'Remove Assessment Tool?',
            'Are you sure you want to remove this assessment tool? All marks associated with it will need to be re-entered if you add it back.',
            () => {
                setAssessmentTools(prev => prev.filter(t => t.id !== id));
            },
            'Remove',
            'bg-red-600'
        );
    };

    const getImprovementTargets = (currentToolId) => {
        return assessmentTools.filter(t => 
            t.id !== currentToolId && 
            t.type === 'Internal Assessment'
        );
    };

    const updateToolMeta = (id, field, value) => {
        // --- DUPLICATE CHECK LOGIC ---
        if (field === 'type' || field === 'subType') {
            const toolToUpdate = assessmentTools.find(t => t.id === id);
            let proposedName = '';
            
            // Construct proposed name
            let type = field === 'type' ? value : toolToUpdate.type;
            let subType = field === 'subType' ? value : toolToUpdate.subType;

            if (type === 'Internal Assessment' && subType !== 'Other') {
                proposedName = `Internal Assessment ${subType}`;
            } else if (type === 'Assignment' && subType !== 'Other') {
                proposedName = `Assignment ${subType}`;
            } else if (type === 'Semester End Exam') {
                proposedName = 'Semester End Exam';
            } else if (type === 'Improvement Test') {
                proposedName = 'Improvement Test';
            }
            
            const exists = assessmentTools.some(t => t.id !== id && t.name === proposedName);
            
            if (exists) {
                showModal(
                    'error',
                    'Duplicate Assessment',
                    `An assessment with the name "${proposedName}" already exists. Please choose a different type or number.`
                );
                return; // Stop update
            }
        }
        // -----------------------------

        setAssessmentTools(tools => tools.map(t => {
            if (t.id !== id) return t;

            const updatedTool = { ...t, [field]: value };

            // --- AUTO-POPULATE CONFIG FOR IMPROVEMENT TESTS ---
            if (field === 'linkedAssessment') {
                const targetTool = tools.find(tool => tool.name === value);
                if (targetTool) {
                    updatedTool.maxMarks = targetTool.maxMarks;
                    updatedTool.weightage = targetTool.weightage;
                    updatedTool.coDistribution = JSON.parse(JSON.stringify(targetTool.coDistribution || {}));
                }
            }
            // --------------------------------------------------

            // Reconstruct Name based on new state
            if (field === 'type' || field === 'subType' || field === 'customName' || field === 'linkedAssessment') {
                if (updatedTool.type === 'Semester End Exam') {
                    updatedTool.name = 'Semester End Exam';
                    if (field === 'type') updatedTool.coDistribution = {}; 
                } else if (updatedTool.type === 'Improvement Test') {
                    updatedTool.name = 'Improvement Test'; 
                     if (field === 'type') updatedTool.coDistribution = {};
                } else if (updatedTool.type === 'Activity') {
                    updatedTool.name = updatedTool.customName ? `Activity - ${updatedTool.customName}` : 'Activity';
                    if (field === 'type') updatedTool.coDistribution = {}; 
                } else if (updatedTool.subType === 'Other') {
                    updatedTool.name = updatedTool.customName;
                } else {
                    updatedTool.name = `${updatedTool.type} ${updatedTool.subType}`;
                }
            }

            return updatedTool;
        }));
    };

    const updateToolCoDistribution = (toolId, coId, marks) => {
        const markValue = parseInt(marks) || 0;
        setAssessmentTools(tools => tools.map(t => {
            if (t.id !== toolId) return t;
            
            const newDist = { ...t.coDistribution };
            if (markValue > 0) {
                newDist[coId] = markValue;
            } else {
                delete newDist[coId];
            }
            return { ...t, coDistribution: newDist };
        }));
    };

    const handleSave = async () => {
        if (!selectedCourseId) return;

        const errors = [];
        assessmentTools.forEach(tool => {
            if (tool.type !== 'Semester End Exam' && tool.type !== 'Activity' && tool.type !== 'Improvement Test') {
                const allocated = Object.values(tool.coDistribution).reduce((a, b) => a + b, 0);
                if (allocated !== tool.maxMarks) {
                    errors.push(<li><strong>{tool.name}</strong>: Allocated {allocated} marks, but Max Marks is {tool.maxMarks}</li>);
                }
            }
            if (!tool.name || tool.name === 'Activity') {
                errors.push(<li>An assessment tool is missing a valid name.</li>);
            }
        });

        if (errors.length > 0) {
            showModal(
                'error',
                'Configuration Errors',
                <ul className="list-disc pl-5 space-y-1">{errors}</ul>
            );
            return;
        }

        try {
            const payload = {
                cos: coDefinitions,
                settings: courseSettings,
                assessmentTools: assessmentTools
            };

            await api.patch(`/courses/${selectedCourseId}`, payload);
            setCourses(prev => prev.map(c => c.id === selectedCourseId ? { ...c, ...payload } : c));
            showModal('success', 'Saved Successfully', `Configuration for ${selectedCourse?.code} has been updated.`);
        } catch (error) {
            console.error("Failed to save configuration", error);
            showModal('error', 'Save Failed', 'There was an error saving your configuration. Please try again.');
        }
    };

    if (!user) return null;
    if (loading && courses.length === 0) return <div className="p-12 text-center text-gray-500">Loading courses...</div>;

    return (
        <div className="p-6 space-y-6 pb-10">
            
            {/* Custom Modal */}
            <CustomModal isOpen={uiModal.isOpen} onClose={closeModal} config={uiModal} />

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
                        {courses.length > 0 ? courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        )) : <option>No courses assigned</option>}
                    </select>
                    <button 
                        onClick={handleSave}
                        disabled={!selectedCourse}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold disabled:opacity-50"
                    >
                        <Icons.Settings className="h-4 w-4" /> Save All
                    </button>
                </div>
            </div>

            {selectedCourse ? (
                <>
                    {/* Navigation Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button onClick={() => setActiveTab('cos')} className={`${activeTab === 'cos' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm`}>1. CO & Syllabus Definition</button>
                            <button onClick={() => setActiveTab('assessments')} className={`${activeTab === 'assessments' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm`}>2. Assessment & Scaling Plan</button>
                        </nav>
                    </div>

                    {/* --- TAB 1: CO MANAGEMENT --- */}
                    {activeTab === 'cos' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Course Outcomes (COs) & Syllabus Mapping</CardTitle>
                                            <CardDescription>Define the COs and map them to the specific modules in your syllabus.</CardDescription>
                                        </div>
                                        <button onClick={addCo} className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-bold dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300">
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
                                                                <Icons.Trash2 className="h-4 w-4" />
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
                                <CardHeader>
                                    <CardTitle>Global Course Parameters</CardTitle>
                                </CardHeader>
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
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assessment Tools & Scaling</h2>
                                <button 
                                    onClick={addTool}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-400 text-gray-800 rounded-lg hover:bg-gray-100 text-sm font-bold shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                                >
                                    <Icons.PlusCircle className="h-4 w-4" /> Add Tool
                                </button>
                            </div>

                            {assessmentTools.map((tool) => {
                                const isSEE = tool.type === 'Semester End Exam';
                                const isActivity = tool.type === 'Activity';
                                const isImprovement = tool.type === 'Improvement Test';
                                
                                const showMapping = !isSEE && !isActivity && !isImprovement;
                                const allocated = Object.values(tool.coDistribution).reduce((a, b) => a + b, 0);
                                const isBalanced = showMapping ? allocated === tool.maxMarks : true;
                                
                                return (
                                    <Card key={tool.id} className={`transition-all border-l-4 ${!isBalanced ? 'border-amber-400 dark:border-amber-600' : 'border-l-primary-600'}`}>
                                        <CardContent className="p-4 sm:p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                
                                                {/* Left: Tool Details */}
                                                <div className="md:col-span-4 space-y-4">
                                                    
                                                    {/* Side-by-Side Dropdowns */}
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 dark:text-gray-300">Type</label>
                                                            <select
                                                                value={tool.type || 'Internal Assessment'}
                                                                onChange={(e) => updateToolMeta(tool.id, 'type', e.target.value)}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm font-medium text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                            >
                                                                {TOOL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                                            </select>
                                                        </div>

                                                        {!isSEE && !isActivity && !isImprovement && (
                                                            <div className="w-24">
                                                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 dark:text-gray-300">Option</label>
                                                                <select
                                                                    value={tool.subType || '1'}
                                                                    onChange={(e) => updateToolMeta(tool.id, 'subType', e.target.value)}
                                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm font-medium text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                                                >
                                                                    {SUB_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Auto-Generated Name Display */}
                                                    <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                                                        <span className="text-xs text-gray-500 uppercase block mb-1">Generated Name</span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{tool.name}</span>
                                                    </div>

                                                    {/* Custom Input */}
                                                    {(tool.subType === 'Other' || isActivity) && (
                                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 dark:text-gray-300">
                                                                {isActivity ? 'Activity Name' : 'Custom Name'}
                                                            </label>
                                                            <input 
                                                                type="text" 
                                                                value={tool.customName || ''}
                                                                onChange={(e) => updateToolMeta(tool.id, 'customName', e.target.value)}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm font-bold text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                                placeholder={isActivity ? "e.g. Quiz 1" : "e.g. Lab Test 1"}
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Marks Configuration */}
                                                    <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Conducted</label>
                                                            <input 
                                                                type="number" 
                                                                value={tool.maxMarks}
                                                                onChange={(e) => updateToolMeta(tool.id, 'maxMarks', parseInt(e.target.value))}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm font-bold text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-primary-600 uppercase mb-1 dark:text-primary-400">Weightage</label>
                                                            <input 
                                                                type="number" 
                                                                value={tool.weightage}
                                                                onChange={(e) => updateToolMeta(tool.id, 'weightage', parseInt(e.target.value))}
                                                                className="block w-full rounded-md border-primary-300 shadow-sm text-sm font-bold text-primary-700 bg-primary-50 dark:bg-gray-800 dark:border-primary-500 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => removeTool(tool.id)}
                                                        className="text-red-600 hover:text-red-800 font-bold text-xs w-full text-left pl-1 dark:text-red-400"
                                                    >
                                                        Remove Tool
                                                    </button>
                                                </div>

                                                {/* Right: CO Distribution */}
                                                <div className="md:col-span-8 border-l border-gray-200 dark:border-gray-700 pl-0 md:pl-6 pt-4 md:pt-0">
                                                    {!showMapping ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                                            <Icons.MarksEntry className="w-10 h-10 mb-2 opacity-50" />
                                                            <p className="text-sm font-medium">{tool.type}</p>
                                                            <p className="text-xs">
                                                                {isImprovement 
                                                                    ? "Mapping will be defined per student in Marks Entry." 
                                                                    : "No CO mapping required. Only total marks will be entered."}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-center mb-3">
                                                                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                    Marks Distribution (on Conducted Marks)
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
                                                                                    value={tool.coDistribution[co.id] || ''}
                                                                                    onChange={(e) => updateToolCoDistribution(tool.id, co.id, e.target.value)}
                                                                                    className={`block w-full text-center rounded-md text-sm font-bold focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white ${
                                                                                        (tool.coDistribution[co.id] > 0) 
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
                                                                <p className="text-xs font-semibold text-amber-700 mt-2 dark:text-amber-500">
                                                                    * Allocation must match Conducted Marks ({tool.maxMarks}).
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