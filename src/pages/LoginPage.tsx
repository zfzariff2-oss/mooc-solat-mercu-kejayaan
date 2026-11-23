import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ENABLE_PASSWORD_LOGIN } from "@/lib/config";
import GoogleSignIn from "@/components/GoogleSignIn";
import { Alert, Field, PrimaryButton, TextInput } from "@/components/ui";

const HIGHLIGHTS = [
  { icon: "📖", text: "7 modul interaktif tentang solat" },
  { icon: "🧠", text: "Kuiz modul + pentaksiran akhir 20 soalan" },
  { icon: "🏅", text: "Ranking markah & sijil pencapaian" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const profile = await signInWithPassword(
        String(form.get("email") ?? "").trim(),
        String(form.get("password") ?? ""),
      );
      if (!profile) {
        setError("Profil tidak dijumpai.");
        return;
      }
      if (profile.role === "ADMIN") navigate("/admin", { replace: true });
      else if (!profile.profile_completed) navigate("/lengkapi-profil", { replace: true });
      else navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Log masuk gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-gradient-to-br from-forest via-forest-light to-sky-dark px-10 py-16 text-white md:px-16">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div aria-hidden className="animate-floaty pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-grape/25" />
        <span aria-hidden className="animate-floaty pointer-events-none absolute right-12 top-16 hidden text-5xl md:block">
          ✨
        </span>
        <span aria-hidden className="animate-floaty pointer-events-none absolute bottom-20 right-24 hidden text-4xl md:block">
          🕌
        </span>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold tracking-[0.25em] backdrop-blur-sm">
          🕌 SOLAT MERCU KEJAYAAN • TINGKATAN 1
        </span>
        <h1 className="font-display mt-5 max-w-lg text-4xl font-extrabold leading-tight md:text-5xl">
          Belajar solat, fahami hikmahnya, amalkan dengan khusyuk.
        </h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-white/80">
          Ikuti 7 modul interaktif, jawab kuiz dan takluki pentaksiran akhir untuk melayakkan sijil
          pencapaian anda.
        </p>
        <ul className="mt-8 grid gap-3">
          {HIGHLIGHTS.map((h) => (
            <li key={h.text} className="flex items-center gap-3 text-sm font-medium text-white/90">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg backdrop-blur-sm">
                {h.icon}
              </span>
              {h.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card-pop w-full max-w-md p-8">
          <h2 className="font-display text-3xl text-stone-900">Log Masuk</h2>
          <p className="mt-2 text-sm text-stone-500">Log masuk dengan akaun Google anda untuk mula belajar.</p>

          <div className="mt-8">
            <GoogleSignIn />
          </div>

          {ENABLE_PASSWORD_LOGIN && (
            <details className="mt-6 rounded-2xl border border-stone-200 px-4 py-3">
              <summary className="cursor-pointer text-xs font-bold tracking-wide text-stone-500">
                Log masuk pentadbir (emel / kata laluan)
              </summary>
              <form onSubmit={submitPassword} className="mt-4 grid gap-4">
                <Field label="EMEL" htmlFor="email">
                  <TextInput id="email" name="email" type="email" autoComplete="email" required />
                </Field>
                <Field label="KATA LALUAN" htmlFor="password">
                  <TextInput id="password" name="password" type="password" autoComplete="current-password" required />
                </Field>
                {error && <Alert>{error}</Alert>}
                <PrimaryButton type="submit" disabled={loading} className="w-full">
                  {loading ? "Menyemak…" : "MASUK"}
                </PrimaryButton>
              </form>
            </details>
          )}

          {!ENABLE_PASSWORD_LOGIN && error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-stone-400">
            <Link to="/" className="font-semibold underline">
              ← Kembali ke halaman utama
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
