import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GOOGLE_CLIENT_ID } from "@/lib/config";
import { Alert } from "./ui";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: "popup" | "redirect";
    locale?: string;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  cancel(): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

export default function GoogleSignIn() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setError("Google tidak memulangkan token. Sila cuba lagi.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const profile = await signInWithGoogle(response.credential);
        if (!profile) {
          setError("Profil tidak dijumpai selepas log masuk. Sila hubungi guru.");
          return;
        }
        if (profile.role === "ADMIN") {
          navigate("/admin", { replace: true });
        } else if (!profile.profile_completed) {
          navigate("/lengkapi-profil", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Log masuk Google gagal.");
      } finally {
        setLoading(false);
      }
    },
    [navigate, signInWithGoogle],
  );

  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => void handleCredential(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: "popup",
        locale: "ms",
      });
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        logo_alignment: "left",
        width: 320,
        locale: "ms",
      });
      if (!cancelled) setReady(true);
    }

    if (window.google?.accounts?.id) {
      init();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-gis="1"]');
    if (existing) {
      existing.addEventListener("load", init);
      init();
      return () => {
        cancelled = true;
        existing.removeEventListener("load", init);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.gis = "1";
    script.onload = init;
    script.onerror = () => {
      if (!cancelled) setLoadFailed(true);
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [handleCredential]);

  return (
    <div>
      <div ref={buttonRef} className="flex min-h-11 justify-center" aria-label="Log masuk dengan Google" />

      {!ready && !loadFailed && (
        <p className="mt-3 text-center text-xs font-medium text-slate-400" aria-live="polite">
          Memuatkan butang Google…
        </p>
      )}

      {loading && (
        <p className="mt-3 text-center text-sm font-semibold text-forest" aria-live="polite">
          Mengesahkan akaun Google…
        </p>
      )}

      {loadFailed && (
        <div className="mt-3">
          <Alert>
            Butang Google tidak dapat dimuatkan. Semak sambungan internet dan tetapan Client ID / origin
            Google Cloud.
          </Alert>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      <p className="mt-4 text-center text-xs leading-5 text-stone-400">
        Gunakan akaun Google anda. Kali pertama, anda akan diminta mengisi nama penuh dan kelas.
      </p>
    </div>
  );
}
