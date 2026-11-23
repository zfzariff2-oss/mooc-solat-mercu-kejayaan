/**
 * Menjana contoh sijil PDF untuk semakan reka bentuk.
 * Jalankan: node scripts/generate-sample-certificate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

function formatDateMY(iso) {
  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(iso));
}

async function build() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const { width, height } = page.getSize();
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifNormal = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(fs.readFileSync(path.join(root, "public", "logo-sekolah.png")));

  const gold = rgb(0.65, 0.54, 0.31);
  const forest = rgb(0.01, 0.17, 0.13);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.98, 0.97) });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: gold, borderWidth: 3 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: gold, borderWidth: 1 });

  const logoSize = 76;
  page.drawImage(logo, {
    x: (width - logoSize) / 2,
    y: height - 112,
    width: logoSize,
    height: logoSize,
  });

  const cx = (text, font, size, y, color = forest) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  cx("SEKOLAH MENENGAH KEBANGSAAN JALAN TIGA", sansBold, 11, height - 132, gold);
  cx("SIJIL PENYERTAAN", serif, 38, height - 170);
  cx("SOLAT MERCU KEJAYAAN", sans, 15, height - 205, gold);
  cx("Dengan ini disahkan bahawa", serifNormal, 13, height - 253);
  cx("AHMAD BIN ABDULLAH", serif, 32, height - 303);
  cx("Kelas: 1 AMANAH", sansBold, 14, height - 336);
  cx(`Telah berjaya menamatkan kursus pada ${formatDateMY(new Date().toISOString())}`, sans, 12, height - 363);
  cx("No. Sijil: SMK-2026-99999", sans, 12, height - 387);
  cx("Tahniah dan teruskan usaha menjadi mukmin yang bertakwa.", sans, 11, height - 415);
  cx("Sahkan di /sijil/[nombor-sijil]", sans, 9, 60, gold);
  cx("CONTOH PAPARAN — BUKAN SIJIL RASMI", sans, 9, 44, rgb(0.55, 0.55, 0.55));

  const bytes = await doc.save();
  const publicOut = path.join(root, "public", "contoh-sijil.pdf");
  const rootOut = path.join(root, "..", "contoh-sijil.pdf");
  fs.mkdirSync(path.dirname(publicOut), { recursive: true });
  fs.writeFileSync(publicOut, bytes);
  fs.writeFileSync(rootOut, bytes);
  console.log("Ditulis:", publicOut);
  console.log("Ditulis:", rootOut);
}

await build();
