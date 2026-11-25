import * as zlib from 'zlib';
import { Question, QuestionData } from '../../models/Question';
import { QuestionBank } from '../../models/QuestionBank';
import { ExamBank } from '../../models/ExamBank';

/** Question data whose first alternative is the only true one. */
export const questionData = (name: string, alternatives: string[] = ['Certa', 'Errada 1', 'Errada 2', 'Errada 3']) => ({
  subject: 'Gerência de configuração',
  statement: `Enunciado da questão ${name}`,
  alternatives: alternatives.map((text, i) => ({ text, isTrue: i === 0 }))
});

export interface Registered {
  questionBank: QuestionBank;
  examBank: ExamBank;
  /** Code of the registered exam. */
  examCode: string;
  questions: Question[];
}

/** Registers the given questions and an exam "Prova de Git" with all of them, in order. */
export function registerExam(questions: ReturnType<typeof questionData>[] = ['A', 'B', 'C'].map(n => questionData(n))): Registered {
  const questionBank = new QuestionBank();
  const examBank = new ExamBank(questionBank);
  const created = questions.map(q => questionBank.add(Question.create(q)));
  const exam = examBank.addExam({ name: 'Prova de Git', questionCodes: created.map(q => q.code) });
  return { questionBank, examBank, examCode: exam.code, questions: created };
}

/** Evaluation data of the GUI scenarios. */
export const evaluation = (overrides: Record<string, unknown> = {}) => ({
  evaluationType: 'Bimestral',
  evaluationDate: '25/12/2026',
  studentCount: 10,
  ...overrides
});

export type { QuestionData };

/** Reads a ZIP archive (as produced by the application) into a map name → content. */
export function readZip(zip: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const endOffset = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOffset < 0) throw new Error('Not a ZIP archive');
  const count = zip.readUInt16LE(endOffset + 10);
  let pos = zip.readUInt32LE(endOffset + 16);
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(pos) !== 0x02014b50) throw new Error('Corrupt central directory');
    const method = zip.readUInt16LE(pos + 10);
    const compressedSize = zip.readUInt32LE(pos + 20);
    const nameLength = zip.readUInt16LE(pos + 28);
    const extraLength = zip.readUInt16LE(pos + 30);
    const commentLength = zip.readUInt16LE(pos + 32);
    const localOffset = zip.readUInt32LE(pos + 42);
    const name = zip.toString('utf8', pos + 46, pos + 46 + nameLength);
    const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    const body = zip.subarray(dataStart, dataStart + compressedSize);
    files.set(name, method === 8 ? zlib.inflateRawSync(body) : Buffer.from(body));
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

/** The text drawn in a PDF produced by the application, one line per text operation. */
export function pdfLines(pdf: Buffer): string[] {
  const source = pdf.toString('latin1');
  const lines: string[] = [];
  for (const match of source.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)) {
    lines.push(
      match[1]
        .replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
        .replace(/\\(.)/g, '$1')
    );
  }
  return lines;
}

export const pdfText = (pdf: Buffer): string => pdfLines(pdf).join('\n');

export const pdfPageCount = (pdf: Buffer): number => (pdf.toString('latin1').match(/\/Type \/Page /g) || []).length;

/** The PDFs of the archive, keyed by exam code. */
export function examsByCode(files: Map<string, Buffer>): Map<string, Buffer> {
  const exams = new Map<string, Buffer>();
  Array.from(files.entries()).forEach(([name, data]) => {
    const match = /^provas\/prova_\d+_([A-Z0-9]+)\.pdf$/.exec(name);
    if (match) exams.set(match[1], data);
  });
  return exams;
}

/** The rows of the first sheet of an .xlsx produced by the application (inline strings and numbers only). */
export function xlsxRows(xlsx: Buffer): string[][] {
  const sheet = readZip(xlsx).get('xl/worksheets/sheet1.xml')!.toString('utf8');
  return Array.from(sheet.matchAll(/<row [^>]*>(.*?)<\/row>/g)).map(row =>
    Array.from(row[1].matchAll(/<c [^>]*?(?:\/>|>(.*?)<\/c>)/g)).map(cell =>
      (cell[1] ?? '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    )
  );
}

/** Letters (A, B...) of the alternatives that hold one of the true texts, in the order printed on the PDF. */
export function trueLettersFromPdf(pdf: Buffer, trueTexts: Set<string>): string[] {
  const questions: string[][] = [];
  for (const line of pdfLines(pdf)) {
    if (/^\d+\. /.test(line)) questions.push([]);
    const alt = /^([a-z])\) (.*)$/.exec(line);
    if (alt && trueTexts.has(alt[2])) questions[questions.length - 1].push(alt[1].toUpperCase());
  }
  return questions.map(letters => (letters.length ? letters.join(',') : '-'));
}
