import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import api from '../../../services/api';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        facultyCount: 0,
        courseCount: 0,
        departmentName: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                setLoading(true);

                // 1. Fetch Faculty Count
                // Filter users where role is 'faculty' AND department matches the admin's
                const facultyRes = await api.get(`/users?role=faculty&departmentId=${user.departmentId}`);
                
                // 2. Fetch Course Count
                // Fetches all courses. You can filter this if courses belong to specific departments in your DB structure.
                const coursesRes = await api.get('/courses');

                // 3. Fetch Department Name
                // We use the admin's departmentId to get the actual name from the 'departments' endpoint
                const deptRes = await api.get(`/departments?id=${user.departmentId}`);
                const deptName = deptRes.data[0]?.name || 'Department';

                setStats({
                    facultyCount: facultyRes.data.length,
                    courseCount: coursesRes.data.length,
                    departmentName: deptName
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Faculty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {loading ? '...' : stats.facultyCount}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Total Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {loading ? '...' : stats.courseCount}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;