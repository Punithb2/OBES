import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import { Icons } from '../shared/icons';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { X, AlertCircle, Plus, Link as LinkIcon, Save, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast'; // 1. IMPORT TOAST
import { TableSkeleton } from '../shared/SkeletonLoaders'; // 2. IMPORT SKELETON

// --- CUSTOM MODAL (Preserved for Deletions ONLY) ---
const CustomModal = ({ isOpen, onClose, config }) => {
    if (!isOpen) return null;
    const { title, message, onConfirm, confirmText = "Confirm", confirmColor = "bg-primary-600" } = config;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trash2 className="text-red-500 w-5 h-5" /> {title}
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="p-6 text-sm text-gray-600 dark:text-gray-300">{message}</div>
                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md">Cancel</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 text-sm font-medium text-white rounded-md ${confirmColor}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// --- ADD TOOL MODAL (Unchanged Logic) ---
const AddToolModal = ({ isOpen, onClose, onAdd, existingTools = [] }) => {
    const [selectedAssessment, setSelectedAssessment] = useState('');
    const [linkedComponent, setLinkedComponent] = useState('Assignment'); 

    useEffect(() => {
        if (isOpen) { setSelectedAssessment(''); setLinkedComponent('Assignment'); }
    }, [isOpen]);

    if (!isOpen) return null;

    const existingIAs = existingTools.filter(t => t.type === 'Internal Assessment');
    const nextIANumber = existingIAs.length + 1;

    const baseOptions = [
        { id: 'IA', label: 'Internal Assessment', type: 'internal' },
        { id: 'SEE', label: 'Semester End Exam', type: 'see' },
        { id: 'Impr', label: 'Improvement Test', type: 'improvement' }
    ];

    const availableOptions = baseOptions.filter(opt => opt.id === 'SEE' ? !existingTools.some(t => t.type === 'Semester End Exam') : true);
    const isInternal = selectedAssessment === 'IA';

    const handleSubmit = () => {
        if (!selectedAssessment) return;
        const selectedOpt = baseOptions.find(o => o.id === selectedAssessment);
        const toolsToAdd = [];

        let mainToolName = selectedOpt.label, subType = 'Other';
        if (isInternal) { mainToolName = `Internal Assessment ${nextIANumber}`; subType = nextIANumber.toString(); }

        toolsToAdd.push({
            id: Date.now().toString(), name: mainToolName, 
            type: selectedOpt.type === 'see' ? 'Semester End Exam' : selectedOpt.type === 'improvement' ? 'Improvement Test' : 'Internal Assessment',
            subType, maxMarks: 0, weightage: 0, coDistribution: {}
        });

        if (isInternal) {
            toolsToAdd.push({
                id: (Date.now() + 1).toString(), name: `${linkedComponent} ${nextIANumber}`, 
                type: linkedComponent, subType: nextIANumber.toString(), maxMarks: 0, weightage: 0, coDistribution: {}
            });
        }
        onAdd(toolsToAdd);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-5 border-b dark:border-gray-700 pb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Plus className="w-5 h-5 text-primary-600" /> Add Assessment</h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Type</label>
                        <select value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2.5">
                            <option value="">-- Choose Assessment --</option>
                            {availableOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                        </select>
                    </div>
                    {isInternal && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                            <label className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-300 mb-2"><LinkIcon className="w-4 h-4" /> Linked Component</label>
                            <select value={linkedComponent} onChange={(e) => setLinkedComponent(e.target.value)} className="w-full rounded-md border-blue-200 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="Assignment">Assignment</option>
                                <option value="Activity">Activity</option>
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-md">Cancel</button>
                        <button onClick={handleSubmit} disabled={!selectedAssessment} className="px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-md disabled:opacity-50">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const FacultyConfigurationPage = () => {
    const { user } = useAuth();
    
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [activeTab, setActiveTab] = useState('cos'); 
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [coDefinitions, setCoDefinitions] = useState([]);
    const [courseSettings, setCourseSettings] = useState({ targetThreshold: 60, courseType: 'Theory' });
    const [assessmentTools, setAssessmentTools] = useState([]);

    const [uiModal, setUiModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
    const [isAddToolModalOpen, setIsAddToolModalOpen] = useState(false);

    const showModal = (title, message, onConfirm = null) => {
        setUiModal({ isOpen: true, title, message, onConfirm, confirmText: "Delete", confirmColor: "bg-red-600" });
    };

    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const res = await api.get('/courses/');
                const coursesData = res.data.results || res.data;
                const myCourses = coursesData.filter(c => String(c.assigned_faculty) === String(user.id));
                setCourses(myCourses);
                if (myCourses.length > 0 && !selectedCourseId) setSelectedCourseId(myCourses[0].id);
            } catch (error) {
                console.error("Failed to load", error);
                toast.error("Failed to load courses.");
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

    const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);

    useEffect(() => {
        if (!selectedCourse) return;
        setCoDefinitions(selectedCourse.cos || []);
        setCourseSettings(selectedCourse.settings || { targetThreshold: 60, courseType: 'Theory' });
        setAssessmentTools((selectedCourse.assessment_tools || []).map(t => ({ ...t, id: t.id || Math.random().toString(36).substr(2, 9) })));
    }, [selectedCourse]);

    const addCo = () => {
        const nextNum = coDefinitions.length + 1;
        setCoDefinitions([...coDefinitions, { id: `CO${nextNum}`, description: '', modules: '', kLevel: 'K1' }]);
    };

    const removeCo = (id) => {
        showModal('Delete Course Outcome?', 'This will remove the CO from all assessment distributions.', () => {
            setCoDefinitions(prev => prev.filter(co => co.id !== id));
            setAssessmentTools(tools => tools.map(t => {
                const newDist = { ...t.coDistribution };
                delete newDist[id];
                return { ...t, coDistribution: newDist };
            }));
        });
    };

    const updateCo = (idx, field, value) => {
        const updated = [...coDefinitions];
        updated[idx][field] = value;
        setCoDefinitions(updated);
    };

    const handleToolsAdded = (newTools) => {
        setAssessmentTools(prev => [...prev, ...newTools]);
        toast.success(`${newTools.length} assessment tool(s) added.`);
    };

    const removeTool = (id) => {
        showModal('Remove Assessment Tool?', 'All entered marks for this tool will be unlinked.', () => {
            setAssessmentTools(prev => prev.filter(t => t.id !== id));
        });
    };

    const updateToolMeta = (id, field, value) => {
        setAssessmentTools(tools => tools.map(t => {
            if (t.id !== id) return t;
            if ((field === 'maxMarks' || field === 'weightage') && typeof value === 'number') return { ...t, [field]: Math.max(0, value) };
            return { ...t, [field]: value };
        }));
    };

    const updateToolCoDistribution = (toolId, coId, marks) => {
        let markValue = Math.max(0, parseInt(marks) || 0);
        setAssessmentTools(tools => tools.map(t => {
            if (t.id !== toolId) return t;
            const newDist = { ...t.coDistribution };
            if (markValue > 0) newDist[coId] = markValue; else delete newDist[coId];
            return { ...t, coDistribution: newDist };
        }));
    };

    const handleSave = async () => {
        if (!selectedCourseId) return;

        // Validation
        const errors = [];
        assessmentTools.forEach(tool => {
            if (tool.type !== 'Semester End Exam' && tool.type !== 'Activity' && tool.type !== 'Improvement Test') {
                const allocated = Object.values(tool.coDistribution || {}).reduce((a, b) => a + b, 0);
                if (allocated !== tool.maxMarks) {
                    errors.push(<li key={tool.id}><strong>{tool.name}</strong>: Allocated {allocated}, but Max is {tool.maxMarks}</li>);
                }
            }
        });

        if (errors.length > 0) {
            // 3. TOAST ERROR WITH RENDERED JSX
            toast.error(
                <div>
                    <p className="font-bold mb-1">Configuration Errors:</p>
                    <ul className="list-disc pl-4 text-xs">{errors}</ul>
                </div>, 
                { duration: 6000 }
            );
            return;
        }

        const payload = { cos: coDefinitions, settings: courseSettings, assessment_tools: assessmentTools };
        
        // 4. TOAST PROMISE FOR SAVING
        toast.promise(api.patch(`/courses/${selectedCourseId}/`, payload), {
            loading: 'Saving configuration...',
            success: 'Course configuration saved!',
            error: 'Failed to save configuration.'
        }).then(() => {
            setCourses(prev => prev.map(c => c.id === selectedCourseId ? { ...c, ...payload } : c));
        });
    };

    if (!user) return null;
    if (loading && courses.length === 0) return <div className="p-6"><div className="w-64 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8"></div><TableSkeleton rows={6} columns={5} /></div>;

    return (
        <div className="p-6 space-y-6 pb-20">
            <CustomModal isOpen={uiModal.isOpen} onClose={() => setUiModal(prev => ({ ...prev, isOpen: false }))} config={uiModal} />
            <AddToolModal isOpen={isAddToolModalOpen} onClose={() => setIsAddToolModalOpen(false)} onAdd={handleToolsAdded} existingTools={assessmentTools} />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Configuration</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 font-medium">Manage COs, Modules, and Assessment Planning.</p>
                </div>
                <div className="flex gap-3">
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={courses.length === 0}
                    >
                        {courses.length > 0 ? courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>) : <option>No courses</option>}
                    </select>
                    <button 
                        onClick={handleSave} 
                        disabled={!selectedCourse}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm"
                    >
                        <Save className="w-4 h-4"/> Save
                    </button>
                </div>
            </div>

            {selectedCourse ? (
                <>
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button onClick={() => setActiveTab('cos')} className={`${activeTab === 'cos' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-bold`}>1. CO & Syllabus Definition</button>
                            <button onClick={() => setActiveTab('assessments')} className={`${activeTab === 'assessments' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-bold`}>2. Assessment & Scaling Plan</button>
                        </nav>
                    </div>

                    {activeTab === 'cos' && (
                        <div className="space-y-6 animate-in fade-in">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>1. Course Outcomes (COs)</CardTitle>
                                        <button onClick={addCo} className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-bold dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300">
                                            <Icons.PlusCircle className="h-4 w-4" /> Add CO
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {/* 5. STICKY HEADER FOR COs */}
                                    <div className="overflow-y-auto max-h-[60vh] custom-scrollbar border rounded-lg dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase shadow-sm">ID</th>
                                                    <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase shadow-sm">CO Description</th>
                                                    <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase shadow-sm w-48">Modules</th>
                                                    <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase shadow-sm w-32">Bloom's</th>
                                                    <th className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase shadow-sm">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700/50">
                                                {coDefinitions.map((co, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="px-4 py-3 align-top"><input value={co.id} onChange={(e) => updateCo(idx, 'id', e.target.value)} className="block w-24 rounded-md border-gray-300 shadow-sm font-bold dark:bg-gray-800 dark:border-gray-600 dark:text-white"/></td>
                                                        <td className="px-4 py-3 align-top"><textarea rows={2} value={co.description} onChange={(e) => updateCo(idx, 'description', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-none"/></td>
                                                        <td className="px-4 py-3 align-top"><input value={co.modules} onChange={(e) => updateCo(idx, 'modules', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"/></td>
                                                        <td className="px-4 py-3 align-top">
                                                            <select value={co.kLevel} onChange={(e) => updateCo(idx, 'kLevel', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                                                                {['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map(k => <option key={k} value={k}>{k}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 align-top text-right">
                                                            <button onClick={() => removeCo(co.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
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
                                            <label className="block text-sm font-bold dark:text-gray-300 mb-2">Course Type</label>
                                            <select value={courseSettings.courseType} onChange={(e) => setCourseSettings({...courseSettings, courseType: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm font-bold dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                                                <option value="Theory">Theory Only</option>
                                                <option value="Integrated">Integrated (Theory + Lab)</option>
                                                <option value="Lab">Laboratory Only</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold dark:text-gray-300 mb-2">Student Pass Threshold (%)</label>
                                            <input type="number" min="0" max="100" value={courseSettings.targetThreshold} onChange={(e) => setCourseSettings({...courseSettings, targetThreshold: parseInt(e.target.value)})} className="w-full rounded-md border-gray-300 shadow-sm font-bold dark:bg-gray-800 dark:border-gray-600 dark:text-white"/>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'assessments' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold dark:text-white">Assessment Tools & Scaling</h2>
                                <button onClick={() => setIsAddToolModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold shadow-sm">
                                    <Plus className="h-4 w-4" /> Add Tool
                                </button>
                            </div>

                            <div className="grid gap-6">
                                {assessmentTools.map((tool) => {
                                    const isSEE = tool.type === 'Semester End Exam';
                                    const isActivity = tool.type === 'Activity';
                                    const isImprovement = tool.type === 'Improvement Test';
                                    const showMapping = !isSEE && !isActivity && !isImprovement;
                                    const allocated = Object.values(tool.coDistribution || {}).reduce((a, b) => a + b, 0);
                                    const isBalanced = showMapping ? allocated === tool.maxMarks : true;
                                    
                                    return (
                                        <Card key={tool.id} className={`transition-all border-l-4 ${!isBalanced ? 'border-amber-400' : 'border-l-primary-600'}`}>
                                            <CardContent className="p-4 sm:p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                    
                                                    <div className="md:col-span-4 space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tool Name</label>
                                                            <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                                                                <span className="font-bold dark:text-white">{tool.name}</span>
                                                                <span className="text-[10px] bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded border dark:border-gray-600 dark:text-gray-300">{tool.type}</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Max Marks</label>
                                                                <input type="number" min="0" value={tool.maxMarks ?? ''} onChange={(e) => updateToolMeta(tool.id, 'maxMarks', parseInt(e.target.value))} className="w-full rounded-md border-gray-300 font-bold dark:bg-gray-900 dark:border-gray-600 dark:text-white"/>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-primary-600 uppercase mb-1">Weightage %</label>
                                                                <input type="number" min="0" value={tool.weightage ?? ''} onChange={(e) => updateToolMeta(tool.id, 'weightage', parseInt(e.target.value))} className="w-full rounded-md border-primary-300 text-primary-700 bg-primary-50 font-bold dark:bg-gray-900 dark:border-primary-500 dark:text-white"/>
                                                            </div>
                                                        </div>

                                                        <button onClick={() => removeTool(tool.id)} className="text-red-600 font-bold text-xs flex items-center gap-1 mt-2 hover:underline">
                                                            <Trash2 className="w-3 h-3" /> Remove Tool
                                                        </button>
                                                    </div>

                                                    <div className="md:col-span-8 border-l dark:border-gray-700 pl-0 md:pl-6 pt-4 md:pt-0">
                                                        {!showMapping ? (
                                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed dark:border-gray-700">
                                                                <Icons.MarksEntry className="w-10 h-10 mb-2 opacity-50" />
                                                                <p className="font-bold">Direct Mark Entry</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-between items-center mb-3">
                                                                    <h3 className="text-sm font-bold dark:text-gray-300">CO Distribution (Total: {tool.maxMarks})</h3>
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${isBalanced ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
                                                                        {allocated} / {tool.maxMarks} Allocated
                                                                    </span>
                                                                </div>
                                                                
                                                                {coDefinitions.length === 0 ? (
                                                                    <div className="text-center py-4 text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-800 rounded border border-dashed dark:border-gray-700">No COs defined.</div>
                                                                ) : (
                                                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                                        {coDefinitions.map((co) => (
                                                                            <div key={co.id} className="relative group">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs font-bold text-center mb-1 dark:text-gray-400">{co.id}</span>
                                                                                    <input type="number" min="0" placeholder="-" value={tool.coDistribution?.[co.id] ?? ''} onChange={(e) => updateToolCoDistribution(tool.id, co.id, e.target.value)} className={`block w-full text-center rounded-md font-bold dark:bg-gray-900 dark:text-white ${tool.coDistribution?.[co.id] > 0 ? 'border-primary-400 bg-primary-50 text-primary-900' : 'border-gray-300 dark:border-gray-600'}`}/>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {!isBalanced && <p className="text-xs font-bold text-amber-700 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Allocation must sum to exactly {tool.maxMarks}.</p>}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                                {assessmentTools.length === 0 && (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed dark:border-gray-700">
                                        <p className="text-gray-500 mb-3">No assessment tools defined.</p>
                                        <button onClick={() => setIsAddToolModalOpen(true)} className="text-primary-600 font-bold">+ Add your first tool</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 text-gray-600 bg-white dark:bg-gray-800 rounded-lg font-medium shadow">Select a course to begin configuration.</div>
            )}
        </div>
    );
};

export default FacultyConfigurationPage;