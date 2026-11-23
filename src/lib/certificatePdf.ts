import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateMY, upperName } from "./utils";

export interface CertificatePdfInput {
  studentName: string;
  className: string | null;
  certificateNumber: string;
  issuedAt: string;
  courseTitle: string;
}

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landskap
  const { width, height } = page.getSize();
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifNormal = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const gold = rgb(0.65, 0.54, 0.31);
  const forest = rgb(0.01, 0.17, 0.13);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.98, 0.97) });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: gold, borderWidth: 3 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: gold, borderWidth: 1 });

  const cx = (text: string, font: typeof serif, size: number, y: number, color = forest) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  cx("SIJIL PENYELESAIAN", serif, 38, height - 140);
  cx(input.courseTitle.toUpperCase(), sans, 15, height - 172, gold);
  cx("Dengan ini disahkan bahawa", serifNormal, 13, height - 222);
  const displayName = upperName(input.studentName);
  let nameSize = 32;
  while (nameSize > 16 && serif.widthOfTextAtSize(displayName, nameSize) > width - 160) {
    nameSize -= 2;
  }
  cx(displayName, serif, nameSize, height - 272);
  if (input.className) cx(`Kelas: ${input.className}`, sansBold, 14, height - 305);
  cx(`Telah berjaya menamatkan kursus pada ${formatDateMY(input.issuedAt)}`, sans, 12, height - 332);
  cx(`No. Sijil: ${input.certificateNumber}`, sans, 12, height - 356);
  cx("Tahniah dan teruskan usaha menjadi mukmin yang bertakwa.", sans, 11, height - 384);
  cx("Sahkan di /sijil/[nombor-sijil]", sans, 9, 60, gold);

  return doc.save();
}

export async function downloadCertificatePdf(input: CertificatePdfInput): Promise<void> {
  const bytes = await buildCertificatePdf(input);
  const blob = new Blob([bytes.slice()], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Sijil-${input.certificateNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
