import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import api from '../../../services/api';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        faculty: 0,
        students: 0,
        courses: 0,
        departmentName: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Ensure user has a department assigned
            if (!user || !user.department) return;

            try {
                setLoading(true);
                const deptId = user.department;

                // 1. Fetch Department Details (Get Name)
                const deptRes = await api.get(`/departments/${deptId}/`);
                
                // 2. Fetch Faculty Count
                const facultyRes = await api.get(`/users/?role=faculty&department=${deptId}`);
                
                // 3. Fetch Course Count (Fixed filter key to 'department' to match Django standards)
                const coursesRes = await api.get(`/courses/?department=${deptId}`);

                // 4. Fetch Student Count
                const studentsRes = await api.get(`/students/?department=${deptId}`);

                // Helper to safely extract count whether paginated or not
                const getCount = (res) => {
                    if (res.data && res.data.count !== undefined) return res.data.count; // Paginated
                    if (res.data && Array.isArray(res.data.results)) return res.data.results.length; // Paginated Fallback
                    if (Array.isArray(res.data)) return res.data.length; // Non-paginated
                    return 0;
                };

                setStats({
                    departmentName: deptRes.data.name || 'Department',
                    faculty: getCount(facultyRes),
                    courses: getCount(coursesRes),
                    students: getCount(studentsRes) 
                });

            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (!user) return null;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                {loading ? 'Loading department info...' : stats.departmentName}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Faculty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {loading ? '...' : stats.faculty}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Total Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {loading ? '...' : stats.courses}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {loading ? '...' : stats.students}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;