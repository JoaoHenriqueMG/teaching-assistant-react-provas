import { DomainError } from '../models/DomainError';
import { AnswerKeyEntry, StudentResponseEntry } from './AutoGrading';

/**
 * Reads the CSV exported from the answer key sheet and from the Google Forms
 * responses sheet. It only knows file formats: what the answers mean is
 * decided in AutoGrading.ts.
 *
 * Columns are found by name (ignoring case and accents), in any order:
 * - answer key: "número da prova"
 * - responses:  "número da prova" and "CPF"; "nome" is optional
 *
 * The answers are every column AFTER the last of those identifying columns,
 * whatever their titles, in the order they appear. Columns before them (the
 * timestamp, the e-mail...) are ignored, and so are columns with no title.
 * So the answers must be the last columns of the sheet.
 */

const DELIMITERS = [',', ';', '\t'];

/** Picks the delimiter that appears most in the first line (Brazilian Excel uses ';'). */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let best = ',';
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/** Parses CSV text (quoted fields, "" escapes, CRLF, BOM). Empty rows are dropped. */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(source);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (row.some(value => value.trim() !== '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      endCell();
    } else if (char === '\n') {
      endRow();
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    endRow();
  }
  return rows;
}

const normalizeHeader = (header: string): string =>
  header.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const namesOf = (header: string[]): string[] => header.map(normalizeHeader);

function requireColumn(names: string[], wanted: string, label: string): number {
  const index = names.indexOf(wanted);
  if (index < 0) {
    throw new DomainError(`Formato inválido: coluna "${label}" ausente`);
  }
  return index;
}

/** The columns after `anchor` that have a title, in order: they hold the answers. */
function answerColumnsAfter(header: string[], anchor: number, anchorLabel: string): number[] {
  const columns = header
    .map((title, index) => ({ title, index }))
    .filter(column => column.index > anchor && column.title.trim() !== '')
    .map(column => column.index);

  if (columns.length === 0) {
    throw new DomainError(`Formato inválido: nenhuma coluna de resposta depois de "${anchorLabel}"`);
  }
  return columns;
}

function headerOf(rows: string[][]): string[] {
  if (rows.length === 0) {
    throw new DomainError('Formato inválido: a planilha está vazia');
  }
  return rows[0];
}

/** One entry per row below the header. A file with only the header gives an empty list. */
export function readAnswerKeys(rows: string[][]): AnswerKeyEntry[] {
  const header = headerOf(rows);
  const names = namesOf(header);
  const examColumn = requireColumn(names, 'numero da prova', 'número da prova');
  const answerColumns = answerColumnsAfter(header, examColumn, 'número da prova');

  return rows.slice(1).map(row => ({
    examNumber: row[examColumn] ?? '',
    answers: answerColumns.map(column => row[column])
  }));
}

/** One entry per row below the header. A file with only the header gives an empty list. */
export function readResponses(rows: string[][]): StudentResponseEntry[] {
  const header = headerOf(rows);
  const names = namesOf(header);
  const examColumn = requireColumn(names, 'numero da prova', 'número da prova');
  const studentColumn = requireColumn(names, 'cpf', 'CPF');
  const nameColumn = names.indexOf('nome');
  const anchor = Math.max(examColumn, studentColumn); // the answers start after both
  const answerColumns = answerColumnsAfter(header, anchor, anchor === studentColumn ? 'CPF' : 'número da prova');

  return rows.slice(1).map(row => ({
    studentId: row[studentColumn] ?? '',
    studentName: nameColumn >= 0 ? (row[nameColumn] ?? '').trim() : '',
    examNumber: row[examColumn] ?? '',
    answers: answerColumns.map(column => row[column])
  }));
}