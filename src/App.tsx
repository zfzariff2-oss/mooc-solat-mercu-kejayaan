import { Route, Routes } from "react-router-dom";
import {
  PublicOnly,
  RequireAdmin,
  RequireAuth,
  RequireIncompleteProfile,
  RequireStaff,
} from "@/components/Guards";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import CompleteProfilePage from "@/pages/CompleteProfilePage";
import DashboardPage from "@/pages/DashboardPage";
import LessonsPage from "@/pages/LessonsPage";
import LessonPage from "@/pages/LessonPage";
import QuizPage from "@/pages/QuizPage";
import AssessmentPage from "@/pages/AssessmentPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import CertificatePage from "@/pages/CertificatePage";
import VerifySearchPage from "@/pages/VerifySearchPage";
import VerifyCertificatePage from "@/pages/VerifyCertificatePage";
import ProfilePage from "@/pages/ProfilePage";
import ProgressPage from "@/pages/ProgressPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminStudentsPage from "@/pages/admin/AdminStudentsPage";
import AdminStudentDetailPage from "@/pages/admin/AdminStudentDetailPage";
import AdminResultsPage from "@/pages/admin/AdminResultsPage";
import AdminRankingPage from "@/pages/admin/AdminRankingPage";
import AdminCertificatesPage from "@/pages/admin/AdminCertificatesPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminTeachersPage from "@/pages/admin/AdminTeachersPage";
import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-pop max-w-md p-8 text-center">
        <span aria-hidden className="text-5xl">🧭</span>
        <h1 className="font-display mt-3 text-3xl font-extrabold text-slate-900">Halaman tidak dijumpai</h1>
        <p className="mt-2 text-sm text-slate-500">Pautan mungkin telah berubah atau tidak sah.</p>
        <Link to="/" className="mt-5 inline-block rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white">
          Kembali ke halaman utama
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/lengkapi-profil"
        element={
          <RequireIncompleteProfile>
            <CompleteProfilePage />
          </RequireIncompleteProfile>
        }
      />
      <Route path="/sahkan-sijil" element={<VerifySearchPage />} />
      <Route path="/sijil/:certificateNumber" element={<VerifyCertificatePage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/pelajaran"
        element={
          <RequireAuth>
            <LessonsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/pelajaran/:lessonId"
        element={
          <RequireAuth>
            <LessonPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kuiz/:quizId"
        element={
          <RequireAuth>
            <QuizPage />
          </RequireAuth>
        }
      />
      <Route
        path="/pentaksiran"
        element={
          <RequireAuth>
            <AssessmentPage />
          </RequireAuth>
        }
      />
      <Route
        path="/ranking"
        element={
          <RequireAuth>
            <LeaderboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sijil"
        element={
          <RequireAuth>
            <CertificatePage />
          </RequireAuth>
        }
      />
      <Route
        path="/profil"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/kemajuan"
        element={
          <RequireAuth>
            <ProgressPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireStaff>
            <AdminDashboardPage />
          </RequireStaff>
        }
      />
      <Route
        path="/admin/pelajar"
        element={
          <RequireStaff>
            <AdminStudentsPage />
          </RequireStaff>
        }
      />
      <Route
        path="/admin/pelajar/:studentId"
        element={
          <RequireStaff>
            <AdminStudentDetailPage />
          </RequireStaff>
        }
      />
      <Route
        path="/admin/keputusan"
        element={
          <RequireStaff>
            <AdminResultsPage />
          </RequireStaff>
        }
      />
      <Route
        path="/admin/ranking"
        element={
          <RequireStaff>
            <AdminRankingPage />
          </RequireStaff>
        }
      />
      <Route
        path="/admin/sijil"
        element={
          <RequireStaff>
            <AdminCertificatesPage />
          </RequireStaff>
        }
      />
      <Route
        path="/admin/guru"
        element={
          <RequireAdmin>
            <AdminTeachersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/tetapan"
        element={
          <RequireAdmin>
            <AdminSettingsPage />
          </RequireAdmin>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
