/*
  # Smart Attendance System Schema

  ## Overview
  Complete database schema for a smart attendance management system with role-based access control.

  ## New Tables
  
  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique)
  - `full_name` (text)
  - `role` (text: 'student', 'faculty', 'admin')
  - `student_id` (text, nullable, unique for students)
  - `department` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `courses`
  Course information
  - `id` (uuid, primary key)
  - `code` (text, unique)
  - `name` (text)
  - `description` (text, nullable)
  - `department` (text)
  - `faculty_id` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 3. `enrollments`
  Student course enrollments
  - `id` (uuid, primary key)
  - `student_id` (uuid, references profiles)
  - `course_id` (uuid, references courses)
  - `enrolled_at` (timestamptz)

  ### 4. `sessions`
  Class sessions where attendance is taken
  - `id` (uuid, primary key)
  - `course_id` (uuid, references courses)
  - `title` (text)
  - `session_date` (timestamptz)
  - `duration_minutes` (integer)
  - `attendance_code` (text, unique, for OTP)
  - `qr_code` (text, nullable)
  - `is_active` (boolean)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)
  - `expires_at` (timestamptz)

  ### 5. `attendance`
  Attendance records
  - `id` (uuid, primary key)
  - `session_id` (uuid, references sessions)
  - `student_id` (uuid, references profiles)
  - `marked_at` (timestamptz)
  - `method` (text: 'qr', 'otp')
  - `status` (text: 'present', 'late')

  ## Security
  - Enable RLS on all tables
  - Policies for role-based access control:
    - Students: Can view own data, mark attendance
    - Faculty: Can manage own courses and sessions
    - Admin: Can view and manage all data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  student_id text UNIQUE,
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  department text NOT NULL,
  faculty_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  session_date timestamptz DEFAULT now(),
  duration_minutes integer DEFAULT 60,
  attendance_code text UNIQUE NOT NULL,
  qr_code text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  marked_at timestamptz DEFAULT now(),
  method text NOT NULL CHECK (method IN ('qr', 'otp')),
  status text DEFAULT 'present' CHECK (status IN ('present', 'late')),
  UNIQUE(session_id, student_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Courses policies
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Faculty can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
  );

CREATE POLICY "Faculty can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (
    faculty_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    faculty_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Faculty can delete own courses"
  ON courses FOR DELETE
  TO authenticated
  USING (
    faculty_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enrollments policies
CREATE POLICY "Users can view enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
  );

CREATE POLICY "Students can enroll in courses"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

CREATE POLICY "Students can unenroll"
  ON enrollments FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- Sessions policies
CREATE POLICY "Users can view sessions for their courses"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = sessions.course_id
      AND (
        courses.faculty_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM enrollments
          WHERE enrollments.course_id = courses.id
          AND enrollments.student_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Faculty can create sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = sessions.course_id
      AND courses.faculty_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Faculty can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Attendance policies
CREATE POLICY "Users can view relevant attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = attendance.session_id
      AND (c.faculty_id = auth.uid() OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Students can mark attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_courses_faculty ON courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();