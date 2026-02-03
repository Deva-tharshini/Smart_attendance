import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { StudentDashboard } from './components/Student/StudentDashboard';
import { StudentCourses } from './components/Student/StudentCourses';
import { MarkAttendance } from './components/Student/MarkAttendance';
import { StudentReports } from './components/Student/StudentReports';
import { FacultyDashboard } from './components/Faculty/FacultyDashboard';
import { FacultyCourses } from './components/Faculty/FacultyCourses';
import { FacultySessions } from './components/Faculty/FacultySessions';
import { FacultyReports } from './components/Faculty/FacultyReports';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminUsers } from './components/Admin/AdminUsers';
import { AdminCourses } from './components/Admin/AdminCourses';
import { AdminReports } from './components/Admin/AdminReports';

function AuthScreen() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      {showLogin ? (
        <Login onToggle={() => setShowLogin(false)} />
      ) : (
        <Register onToggle={() => setShowLogin(true)} />
      )}
    </div>
  );
}

function MainApp() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthScreen />;
  }

  const renderContent = () => {
    if (profile.role === 'student') {
      switch (currentPage) {
        case 'dashboard':
          return <StudentDashboard />;
        case 'courses':
          return <StudentCourses />;
        case 'attendance':
          return <MarkAttendance />;
        case 'reports':
          return <StudentReports />;
        default:
          return <StudentDashboard />;
      }
    } else if (profile.role === 'faculty') {
      switch (currentPage) {
        case 'dashboard':
          return <FacultyDashboard />;
        case 'courses':
          return <FacultyCourses />;
        case 'sessions':
          return <FacultySessions />;
        case 'reports':
          return <FacultyReports />;
        default:
          return <FacultyDashboard />;
      }
    } else if (profile.role === 'admin') {
      switch (currentPage) {
        case 'dashboard':
          return <AdminDashboard />;
        case 'users':
          return <AdminUsers />;
        case 'courses':
          return <AdminCourses />;
        case 'reports':
          return <AdminReports />;
        default:
          return <AdminDashboard />;
      }
    }

    return <div>Invalid role</div>;
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderContent()}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
