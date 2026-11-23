import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import SiteShell, { ADMIN_NAV, TEACHER_NAV } from "./SiteShell";

export default function AdminShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isTeacher = profile?.role === "TEACHER";
  const classes = profile?.assigned_classes?.join(", ");
  return (
    <SiteShell
      kicker={isTeacher ? "PANEL GURU KELAS" : "PENTADBIR"}
      name={profile?.full_name ?? (isTeacher ? "Guru Kelas" : "Pentadbir")}
      code={isTeacher ? classes || profile?.email || "GURU" : profile?.email ?? "ADMIN"}
      nav={isTeacher ? TEACHER_NAV : ADMIN_NAV}
    >
      {children}
    </SiteShell>
  );
}
