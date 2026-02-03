import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Plus, X } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department: string;
  faculty_id: string | null;
  profiles?: { full_name: string };
  isEnrolled?: boolean;
}

export function StudentCourses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data: allCourses } = await supabase
        .from('courses')
        .select(`
          *,
          profiles:faculty_id (full_name)
        `)
        .order('name');

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile!.id);

      const enrolledIds = new Set(enrollments?.map((e) => e.course_id) || []);

      const coursesWithEnrollment = (allCourses || []).map((course) => ({
        ...course,
        isEnrolled: enrolledIds.has(course.id),
      }));

      setCourses(coursesWithEnrollment);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: profile!.id,
          course_id: courseId,
        });

      if (error) throw error;
      await fetchCourses();
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll in course');
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!confirm('Are you sure you want to unenroll from this course?')) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', profile!.id)
        .eq('course_id', courseId);

      if (error) throw error;
      await fetchCourses();
    } catch (error) {
      console.error('Error unenrolling:', error);
      alert('Failed to unenroll from course');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const enrolledCourses = courses.filter((c) => c.isEnrolled);
  const availableCourses = courses.filter((c) => !c.isEnrolled);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          My Enrolled Courses
        </h2>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              You haven't enrolled in any courses yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {course.code}
                    </h3>
                    <p className="text-sm text-gray-600">{course.name}</p>
                  </div>
                  <button
                    onClick={() => handleUnenroll(course.id)}
                    className="text-red-500 hover:text-red-600"
                    title="Unenroll"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  {course.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{course.department}</span>
                  <span className="text-gray-500">
                    {course.profiles?.full_name || 'No instructor'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Available Courses
        </h2>

        {availableCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              No more courses available to enroll
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {course.code}
                  </h3>
                  <p className="text-sm text-gray-600">{course.name}</p>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  {course.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-600">{course.department}</span>
                  <span className="text-gray-500">
                    {course.profiles?.full_name || 'No instructor'}
                  </span>
                </div>

                <button
                  onClick={() => handleEnroll(course.id)}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
