import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

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
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40">Rating (1-3)</th>
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
                                            aria-label={`Rating for ${outcome.id}`}
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
    const [outcomes, setOutcomes] = useState([]); // Combined POs and PSOs
    
    // State to store ratings
    const [surveyRatings, setSurveyRatings] = useState({
        exitSurvey: {},
        employerSurvey: {},
        alumniSurvey: {}
    });

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.departmentId) return;

            try {
                setLoading(true);
                // Fetch Outcomes
                const [posRes, psosRes] = await Promise.all([
                    api.get('/pos'),
                    api.get('/psos')
                ]);
                setOutcomes([...posRes.data, ...psosRes.data]);

                // Fetch Existing Survey Data for this Department
                try {
                    const surveyRes = await api.get(`/surveys/${user.departmentId}`);
                    setSurveyRatings(surveyRes.data);
                } catch (err) {
                    // If 404 (not found), we'll create it on save. 
                    // State remains default empty objects.
                    console.log("No existing survey data found, starting fresh.");
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
                // Allow empty string for clearing, otherwise clamp between 0 and 3
                [outcomeId]: value === '' ? '' : Math.max(0, Math.min(3, isNaN(numericValue) ? 0 : numericValue))
            }
        }));
    };

    // 3. Save Changes
    const handleSaveChanges = async () => {
        if (!user?.departmentId) return;

        const payload = {
            id: user.departmentId,
            ...surveyRatings
        };

        try {
            // Try to update first
            try {
                await api.put(`/surveys/${user.departmentId}`, payload);
            } catch (err) {
                // If update fails (e.g. 404), create new
                await api.post('/surveys', payload);
            }
            alert('Survey ratings saved successfully!');
        } catch (error) {
            console.error("Failed to save surveys", error);
            alert('Error saving data.');
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading survey data...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Indirect Attainment Surveys</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Collect and manage feedback from program stakeholders to calculate indirect attainment.
                    </p>
                </div>
                <button
                    onClick={handleSaveChanges}
                    className="mt-4 sm:mt-0 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors"
                >
                    Save Changes
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
                description="Feedback from alumni on how well the program prepared them for their careers, collected a few years after graduation."
                outcomes={outcomes}
                ratings={surveyRatings.alumniSurvey}
                onRatingChange={(outcomeId, value) => handleRatingChange('alumniSurvey', outcomeId, value)}
            />
        </div>
    );
};

export default IndirectAttainmentPage;