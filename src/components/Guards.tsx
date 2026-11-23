import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Alert, Loading, PrimaryButton } from "./ui";

function FullPageLoading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
      <Loading text="Menyemak sesi…" />
    </div>
  );
}

function ProfileMissing({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const [pending, setPending] = useState(false);
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6">
      <div className="card-pop w-full p-8">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Profil tidak dijumpai</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Akaun auth berjaya, tetapi rekod profil tiada. Pastikan skrip SQL Supabase telah dijalankan
          (trigger <span className="font-mono">handle_new_user</span>).
        </p>
        <div className="mt-4">
          <Alert kind="info">Cuba muat semula profil. Jika masih gagal, semak Supabase SQL Editor.</Alert>
        </div>
        <div className="mt-5">
          <PrimaryButton
            onClick={async () => {
              setPending(true);
              try {
                await onRetry();
              } finally {
                setPending(false);
              }
            }}
            disabled={pending}
          >
            {pending ? "Menyemak…" : "Cuba lagi"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading, profileError, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) {
    if (profileError) {
      return (
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6">
          <div className="card-pop w-full p-8">
            <Alert>{profileError}</Alert>
            <div className="mt-4">
              <PrimaryButton onClick={() => void refreshProfile()}>Cuba lagi</PrimaryButton>
            </div>
          </div>
        </div>
      );
    }
    return <ProfileMissing onRetry={refreshProfile} />;
  }
  if (profile.role === "ADMIN" || profile.role === "TEACHER") {
    return <Navigate to="/admin" replace />;
  }
  if (profile.role === "STUDENT" && !profile.profile_completed) {
    return <Navigate to="/lengkapi-profil" replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading, profileError, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) {
    if (profileError) return <Alert>{profileError}</Alert>;
    return <ProfileMissing onRetry={refreshProfile} />;
  }
  if (profile.role !== "ADMIN") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/** Admin atau Guru Kelas — data sebenar sudah ditapis oleh RPC Supabase. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { session, profile, loading, profileError, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) {
    if (profileError) return <Alert>{profileError}</Alert>;
    return <ProfileMissing onRetry={refreshProfile} />;
  }
  if (profile.role !== "ADMIN" && profile.role !== "TEACHER") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export function RequireIncompleteProfile({ children }: { children: ReactNode }) {
  const { session, profile, loading, refreshProfile } = useAuth();
  if (loading) return <FullPageLoading />;
  if (!session) return <Navigate to="/login" />;
  if (!profile) return <ProfileMissing onRetry={refreshProfile} />;
  if (profile.role === "ADMIN" || profile.role === "TEACHER" || profile.profile_completed) {
    return (
      <Navigate
        to={profile.role === "ADMIN" || profile.role === "TEACHER" ? "/admin" : "/dashboard"}
        replace
      />
    );
  }
  return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (session && profile) {
    if (profile.role === "ADMIN" || profile.role === "TEACHER") {
      return <Navigate to="/admin" replace />;
    }
    if (!profile.profile_completed) return <Navigate to="/lengkapi-profil" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
