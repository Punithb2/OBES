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
    const [outcomes, setOutcomes] = useState([]); 
    
    // Store the ID of the survey record if it exists (for updates)
    const [surveyId, setSurveyId] = useState(null);

    // State to store ratings
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

                // Fetch Outcomes
                const [posRes, psosRes] = await Promise.all([
                    api.get('/pos/'),
                    api.get('/psos/')
                ]);
                
                // Sort naturally
                const sortById = (a, b) => {
                    const numA = parseInt(a.id.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.id.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };
                setOutcomes([...posRes.data.sort(sortById), ...psosRes.data.sort(sortById)]);

                // Fetch Existing Survey Data
                // Filter by department to find the specific record
                const surveyRes = await api.get(`/surveys/?department=${deptId}`);
                
                if (surveyRes.data && surveyRes.data.length > 0) {
                    // Data exists: Load it
                    const existingData = surveyRes.data[0];
                    setSurveyId(existingData.id); // Save ID for PUT/PATCH later
                    setSurveyRatings({
                        exitSurvey: existingData.exitSurvey || {},
                        employerSurvey: existingData.employerSurvey || {},
                        alumniSurvey: existingData.alumniSurvey || {}
                    });
                } else {
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
        if (!user || !user.department) return;

        const payload = {
            department: user.department,
            exitSurvey: surveyRatings.exitSurvey,
            employerSurvey: surveyRatings.employerSurvey,
            alumniSurvey: surveyRatings.alumniSurvey
        };

        try {
            if (surveyId) {
                // UPDATE existing record (PATCH)
                await api.patch(`/surveys/${surveyId}/`, payload);
            } else {
                // CREATE new record (POST)
                const res = await api.post('/surveys/', payload);
                // Capture the new ID immediately so next save is an update
                setSurveyId(res.data.id); 
            }
            alert('Survey ratings saved successfully!');
        } catch (error) {
            console.error("Failed to save surveys", error);
            alert('Error saving data. Please check your network connection.');
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
                description="Feedback from alumni on how well the program prepared them for their careers."
                outcomes={outcomes}
                ratings={surveyRatings.alumniSurvey}
                onRatingChange={(outcomeId, value) => handleRatingChange('alumniSurvey', outcomeId, value)}
            />
        </div>
    );
};

export default IndirectAttainmentPage;