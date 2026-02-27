import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api'; 
import Icons from '../shared/icons';
import { Card } from '../shared/Card';
import { SuperAdminDashboardSkeleton } from '../shared/SkeletonLoaders';

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
      
      // FIX: Added the /students/ endpoint to fetch the actual student count
      const [usersRes, coursesRes, deptsRes, studentsRes] = await Promise.all([
        api.get('/users/'),
        api.get('/courses/'),
        api.get('/departments/'),
        api.get('/students/') 
      ]);

      // Safely extract data handling Django's paginated responses
      const users = usersRes.data.results || usersRes.data || [];
      const courses = coursesRes.data.results || coursesRes.data || [];
      const depts = deptsRes.data.results || deptsRes.data || [];

      // Ensure we are working with arrays before filtering
      const safeUsers = Array.isArray(users) ? users : [];
      const safeCourses = Array.isArray(courses) ? courses : [];
      const safeDepts = Array.isArray(depts) ? depts : [];

      const totalFaculty = safeUsers.filter(u => u.role === 'faculty').length;
      
      // FIX: Count students directly from the students endpoint response
      const totalStudents = studentsRes.data.count !== undefined 
          ? studentsRes.data.count 
          : (studentsRes.data.results || studentsRes.data || []).length;

      setStats({
        faculty: totalFaculty,
        students: totalStudents,
        courses: coursesRes.data.count !== undefined ? coursesRes.data.count : safeCourses.length,
        departments: deptsRes.data.count !== undefined ? deptsRes.data.count : safeDepts.length
      });
      
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { 
      title: 'Department Management', 
      icon: Icons.BuildingOffice, 
      path: '/superadmin/departments', 
      color: 'bg-blue-500',
      description: 'Manage departments and HODs'
    },
    { 
      title: 'Admin Management', 
      icon: Icons.UserGroup, 
      path: '/superadmin/admins', 
      color: 'bg-green-500',
      description: 'Manage department administrators'
    },
    { 
      title: 'Department Attainment', 
      icon: Icons.ChartBar, 
      path: '/superadmin/attainment', 
      color: 'bg-purple-500',
      description: 'View department-wise performance'
    }
  ];

  if (loading) {
    return <SuperAdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of institution performance
          </p>
        </div>
        <button 
            onClick={fetchStats}
            className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Refresh Data"
        >
            <Icons.ArrowPath className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Faculty</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.faculty}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <Icons.Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.students}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
              <Icons.AcademicCap className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.courses}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full">
              <Icons.BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Departments</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.departments}</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full">
              <Icons.BuildingOffice className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Menu Grid */}
      <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item, index) => (
              <Card 
                key={index}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                onClick={() => navigate(item.path)}
              >
                <div className="p-6">
                  <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {item.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;