import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, Calendar, CheckCircle } from 'lucide-react';

interface CourseAttendance {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
}

export function StudentReports() {
  const { profile } = useAuth();
  const [courseAttendance, setCourseAttendance] = useState<CourseAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', profile!.id);

      if (!enrollments) {
        setLoading(false);
        return;
      }

      const reports: CourseAttendance[] = [];

      for (const enrollment of enrollments) {
        const course = enrollment.courses as any;

        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('course_id', enrollment.course_id)
          .lte('created_at', new Date().toISOString());

        const { data: attendance } = await supabase
          .from('attendance')
          .select('id')
          .eq('student_id', profile!.id)
          .in('session_id', sessions?.map((s) => s.id) || []);

        const totalSessions = sessions?.length || 0;
        const attendedSessions = attendance?.length || 0;
        const attendanceRate = totalSessions > 0
          ? Math.round((attendedSessions / totalSessions) * 100)
          : 0;

        reports.push({
          courseId: course.id,
          courseName: course.name,
          courseCode: course.code,
          totalSessions,
          attendedSessions,
          attendanceRate,
        });
      }

      setCourseAttendance(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const overallStats = {
    totalSessions: courseAttendance.reduce((sum, c) => sum + c.totalSessions, 0),
    attendedSessions: courseAttendance.reduce((sum, c) => sum + c.attendedSessions, 0),
  };

  const overallRate = overallStats.totalSessions > 0
    ? Math.round((overallStats.attendedSessions / overallStats.totalSessions) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Total Sessions</h3>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {overallStats.totalSessions}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Attended</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {overallStats.attendedSessions}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Overall Rate</h3>
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overallRate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Course-wise Attendance
          </h2>
        </div>

        <div className="p-6">
          {courseAttendance.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No attendance data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseAttendance.map((course) => (
                <div
                  key={course.courseId}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {course.courseCode}
                      </h3>
                      <p className="text-sm text-gray-600">{course.courseName}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        course.attendanceRate >= 75
                          ? 'bg-green-100 text-green-700'
                          : course.attendanceRate >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {course.attendanceRate}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>
                      Attended: {course.attendedSessions} / {course.totalSessions}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        course.attendanceRate >= 75
                          ? 'bg-green-500'
                          : course.attendanceRate >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${course.attendanceRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
