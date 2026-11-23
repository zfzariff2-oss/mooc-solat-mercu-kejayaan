import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COURSE_TITLE } from "@/lib/config";
import { Field, PrimaryButton, TextInput } from "@/components/ui";

export default function VerifySearchPage() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-forest via-forest-light to-sky-dark px-4 py-12">
      <div className="card-pop w-full max-w-lg p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-mint-light px-3 py-1 text-[11px] font-bold tracking-[0.22em] text-mint-dark">
          ✅ VERIFIKASI SIJIL
        </span>
        <h1 className="font-display mt-3 text-3xl font-extrabold text-slate-900">Sahkan Sijil</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Masukkan nombor sijil untuk menyemak kesahihannya. Nombor sijil terdapat pada sijil {COURSE_TITLE}.
        </p>
        <form
          className="mt-6 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const number = value.trim().toUpperCase();
            if (number) navigate(`/sijil/${encodeURIComponent(number)}`);
          }}
        >
          <Field label="NOMBOR SIJIL" htmlFor="certificateNumber">
            <TextInput
              id="certificateNumber"
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              placeholder="cth. SMK-2026-00001"
              className="font-mono tracking-wider"
              required
            />
          </Field>
          <PrimaryButton type="submit" className="w-full">
            SEMAK SIJIL
          </PrimaryButton>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/" className="font-semibold underline">
            ← Kembali ke halaman utama
          </Link>
        </p>
      </div>
    </div>
  );
}
