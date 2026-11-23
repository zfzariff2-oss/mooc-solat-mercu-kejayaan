# MOOC Solat Mercu Kejayaan

Platform MOOC statik untuk **Pendidikan Islam Tingkatan 1 — Solat Mercu Kejayaan**.
Dibina dengan **Vite + React + TypeScript + Tailwind CSS**, menggunakan **Supabase**
untuk auth/database dan **Google Sheets** untuk laporan.

- **7 modul** pembelajaran
- **35 soalan kuiz modul** (5 per modul, lulus 80%, percubaan tanpa had)
- **20 soalan pentaksiran akhir** (10 objektif, 5 Betul/Salah, 5 padanan)
- **Satu percubaan** pentaksiran akhir
- **Ranking** top 20 + kedudukan sendiri (markah tertinggi, masa terpantas)
- **Sijil** diberikan selepas pentaksiran dihantar, tanpa mengira markah
- **Google Sheets sync** setiap kali hantar + butang sync semua
- Admin: pelajar, keputusan, ranking, sijil, tetapan Sheet

## URL

- GitHub Pages: `https://zfzariff2-oss.github.io/`
- Supabase: `https://ghrzskkcxkezczxlnugr.supabase.co`
- Google Sheet: `1XNTSigIP-OdgvaSczIlLaFpAJUtq3gXle5OqGtgUWL4`

## 1. Jalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

Build production:

```bash
npm run build
npm run preview
```

## 2. Supabase (WAJIB)

Buka **Supabase SQL Editor**:
`https://supabase.com/dashboard/project/ghrzskkcxkezczxlnugr/sql/new`

Jalankan sama ada:

- **`supabase/setup.sql`** (semua sekali gus), atau
- fail mengikut urutan:
  1. `supabase/migrations/001_schema.sql`
  2. `supabase/migrations/002_rpc.sql`
  3. `supabase/migrations/003_seed.sql`

`003_seed.sql` dijana daripada kandungan frontend. Jika kandungan berubah:

```bash
npm run generate:keys
```

Kemudian jalankan semula `003_seed.sql`.

### Auth Google (GIS)

1. Buka [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - **Authorized JavaScript origins:**
     - `http://localhost:5173`
     - `https://zfzariff2-oss.github.io`
   - **Authorized redirect URIs:**
     - `https://ghrzskkcxkezczxlnugr.supabase.co/auth/v1/callback`
2. Di Supabase Dashboard → **Authentication → Providers → Google**:
   - Enable.
   - Masukkan **Client ID** dan **Client Secret**.
3. Di Supabase → **Authentication → URL Configuration**:
   - Site URL: `https://zfzariff2-oss.github.io`
   - Redirect URLs:
     - `http://localhost:5173/**`
     - `https://zfzariff2-oss.github.io/**`

Admin: emel **`zfzariff2@gmail.com`** akan diberi peranan `ADMIN` secara automatik oleh trigger.
Emel lain akan menjadi `STUDENT` dan perlu mengisi nama penuh + kelas.

## 3. Google Sheets (Apps Script)

1. Buka Google Sheet:
   `https://docs.google.com/spreadsheets/d/1XNTSigIP-OdgvaSczIlLaFpAJUtq3gXle5OqGtgUWL4`
2. **Extensions → Apps Script**.
3. Tampal kandungan `integrations/google-sheets/Code.gs` ke `Code.gs`.
4. Jalankan fungsi **`setup`** sekali. Lihat **Execution log** untuk `WEBHOOK_SECRET`.
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin URL `/exec`.
7. Di panel admin MOOC → **Tetapan Sheet**:
   - Masukkan URL webhook.
   - Masukkan secret.
   - Tekan **Simpan Tetapan**.
   - Tekan **Sync Semua ke Sheet**.

Tab yang akan dicipta:

- `Pelajar` — snapshot pelajar
- `Keputusan` — setiap percubaan kuiz/pentaksiran
- `Sijil` — setiap sijil
- `Ranking` — ranking penuh

## 4. Deploy GitHub Pages

Repo: `zfzariff2-oss.github.io` (public, user site).

```bash
git init
git add .
git commit -m "MOOC Solat Mercu Kejayaan"
git branch -M main
git remote add origin https://github.com/zfzariff2-oss/zfzariff2-oss.github.io.git
git push -u origin main
```

GitHub Actions (`.github/workflows/deploy.yml`) akan build dan deploy ke
`https://zfzariff2-oss.github.io/`.

Jika perlu, di GitHub → **Settings → Pages** pilih source **GitHub Actions**.

## 5. Struktur

```text
src/
  content/course.ts          # 7 modul, 35 soalan kuiz, 20 soalan akhir
  context/AuthContext.tsx    # sesi GIS + profil
  components/                # UI, slaid, kuiz, pentaksiran, sijil
  pages/                     # halaman pelajar + admin
  lib/                       # Supabase, PDF sijil, utiliti
supabase/migrations/         # skema, RPC, seed
integrations/google-sheets/  # Apps Script webhook
```

## 6. Peraturan pentaksiran

- Kuiz modul: 5 soalan, lulus 80%, percubaan tanpa had.
- Pentaksiran akhir: 20 soalan, **satu percubaan sahaja**.
- Masa bermula apabila pelajar tekan **Mula Pentaksiran**.
- Jika refresh/tutup browser, percubaan yang sama boleh disambung; masa terus berjalan.
- Tiada had masa.
- Ranking: markah betul DESC → masa ASC → tarikh hantar ASC.
- Sijil: dijana selepas hantar, tanpa mengira markah.
- Nama pada sijil dipaparkan **HURUF BESAR**, bersama kelas dan tarikh selesai.

## 7. Keselamatan

- `VITE_SUPABASE_PUBLISHABLE_KEY` memang selamat untuk frontend **selagi RLS diaktifkan**.
- **Jangan** letak `service_role` key dalam frontend.
- Jawapan betul hanya dalam `question_keys`; pelajar tidak boleh membaca jadual itu.
- Pemarkahan dibuat dalam RPC `security definer`.
- Apps Script webhook dilindungi `WEBHOOK_SECRET`.
- Client Secret Google hanya dalam dashboard Supabase, bukan dalam repo.
- Jangan commit token GitHub. Revoke token yang pernah dikongsi.

## 8. Nota

- Panel admin **tidak** menyunting kandungan. Kandungan diurus melalui
  `src/content/course.ts` + `npm run generate:keys`.
- Jika mahu tambah/edit soalan, ubah fail kandungan, jana semula seed, dan jalankan
  `003_seed.sql` semula.
