import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface CourseReport {
  courseId: string;
  courseCode: string;
  courseName: string;
  department: string;
  facultyName: string;
  totalStudents: number;
  totalSessions: number;
  avgAttendance: number;
}

export function AdminReports() {
  const [reports, setReports] = useState<CourseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'attendance'>('name');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    sortReports();
  }, [sortBy]);

  const fetchReports = async () => {
    try {
      const { data: courses } = await supabase
        .from('courses')
        .select(`
          id,
          code,
          name,
          department,
          profiles:faculty_id (full_name)
        `);

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

        const { count: enrollmentCount } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        const { data: attendance } = await supabase
          .from('attendance')
          .select('id')
          .in('session_id', sessions?.map((s) => s.id) || []);

        const totalSessions = sessions?.length || 0;
        const totalStudents = enrollmentCount || 0;
        const totalPossibleAttendance = totalSessions * totalStudents || 1;
        const avgAttendance = Math.round(
          ((attendance?.length || 0) / totalPossibleAttendance) * 100
        );

        const faculty = course.profiles as any;

        courseReports.push({
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          department: course.department,
          facultyName: faculty?.full_name || 'Unassigned',
          totalStudents,
          totalSessions,
          avgAttendance: isNaN(avgAttendance) ? 0 : avgAttendance,
        });
      }

      setReports(courseReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortReports = () => {
    const sorted = [...reports].sort((a, b) => {
      if (sortBy === 'attendance') {
        return b.avgAttendance - a.avgAttendance;
      }
      return a.courseName.localeCompare(b.courseName);
    });
    setReports(sorted);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const overallStats = {
    totalCourses: reports.length,
    avgAttendance: reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.avgAttendance, 0) / reports.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Reports</h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'attendance')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="name">Sort by Name</option>
          <option value="attendance">Sort by Attendance</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Total Courses</h3>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {overallStats.totalCourses}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">System Avg Attendance</h3>
            {overallStats.avgAttendance >= 75 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {overallStats.avgAttendance}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">
            Course-wise Report
          </h3>
        </div>

        <div className="overflow-x-auto">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No data available
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faculty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.courseId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {report.courseCode}
                        </div>
                        <div className="text-sm text-gray-600">
                          {report.courseName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {report.department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {report.facultyName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {report.totalStudents}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {report.totalSessions}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          report.avgAttendance >= 75
                            ? 'bg-green-100 text-green-800'
                            : report.avgAttendance >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {report.avgAttendance}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
