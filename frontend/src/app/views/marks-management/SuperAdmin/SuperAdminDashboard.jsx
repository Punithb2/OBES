import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api'; // Use your configured axios instance
import Icons from '../shared/icons';
import { Card } from '../shared/Card';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    faculty: 0,
    students: 0,
    courses: 0,
    departments: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Execute all API requests in parallel
      // IMPORTANT: Added trailing slashes '/' to match Django URL patterns
      const [usersRes, coursesRes, deptsRes] = await Promise.all([
        api.get('/users/'),
        api.get('/courses/'),
        api.get('/departments/')
      ]);

      // Calculate stats from the real data
      // We check if data exists and is an array to avoid errors
      const users = Array.isArray(usersRes.data) ? usersRes.data : [];
      const courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
      const depts = Array.isArray(deptsRes.data) ? deptsRes.data : [];

      const totalFaculty = users.filter(u => u.role === 'faculty').length;
      const totalStudents = users.filter(u => u.role === 'student').length; 

      setStats({
        faculty: totalFaculty,
        students: totalStudents,
        courses: courses.length,
        departments: depts.length
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
      // Optional: Set some error state to show a message to the user
      setLoading(false);
    }
  };

  const menuItems = [
    { 
      title: 'Department Management', 
      icon: Icons.BuildingOffice, 
      path: '/superadmin/departments', // Must match routes.jsx
      color: 'bg-blue-500',
      description: 'Manage departments and HODs'
    },
    { 
      title: 'Admin Management', 
      icon: Icons.UserGroup, 
      path: '/superadmin/admins', // Must match routes.jsx
      color: 'bg-green-500',
      description: 'Manage department administrators'
    },
    { 
      title: 'Department Attainment', 
      icon: Icons.ChartBar, 
      path: '/superadmin/attainment', // Must match routes.jsx
      color: 'bg-purple-500',
      description: 'View department-wise performance'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overview of institution performance
          </p>
        </div>
        <button 
            onClick={fetchStats}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="Refresh Data"
        >
            <Icons.ArrowPath className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Faculty</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.faculty}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <Icons.Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.students}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
              <Icons.AcademicCap className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.courses}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full">
              <Icons.BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departments</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.departments}</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full">
              <Icons.BuildingOffice className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Menu Grid */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {menuItems.map((item, index) => (
          <Card 
            key={index}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => navigate(item.path)}
          >
            <div className="p-6">
              <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;