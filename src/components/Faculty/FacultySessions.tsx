import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Plus, QrCode, Hash, Clock, Users, XCircle } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  session_date: string;
  duration_minutes: number;
  attendance_code: string;
  is_active: boolean;
  expires_at: string;
  courses: { name: string; code: string };
  attendanceCount?: number;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

export function FacultySessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    duration_minutes: 60,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, code, name')
        .eq('faculty_id', profile!.id);

      setCourses(coursesData || []);

      const courseIds = coursesData?.map((c) => c.id) || [];

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select(`
          *,
          courses (name, code)
        `)
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      if (sessionsData) {
        const sessionsWithCounts = await Promise.all(
          sessionsData.map(async (session) => {
            const { count } = await supabase
              .from('attendance')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', session.id);

            return { ...session, attendanceCount: count || 0 };
          })
        );

        setSessions(sessionsWithCounts as Session[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + formData.duration_minutes * 60000);

      const { error } = await supabase.from('sessions').insert({
        course_id: formData.course_id,
        title: formData.title,
        duration_minutes: formData.duration_minutes,
        attendance_code: generateCode(),
        is_active: true,
        created_by: profile!.id,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      setShowModal(false);
      setFormData({ course_id: '', title: '', duration_minutes: 60 });
      await fetchData();
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    }
  };

  const handleDeactivate = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deactivating session:', error);
      alert('Failed to deactivate session');
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Attendance Sessions</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Session</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No sessions created yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-green-500 hover:text-green-600 font-medium"
          >
            Create your first session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessions.map((session) => {
            const isExpired = new Date(session.expires_at) < new Date();
            const isActive = session.is_active && !isExpired;

            return (
              <div
                key={session.id}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 ${
                  isActive ? 'border-2 border-green-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {session.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {session.courses.code} - {session.courses.name}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Ended
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(session.session_date).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{session.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{session.attendanceCount} students attended</span>
                  </div>
                </div>

                {isActive && (
                  <div className="border-t pt-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        Attendance Code
                      </p>
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Hash className="w-5 h-5 text-blue-600" />
                        <span className="text-2xl font-bold font-mono text-blue-600">
                          {session.attendance_code}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Share this code with students to mark attendance
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  {isActive ? (
                    <>
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>View Code</span>
                      </button>
                      <button
                        onClick={() => handleDeactivate(session.id)}
                        className="flex items-center justify-center space-x-2 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="flex-1 bg-gray-100 text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed"
                    >
                      Session Ended
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Create Attendance Session
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Lecture 1: Introduction"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min={5}
                  max={180}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long students can mark attendance
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedSession.title}
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedSession.courses.code}
            </p>

            <div className="bg-blue-50 rounded-lg p-8 mb-6">
              <p className="text-sm text-gray-600 mb-3">
                Share this code with students
              </p>
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Hash className="w-8 h-8 text-blue-600" />
                <span className="text-5xl font-bold font-mono text-blue-600">
                  {selectedSession.attendance_code}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Expires: {new Date(selectedSession.expires_at).toLocaleTimeString()}
              </p>
            </div>

            <button
              onClick={() => setSelectedSession(null)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
