/**
 * Konfigurasi awam frontend.
 * URL, publishable key dan Google Client ID memang selamat didedahkan —
 * keselamatan sebenar terletak pada RLS + RPC Supabase.
 */
function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const SUPABASE_URL = envOr(
  import.meta.env.VITE_SUPABASE_URL,
  "https://ghrzskkcxkezczxlnugr.supabase.co",
);

export const SUPABASE_PUBLISHABLE_KEY = envOr(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  "sb_publishable_kdwj37R2ar53xZgHr1Kblg_LAn8_C9p",
);

export const GOOGLE_CLIENT_ID = envOr(
  import.meta.env.VITE_GOOGLE_CLIENT_ID,
  "758579492428-vofita9ipjoppcm6jntdpejhmc3v1d5a.apps.googleusercontent.com",
);

export const ENABLE_PASSWORD_LOGIN =
  (import.meta.env.VITE_ENABLE_PASSWORD_LOGIN ?? "false") === "true";

export const ADMIN_EMAIL = "zfzariff2@gmail.com";

export const COURSE_TITLE = "Solat Mercu Kejayaan";
export const COURSE_SUBTITLE = "Pendidikan Islam Tingkatan 1";
export const COURSE_FULL_TITLE = `MOOC ${COURSE_TITLE} — ${COURSE_SUBTITLE}`;
