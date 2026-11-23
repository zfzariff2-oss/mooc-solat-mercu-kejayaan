import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import SiteShell, { ADMIN_NAV } from "./SiteShell";

export default function AdminShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <SiteShell
      kicker="PENTADBIR"
      name={profile?.full_name ?? "Pentadbir"}
      code={profile?.email ?? "ADMIN"}
      nav={ADMIN_NAV}
    >
      {children}
    </SiteShell>
  );
}
