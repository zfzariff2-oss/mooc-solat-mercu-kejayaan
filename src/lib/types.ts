export type Role = "STUDENT" | "ADMIN";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  class_name: string | null;
  role: Role;
  profile_completed: boolean;
  created_at: string;
}

export interface LessonProgress {
  lesson_id: string;
  title: string;
  order: number;
  total_slides: number;
  slides_viewed: number;
  percentage: number;
  quiz_passed: boolean;
  completed: boolean;
}

export interface CertificateInfo {
  certificate_number: string;
  student_name?: string | null;
  class_name?: string | null;
  issued_at: string;
  score: number | null;
  total: number | null;
  duration_seconds: number | null;
}

export interface FinalState {
  status: "LOCKED" | "READY" | "IN_PROGRESS" | "SUBMITTED";
  attempt_id?: string;
  started_at?: string;
  submitted_at?: string;
  duration_seconds?: number;
  score?: number;
  total?: number;
  percentage?: number;
  certificate_number?: string;
  rank?: number;
  locked_reason?: string;
}

export interface DashboardData {
  profile: Profile;
  lessons: LessonProgress[];
  completed_lessons: number;
  total_lessons: number;
  course_percentage: number;
  final: FinalState;
  certificate: CertificateInfo | null;
}

export interface ReviewItem {
  question_id: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  is_correct: boolean;
  given: string;
}

export interface QuizSubmitResult {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  passing_score: number;
  review: ReviewItem[];
  lesson_completed: boolean;
}

export interface FinalSubmitResult {
  score: number;
  total: number;
  percentage: number;
  duration_seconds: number;
  certificate_number: string;
  rank: number;
  review: ReviewItem[];
}

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  full_name: string;
  class_name: string;
  score: number;
  total: number;
  percentage: number;
  duration_seconds: number;
  submitted_at: string;
  is_me?: boolean;
}

export interface LeaderboardData {
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface AdminStudent {
  id: string;
  email: string;
  full_name: string | null;
  class_name: string | null;
  profile_completed: boolean;
  created_at: string;
  completed_lessons: number;
  total_lessons: number;
  final_score: number | null;
  final_total: number | null;
  final_duration: number | null;
  final_submitted_at: string | null;
  certificate_number: string | null;
}

export interface AdminStats {
  students: number;
  completed_profiles: number;
  final_submitted: number;
  certificates: number;
  average_progress: number;
}

export interface AdminLessonRow {
  lesson_id: string;
  title: string;
  order: number;
  total_slides: number;
  slides_viewed: number;
  percentage: number;
  completed: boolean;
  completed_at: string | null;
}

export interface AdminStudentDetail {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    class_name: string | null;
    profile_completed: boolean;
    created_at: string;
  };
  lessons: AdminLessonRow[];
  attempts: QuizAttemptRow[];
  final: {
    started_at: string;
    submitted_at: string | null;
    duration_seconds: number | null;
    score: number | null;
    total: number | null;
    percentage: number | null;
    certificate_number: string | null;
    rank: number | null;
  } | null;
  certificate: CertificateInfo | null;
}

export interface AdminModuleAttempt {
  id: string;
  student_id: string;
  student_name: string | null;
  class_name: string | null;
  email?: string;
  quiz_id: string;
  quiz_title?: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
}

export interface AdminFinalAttempt {
  id: string;
  student_id: string;
  student_name: string | null;
  class_name: string | null;
  email?: string;
  score: number;
  total: number;
  percentage: number;
  duration_seconds: number;
  certificate_number: string | null;
  submitted_at: string;
}

export interface AdminAttempts {
  module_attempts: AdminModuleAttempt[];
  final_attempts: AdminFinalAttempt[];
}

export interface AdminCertificateRow {
  certificate_number: string;
  student_id: string;
  student_name: string | null;
  class_name: string | null;
  email: string;
  issued_at: string;
  score: number | null;
  total: number | null;
  duration_seconds: number | null;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
}
