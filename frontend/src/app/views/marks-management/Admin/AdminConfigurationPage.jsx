import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import api from '../../../services/api';
import { Plus, Trash2, Save, X, Loader2, AlertCircle } from 'lucide-react';
import ConfirmationModal from '../shared/ConfirmationModal'; 
import toast from 'react-hot-toast'; // 1. IMPORT TOAST
import { BlockSkeleton } from '../shared/SkeletonLoaders';

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
            setFormData({ id: '', name: '' }); 
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
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
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors">
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
    const [schemes, setSchemes] = useState([]);
    const [selectedSchemeId, setSelectedSchemeId] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // 2. ONLY KEEP THE DELETE MODAL STATE
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const defaultRules = {
        pass_criteria: 50,
        attainment_levels: { level_3: 70, level_2: 60, level_1: 50 },
        weightage: { direct: 80, indirect: 20 },
        po_calculation: { normalization_factor: 3 },
        direct_split: { cie: 50, see: 50 } 
    };

    const defaultTools = [
        { id: 'exit', name: 'Program Exit Survey', weight: 33 },
        { id: 'employer', name: 'Employer Survey', weight: 33 },
        { id: 'alumni', name: 'Alumni Survey', weight: 34 }
    ];

    const [attainmentRules, setAttainmentRules] = useState(defaultRules);
    const [indirectTools, setIndirectTools] = useState(defaultTools);
    
    const [pos, setPos] = useState([]);
    const [psos, setPsos] = useState([]);

    useEffect(() => { fetchAllData(); }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [schemesRes, posRes, psosRes] = await Promise.all([
                api.get('/schemes/'), api.get('/pos/'), api.get('/psos/')
            ]);

            const fetchedSchemes = schemesRes.data.results || schemesRes.data;
            const fetchedPos = posRes.data.results || posRes.data;
            const fetchedPsos = psosRes.data.results || psosRes.data;

            setSchemes(fetchedSchemes);

            if (fetchedSchemes.length > 0 && !selectedSchemeId) {
                loadSchemeData(fetchedSchemes[0]);
            }

            const sortById = (a, b) => parseInt(a.id.match(/\d+/)?.[0] || 0) - parseInt(b.id.match(/\d+/)?.[0] || 0);
            
            setPos(fetchedPos.sort(sortById));
            setPsos(fetchedPsos.sort(sortById));

        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load configuration data.");
        } finally {
            setLoading(false);
        }
    };

    const loadSchemeData = (scheme) => {
        setSelectedSchemeId(scheme.id);
        const settings = scheme.settings || {};
        
        setAttainmentRules({
            pass_criteria: settings.pass_criteria || defaultRules.pass_criteria,
            attainment_levels: settings.attainment_levels || defaultRules.attainment_levels,
            weightage: settings.weightage || defaultRules.weightage,
            po_calculation: settings.po_calculation || defaultRules.po_calculation,
            direct_split: settings.direct_split || defaultRules.direct_split
        });
        setIndirectTools(settings.indirect_tools || defaultTools);
    };

    const handleSchemeChange = (e) => {
        const scheme = schemes.find(s => s.id === e.target.value);
        if (scheme) loadSchemeData(scheme);
    };

    const handleCreateScheme = async (formData) => {
        const payload = {
            id: formData.id, name: formData.name,
            settings: { ...defaultRules, indirect_tools: defaultTools }
        };

        try {
            const res = await api.post('/schemes/', payload);
            const newScheme = res.data;
            setSchemes([...schemes, newScheme]);
            loadSchemeData(newScheme);
            setIsCreateModalOpen(false);
            
            // 3. SUCCESS TOAST
            toast.success(`Scheme "${newScheme.name}" created successfully!`);
        } catch (error) {
            console.error("Failed to create scheme", error);
            toast.error('Failed to create scheme. Ensure the Scheme ID is unique.');
            throw error;
        }
    };

    const handleSave = async () => {
        if (!selectedSchemeId) return;

        const payload = {
            settings: { ...attainmentRules, indirect_tools: indirectTools }
        };

        // 4. PROMISE TOAST FOR SAVING
        toast.promise(
            api.patch(`/schemes/${selectedSchemeId}/`, payload),
            {
                loading: 'Saving configuration...',
                success: 'Configuration saved successfully!',
                error: 'Failed to save configuration.',
            }
        );
    };

    const confirmDelete = async () => {
        if (!selectedSchemeId) return;

        try {
            await api.delete(`/schemes/${selectedSchemeId}/`);
            const remaining = schemes.filter(s => s.id !== selectedSchemeId);
            setSchemes(remaining);
            
            if (remaining.length > 0) {
                loadSchemeData(remaining[0]);
            } else {
                setSelectedSchemeId('');
                setAttainmentRules(defaultRules);
            }
            // 5. DELETE SUCCESS TOAST
            toast.success('Scheme deleted successfully.');
        } catch (error) {
            console.error("Delete failed", error);
            toast.error('Failed to delete scheme.');
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const updateRule = (category, field, value) => {
        setAttainmentRules(prev => {
            if (category) return { ...prev, [category]: { ...prev[category], [field]: parseFloat(value) || 0 } };
            return { ...prev, [field]: parseFloat(value) || 0 };
        });
    };

    const handleDirectWeightChange = (val) => setAttainmentRules(prev => ({ ...prev, weightage: { direct: val, indirect: 100 - val } }));
    const handleCieWeightChange = (val) => setAttainmentRules(prev => ({ ...prev, direct_split: { cie: val, see: 100 - val } }));
    const handleToolChange = (id, field, value) => setIndirectTools(tools => tools.map(t => t.id === id ? { ...t, [field]: value } : t));

    if (loading && schemes.length === 0) {
        return <div className="p-6"><div className="w-64 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8"></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6"><BlockSkeleton className="h-48" /><BlockSkeleton className="h-48" /><BlockSkeleton className="h-48" /><BlockSkeleton className="h-48" /></div></div>
    }

    return (
        <div className="p-6 space-y-6 pb-10">
            <SchemeCreationModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={handleCreateScheme} />
            
            {/* ONLY RENDER THE DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <ConfirmationModal 
                    title="Delete Scheme"
                    message="Are you sure you want to delete this scheme? This will affect calculations for all courses linked to it."
                    theme="danger"
                    confirmText="Delete"
                    onConfirm={confirmDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 font-medium">Define attainment rules, thresholds, and outcomes for the institution.</p>
                </div>
                
                <div className="flex gap-3 items-center bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <select 
                            value={selectedSchemeId} onChange={handleSchemeChange}
                            className="block w-56 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            disabled={schemes.length === 0}
                        >
                            {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            {schemes.length === 0 && <option>No Schemes Found</option>}
                        </select>
                    </div>

                    <button onClick={() => setIsCreateModalOpen(true)} className="p-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors" title="Create New Scheme">
                        <Plus className="h-5 w-5" />
                    </button>

                    {selectedSchemeId && (
                        <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors" title="Delete current scheme">
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                    
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm transition-colors">
                        <Save className="h-4 w-4" /> Save
                    </button>
                </div>
            </div>

            {selectedSchemeId ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <input type="number" value={attainmentRules.pass_criteria} onChange={(e) => updateRule(null, 'pass_criteria', e.target.value)} className="w-20 rounded-md border-gray-300 text-gray-900 font-bold dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 text-center" />
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-300">%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Class Performance Levels</CardTitle>
                                <CardDescription>Percentage of students required to achieve each level.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {['level_3', 'level_2', 'level_1'].map((level, idx) => (
                                    <div key={level} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-2 last:pb-0 dark:border-gray-700">
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Level {3 - idx}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600 font-medium dark:text-gray-400">Above</span>
                                            <input type="number" value={attainmentRules.attainment_levels[level]} onChange={(e) => updateRule('attainment_levels', level, e.target.value)} className="w-20 rounded-md border-gray-300 text-gray-900 font-semibold dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm text-center" />
                                            <span className="text-xs text-gray-700 font-bold dark:text-gray-300">% Students</span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Direct Attainment Formula</CardTitle>
                                <CardDescription>Weightage of Internal (CIE) vs Semester End (SEE).</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">CIE (Internals)</label>
                                        <span className="font-bold text-primary-700 dark:text-primary-400">{attainmentRules.direct_split.cie}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={attainmentRules.direct_split.cie} onChange={(e) => handleCieWeightChange(parseInt(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:bg-gray-600" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">SEE (University Exam)</label>
                                        <span className="font-bold text-blue-700 dark:text-blue-400">{attainmentRules.direct_split.see}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={attainmentRules.direct_split.see} disabled className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-not-allowed dark:bg-gray-700" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Final PO Attainment Formula</CardTitle>
                                <CardDescription>Calculation for Total PO Attainment.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">Direct Attainment (DA)</label>
                                        <span className="font-bold text-primary-700 dark:text-primary-400">{attainmentRules.weightage.direct}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={attainmentRules.weightage.direct} onChange={(e) => handleDirectWeightChange(parseInt(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:bg-gray-600" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <label className="text-gray-900 font-semibold dark:text-gray-200">Indirect Attainment (IA)</label>
                                        <span className="font-bold text-purple-700 dark:text-purple-400">{attainmentRules.weightage.indirect}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={attainmentRules.weightage.indirect} disabled className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-not-allowed dark:bg-gray-700" />
                                </div>
                                
                                <div className="pt-4 border-t dark:border-gray-700">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Normalization Factor (Divisor)</label>
                                    <input type="number" value={attainmentRules.po_calculation.normalization_factor} onChange={e => updateRule('po_calculation', 'normalization_factor', e.target.value)} className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Indirect Assessment Tools</h2>
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
                                                        <input value={tool.name} onChange={(e) => handleToolChange(tool.id, 'name', e.target.value)} className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 text-sm font-bold text-gray-900 dark:text-white w-full dark:bg-gray-700 dark:border-gray-600" />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input type="number" value={tool.weight} onChange={(e) => handleToolChange(tool.id, 'weight', e.target.value)} className="w-24 rounded border-gray-300 text-sm py-1 font-bold text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center" />
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
                    </div>
                </>
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 mt-6">
                    <Icons.Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-500">No Scheme Selected</h3>
                    <p className="text-gray-400 mt-1">Select an existing scheme or create a new one to configure settings.</p>
                </div>
            )}
            
            <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Outcome Definitions</h2>
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
        </div>
    );
};

export default AdminConfigurationPage;