import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { QrCode, Hash, CheckCircle } from 'lucide-react';

export function MarkAttendance() {
  const { profile } = useAuth();
  const [attendanceCode, setAttendanceCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, course_id, expires_at, is_active')
        .eq('attendance_code', attendanceCode.trim().toUpperCase())
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (!session) {
        setError('Invalid attendance code');
        setLoading(false);
        return;
      }

      if (!session.is_active) {
        setError('This session is no longer active');
        setLoading(false);
        return;
      }

      if (new Date(session.expires_at) < new Date()) {
        setError('This attendance code has expired');
        setLoading(false);
        return;
      }

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', profile!.id)
        .eq('course_id', session.course_id)
        .maybeSingle();

      if (!enrollment) {
        setError('You are not enrolled in this course');
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('session_id', session.id)
        .eq('student_id', profile!.id)
        .maybeSingle();

      if (existing) {
        setError('You have already marked attendance for this session');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          session_id: session.id,
          student_id: profile!.id,
          method: 'otp',
          status: 'present',
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setAttendanceCode('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError('Failed to mark attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-500 p-4 rounded-full">
            <QrCode className="w-10 h-10 text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Mark Your Attendance
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Enter the attendance code provided by your instructor
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700 font-medium">
              Attendance marked successfully!
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleMarkAttendance} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendance Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={attendanceCode}
                onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono uppercase"
                placeholder="Enter code"
                required
                maxLength={8}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter the 6-8 character code displayed by your instructor
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || attendanceCode.length < 4}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {loading ? 'Marking Attendance...' : 'Mark Attendance'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold text-gray-900 mb-3">How it works:</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <span>Your instructor will share an attendance code during class</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <span>Enter the code in the field above</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">3.</span>
              <span>Submit to mark your attendance for that session</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
