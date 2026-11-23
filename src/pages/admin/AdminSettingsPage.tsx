import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/AdminShell";
import { Alert, Field, Loading, PageHeader, PrimaryButton, TextInput } from "@/components/ui";

export default function AdminSettingsPage() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("get_sheet_settings")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMessage({ kind: "error", text: error.message });
        } else {
          const result = data as { url: string; has_secret: boolean };
          setUrl(result.url ?? "");
          setHasSecret(!!result.has_secret);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc("set_sheet_webhook", {
        p_url: url.trim(),
        p_secret: secret.trim() ? secret.trim() : null,
      });
      if (error) setMessage({ kind: "error", text: error.message });
      else {
        setMessage({ kind: "success", text: "Tetapan webhook disimpan." });
        if (secret.trim()) setHasSecret(true);
        setSecret("");
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Gagal menyimpan." });
    } finally {
      setSaving(false);
    }
  }

  async function syncAll() {
    setSyncing(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc("sync_all_sheets");
      if (error) {
        setMessage({ kind: "error", text: error.message });
        return;
      }
      const result = data as { ok?: boolean; error?: string } | null;
      if (result && result.ok === false) {
        setMessage({ kind: "error", text: result.error ?? "Sync gagal. Semak URL/secret dan pg_net Supabase." });
      } else {
        setMessage({ kind: "success", text: "Data dihantar ke Google Sheets. Semak Sheet anda." });
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Gagal sync." });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        kicker="TETAPAN"
        title="Sync Google Sheets"
        desc="Hubungkan kursus ini kepada Google Sheet melalui Apps Script webhook."
      />
      {loading ? (
        <Loading text="Memuatkan tetapan…" />
      ) : (
        <div className="mt-6 grid gap-5">
          <div className="card-pop p-6">
            <h2 className="font-display text-xl font-extrabold text-slate-900">1. URL Webhook Apps Script</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Deploy <span className="font-mono">integrations/google-sheets/Code.gs</span> sebagai Web App,
              kemudian tampal URL <span className="font-mono">/exec</span> di sini.
            </p>
            <form onSubmit={save} className="mt-4 grid gap-4">
              <Field label="URL WEBHOOK" htmlFor="sheetUrl">
                <TextInput
                  id="sheetUrl"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  required
                />
              </Field>
              <Field label="SECRET WEBHOOK" htmlFor="sheetSecret">
                <TextInput
                  id="sheetSecret"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={hasSecret ? "Secret sudah disimpan — biarkan kosong untuk kekalkan" : "Masukkan secret yang sama dengan Apps Script"}
                />
              </Field>
              {message && <Alert kind={message.kind}>{message.text}</Alert>}
              <div className="flex flex-wrap gap-3">
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? "Menyimpan…" : "SIMPAN TETAPAN"}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => void syncAll()}
                  disabled={syncing || !url}
                  className="transition-soft rounded-full border-2 border-forest/20 bg-white px-5 py-2.5 text-sm font-bold text-forest hover:bg-forest hover:text-white disabled:opacity-50"
                >
                  {syncing ? "Menghantar…" : "📤 SYNC SEMUA KE SHEET"}
                </button>
              </div>
            </form>
          </div>

          <div className="card-pop p-6 text-sm leading-7 text-slate-600">
            <h2 className="font-display text-xl font-extrabold text-slate-900">Langkah ringkas</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Buka Google Sheet anda (ID: <span className="font-mono text-xs">1XNTSigIP-OdgvaSczIlLaFpAJUtq3gXle5OqGtgUWL4</span>).</li>
              <li>Extensions → Apps Script → tampal kandungan <span className="font-mono">Code.gs</span>.</li>
              <li>Project Settings → Script Properties → tambah <span className="font-mono">WEBHOOK_SECRET</span> dengan nilai rawak.</li>
              <li>Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy.</li>
              <li>Salin URL <span className="font-mono">/exec</span> dan secret ke borang di atas.</li>
              <li>Tekan <b>Sync semua ke Sheet</b> untuk mengisi data sedia ada.</li>
            </ol>
            <p className="mt-3 rounded-2xl bg-sun-light/70 px-4 py-3 text-xs text-sand-dark">
              ⚠️ Jangan kongsi secret webhook. Semua data pelajar akan ditulis ke Sheet yang anda tetapkan.
            </p>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
