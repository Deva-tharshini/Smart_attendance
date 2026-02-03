import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface CourseReport {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalSessions: number;
  totalStudents: number;
  avgAttendance: number;
  students: {
    id: string;
    name: string;
    email: string;
    attendedSessions: number;
    attendanceRate: number;
  }[];
}

export function FacultyReports() {
  const { profile } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [reports, setReports] = useState<CourseReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('faculty_id', profile!.id);

      if (!courses) {
        setLoading(false);
        return;
      }

      const courseReports: CourseReport[] = [];

      for (const course of courses) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('course_id', course.id);

        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            student_id,
            profiles (
              id,
              full_name,
              email
            )
          `)
          .eq('course_id', course.id);

        const totalSessions = sessions?.length || 0;
        const totalStudents = enrollments?.length || 0;

        const students = await Promise.all(
          (enrollments || []).map(async (enrollment) => {
            const student = enrollment.profiles as any;

            const { data: attendance } = await supabase
              .from('attendance')
              .select('id')
              .eq('student_id', enrollment.student_id)
              .in('session_id', sessions?.map((s) => s.id) || []);

            const attendedSessions = attendance?.length || 0;
            const attendanceRate = totalSessions > 0
              ? Math.round((attendedSessions / totalSessions) * 100)
              : 0;

            return {
              id: student.id,
              name: student.full_name,
              email: student.email,
              attendedSessions,
              attendanceRate,
            };
          })
        );

        const avgAttendance = students.length > 0
          ? Math.round(
              students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length
            )
          : 0;

        courseReports.push({
          courseId: course.id,
          courseName: course.name,
          courseCode: course.code,
          totalSessions,
          totalStudents,
          avgAttendance,
          students: students.sort((a, b) => b.attendanceRate - a.attendanceRate),
        });
      }

      setReports(courseReports);
      if (courseReports.length > 0) {
        setSelectedCourseId(courseReports[0].courseId);
      }
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

  const selectedReport = reports.find((r) => r.courseId === selectedCourseId);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Course
        </label>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {reports.map((report) => (
            <option key={report.courseId} value={report.courseId}>
              {report.courseCode} - {report.courseName}
            </option>
          ))}
        </select>
      </div>

      {selectedReport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-gray-600">Total Sessions</h3>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {selectedReport.totalSessions}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-gray-600">Enrolled Students</h3>
                <BarChart3 className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {selectedReport.totalStudents}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-gray-600">Avg Attendance</h3>
                {selectedReport.avgAttendance >= 75 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {selectedReport.avgAttendance}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Student Attendance Report
              </h2>
            </div>

            <div className="overflow-x-auto">
              {selectedReport.students.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  No students enrolled in this course
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions Attended
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedReport.students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {student.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {student.attendedSessions} / {selectedReport.totalSessions}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              student.attendanceRate >= 75
                                ? 'bg-green-100 text-green-800'
                                : student.attendanceRate >= 50
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
