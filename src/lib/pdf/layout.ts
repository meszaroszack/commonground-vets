import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export const ink = rgb(28 / 255, 40 / 255, 38 / 255);
export const clay = rgb(217 / 255, 107 / 255, 67 / 255);
export const paperInk = rgb(251 / 255, 249 / 255, 245 / 255);
const muted = rgb(90 / 255, 104 / 255, 100 / 255);

export function pdfSafe(text: string): string {
  return text
    .replaceAll("\u2019", "'")
    .replaceAll("\u2018", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u2014", " - ")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2026", "...")
    .replace(/[^\n\r\t\x20-\x7E]/g, "");
}

function breakWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const parts: string[] = [];
  let chunk = "";
  for (const char of word) {
    const next = chunk + char;
    if (font.widthOfTextAtSize(next, size) > maxWidth && chunk) {
      parts.push(chunk);
      chunk = char;
    } else {
      chunk = next;
    }
  }
  if (chunk) parts.push(chunk);
  return parts;
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of pdfSafe(text).split(/\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      for (const piece of breakWord(word, font, size, maxWidth)) {
        const next = current ? `${current} ${piece}` : piece;
        if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
          lines.push(current);
          current = piece;
        } else {
          current = next;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export function decodePngDataUrl(dataUrl: string): Uint8Array | null {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length < 40 || bytes.length > 1_500_000) return null;
  return new Uint8Array(bytes);
}

export class Paper {
  readonly doc: PDFDocument;
  page: PDFPage;
  readonly font: PDFFont;
  readonly fontBold: PDFFont;
  y = 724;

  private constructor(doc: PDFDocument, page: PDFPage, font: PDFFont, fontBold: PDFFont) {
    this.doc = doc;
    this.page = page;
    this.font = font;
    this.fontBold = fontBold;
  }

  static async create(title: string): Promise<Paper> {
    const doc = await PDFDocument.create();
    doc.setTitle(pdfSafe(title));
    doc.setAuthor("Common Ground");
    doc.setSubject("Self-service preparation copy. Not a VA decision.");
    doc.setCreator("Common Ground");
    const page = doc.addPage([612, 792]);
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const paper = new Paper(doc, page, font, fontBold);
    paper.paintBand();
    return paper;
  }

  paintBand() {
    this.page.drawRectangle({ x: 0, y: 756, width: 612, height: 36, color: rgb(0.11, 0.157, 0.149) });
    this.page.drawText("COMMON GROUND  ·  SELF-SERVICE PREPARATION COPY", {
      x: 48,
      y: 770,
      size: 9,
      font: this.fontBold,
      color: paperInk,
    });
  }

  ensure(height: number) {
    if (this.y - height >= 56) return;
    this.breakPage();
  }

  breakPage() {
    this.page = this.doc.addPage([612, 792]);
    this.paintBand();
    this.y = 724;
  }

  heading(text: string) {
    this.ensure(26);
    this.page.drawText(pdfSafe(text), { x: 48, y: this.y, size: 14, font: this.fontBold, color: clay });
    this.y -= 20;
  }

  label(text: string) {
    this.ensure(16);
    this.page.drawText(pdfSafe(text), { x: 48, y: this.y, size: 9, font: this.fontBold, color: muted });
    this.y -= 14;
  }

  paragraph(text: string, size = 11) {
    const lines = wrapText(text, this.font, size, 516);
    for (const line of lines) {
      this.ensure(size + 4);
      if (line) this.page.drawText(line, { x: 48, y: this.y, size, font: this.font, color: ink });
      this.y -= size + 3;
    }
    this.y -= 6;
  }

  async drawSignature(png: Uint8Array | null | undefined) {
    this.label("Signature");
    if (!png) {
      this.paragraph("No signature image was attached.");
      return;
    }
    const image = await this.doc.embedPng(png);
    const width = 200;
    const height = Math.min(70, (image.height / image.width) * width);
    this.ensure(height + 8);
    this.page.drawRectangle({ x: 48, y: this.y - height, width: 220, height: height + 6, borderColor: sandColor(), borderWidth: 1 });
    this.page.drawImage(image, { x: 54, y: this.y - height + 2, width, height });
    this.y -= height + 16;
  }

  async finish(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      page.drawText(`You keep 100% of any VA compensation. Page ${index + 1} of ${pages.length}.`, {
        x: 48,
        y: 32,
        size: 8,
        font: this.font,
        color: muted,
      });
    });
    return this.doc.save();
  }
}

function sandColor() {
  return rgb(230 / 255, 225 / 255, 214 / 255);
}
