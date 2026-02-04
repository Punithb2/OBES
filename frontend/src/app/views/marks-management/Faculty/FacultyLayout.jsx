import React, { useState } from 'react';
import MainLayout from '../shared/MainLayout'; // Updated path
import { useAuth } from 'app/contexts/AuthContext'; // Updated path
import { Icons } from '../shared/icons'; // Updated path
import Dashboard from './FacultyDashboard'; // Updated path
import ArticulationMatrixPage from './ArticulationMatrixPage'; // Updated path
import MarksEntryPage from './MarksEntryPage'; // Updated path
import AttainmentReportPage from './AttainmentReportPage'; // Updated path
import CoPoAttainmentPage from './CoPoAttainmentPage'; // Updated path
import IndirectCoAttainmentPage from './IndirectCoAttainmentPage'; // Updated path

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
  { id: 'matrix', label: 'Articulation Matrix', icon: Icons.ArticulationMatrix },
  { id: 'marks', label: 'Marks Entry', icon: Icons.MarksEntry },
  { id: 'indirect-co', label: 'Indirect CO Attainment', icon: Icons.Syllabus },
  { id: 'attainment', label: 'CO-PO Attainment', icon: Icons.Target },
  { id: 'reports', label: 'Attainment Reports', icon: Icons.Reports },
];

const FacultyLayout = () => {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'matrix':
        return <ArticulationMatrixPage />;
      case 'marks':
        return <MarksEntryPage />;
      case 'reports':
        return <AttainmentReportPage />;
      case 'attainment':
        return <CoPoAttainmentPage />;
      case 'indirect-co':
        return <IndirectCoAttainmentPage />;
      default:
        return <Dashboard />;
    }
  };
  
  if (!user) return null;

  return (
    <MainLayout
      user={user}
      navItems={navItems}
      activePageId={activePage}
      onNavItemClick={(id) => setActivePage(id)}
    >
      {renderPage()}
    </MainLayout>
  );
};

export default FacultyLayout;