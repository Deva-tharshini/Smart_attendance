import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Calendar, Users, TrendingUp } from 'lucide-react';

export function FacultyDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    activeSessions: 0,
    totalStudents: 0,
    avgAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    try {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('faculty_id', profile!.id);

      const courseIds = courses?.map((c) => c.id) || [];

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('course_id', courseIds)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .in('course_id', courseIds);

      const uniqueStudents = new Set(enrollments?.map((e) => e.student_id) || []);

      const { data: allSessions } = await supabase
        .from('sessions')
        .select('id')
        .in('course_id', courseIds);

      const { data: attendance } = await supabase
        .from('attendance')
        .select('id')
        .in('session_id', allSessions?.map((s) => s.id) || []);

      const totalSessions = allSessions?.length || 1;
      const totalPossibleAttendance = totalSessions * uniqueStudents.size || 1;
      const actualAttendance = attendance?.length || 0;
      const avgAttendance = Math.round((actualAttendance / totalPossibleAttendance) * 100);

      setStats({
        totalCourses: courses?.length || 0,
        activeSessions: sessions?.length || 0,
        totalStudents: uniqueStudents.size,
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
      title: 'My Courses',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'blue',
    },
    {
      title: 'Active Sessions',
      value: stats.activeSessions,
      icon: Calendar,
      color: 'green',
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
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
          Welcome back, {profile?.full_name}!
        </h1>
        <p className="text-gray-600">
          Here's your teaching overview
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">
          Quick Actions
        </h3>
        <p className="text-green-700">
          Create a new session from the "Sessions" page to start taking attendance for your classes.
        </p>
      </div>
    </div>
  );
}
