import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { upperName } from "./utils";
import { assetUrl } from "./asset";
import {
  CERT_HEIGHT,
  CERT_LAYOUT,
  CERT_WIDTH,
  certificateClassText,
  certificateNumberText,
  certificateSentence,
} from "./certificateLayout";

export interface CertificatePdfInput {
  studentName: string;
  className: string | null;
  certificateNumber: string;
  issuedAt: string;
  courseTitle: string;
}

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const X_SCALE = PAGE_WIDTH / CERT_WIDTH;

const navy = rgb(4 / 255, 22 / 255, 61 / 255);
const sentenceColor = rgb(6 / 255, 9 / 255, 33 / 255);
const white = rgb(1, 1, 1);
const nameShadow = rgb(169 / 255, 184 / 255, 202 / 255);
const classShadow = rgb(158 / 255, 178 / 255, 200 / 255);
const sentenceShadow = rgb(185 / 255, 196 / 255, 212 / 255);
const numberShadow = rgb(7 / 255, 63 / 255, 104 / 255);

/** Tukar baseline dalam unit imej kepada koordinat PDF (asal bawah-kiri). */
function imageYToPdf(imageY: number): number {
  return PAGE_HEIGHT - (imageY / CERT_HEIGHT) * PAGE_HEIGHT;
}

function fitFontSize(font: PDFFont, text: string, baseSize: number, maxWidth: number): number {
  const naturalWidth = font.widthOfTextAtSize(text, baseSize);
  if (naturalWidth <= maxWidth) return baseSize;
  return Math.max(8, (maxWidth / naturalWidth) * baseSize);
}

interface TextSegment {
  text: string;
  font: PDFFont;
}

function segmentsWidth(segments: TextSegment[], size: number): number {
  return segments.reduce((total, segment) => total + segment.font.widthOfTextAtSize(segment.text, size), 0);
}

function fitSegmentsSize(segments: TextSegment[], baseSize: number, maxWidth: number): number {
  const naturalWidth = segmentsWidth(segments, baseSize);
  if (naturalWidth <= maxWidth) return baseSize;
  return Math.max(8, (maxWidth / naturalWidth) * baseSize);
}

function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  imageBaseline: number,
  color: ReturnType<typeof rgb>,
  shadow?: { color: ReturnType<typeof rgb>; dx: number; dy: number },
) {
  if (!text) return;
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = (PAGE_WIDTH - textWidth) / 2;
  const y = imageYToPdf(imageBaseline);
  if (shadow) {
    page.drawText(text, {
      x: x + shadow.dx,
      y: y - shadow.dy,
      size,
      font,
      color: shadow.color,
    });
  }
  page.drawText(text, { x, y, size, font, color });
}

function drawCenteredSegments(
  page: PDFPage,
  segments: TextSegment[],
  size: number,
  imageBaseline: number,
  color: ReturnType<typeof rgb>,
  shadow?: { color: ReturnType<typeof rgb>; dx: number; dy: number },
) {
  const totalWidth = segmentsWidth(segments, size);
  const startX = (PAGE_WIDTH - totalWidth) / 2;
  const y = imageYToPdf(imageBaseline);

  if (shadow) {
    let x = startX;
    for (const segment of segments) {
      if (segment.text) {
        page.drawText(segment.text, {
          x: x + shadow.dx,
          y: y - shadow.dy,
          size,
          font: segment.font,
          color: shadow.color,
        });
      }
      x += segment.font.widthOfTextAtSize(segment.text, size);
    }
  }

  let x = startX;
  for (const segment of segments) {
    if (segment.text) page.drawText(segment.text, { x, y, size, font: segment.font, color });
    x += segment.font.widthOfTextAtSize(segment.text, size);
  }
}

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]); // A4 landskap
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const serifBoldItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const templateResponse = await fetch(assetUrl("sijil-template.png"));
  if (!templateResponse.ok) throw new Error("Templat sijil tidak dapat dimuatkan.");
  const template = await doc.embedPng(await templateResponse.arrayBuffer());

  // Latar templat penuh (diregangkan sedikit mengikut nisbah A4 landskap).
  page.drawImage(template, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

  const displayName = upperName(input.studentName) || "PELAJAR";
  const nameSizePt = fitFontSize(
    serifBold,
    displayName,
    CERT_LAYOUT.name.size * X_SCALE,
    CERT_LAYOUT.name.maxWidth * X_SCALE,
  );
  drawCentered(page, displayName, serifBold, nameSizePt, CERT_LAYOUT.name.baseline, navy, {
    color: nameShadow,
    dx: 2 * X_SCALE,
    dy: 3 * (PAGE_HEIGHT / CERT_HEIGHT),
  });

  const classText = certificateClassText(input.className);
  const classSizePt = fitFontSize(
    serifBold,
    classText,
    CERT_LAYOUT.className.size * X_SCALE,
    CERT_LAYOUT.className.maxWidth * X_SCALE,
  );
  drawCentered(page, classText, serifBold, classSizePt, CERT_LAYOUT.className.baseline, navy, {
    color: classShadow,
    dx: 1.5 * X_SCALE,
    dy: 2 * (PAGE_HEIGHT / CERT_HEIGHT),
  });

  const sentence = certificateSentence(input.courseTitle, input.issuedAt);
  const sentenceBasePt = CERT_LAYOUT.sentenceLine1.size * X_SCALE;
  const line2Segments: TextSegment[] = [
    { text: sentence.line2Before, font: serifItalic },
    { text: sentence.line2Course, font: serifBoldItalic },
    { text: sentence.line2After, font: serifItalic },
  ];
  const sentenceSizePt = Math.min(
    fitFontSize(
      serifItalic,
      sentence.line1,
      sentenceBasePt,
      CERT_LAYOUT.sentenceLine1.maxWidth * X_SCALE,
    ),
    fitSegmentsSize(
      line2Segments,
      sentenceBasePt,
      CERT_LAYOUT.sentenceLine2.maxWidth * X_SCALE,
    ),
  );
  const sentenceShadowStyle = {
    color: sentenceShadow,
    dx: 1.5 * X_SCALE,
    dy: 2 * (PAGE_HEIGHT / CERT_HEIGHT),
  };
  drawCentered(
    page,
    sentence.line1,
    serifItalic,
    sentenceSizePt,
    CERT_LAYOUT.sentenceLine1.baseline,
    sentenceColor,
    sentenceShadowStyle,
  );
  drawCenteredSegments(
    page,
    line2Segments,
    sentenceSizePt,
    CERT_LAYOUT.sentenceLine2.baseline,
    sentenceColor,
    sentenceShadowStyle,
  );

  const numberText = certificateNumberText(input.certificateNumber);
  const numberSizePt = fitFontSize(
    sansBold,
    numberText,
    CERT_LAYOUT.certificateNumber.size * X_SCALE,
    CERT_LAYOUT.certificateNumber.maxWidth * X_SCALE,
  );
  drawCentered(
    page,
    numberText,
    sansBold,
    numberSizePt,
    CERT_LAYOUT.certificateNumber.baseline,
    white,
    { color: numberShadow, dx: 0, dy: 2 * (PAGE_HEIGHT / CERT_HEIGHT) },
  );

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
