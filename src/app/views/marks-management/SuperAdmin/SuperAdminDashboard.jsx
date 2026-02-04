import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import api from '../../../services/api';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState({
        deptCount: 0,
        facultyCount: 0,
        courseCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const [deptRes, facultyRes, coursesRes] = await Promise.all([
                    api.get('/departments'),
                    api.get('/users?role=faculty'),
                    api.get('/courses')
                ]);

                setStats({
                    deptCount: deptRes.data.length,
                    facultyCount: facultyRes.data.length,
                    courseCount: coursesRes.data.length
                });
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Super Admin Dashboard</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Overview of all departments</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Departments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {loading ? '...' : stats.deptCount}
                        </p>
                    </CardContent>
                </Card>
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

export default SuperAdminDashboard;