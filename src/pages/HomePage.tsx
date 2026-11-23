import { Link } from "react-router-dom";
import { COURSE_SUBTITLE, COURSE_TITLE } from "@/lib/config";

const STEPS = [
  {
    n: "01",
    title: "Log Masuk",
    desc: "Guna akaun Google anda (GIS). Kali pertama, isi nama penuh dan kelas.",
    icon: "🔑",
    tone: "from-forest/15 to-mint/15 text-forest",
  },
  {
    n: "02",
    title: "Belajar 7 Modul",
    desc: "Ikuti slaid interaktif tentang solat, dari dalil hingga khusyuk.",
    icon: "📖",
    tone: "from-sky/15 to-forest/10 text-sky-dark",
  },
  {
    n: "03",
    title: "Kuiz Modul",
    desc: "Uji kefahaman setiap modul. Lulus 80% untuk melengkapkan modul.",
    icon: "🧠",
    tone: "from-grape/15 to-sky/10 text-grape",
  },
  {
    n: "04",
    title: "Pentaksiran & Sijil",
    desc: "Jawab 20 soalan sekali sahaja. Sijil diberikan tanpa kira markah.",
    icon: "🏆",
    tone: "from-sun/20 to-coral/10 text-sun-dark",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden bg-gradient-to-br from-forest via-forest-light to-sky-dark text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-grape/25" />
        <span aria-hidden className="animate-floaty pointer-events-none absolute right-16 top-20 hidden text-5xl lg:block">
          ✨
        </span>
        <span aria-hidden className="animate-floaty pointer-events-none absolute bottom-24 right-40 hidden text-4xl lg:block">
          🕌
        </span>
        <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold tracking-[0.28em] backdrop-blur-sm">
            📚 {COURSE_SUBTITLE.toUpperCase()} • KSSM
          </span>
          <h1 className="font-display mt-5 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            MOOC {COURSE_TITLE}
          </h1>
          <p className="font-display mt-4 text-2xl font-bold text-mint md:text-3xl">
            Solat tiang agama, mercu kejayaan 🌟
          </p>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/80">
            Pelajari maksud, dalil, syarat, rukun, sunat, hikmah dan khusyuk dalam solat melalui 7 modul
            interaktif. Jawab kuiz, takluki pentaksiran akhir dan raih sijil pencapaian anda.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="transition-soft rounded-full bg-white px-8 py-3 text-sm font-bold tracking-wide text-forest shadow-lg hover:-translate-y-0.5"
            >
              🚀 LOG MASUK
            </Link>
            <Link
              to="/sahkan-sijil"
              className="transition-soft rounded-full border-2 border-white/40 px-8 py-3 text-sm font-bold tracking-wide text-white hover:bg-white/10"
            >
              ✅ SAHKAN SIJIL
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-14">
        <span className="inline-flex items-center rounded-full bg-forest/10 px-3 py-1 text-[11px] font-bold tracking-[0.22em] text-forest">
          CARA IA BERFUNGSI
        </span>
        <h2 className="font-display mt-3 text-3xl font-extrabold text-slate-900">Empat langkah mudah 🎯</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className={`card-pop card-hover animate-fade-up bg-gradient-to-br p-6 ${s.tone}`}>
              <div className="flex items-start justify-between">
                <p className="font-display text-4xl font-extrabold opacity-30">{s.n}</p>
                <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  {s.icon}
                </span>
              </div>
              <p className="font-display mt-4 text-lg font-extrabold text-slate-800">{s.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{s.desc}</p>
            </li>
          ))}
        </ol>

        <div className="card-pop mt-10 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-sun-light via-white to-coral-light p-6 text-sm leading-6 text-slate-600">
          <p className="max-w-2xl">
            Kursus ini mengandungi <b>7 modul</b>, <b>35 soalan kuiz</b> dan <b>20 soalan pentaksiran akhir</b>.
            Sijil dikeluarkan selepas pentaksiran akhir dihantar — tanpa kira markah.
          </p>
          <span aria-hidden className="animate-floaty text-4xl">
            🎓
          </span>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200/70 px-6 py-6 text-center text-xs font-medium text-slate-400">
        MOOC {COURSE_TITLE} • {COURSE_SUBTITLE} • Kandungan berdasarkan nota kursus Solat Mercu Kejayaan.
      </footer>
    </div>
  );
}
