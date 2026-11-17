import { DomainError } from './DomainError';
import { AnswerKeyEntry, StudentResponseEntry } from './AutoGrading';

/**
 * Reads the CSV exported from the answer key sheet and from the Google Forms
 * responses sheet. It only knows file formats: what the answers mean is
 * decided in AutoGrading.ts.
 *
 * Expected columns (names ignore case and accents, order does not matter):
 * - answer key: "número da prova", "questão 1", "questão 2", ...
 * - responses:  "número da prova", "CPF", "nome" (optional), "questão 1", ...
 *               and any other column, such as the timestamp or the e-mail.
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

interface Layout {
  names: string[];
  questionColumns: number[]; // column indexes, in the order of the question numbers
}

function layoutOf(header: string[]): Layout {
  const names = header.map(normalizeHeader);
  const questionColumns = names
    .map((name, index) => ({ index, match: /^questao (\d+)$/.exec(name) }))
    .filter(column => column.match !== null)
    .map(column => ({ index: column.index, number: Number(column.match![1]) }))
    .sort((a, b) => a.number - b.number)
    .map(column => column.index);

  if (questionColumns.length === 0) {
    throw new DomainError('Formato inválido: nenhuma coluna de questão (ex.: "questão 1") encontrada');
  }
  return { names, questionColumns };
}

function requireColumn(layout: Layout, name: string, label: string): number {
  const index = layout.names.indexOf(name);
  if (index < 0) {
    throw new DomainError(`Formato inválido: coluna "${label}" ausente`);
  }
  return index;
}

function headerOf(rows: string[][]): string[] {
  if (rows.length === 0) {
    throw new DomainError('Formato inválido: a planilha está vazia');
  }
  return rows[0];
}

/** One entry per row below the header. A file with only the header gives an empty list. */
export function readAnswerKeys(rows: string[][]): AnswerKeyEntry[] {
  const layout = layoutOf(headerOf(rows));
  const examColumn = requireColumn(layout, 'numero da prova', 'número da prova');

  return rows.slice(1).map(row => ({
    examNumber: row[examColumn] ?? '',
    answers: layout.questionColumns.map(column => row[column])
  }));
}

/** One entry per row below the header. A file with only the header gives an empty list. */
export function readResponses(rows: string[][]): StudentResponseEntry[] {
  const layout = layoutOf(headerOf(rows));
  const examColumn = requireColumn(layout, 'numero da prova', 'número da prova');
  const studentColumn = requireColumn(layout, 'cpf', 'CPF');
  const nameColumn = layout.names.indexOf('nome');

  return rows.slice(1).map(row => ({
    studentId: row[studentColumn] ?? '',
    studentName: nameColumn >= 0 ? (row[nameColumn] ?? '').trim() : '',
    examNumber: row[examColumn] ?? '',
    answers: layout.questionColumns.map(column => row[column])
  }));
}