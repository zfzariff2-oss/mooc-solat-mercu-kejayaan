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
- **Kesan bunyi** klik / betul / berjaya / salah / ralat
- **TTS Bahasa Melayu** membaca tajuk slaid, label setiap kad, kemudian kandungan; singkatan `SAW` / `SWT` / `RA` disebut penuh
- **Layout kad berbeza** mengikut modul: editorial, checklist, timeline, bento, split, infografik manfaat, quote
- **Audio auto-sambung**: tekan kad pertama → tajuk slaid → kad 1, 2, 3… dimainkan dan ditanda selesai automatik
- **Kelas pelajar** dipilih daripada senarai tetap 11 kelas Tingkatan 1
- Admin: pelajar, keputusan, ranking, sijil, Guru Kelas, tetapan Sheet
- **Guru Kelas**: satu atau lebih kelas, hanya melihat pelajar dan data kelas yang ditetapkan

## URL

- GitHub Pages: `https://zfzariff2-oss.github.io/mooc-solat-mercu-kejayaan/`
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
  4. `supabase/migrations/004_teachers_and_classes.sql`

Bagi pangkalan data sedia ada, memadai jalankan **`004_teachers_and_classes.sql`**
sahaja untuk menambah peranan Guru Kelas, senarai kelas tetap dan RPC berskop kelas.

`003_seed.sql` dijana daripada kandungan frontend. Jika kandungan berubah:

```bash
npm run generate:keys
```

Kemudian jalankan semula `003_seed.sql`.

Audio TTS Bahasa Melayu dijana sebagai fail MP3 statik untuk **tajuk slaid**,
**setiap kad** (label + kandungan) dan **soalan**:

```bash
GOOGLE_TTS_API_KEY="..." npm run generate:tts
```

Di Windows PowerShell:

```powershell
$env:GOOGLE_TTS_API_KEY="..."; npm run generate:tts
```

Guna `npm run generate:tts -- --force` untuk jana semula semua fail. Key hanya
digunakan semasa penjanaan dan **tidak** disimpan dalam repo/frontend. Jika key
pernah dikongsi, hadkan penggunaannya pada Google Cloud Console dan tukar key baharu.

Fail audio disimpan di:

- `public/audio/tts/titles/<slide-id>.mp3`
- `public/audio/tts/cards/<slide-id>-<index>.mp3`
- `public/audio/tts/questions/<question-id>.mp3`

Jika fail audio tiada, frontend menggunakan Web Speech API sebagai fallback.

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
   - Site URL: `https://zfzariff2-oss.github.io/mooc-solat-mercu-kejayaan`
   - Redirect URLs:
     - `http://localhost:5173/**`
     - `https://zfzariff2-oss.github.io/mooc-solat-mercu-kejayaan/**`

Admin: emel **`zfzariff2@gmail.com`** akan diberi peranan `ADMIN` secara automatik oleh trigger.
Emel lain akan menjadi `STUDENT` dan perlu mengisi nama penuh + kelas.

### Guru Kelas

1. Log masuk sebagai admin → **Guru Kelas**.
2. Masukkan emel Google guru dan tandakan satu atau lebih kelas (11 kelas tersedia):
   `1 AMANAH`, `1 BUDIMAN`, `1 CEKAL`, `1 DAMAI`, `1 EHSAN`, `1 FIKRAH`,
   `1 GIGIH`, `1 JUJUR`, `1 IKHLAS`, `1 KUKUH`, `1 MURNI`.
3. Jika guru belum pernah log masuk, status menunjukkan **Menunggu Log Masuk**.
   Apabila guru log masuk dengan emel tersebut, akaunnya automatik menjadi
   `TEACHER` (label **Guru Kelas**).
4. Guru hanya nampak dashboard, pelajar, keputusan, ranking dan sijil bagi kelas
   yang ditetapkan. Halaman **Guru Kelas** dan **Tetapan Sheet** hanya untuk admin.
5. Untuk membuang akses, tekan **Buang** dalam senarai Guru Kelas. Akaun guru
   kembali menjadi pelajar dan perlu melengkapkan profil semula jika digunakan
   sebagai pelajar.

Penapisan kelas dibuat di pelayan melalui RPC Supabase (`staff_class_scope()`),
bukan sekadar disembunyikan di frontend.

### Senarai kelas pelajar

Pelajar memilih kelas daripada dropdown semasa melengkapkan profil. Senarai
kelas diselaraskan antara frontend (`src/lib/classes.ts`) dan pengesahan SQL
(`public.is_valid_class()`). Jika senarai kelas berubah, kemas kini kedua-dua
tempat dan jalankan semula `004_teachers_and_classes.sql`.

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

Repo: `mooc-solat-mercu-kejayaan` (public, project site).

```bash
git init
git add .
git commit -m "MOOC Solat Mercu Kejayaan"
git branch -M main
git remote add origin https://github.com/zfzariff2-oss/mooc-solat-mercu-kejayaan.git
git push -u origin main
```

GitHub Actions (`.github/workflows/deploy.yml`) akan build dan deploy ke
`https://zfzariff2-oss.github.io/mooc-solat-mercu-kejayaan/`.

Jika perlu, di GitHub → **Settings → Pages** pilih source **GitHub Actions**.

## 5. Struktur

```text
src/
  content/course.ts          # 7 modul, 35 soalan kuiz, 20 soalan akhir
  context/AuthContext.tsx    # sesi GIS + profil + kelas guru
  components/                # UI, slaid, kuiz, pentaksiran, sijil
  pages/                     # halaman pelajar + admin + Guru Kelas
  lib/                       # Supabase, PDF sijil, TTS, kelas, utiliti
supabase/migrations/         # skema, RPC, seed, guru & kelas (004)
integrations/google-sheets/  # Apps Script webhook
public/audio/tts/            # MP3 tajuk, kad dan soalan
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
- Data Guru Kelas ditapis di pelayan mengikut `staff_class_scope()`; guru tidak
  boleh mengakses kelas lain melalui RPC atau URL.
- Halaman **Guru Kelas** dan **Tetapan Sheet** hanya boleh diakses `ADMIN`.
- Apps Script webhook dilindungi `WEBHOOK_SECRET`.
- Client Secret Google hanya dalam dashboard Supabase, bukan dalam repo.
- Jangan commit token GitHub. Revoke token yang pernah dikongsi.

## 8. Nota

- Panel admin **tidak** menyunting kandungan. Kandungan diurus melalui
  `src/content/course.ts` + `npm run generate:keys`.
- Jika mahu tambah/edit soalan, ubah fail kandungan, jana semula seed, dan jalankan
  `003_seed.sql` semula.
- **Aliran audio kad:**
  - Pelajar tekan kad pertama (**Mula Dengar**).
  - Audio **tajuk slaid** dimainkan dahulu, kemudian audio kad 1, 2, 3… secara auto-sambung.
  - Setiap audio kad menyebut **label kad** (contoh: “Maksud”, “Syarat wajib”, “Perkara 1”) sebelum kandungannya.
  - Singkatan **SAW**, **SWT** dan **RA** disebut penuh dalam audio: “Sallallahu alaihi wasallam”, “Subhanahu wa ta'ala” dan “Radiyallahu anhu”.
  - Setiap kad ditanda **✓ Selesai** selepas audionya tamat.
  - Butang **⏸ Hentikan** menghentikan audio; kad yang belum selesai menunjukkan **Sambung Dengar**.
  - Selepas semua kad selesai, butang **🔊 Dengar** satu-satu muncul dan butang **Seterusnya** dibuka.
  - Jika pelajar keluar slaid di tengah, slaid perlu dimulakan semula dari kad pertama.
- **TTS** menggunakan audio MP3 Google Cloud TTS yang dijana melalui
  `scripts/generate-google-tts.mjs` dan disimpan di `public/audio/tts/{titles,cards,questions}`.
  Key hanya digunakan semasa penjanaan; ia tidak dimasukkan ke frontend. Jika fail
  audio tiada, frontend fallback ke Web Speech API dengan normalisasi singkatan yang sama.
- **Peranan Guru Kelas** menggunakan `profiles.role = 'TEACHER'` dan jadual
  `teacher_assignments(email, class_name)`. Satu guru boleh memegang lebih daripada
  satu kelas. Skop kelas dikuatkuasakan dalam RPC Supabase, jadi guru tidak boleh
  membaca kelas lain walaupun menukar URL.
- Kesan bunyi (klik/betul/salah/ralat) menggunakan Web Audio API; tiada fail
  audio luaran diperlukan untuk kesan bunyi.
