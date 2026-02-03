import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Calendar, CheckCircle, TrendingUp } from 'lucide-react';

export function StudentDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    upcomingSessions: 0,
    attendanceRate: 0,
    totalAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile!.id);

      const courseIds = enrollments?.map((e) => e.course_id) || [];

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('course_id', courseIds)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());

      const { data: attendance } = await supabase
        .from('attendance')
        .select('id, session_id')
        .eq('student_id', profile!.id);

      const { data: allSessions } = await supabase
        .from('sessions')
        .select('id')
        .in('course_id', courseIds)
        .lte('created_at', new Date().toISOString());

      const totalAttendance = attendance?.length || 0;
      const totalSessions = allSessions?.length || 1;
      const attendanceRate = Math.round((totalAttendance / totalSessions) * 100);

      setStats({
        totalCourses: enrollments?.length || 0,
        upcomingSessions: sessions?.length || 0,
        attendanceRate: isNaN(attendanceRate) ? 0 : attendanceRate,
        totalAttendance,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Enrolled Courses',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'blue',
    },
    {
      title: 'Active Sessions',
      value: stats.upcomingSessions,
      icon: Calendar,
      color: 'green',
    },
    {
      title: 'Total Attendance',
      value: stats.totalAttendance,
      icon: CheckCircle,
      color: 'orange',
    },
    {
      title: 'Attendance Rate',
      value: `${stats.attendanceRate}%`,
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
          Here's your attendance overview
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

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          Quick Tip
        </h3>
        <p className="text-blue-700">
          Don't forget to mark your attendance for active sessions. Check the "Mark Attendance" page to scan QR codes or enter OTP codes.
        </p>
      </div>
    </div>
  );
}
