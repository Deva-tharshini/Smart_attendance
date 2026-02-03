import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, BookOpen, Calendar, TrendingUp } from 'lucide-react';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalCourses: 0,
    totalSessions: 0,
    avgAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role');

      const totalStudents = profiles?.filter((p) => p.role === 'student').length || 0;
      const totalFaculty = profiles?.filter((p) => p.role === 'faculty').length || 0;

      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });

      const { data: allSessions } = await supabase
        .from('sessions')
        .select('id, course_id');

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, course_id');

      const { data: attendance } = await supabase
        .from('attendance')
        .select('id');

      const totalPossibleAttendance = (allSessions?.length || 1) * new Set(enrollments?.map(e => e.student_id) || []).size || 1;
      const avgAttendance = Math.round(((attendance?.length || 0) / totalPossibleAttendance) * 100);

      setStats({
        totalUsers: profiles?.length || 0,
        totalStudents,
        totalFaculty,
        totalCourses: coursesCount || 0,
        totalSessions: sessionsCount || 0,
        avgAttendance: isNaN(avgAttendance) ? 0 : avgAttendance,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: `${stats.totalStudents} Students, ${stats.totalFaculty} Faculty`,
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Total Courses',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'green',
    },
    {
      title: 'Total Sessions',
      value: stats.totalSessions,
      icon: Calendar,
      color: 'orange',
    },
    {
      title: 'Avg Attendance',
      value: `${stats.avgAttendance}%`,
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          System Overview
        </h1>
        <p className="text-gray-600">
          Complete statistics of the Smart Attendance System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          Admin Panel
        </h3>
        <p className="text-blue-700">
          Use the navigation menu to manage users, view all courses, and access detailed reports.
        </p>
      </div>
    </div>
  );
}
