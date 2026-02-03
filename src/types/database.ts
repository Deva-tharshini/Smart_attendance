export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'student' | 'faculty' | 'admin';
          student_id: string | null;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'student' | 'faculty' | 'admin';
          student_id?: string | null;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'student' | 'faculty' | 'admin';
          student_id?: string | null;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          department: string;
          faculty_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          department: string;
          faculty_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          department?: string;
          faculty_id?: string | null;
          created_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          enrolled_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          session_date: string;
          duration_minutes: number;
          attendance_code: string;
          qr_code: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          session_date?: string;
          duration_minutes?: number;
          attendance_code: string;
          qr_code?: string | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          session_date?: string;
          duration_minutes?: number;
          attendance_code?: string;
          qr_code?: string | null;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          marked_at: string;
          method: 'qr' | 'otp';
          status: 'present' | 'late';
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          marked_at?: string;
          method: 'qr' | 'otp';
          status?: 'present' | 'late';
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          marked_at?: string;
          method?: 'qr' | 'otp';
          status?: 'present' | 'late';
        };
      };
    };
  };
}
