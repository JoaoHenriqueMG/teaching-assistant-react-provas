/**
 * A minimal PDF writer for text-only documents (A4, Helvetica). It exists so
 * that the exams can be produced without a PDF library. Text is encoded in
 * WinAnsi (Windows-1252), which covers Portuguese; other characters become '?'.
 */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

// Helvetica advance widths (1/1000 em) for the printable ASCII range 32..126
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];
const BOLD_FACTOR = 1.06; // Helvetica-Bold is slightly wider; good enough for wrapping

const WIN_ANSI_SPECIALS: Record<string, number> = {
  '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93,
  '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99
};

/** The WinAnsi byte for a character, or '?' when it cannot be represented. */
function winAnsiByte(char: string): number {
  const code = char.charCodeAt(0);
  if (code === 9) return 32;
  if (code >= 32 && code <= 126) return code;
  if (code >= 160 && code <= 255) return code;
  return WIN_ANSI_SPECIALS[char] ?? 63;
}

/** Text of a PDF literal string: ASCII only, with the special bytes escaped. */
function pdfString(text: string): string {
  let out = '';
  for (const char of Array.from(text.normalize('NFC'))) {
    const byte = winAnsiByte(char);
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) {
      out += '\\' + String.fromCharCode(byte);
    } else if (byte > 126) {
      out += '\\' + byte.toString(8).padStart(3, '0');
    } else {
      out += String.fromCharCode(byte);
    }
  }
  return `(${out})`;
}

function charWidth(char: string): number {
  const byte = winAnsiByte(char);
  if (byte >= 32 && byte <= 126) return HELVETICA_WIDTHS[byte - 32];
  // accented letters are about as wide as their base letter
  const base = char.normalize('NFD')[0];
  const baseByte = winAnsiByte(base);
  return baseByte >= 32 && baseByte <= 126 && base !== char ? HELVETICA_WIDTHS[baseByte - 32] : 556;
}

/** Width, in points, of a text at the given font size. */
export function textWidth(text: string, size: number, bold = false): number {
  const units = Array.from(text).reduce((sum, char) => sum + charWidth(char), 0);
  return ((units * (bold ? BOLD_FACTOR : 1)) / 1000) * size;
}

export interface TextStyle {
  size?: number;
  bold?: boolean;
  /** Left indentation, in points. */
  indent?: number;
  /** Extra space after the paragraph, in points. */
  spaceAfter?: number;
}

interface Line {
  x: number;
  y: number;
  text: string;
  size: number;
  bold: boolean;
}

/** Splits text into lines no wider than maxWidth, breaking words that are too long. */
export function wrapText(text: string, maxWidth: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidth(candidate, size, bold) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = '';
      let rest = word;
      while (textWidth(rest, size, bold) > maxWidth) {
        let cut = 1;
        while (cut < rest.length && textWidth(rest.slice(0, cut + 1), size, bold) <= maxWidth) cut++;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
    lines.push(current);
  }
  return lines;
}

/** Builds a multi-page PDF from paragraphs laid out top to bottom. */
export class PdfDocument {
  private readonly margin = 56;
  private readonly footerSpace = 36;
  private pages: Line[][] = [[]];
  private y = PAGE_HEIGHT - this.margin;

  constructor(private readonly title: string = 'Document') {}

  get pageCount(): number {
    return this.pages.length;
  }

  private get lineWidth(): number {
    return PAGE_WIDTH - 2 * this.margin;
  }

  /** Adds a paragraph, wrapping it and starting a new page when it does not fit. */
  paragraph(text: string, style: TextStyle = {}): void {
    const size = style.size ?? 11;
    const bold = style.bold ?? false;
    const indent = style.indent ?? 0;
    const leading = size * 1.35;
    for (const line of wrapText(text, this.lineWidth - indent, size, bold)) {
      if (this.y - leading < this.margin + this.footerSpace) {
        this.newPage();
      }
      this.y -= leading;
      this.pages[this.pages.length - 1].push({ x: this.margin + indent, y: this.y, text: line, size, bold });
    }
    this.y -= style.spaceAfter ?? 0;
  }

  /** Vertical blank space, in points. */
  space(points: number): void {
    this.y -= points;
  }

  private newPage(): void {
    this.pages.push([]);
    this.y = PAGE_HEIGHT - this.margin;
  }

  /**
   * Serializes the document. The footer function gives the text printed at
   * the bottom of each page, given the page number and the page count.
   */
  toBuffer(footer?: (page: number, total: number) => string): Buffer {
    const objects: string[] = [];
    // 1: catalog, 2: page tree, 3 and 4: fonts, then a page and its content per page
    const pageObjectIds = this.pages.map((_, i) => 5 + 2 * i);
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${this.pages.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    this.pages.forEach((lines, i) => {
      const all = footer
        ? [...lines, { x: this.margin, y: this.margin - 8, text: footer(i + 1, this.pages.length), size: 9, bold: false }]
        : lines;
      const content = all
        .map(l => `BT /${l.bold ? 'F2' : 'F1'} ${l.size} Tf ${l.x.toFixed(2)} ${l.y.toFixed(2)} Td ${pdfString(l.text)} Tj ET`)
        .join('\n');
      const pageId = 5 + 2 * i;
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
      objects[pageId + 1] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;
    });
    const infoId = objects.length;
    objects[infoId] = `<< /Title ${pdfString(this.title)} /Producer (Teaching Assistant) >>`;

    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = Buffer.byteLength(out, 'latin1');
      out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(out, 'latin1');
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) {
      out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
  }
}
