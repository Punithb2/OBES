import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { Loader2 } from 'lucide-react';
import ConfirmationModal from '../shared/ConfirmationModal';
import toast from 'react-hot-toast';
import { BlockSkeleton } from '../shared/SkeletonLoaders';

// Reusable Card Component for each Survey Type
const SurveyCard = ({ title, description, outcomes, ratings, onRatingChange }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">Outcome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40">Rating (0-3)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {outcomes.map(outcome => (
                                <tr key={outcome.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{outcome.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{outcome.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="3"
                                            step="0.1"
                                            value={ratings?.[outcome.id] ?? ''}
                                            onChange={(e) => onRatingChange(outcome.id, e.target.value)}
                                            className="w-24 h-10 text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                            placeholder="-"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

const IndirectAttainmentPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [outcomes, setOutcomes] = useState([]); 
    const [surveyId, setSurveyId] = useState(null);

    const [surveyRatings, setSurveyRatings] = useState({
        exitSurvey: {},
        employerSurvey: {},
        alumniSurvey: {}
    });

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                const [posRes, psosRes] = await Promise.all([
                    api.get('/pos/'),
                    api.get('/psos/')
                ]);
                
                const fetchedPos = posRes.data.results || posRes.data || [];
                const fetchedPsos = psosRes.data.results || psosRes.data || [];

                const sortById = (a, b) => {
                    const numA = parseInt((a.id || '').match(/\d+/)?.[0] || 0);
                    const numB = parseInt((b.id || '').match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };
                
                const safePos = Array.isArray(fetchedPos) ? [...fetchedPos].sort(sortById) : [];
                const safePsos = Array.isArray(fetchedPsos) ? [...fetchedPsos].sort(sortById) : [];

                setOutcomes([...safePos, ...safePsos]);

                const surveyRes = await api.get(`/surveys/?department=${deptId}`);
                const fetchedSurveys = surveyRes.data.results || surveyRes.data;
                
                if (Array.isArray(fetchedSurveys) && fetchedSurveys.length > 0) {
                    const existingData = fetchedSurveys[0];
                    setSurveyId(existingData.id); 
                    setSurveyRatings({
                        exitSurvey: existingData.exit_survey || {},
                        employerSurvey: existingData.employer_survey || {},
                        alumniSurvey: existingData.alumni_survey || {}
                    });
                }
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // 2. Handle Input Changes
    const handleRatingChange = (surveyType, outcomeId, value) => {
        const numericValue = parseFloat(value);
        
        setSurveyRatings(prev => ({
            ...prev,
            [surveyType]: {
                ...prev[surveyType],
                [outcomeId]: value === '' ? '' : Math.max(0, Math.min(3, isNaN(numericValue) ? 0 : numericValue))
            }
        }));
    };

    // 3. Save Changes
    const handleSaveChanges = async () => {
        if (!user || !user.department) return;
        
        // 3. USE TOAST.PROMISE FOR BEAUTIFUL LOADING -> SUCCESS/ERROR ANIMATION
        const savePromise = async () => {
            const payload = {
                department: user.department,
                exit_survey: surveyRatings.exitSurvey,
                employer_survey: surveyRatings.employerSurvey,
                alumni_survey: surveyRatings.alumniSurvey
            };
            if (surveyId) {
                await api.patch(`/surveys/${surveyId}/`, payload);
            } else {
                const res = await api.post('/surveys/', payload);
                setSurveyId(res.data.id); 
            }
        };

        setIsSaving(true);
        
        toast.promise(savePromise(), {
            loading: 'Saving survey ratings...',
            success: 'Survey ratings saved successfully!',
            error: 'Failed to save. Please check your connection.',
        }).finally(() => {
            setIsSaving(false);
        });
    };

    if (loading) {
        return <div className="p-6 space-y-6 pb-10"><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /></div>
    }

    return (
        <div className="p-6 space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Indirect Attainment Surveys</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Collect and manage feedback from program stakeholders to calculate indirect attainment.
                    </p>
                </div>
                <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <SurveyCard
                title="Program Exit Survey"
                description="Feedback collected from graduating students about their perception of outcome achievement."
                outcomes={outcomes}
                ratings={surveyRatings.exitSurvey}
                onRatingChange={(outcomeId, value) => handleRatingChange('exitSurvey', outcomeId, value)}
            />

            <SurveyCard
                title="Employer Survey"
                description="Feedback from employers regarding the performance and capabilities of graduates in the workplace."
                outcomes={outcomes}
                ratings={surveyRatings.employerSurvey}
                onRatingChange={(outcomeId, value) => handleRatingChange('employerSurvey', outcomeId, value)}
            />

            <SurveyCard
                title="Alumni Survey"
                description="Feedback from alumni on how well the program prepared them for their careers."
                outcomes={outcomes}
                ratings={surveyRatings.alumniSurvey}
                onRatingChange={(outcomeId, value) => handleRatingChange('alumniSurvey', outcomeId, value)}
            />
        </div>
    );
};

export default IndirectAttainmentPage;