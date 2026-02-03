import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Users } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department: string;
  profiles: { full_name: string } | null;
  enrollmentCount?: number;
  sessionCount?: number;
}

export function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select(`
          *,
          profiles:faculty_id (full_name)
        `)
        .order('name');

      if (data) {
        const coursesWithStats = await Promise.all(
          data.map(async (course) => {
            const { count: enrollmentCount } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);

            const { count: sessionCount } = await supabase
              .from('sessions')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);

            return {
              ...course,
              enrollmentCount: enrollmentCount || 0,
              sessionCount: sessionCount || 0,
            };
          })
        );

        setCourses(coursesWithStats as Course[]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">All Courses</h2>
        <p className="text-gray-600 mt-1">
          Complete overview of all courses in the system
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No courses available</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {course.code}
                        </div>
                        <div className="text-sm text-gray-600">{course.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {course.department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {course.profiles?.full_name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{course.enrollmentCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {course.sessionCount}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
