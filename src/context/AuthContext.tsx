import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  signInWithGoogle: (credential: string) => Promise<Profile | null>;
  signInWithPassword: (email: string, password: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  completeProfile: (fullName: string, className: string) => Promise<Profile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,class_name,role,profile_completed,created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      setProfileError(error.message);
      return null;
    }
    setProfileError(null);
    setProfile((data as Profile | null) ?? null);
    return (data as Profile | null) ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        if (data.session) {
          await fetchProfile(data.session.user.id);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(
    async (credential: string) => {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
      });
      if (error) throw error;
      const userId = data.user?.id;
      return userId ? fetchProfile(userId) : null;
    },
    [fetchProfile],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const userId = data.user?.id;
      return userId ? fetchProfile(userId) : null;
    },
    [fetchProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    return fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const completeProfile = useCallback(
    async (fullName: string, className: string) => {
      const { data, error } = await supabase.rpc("complete_profile", {
        p_full_name: fullName,
        p_class_name: className,
      });
      if (error) throw error;
      const merged = { ...(profile ?? {}), ...(data as Partial<Profile>) } as Profile;
      setProfile(merged);
      return merged;
    },
    [profile],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileError,
        signInWithGoogle,
        signInWithPassword,
        signOut,
        refreshProfile,
        completeProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mesti digunakan dalam AuthProvider.");
  return ctx;
}
