import { assetUrl } from "@/lib/asset";
import {
  CERT_COLORS,
  CERT_HEIGHT,
  CERT_LAYOUT,
  CERT_WIDTH,
  certificateClassText,
  certificateNumberText,
  certificateSentence,
  fitPreviewTextSize,
} from "@/lib/certificateLayout";
import { playClick } from "@/lib/sfx";
import { upperName } from "@/lib/utils";

/** Nisbah halaman PDF A4 landskap. */
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const X_SCALE = PAGE_WIDTH / CERT_WIDTH;
const Y_SCALE = PAGE_HEIGHT / CERT_HEIGHT;

const sx = (value: number) => value * X_SCALE;
const sy = (value: number) => value * Y_SCALE;

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
  const nameText = upperName(studentName) || "PELAJAR";
  const classText = certificateClassText(className);
  const numberText = certificateNumberText(certificateNumber);
  const sentence = certificateSentence(courseTitle, issuedAt);

  const nameSize = fitPreviewTextSize(nameText, CERT_LAYOUT.name.size, CERT_LAYOUT.name.maxWidth, 0.62);
  const classSize = fitPreviewTextSize(
    classText,
    CERT_LAYOUT.className.size,
    CERT_LAYOUT.className.maxWidth,
    0.55,
  );
  const sentenceSize = Math.min(
    fitPreviewTextSize(
      sentence.line1,
      CERT_LAYOUT.sentenceLine1.size,
      CERT_LAYOUT.sentenceLine1.maxWidth,
      0.472,
    ),
    fitPreviewTextSize(
      sentence.line2,
      CERT_LAYOUT.sentenceLine2.size,
      CERT_LAYOUT.sentenceLine2.maxWidth,
      0.48,
    ),
  );
  const numberSize = fitPreviewTextSize(
    numberText,
    CERT_LAYOUT.certificateNumber.size,
    CERT_LAYOUT.certificateNumber.maxWidth,
    0.484,
  );

  const serif = "'Times New Roman', Times, Georgia, serif";
  const sans = "Arial, Helvetica, sans-serif";

  return (
    <div className="certificate-print">
      <div
        className="certificate-sheet relative mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(2,32,71,0.55)]"
        style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
        role="img"
        aria-label={`Sijil penyertaan ${studentName}${className ? `, kelas ${className}` : ""}, nombor ${certificateNumber}.`}
      >
        <img
          src={assetUrl("sijil-template.png")}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-fill"
        />
        <svg
          viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <g textAnchor="middle">
            {/* Nama pelajar: bayang halus + teks navy. */}
            <text
              x={sx(CERT_LAYOUT.name.x + 2)}
              y={sy(CERT_LAYOUT.name.baseline + 3)}
              fontFamily={serif}
              fontWeight="700"
              fontSize={sx(nameSize)}
              fill={CERT_COLORS.nameShadow}
            >
              {nameText}
            </text>
            <text
              x={sx(CERT_LAYOUT.name.x)}
              y={sy(CERT_LAYOUT.name.baseline)}
              fontFamily={serif}
              fontWeight="700"
              fontSize={sx(nameSize)}
              fill={CERT_COLORS.navy}
            >
              {nameText}
            </text>

            {/* Plak kelas. */}
            <text
              x={sx(CERT_LAYOUT.className.x + 1.5)}
              y={sy(CERT_LAYOUT.className.baseline + 2)}
              fontFamily={serif}
              fontWeight="700"
              fontSize={sx(classSize)}
              fill={CERT_COLORS.classShadow}
            >
              {classText}
            </text>
            <text
              x={sx(CERT_LAYOUT.className.x)}
              y={sy(CERT_LAYOUT.className.baseline)}
              fontFamily={serif}
              fontWeight="700"
              fontSize={sx(classSize)}
              fill={CERT_COLORS.navy}
            >
              {classText}
            </text>

            {/* Ayat kursus dan tarikh. */}
            <g
              fontFamily={serif}
              fontStyle="italic"
              fontSize={sx(sentenceSize)}
              fill={CERT_COLORS.sentence}
            >
              <text
                x={sx(CERT_LAYOUT.sentenceLine1.x + 1.5)}
                y={sy(CERT_LAYOUT.sentenceLine1.baseline + 2)}
                fill={CERT_COLORS.sentenceShadow}
              >
                {sentence.line1}
              </text>
              <text x={sx(CERT_LAYOUT.sentenceLine1.x)} y={sy(CERT_LAYOUT.sentenceLine1.baseline)}>
                {sentence.line1}
              </text>
              <text
                x={sx(CERT_LAYOUT.sentenceLine2.x + 1.5)}
                y={sy(CERT_LAYOUT.sentenceLine2.baseline + 2)}
                fill={CERT_COLORS.sentenceShadow}
              >
                {sentence.line2Before}
                <tspan fontWeight="700">{sentence.line2Course}</tspan>
                {sentence.line2After}
              </text>
              <text
                x={sx(CERT_LAYOUT.sentenceLine2.x)}
                y={sy(CERT_LAYOUT.sentenceLine2.baseline)}
              >
                {sentence.line2Before}
                <tspan fontWeight="700">{sentence.line2Course}</tspan>
                {sentence.line2After}
              </text>
            </g>

            {/* Nombor sijil pada reben biru. */}
            <text
              x={sx(CERT_LAYOUT.certificateNumber.x)}
              y={sy(CERT_LAYOUT.certificateNumber.baseline + 2)}
              fontFamily={sans}
              fontWeight="700"
              fontSize={sx(numberSize)}
              fill={CERT_COLORS.numberShadow}
            >
              {numberText}
            </text>
            <text
              x={sx(CERT_LAYOUT.certificateNumber.x)}
              y={sy(CERT_LAYOUT.certificateNumber.baseline)}
              fontFamily={sans}
              fontWeight="700"
              fontSize={sx(numberSize)}
              fill={CERT_COLORS.white}
            >
              {numberText}
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => {
            playClick();
            window.print();
          }}
          className="transition-soft rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:border-forest/30 hover:text-forest"
        >
          🖨 CETAK / SIMPAN PDF
        </button>
        {onDownload && (
          <button
            onClick={() => {
              playClick();
              onDownload();
            }}
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
