import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { CLASS_OPTIONS, isClassOption, normalizeClassName } from "@/lib/classes";
import { Alert, Field, PrimaryButton, SelectInput, TextInput } from "@/components/ui";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { profile, completeProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const next = await completeProfile(
        String(form.get("name") ?? ""),
        String(form.get("className") ?? ""),
      );
      if (next.role === "ADMIN" || next.role === "TEACHER") navigate("/admin", { replace: true });
      else navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-forest via-forest-light to-sky-dark px-4 py-10 md:px-8 md:py-16">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
      <div aria-hidden className="animate-floaty pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-grape/25" />

      <div className="relative mx-auto grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        <div className="text-white">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold tracking-[0.25em] backdrop-blur-sm">
            🎓 LANGKAH TERAKHIR
          </span>
          <h1 className="font-display mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
            Satu langkah lagi sebelum mula belajar.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/80">
            Akaun Google anda telah disahkan. Kami hanya perlukan nama penuh dan kelas supaya kemajuan
            serta sijil anda direkodkan dengan betul.
          </p>
          <ul className="mt-7 grid gap-3 text-sm font-medium text-white/90">
            <li className="flex items-center gap-3">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">✍️</span>
              Nama penuh akan dicetak pada sijil
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">🏫</span>
              Kelas membantu guru memantau kemajuan
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">🔒</span>
              Tiada kata laluan tambahan diperlukan
            </li>
          </ul>
        </div>

        <div className="card-pop bg-white p-6 md:p-8">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 md:text-3xl">Lengkapkan Profil</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Isi maklumat di bawah dengan betul. Anda hanya perlu melakukannya sekali.
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-5">
            <div className="rounded-2xl border border-forest/10 bg-forest/5 p-4">
              <p className="text-[11px] font-bold tracking-widest text-forest/70">AKAUN GOOGLE</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                {profile?.email ?? "Akaun Google disahkan"}
              </p>
            </div>

            <Field label="NAMA PENUH" htmlFor="name">
              <TextInput
                id="name"
                name="name"
                defaultValue={profile?.full_name ?? ""}
                placeholder="cth. Ahmad bin Abdullah"
                autoComplete="name"
                required
                minLength={3}
                maxLength={100}
              />
            </Field>
            <p className="-mt-3 text-xs leading-5 text-slate-400">
              Masukkan nama penuh seperti dalam kad pelajar. Nama ini akan tercetak pada sijil dalam HURUF BESAR.
            </p>

            <Field label="KELAS" htmlFor="className">
              <SelectInput
                id="className"
                name="className"
                defaultValue={
                  isClassOption(profile?.class_name) ? normalizeClassName(profile?.class_name) : ""
                }
                required
              >
                <option value="" disabled>
                  — Pilih kelas anda —
                </option>
                {CLASS_OPTIONS.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <p className="-mt-3 text-xs leading-5 text-slate-400">
              Pilih kelas anda daripada senarai. Kelas digunakan oleh guru untuk memantau kemajuan.
            </p>

            {error && <Alert>{error}</Alert>}

            <PrimaryButton type="submit" disabled={loading} className="w-full">
              {loading ? "Menyimpan…" : "SIMPAN & MULA BELAJAR"}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}
