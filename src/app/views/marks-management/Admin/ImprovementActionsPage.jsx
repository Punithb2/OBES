import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { Icons } from '../shared/icons';

// Mock suggestions database
const SUGGESTIONS_DB = {
    'PO1': ['Conduct remedial classes on fundamental engineering concepts.', 'Introduce technical quizzes to reinforce basic knowledge.'],
    'PO2': ['Increase problem-solving sessions during tutorials.', 'Assign complex case studies requiring analytical thinking.'],
    'PO3': ['Include more design-oriented projects in the curriculum.', 'Organize workshops on system design and development.'],
    'PO4': ['Encourage participation in research-based projects.', 'Introduce mini-projects requiring data analysis and interpretation.'],
    'PO5': ['Integrate modern tools (e.g., MATLAB, CAD) into lab sessions.', 'Conduct training sessions on industry-standard software.'],
    'PO6': ['Organize guest lectures on the role of engineers in society.', 'Include social impact analysis in project reports.'],
    'PO7': ['Promote projects focused on sustainability and environment.', 'Introduce modules on green technology.'],
    'PO8': ['Conduct workshops on professional ethics and cyber laws.', 'Include case studies on ethical dilemmas in engineering.'],
    'PO9': ['Assign group projects to enhance team dynamics.', 'Encourage participation in team-based hackathons.'],
    'PO10': ['Organize soft skills training and presentation sessions.', 'Mandate technical report writing for all major projects.'],
    'PO11': ['Introduce basics of project management and finance in projects.', 'Encourage students to plan project budgets and timelines.'],
    'PO12': ['Encourage usage of MOOCs (NPTEL, Coursera) for self-learning.', 'Promote membership in professional bodies like IEEE/ACM.'],
    'PSO1': ['Strengthen coding bootcamps and algorithmic problem solving.', 'Host hackathons focused on domain-specific challenges.'],
    'PSO2': ['Facilitate internships with core industry partners.', 'Focus on end-to-end software development lifecycles in projects.']
};

const ImprovementActionsPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [surveyData, setSurveyData] = useState({ exitSurvey: {}, employerSurvey: {}, alumniSurvey: {} });
    const [config, setConfig] = useState(null);

    const THRESHOLD = 1.9;

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [coursesRes, posRes, psosRes, matrixRes, configRes, surveyRes] = await Promise.all([
                    api.get('/courses'),
                    api.get('/pos'),
                    api.get('/psos'),
                    api.get('/articulationMatrix'),
                    api.get('/configurations/global'),
                    api.get(`/surveys/${user?.departmentId}`).catch(() => ({ data: {} }))
                ]);

                setCourses(coursesRes.data);
                setOutcomes([...posRes.data, ...psosRes.data]);
                setMatrix(matrixRes.data);
                setConfig(configRes.data);
                if (surveyRes.data) setSurveyData(surveyRes.data);

            } catch (error) {
                console.error("Failed to load evaluation data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // 2. Calculate Attainment
    const lowAttainmentData = useMemo(() => {
        if (!outcomes.length) return [];

        // Filter valid courses
        const validCourses = courses.filter(c => matrix[c.id]);

        // Calculate Course Averages
        const courseAverages = validCourses.map(course => {
            const courseMatrix = matrix[course.id];
            const avgs = {};
            outcomes.forEach(outcome => {
                let sum = 0, count = 0;
                Object.values(courseMatrix).forEach(coMap => {
                    const val = coMap[outcome.id];
                    if (val) { sum += val; count++; }
                });
                if (count > 0) avgs[outcome.id] = sum / count;
            });
            return { id: course.id, avgs };
        });

        // Calculate Direct Attainment (Average of courses)
        const directAttainment = {};
        outcomes.forEach(outcome => {
            let sum = 0, count = 0;
            courseAverages.forEach(c => {
                if (c.avgs[outcome.id]) { sum += c.avgs[outcome.id]; count++; }
            });
            directAttainment[outcome.id] = count > 0 ? sum / count : 0;
        });

        // Calculate Indirect Attainment (Surveys)
        const { exitSurvey = {}, employerSurvey = {}, alumniSurvey = {} } = surveyData;
        const indirectAttainment = {};
        outcomes.forEach(outcome => {
            const v1 = parseFloat(exitSurvey[outcome.id]) || 0;
            const v2 = parseFloat(employerSurvey[outcome.id]) || 0;
            const v3 = parseFloat(alumniSurvey[outcome.id]) || 0;
            let total = v1 + v2 + v3;
            let divisor = (v1 ? 1 : 0) + (v2 ? 1 : 0) + (v3 ? 1 : 0);
            indirectAttainment[outcome.id] = divisor > 0 ? total / divisor : 0;
        });

        // Calculate Final Attainment & Filter
        const directWeight = (config?.attainmentRules?.finalWeightage?.direct || 80) / 100;
        const indirectWeight = (config?.attainmentRules?.finalWeightage?.indirect || 20) / 100;

        const lowPerformers = [];

        outcomes.forEach(outcome => {
            const da = directAttainment[outcome.id] || 0;
            const ia = indirectAttainment[outcome.id] || 0;
            const total = (da * directWeight) + (ia * indirectWeight);

            if (total < THRESHOLD) {
                lowPerformers.push({
                    ...outcome,
                    attained: total.toFixed(2),
                    suggestions: SUGGESTIONS_DB[outcome.id] || ['Review curriculum gaps for this outcome.', 'Consult senior faculty for pedagogical improvements.']
                });
            }
        });

        return lowPerformers;

    }, [courses, outcomes, matrix, surveyData, config]);

    if (loading) return <div className="p-12 text-center text-gray-500">Analyzing attainment data...</div>;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Improvement Actions</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Analysis of outcomes falling below the target attainment level of <strong>{THRESHOLD}</strong>
                </p>
            </div>

            {lowAttainmentData.length === 0 ? (
                <Card className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="rounded-full bg-green-100 p-3 mb-4 dark:bg-green-800">
                            <Icons.ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-200" />
                        </div>
                        <h3 className="text-xl font-bold text-green-800 dark:text-green-100">Excellent!</h3>
                        <p className="text-green-700 dark:text-green-300 mt-2">All Program Outcomes have reached the target attainment level of {THRESHOLD}.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {lowAttainmentData.map(item => (
                        <Card key={item.id} className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-red-700 dark:text-red-400">{item.id}</CardTitle>
                                            <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full dark:bg-red-900/50 dark:text-red-200">
                                                Attainment: {item.attained}
                                            </span>
                                        </div>
                                        <CardDescription className="mt-1 font-medium text-gray-700 dark:text-gray-300">
                                            {item.description}
                                        </CardDescription>
                                    </div>
                                    <div className="p-2 bg-red-50 rounded-full dark:bg-red-900/20">
                                        <Icons.Target className="h-6 w-6 text-red-500" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <Icons.Syllabus className="h-4 w-4" /> Suggested Implementations
                                </h4>
                                <ul className="space-y-2">
                                    {item.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                            <span className="mr-2 text-primary-500">•</span>
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImprovementActionsPage;