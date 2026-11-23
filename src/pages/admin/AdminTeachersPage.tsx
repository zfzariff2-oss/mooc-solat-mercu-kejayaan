import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CLASS_OPTIONS } from "@/lib/classes";
import { supabase } from "@/lib/supabase";
import type { TeacherAccessRow } from "@/lib/types";
import { cn, formatDateTimeMY } from "@/lib/utils";
import AdminShell from "@/components/AdminShell";
import {
  Alert,
  Card,
  EmptyState,
  Field,
  Loading,
  PageHeader,
  PrimaryButton,
  TextInput,
} from "@/components/ui";

interface SaveResult {
  email: string;
  classes: string[];
  profile_exists: boolean;
  was_student: boolean;
}

export default function AdminTeachersPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<TeacherAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("admin_list_teachers");
    if (rpcError) {
      setError(rpcError.message);
      setRows([]);
    } else {
      setRows((data as TeacherAccessRow[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEmail("");
    setSelectedClasses([]);
    setEditing(false);
  }

  function edit(row: TeacherAccessRow) {
    setEmail(row.email);
    setSelectedClasses(row.classes);
    setEditing(true);
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleClass(className: string) {
    setSelectedClasses((current) =>
      current.includes(className)
        ? current.filter((item) => item !== className)
        : [...current, className],
    );
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Masukkan alamat emel guru.");
      return;
    }
    if (selectedClasses.length === 0) {
      setError("Pilih sekurang-kurangnya satu kelas.");
      return;
    }

    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_set_teacher_classes", {
        p_email: email.trim(),
        p_classes: selectedClasses,
      });
      if (rpcError) throw rpcError;

      const result = data as SaveResult;
      setNotice(
        result.was_student
          ? `Akses guru untuk ${result.email} dikemas kini. Emel ini sebelum ini pelajar — rekod pelajar tidak dipadam, tetapi akaun kini menggunakan akses Guru Kelas.`
          : `Akses guru untuk ${result.email} disimpan untuk kelas ${result.classes.join(", ")}.`,
      );
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan akses guru.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: TeacherAccessRow) {
    if (!window.confirm(`Buang akses Guru Kelas untuk ${row.email}?`)) return;
    setRemoving(row.email);
    setError(null);
    setNotice(null);
    try {
      const { error: rpcError } = await supabase.rpc("admin_remove_teacher", {
        p_email: row.email,
      });
      if (rpcError) throw rpcError;
      setNotice(`Akses guru untuk ${row.email} telah dibuang.`);
      if (email.toLowerCase() === row.email.toLowerCase()) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuang akses guru.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        kicker="PENGURUSAN GURU"
        title="Guru Kelas"
        desc="Daftar emel guru dan pilih kelas yang boleh dipantau. Guru akan log masuk menggunakan akaun Google yang sama."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card>
          <h2 className="font-display text-xl font-extrabold text-slate-900">
            {editing ? "Kemas Kini Akses Guru" : "Daftar Guru Baharu"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Satu guru boleh ditetapkan kepada lebih daripada satu kelas.
          </p>

          <form onSubmit={save} className="mt-5 grid gap-4">
            <Field label="EMEL GURU" htmlFor="teacherEmail">
              <TextInput
                id="teacherEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cth. guru@sekolah.edu.my"
                autoComplete="email"
                required
              />
            </Field>

            <div>
              <p className="text-xs font-bold tracking-widest text-slate-500">KELAS YANG DIPANTAU</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CLASS_OPTIONS.map((className) => {
                  const checked = selectedClasses.includes(className);
                  return (
                    <label
                      key={className}
                      className={cn(
                        "transition-soft flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-[11px] font-bold",
                        checked
                          ? "border-forest bg-forest/10 text-forest"
                          : "border-slate-200 bg-white text-slate-500 hover:border-forest/30",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(className)}
                        className="h-4 w-4 accent-forest"
                      />
                      {className}
                    </label>
                  );
                })}
              </div>
            </div>

            {error && <Alert>{error}</Alert>}
            {notice && <Alert kind="success">{notice}</Alert>}

            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "Menyimpan…" : editing ? "KEMAS KINI" : "SIMPAN GURU"}
              </PrimaryButton>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="transition-soft rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-500 hover:border-forest/30 hover:text-forest"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          <div className="mt-5 rounded-2xl bg-forest/5 px-4 py-3 text-[11px] leading-5 text-forest">
            <b>Cara ia berfungsi:</b> jika guru belum pernah log masuk, status akan menjadi
            <b> Menunggu Log Masuk</b>. Bila mereka log masuk dengan Google menggunakan emel ini,
            akaun mereka automatik menjadi Guru Kelas.
          </div>
        </Card>

        <div>
          {loading ? (
            <Loading text="Memuatkan senarai guru…" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="👩‍🏫"
              title="Belum ada guru didaftarkan."
              desc="Masukkan emel guru dan pilih kelas di sebelah kiri."
            />
          ) : (
            <div className="card-pop overflow-hidden !p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-forest text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Guru</th>
                      <th className="px-4 py-3 text-left font-bold">Kelas</th>
                      <th className="px-4 py-3 text-center font-bold">Status</th>
                      <th className="px-4 py-3 text-center font-bold">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.email} className="even:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{row.full_name ?? "—"}</p>
                          <p className="break-all text-xs text-slate-500">{row.email}</p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Didaftar {formatDateTimeMY(row.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.classes.map((className) => (
                              <span
                                key={className}
                                className="rounded-full bg-sky-light px-2 py-0.5 text-[10px] font-bold text-sky-dark"
                              >
                                {className}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold",
                              row.status === "AKTIF"
                                ? "bg-mint-light text-mint-dark"
                                : row.status === "MENUNGGU"
                                  ? "bg-sun-light text-sand-dark"
                                  : "bg-coral-light text-coral-dark",
                            )}
                          >
                            {row.status === "AKTIF"
                              ? "AKTIF"
                              : row.status === "MENUNGGU"
                                ? "MENUNGGU LOG MASUK"
                                : "PERLU SEMAK"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => edit(row)}
                              className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest hover:bg-forest hover:text-white"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(row)}
                              disabled={removing === row.email}
                              className="rounded-full bg-coral-light px-3 py-1 text-xs font-bold text-coral-dark hover:bg-coral hover:text-white disabled:opacity-50"
                            >
                              {removing === row.email ? "Membuang…" : "Buang"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Admin: {profile?.email ?? "—"} • Data guru disimpan dalam jadual akses Supabase.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
