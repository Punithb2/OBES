import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import api from '../../../services/api';
import { Plus, Trash2, Save, X, Loader2, AlertCircle } from 'lucide-react';

// --- INTERNAL MODAL COMPONENT ---
const SchemeCreationModal = ({ isOpen, onClose, onCreate }) => {
    const [formData, setFormData] = useState({ id: '', name: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id || !formData.name) return;
        
        setIsSubmitting(true);
        try {
            await onCreate(formData);
            setFormData({ id: '', name: '' }); // Reset form
        } catch (error) {
            console.error(error);
            // Error handling is done in parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-5 border-b dark:border-gray-700 pb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary-600" />
                        Create New Scheme
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            This will create a new configuration profile with default settings. You can customize the rules after creation.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Scheme ID <span className="text-red-500">*</span>
                        </label>
                        <input 
                            autoFocus
                            value={formData.id}
                            onChange={(e) => setFormData({...formData, id: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                            placeholder="e.g. SCHEME2024"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono uppercase dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Unique identifier (Uppercase, No spaces).</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Scheme Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="e.g. 2024 AICTE Regulation"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-2 border-t dark:border-gray-700">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                            Create Scheme
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminConfigurationPage = () => {
    // --- State Management ---
    const [schemes, setSchemes] = useState([]);
    const [selectedSchemeId, setSelectedSchemeId] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Default Configuration Templates
    const defaultRules = {
        studentPassThreshold: 50,
        maxAttainmentLevel: 3,
        levelThresholds: { level3: 70, level2: 60, level1: 50 },
        finalWeightage: { direct: 80, indirect: 20 },
        directSplit: { cie: 50, see: 50 }
    };

    const defaultTools = [
        { id: 'exit', name: 'Program Exit Survey', weight: 33 },
        { id: 'employer', name: 'Employer Survey', weight: 33 },
        { id: 'alumni', name: 'Alumni Survey', weight: 34 }
    ];

    const [attainmentRules, setAttainmentRules] = useState(defaultRules);
    const [indirectTools, setIndirectTools] = useState(defaultTools);
    
    // Outcomes Data
    const [pos, setPos] = useState([]);
    const [psos, setPsos] = useState([]);

    // --- 1. FETCH DATA ---
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [schemesRes, posRes, psosRes] = await Promise.all([
                api.get('/schemes/'), 
                api.get('/pos/'),
                api.get('/psos/')
            ]);

            setSchemes(schemesRes.data);

            // Select first scheme if none selected
            if (schemesRes.data.length > 0 && !selectedSchemeId) {
                loadSchemeData(schemesRes.data[0]);
            }

            // Handle Outcomes Sorting
            const sortById = (a, b) => {
                const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                return numA - numB;
            };
            setPos(posRes.data.sort(sortById));
            setPsos(psosRes.data.sort(sortById));

        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadSchemeData = (scheme) => {
        setSelectedSchemeId(scheme.id);
        const settings = scheme.settings || {};
        setAttainmentRules(settings.attainment_rules || defaultRules);
        setIndirectTools(settings.indirect_tools || defaultTools);
    };

    // --- Handlers ---

    const handleSchemeChange = (e) => {
        const scheme = schemes.find(s => s.id === e.target.value);
        if (scheme) loadSchemeData(scheme);
    };

    // --- Create New Scheme Handler (Called from Modal) ---
    const handleCreateScheme = async (formData) => {
        const payload = {
            id: formData.id,
            name: formData.name,
            settings: {
                attainment_rules: defaultRules,
                indirect_tools: defaultTools
            }
        };

        try {
            // POST to create
            const res = await api.post('/schemes/', payload);
            
            // Update Local State
            const newScheme = res.data;
            setSchemes([...schemes, newScheme]);
            
            // Auto-Select the new scheme
            loadSchemeData(newScheme);
            setIsCreateModalOpen(false);
            
            alert(`Scheme "${newScheme.name}" created successfully!`);
        } catch (error) {
            console.error("Failed to create scheme", error);
            alert("Failed to create scheme. Ensure ID is unique.");
            throw error; // Let modal know it failed
        }
    };

    // --- Update Handler (PATCH) ---
    const handleSave = async () => {
        if (!selectedSchemeId) return;

        const payload = {
            settings: {
                attainment_rules: attainmentRules,
                indirect_tools: indirectTools
            }
        };

        try {
            await api.patch(`/schemes/${selectedSchemeId}/`, payload);
            alert("Configuration saved successfully.");
        } catch (error) {
            console.error("Failed to save configuration", error);
            alert("Failed to save configuration.");
        }
    };

    const handleDelete = async () => {
        if (!selectedSchemeId) return;
        if (!window.confirm("Are you sure? This scheme will be removed from all linked courses.")) return;

        try {
            await api.delete(`/schemes/${selectedSchemeId}/`);
            
            // Update local state
            const remaining = schemes.filter(s => s.id !== selectedSchemeId);
            setSchemes(remaining);
            
            if (remaining.length > 0) {
                loadSchemeData(remaining[0]);
            } else {
                setSelectedSchemeId('');
                setAttainmentRules(defaultRules);
            }
            alert("Scheme deleted.");
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete scheme.");
        }
    };

    // --- Rule Update Helpers ---
    const updateRule = (category, field, value) => {
        setAttainmentRules(prev => {
            if (category) {
                return { ...prev, [category]: { ...prev[category], [field]: parseFloat(value) || 0 } };
            }
            return { ...prev, [field]: parseFloat(value) || 0 };
        });
    };

    const handleDirectWeightChange = (val) => {
        setAttainmentRules(prev => ({
            ...prev, finalWeightage: { direct: val, indirect: 100 - val }
        }));
    };

    const handleCieWeightChange = (val) => {
        setAttainmentRules(prev => ({
            ...prev, directSplit: { cie: val, see: 100 - val }
        }));
    };

    const handleToolChange = (id, field, value) => {
        setIndirectTools(tools => tools.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    if (loading && schemes.length === 0) {
        return <div className="p-12 text-center text-gray-500">Loading configuration...</div>;
    }

    return (
        <div className="p-6 space-y-6 pb-10">
            
            {/* --- MODAL INJECTION --- */}
            <SchemeCreationModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateScheme}
            />

            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 font-medium">Define attainment rules, thresholds, and outcomes for the institution.</p>
                </div>
                
                <div className="flex gap-3 items-center bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    {/* Scheme Selector */}
                    <div className="relative">
                        <select 
                            value={selectedSchemeId}
                            onChange={handleSchemeChange}
                            className="block w-56 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            disabled={schemes.length === 0}
                        >
                            {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            {schemes.length === 0 && <option>No Schemes Found</option>}
                        </select>
                    </div>

                    {/* Create Button */}
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors"
                        title="Create New Scheme"
                    >
                        <Plus className="h-5 w-5" />
                    </button>

                    {/* Delete Button */}
                    {selectedSchemeId && (
                        <button 
                            onClick={handleDelete}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                            title="Delete current scheme"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                    
                    {/* Separator */}
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

                    {/* Save Button */}
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm transition-colors"
                    >
                        <Save className="h-4 w-4" /> Save
                    </button>
                </div>
            </div>

            {selectedSchemeId ? (
                <>
                    {/* --- 1. ATTAINMENT CRITERIA --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* A. Pass Criteria */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Student Pass Criteria</CardTitle>
                                <CardDescription>Minimum score required for a student to "attain" a CO.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 dark:text-white">Target Score (%)</label>
                                        <span className="text-xs text-gray-600 font-medium dark:text-gray-300">Threshold to count as "Y" (Attained)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={attainmentRules.studentPassThreshold}
                                            onChange={(e) => updateRule(null, 'studentPassThreshold', e.target.value)}
                                            className="w-20 rounded-md border-gray-300 text-gray-900 font-bold dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 text-center"
                                        />
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-300">%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* B. Attainment Level Thresholds */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Class Performance Levels</CardTitle>
                                <CardDescription>Percentage of students required to achieve each level.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {['level3', 'level2', 'level1'].map((level, idx) => (
                                    <div key={level} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-2 last:pb-0 dark:border-gray-700">
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                            Level {3 - idx}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600 font-medium dark:text-gray-400">Above</span>
                                            <input 
                                                type="number" 
                                                value={attainmentRules.levelThresholds[level]}
                                                onChange={(e) => updateRule('levelThresholds', level, e.target.value)}
                                                className="w-20 rounded-md border-gray-300 text-gray-900 font-semibold dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm text-center"
                                            />
                                            <span className="text-xs text-gray-700 font-bold dark:text-gray-300">% Students</span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* C. Direct Attainment Split */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Direct Attainment Formula</CardTitle>
                                <CardDescription>Weightage of Internal (CIE) vs Semester End (SEE).</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">CIE (Internals)</label>
                                        <span className="font-bold text-primary-700 dark:text-primary-400">{attainmentRules.directSplit.cie}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={attainmentRules.directSplit.cie} 
                                        onChange={(e) => handleCieWeightChange(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:bg-gray-600"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">SEE (University Exam)</label>
                                        <span className="font-bold text-blue-700 dark:text-blue-400">{attainmentRules.directSplit.see}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={attainmentRules.directSplit.see} 
                                        disabled
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-not-allowed dark:bg-gray-700"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* D. Final PO Attainment Split */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Final PO Attainment Formula</CardTitle>
                                <CardDescription>Calculation for Total PO Attainment.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">Direct Attainment (DA)</label>
                                        <span className="font-bold text-primary-700 dark:text-primary-400">{attainmentRules.finalWeightage.direct}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={attainmentRules.finalWeightage.direct} 
                                        onChange={(e) => handleDirectWeightChange(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:bg-gray-600"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">Indirect Attainment (IA)</label>
                                        <span className="font-bold text-purple-700 dark:text-purple-400">{attainmentRules.finalWeightage.indirect}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={attainmentRules.finalWeightage.indirect} 
                                        disabled
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-not-allowed dark:bg-gray-700"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- 2. INDIRECT TOOLS CONFIGURATION --- */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">Indirect Assessment Tools</h2>
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase dark:text-gray-200">Tool Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase dark:text-gray-200">Weightage (%)</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-800 uppercase dark:text-gray-200">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {indirectTools.map((tool) => (
                                            <tr key={tool.id}>
                                                <td className="px-6 py-4">
                                                    <input 
                                                        value={tool.name}
                                                        onChange={(e) => handleToolChange(tool.id, 'name', e.target.value)}
                                                        className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-900 dark:text-white w-full dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="number"
                                                        value={tool.weight}
                                                        onChange={(e) => handleToolChange(tool.id, 'weight', e.target.value)}
                                                        className="w-24 rounded border-gray-300 text-sm py-1 font-bold text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Fixed</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Icons.Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-500">No Scheme Selected</h3>
                    <p className="text-gray-400 mt-1">Select an existing scheme or create a new one to configure settings.</p>
                </div>
            )}
            
            {/* --- 3. OUTCOME DEFINITIONS (Shared Across Schemes) --- */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8">Outcome Definitions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Program Outcomes (POs)</CardTitle>
                            <a href="/admin/outcomes" className="text-xs text-primary-600 hover:underline dark:text-primary-400">Manage</a>
                        </div>
                    </CardHeader>
                    <CardContent className="h-64 overflow-y-auto border-t border-gray-200 dark:border-gray-700 pt-2 custom-scrollbar">
                        <ul className="space-y-2">
                            {pos.length > 0 ? pos.map(po => (
                                <li key={po.id} className="text-sm p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex gap-2">
                                    <span className="font-extrabold text-gray-900 dark:text-white w-12 shrink-0">{po.id}</span>
                                    <span className="text-gray-800 font-medium dark:text-gray-200 truncate">{po.description}</span>
                                </li>
                            )) : <li className="text-sm text-gray-500 p-2">No POs defined.</li>}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Program Specific Outcomes (PSOs)</CardTitle>
                            <a href="/admin/outcomes" className="text-xs text-primary-600 hover:underline dark:text-primary-400">Manage</a>
                        </div>
                    </CardHeader>
                    <CardContent className="h-64 overflow-y-auto border-t border-gray-200 dark:border-gray-700 pt-2 custom-scrollbar">
                        <ul className="space-y-2">
                            {psos.length > 0 ? psos.map(pso => (
                                <li key={pso.id} className="text-sm p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex gap-2">
                                    <span className="font-extrabold text-gray-900 dark:text-white w-12 shrink-0">{pso.id}</span>
                                    <span className="text-gray-800 font-medium dark:text-gray-200 truncate">{pso.description}</span>
                                </li>
                            )) : <li className="text-sm text-gray-500 p-2">No PSOs defined.</li>}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminConfigurationPage;