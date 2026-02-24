import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { Icons } from '../shared/icons';
import { BlockSkeleton } from '../shared/SkeletonLoaders';

// Mock suggestions database (In a real app, this could be an API endpoint)
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
    const [surveyData, setSurveyData] = useState({ exit_survey: {}, employer_survey: {}, alumni_survey: {} });
    const [schemes, setSchemes] = useState([]);
    
    // NEW: Store backend-calculated CO reports for each course
    const [courseReports, setCourseReports] = useState({});

    // Target Threshold (Outcomes below this value will be flagged)
    const THRESHOLD = 2.0; 

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                const [coursesRes, posRes, psosRes, matrixRes, schemesRes, surveyRes] = await Promise.all([
                    api.get(`/courses/?department=${deptId}`), // Fixed to use 'department'
                    api.get('/pos/'),
                    api.get('/psos/'),
                    api.get(`/articulation-matrix/?department=${deptId}`).catch(() => ({ data: { results: [] } })),
                    api.get('/schemes/').catch(() => ({ data: { results: [] } })),
                    api.get(`/surveys/?department=${deptId}`).catch(() => ({ data: { results: [] } }))
                ]);

                // FIX: Safely extract data handling Django's paginated responses
                const fetchedCourses = coursesRes.data.results || coursesRes.data || [];
                const fetchedPos = posRes.data.results || posRes.data || [];
                const fetchedPsos = psosRes.data.results || psosRes.data || [];
                const fetchedMatrix = matrixRes.data.results || matrixRes.data || [];
                const fetchedSchemes = schemesRes.data.results || schemesRes.data || [];
                const fetchedSurveys = surveyRes.data.results || surveyRes.data || [];

                // Sort outcomes naturally
                const sortById = (a, b) => {
                    const numA = parseInt((a.id || '').match(/\d+/)?.[0] || 0);
                    const numB = parseInt((b.id || '').match(/\d+/)?.[0] || 0);
                    return numA - numB;
                };

                const safePos = Array.isArray(fetchedPos) ? [...fetchedPos].sort(sortById) : [];
                const safePsos = Array.isArray(fetchedPsos) ? [...fetchedPsos].sort(sortById) : [];
                const safeCourses = Array.isArray(fetchedCourses) ? fetchedCourses : [];

                setCourses(safeCourses);
                setOutcomes([...safePos, ...safePsos]);
                setSchemes(Array.isArray(fetchedSchemes) ? fetchedSchemes : []);
                
                const mBuilder = {};
                if (Array.isArray(fetchedMatrix)) {
                    fetchedMatrix.forEach(item => {
                        if (item.course && item.matrix) mBuilder[item.course] = item.matrix;
                    });
                }
                setMatrix(mBuilder);
                
                // Handle Survey Data
                if (Array.isArray(fetchedSurveys) && fetchedSurveys.length > 0) {
                    setSurveyData(fetchedSurveys[0]);
                }

                // DYNAMICALLY FETCH PRE-CALCULATED REPORTS FOR ALL COURSES
                const reportsMap = {};
                const reportPromises = safeCourses.map(course => 
                    api.get(`/reports/course-attainment/${course.id}/`).catch(() => null)
                );
                
                const reports = await Promise.all(reportPromises);
                
                safeCourses.forEach((course, index) => {
                    const res = reports[index];
                    if (res && res.data && res.data.co_attainment) {
                        reportsMap[course.id] = res.data.co_attainment;
                    } else {
                        reportsMap[course.id] = [];
                    }
                });
                
                setCourseReports(reportsMap);

            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // 2. Calculate Attainment
    const lowAttainmentData = useMemo(() => {
        if (!outcomes.length || !courses.length) return [];

        // Calculate Direct Attainment (Course Average mapped to POs)
        const courseRows = courses.map(course => {
            const coData = courseReports[course.id] || [];
            const courseMatrix = matrix[course.id] || {};
            const poAttainment = {};

            outcomes.forEach(outcome => {
                let wSum = 0, wCount = 0;
                coData.forEach(coItem => {
                    const mapVal = parseFloat(courseMatrix[coItem.co]?.[outcome.id]);
                    if (!isNaN(mapVal)) {
                        wSum += (mapVal * coItem.score_index) / 3;
                        wCount++;
                    }
                });
                if (wCount > 0) poAttainment[outcome.id] = wSum / wCount;
            });

            return { course, attainment: poAttainment };
        });

        const directAttainment = {};
        outcomes.forEach(outcome => {
            let sum = 0, count = 0;
            courseRows.forEach(row => {
                if (row.attainment[outcome.id] !== undefined) {
                    sum += row.attainment[outcome.id];
                    count++;
                }
            });
            if (count > 0) directAttainment[outcome.id] = sum / count;
        });

        // Calculate Indirect Attainment (Surveys)
        const exitData = surveyData.exit_survey || {};
        const employerData = surveyData.employer_survey || {};
        const alumniData = surveyData.alumni_survey || {};

        const indirectAttainment = {};
        outcomes.forEach(outcome => {
            const v1 = parseFloat(exitData[outcome.id]) || 0;
            const v2 = parseFloat(employerData[outcome.id]) || 0;
            const v3 = parseFloat(alumniData[outcome.id]) || 0;
            
            let total = v1 + v2 + v3;
            let divisor = (v1 ? 1 : 0) + (v2 ? 1 : 0) + (v3 ? 1 : 0);
            indirectAttainment[outcome.id] = divisor > 0 ? total / divisor : 0;
        });

        // Calculate Final Attainment & Filter
        // Note: Using the first available scheme to get global weightages as a fallback
        const refScheme = schemes.length > 0 ? schemes[0] : null;
        const refRules = refScheme?.settings?.attainment_rules || {};
        const directWeight = (refRules.finalWeightage?.direct || 80) / 100;
        const indirectWeight = (refRules.finalWeightage?.indirect || 20) / 100;

        const lowPerformers = [];

        outcomes.forEach(outcome => {
            const da = directAttainment[outcome.id] || 0;
            const ia = indirectAttainment[outcome.id] || 0;
            const total = (da * directWeight) + (ia * indirectWeight);

            // Only flag if attainment is non-zero AND below threshold
            if (total > 0 && total < THRESHOLD) {
                lowPerformers.push({
                    ...outcome,
                    attained: total.toFixed(2),
                    suggestions: SUGGESTIONS_DB[outcome.id] || ['Review curriculum gaps.', 'Consult academic experts.']
                });
            }
        });

        return lowPerformers;

    }, [courses, outcomes, matrix, surveyData, schemes, courseReports]);

    if (loading) return <div className="p-6 space-y-6 pb-10"><div className="w-64 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8"></div><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /><BlockSkeleton className="h-64" /></div>;

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
                        <h3 className="text-xl font-bold text-green-800 dark:text-green-100">Excellent Performance!</h3>
                        <p className="text-green-700 dark:text-green-300 mt-2 text-center">
                            All measured Program Outcomes have reached or exceeded the target attainment level of {THRESHOLD}.<br/>
                            (Or insufficient data is available to calculate attainment).
                        </p>
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