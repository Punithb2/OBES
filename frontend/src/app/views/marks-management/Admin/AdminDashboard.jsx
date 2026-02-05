import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import api from '../../../services/api';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        faculty: 0,
        students: 0, // Added Students back (optional, but good to have)
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
                // Django REST default: GET /departments/{id}/
                const deptRes = await api.get(`/departments/${deptId}/`);
                
                // 2. Fetch Faculty Count
                // Filter by role='faculty' AND department
                const facultyRes = await api.get(`/users/?role=faculty&department=${deptId}`);
                
                // 3. Fetch Course Count
                // Filter courses by departmentId
                const coursesRes = await api.get(`/courses/?departmentId=${deptId}`);

                // 4. Fetch Student Count (Optional - added for completeness)
                const studentsRes = await api.get(`/students/?department=${deptId}`);

                setStats({
                    departmentName: deptRes.data.name,
                    faculty: facultyRes.data.length,
                    courses: coursesRes.data.length,
                    students: studentsRes.data.length // Added this
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

                {/* Added Student Card for completeness */}
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