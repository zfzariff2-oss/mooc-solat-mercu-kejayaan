import { formatDateMY, upperName } from "@/lib/utils";

export default function CertificatePreview({
  studentName,
  className,
  certificateNumber,
  issuedAt,
  courseTitle,
  onDownload,
  downloadPending = false,
}: {
  studentName: string;
  className: string | null;
  certificateNumber: string;
  issuedAt: string;
  courseTitle: string;
  onDownload?: () => void;
  downloadPending?: boolean;
}) {
  return (
    <div className="certificate-print">
      <div className="border-[3px] border-[#a68b4f] bg-[#fdfcf9] p-2">
        <div className="border border-[#d6c08a] px-6 py-10 text-center">
          <p className="font-display text-4xl md:text-5xl">SIJIL PENYELESAIAN</p>
          <p className="mt-2 text-sm tracking-[0.2em] text-[#a68b4f]">{courseTitle.toUpperCase()}</p>
          <p className="mt-6 text-sm text-stone-500">Dengan ini disahkan bahawa</p>
          <p className="font-display mt-2 break-words text-3xl md:text-4xl">{upperName(studentName)}</p>
          {className && <p className="mt-2 font-mono text-sm text-stone-500">Kelas: {className}</p>}
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-stone-600">
            telah berjaya menamatkan kursus pada {formatDateMY(issuedAt)}.
          </p>
          <p className="mt-4 text-sm text-stone-600">
            No. Sijil: <span className="font-mono font-bold">{certificateNumber}</span>
          </p>
          <p className="mt-2 text-sm italic text-stone-500">Tahniah dan teruskan usaha menjadi mukmin yang bertakwa.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="transition-soft rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:border-forest/30 hover:text-forest"
        >
          🖨 CETAK / SIMPAN PDF
        </button>
        {onDownload && (
          <button
            onClick={onDownload}
            disabled={downloadPending}
            className="transition-soft rounded-full bg-forest px-6 py-2.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-forest/25 hover:bg-forest-light disabled:opacity-50"
          >
            {downloadPending ? "Menjana PDF…" : "📥 MUAT TURUN PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
