/**
 * Builds the two spreadsheets of the automatic correction from the tables of
 * the auto_grade features, in the format the professor uploads:
 *
 * - answer keys: "número da prova", "alternativas", "questão 1", "questão 2", ...
 * - responses (Google Forms export): "Carimbo de data/hora", "nome", "e-mail",
 *   "CPF", "número da prova", "questão 1", "questão 2", ...
 *
 * The column titles are in Portuguese because they are the ones the server reads.
 */

/** How the features write an empty cell. */
export const BLANK = '(blank)';

export interface AnswerKey {
  exam: string;
  answers: string[];
}

export interface StudentResponse {
  name: string;
  cpf: string;
  exam: string;
  answers: string[];
}

/** A spreadsheet before being written as a file. */
export interface Sheet {
  fileName: string;
  header: string[];
  rows: string[][];
}

/** "3, B, (blank)" -> ['3', 'B', '']. An empty text means no answers at all. */
export const parseAnswers = (text: string): string[] =>
  text.trim() === '' ? [] : text.split(',').map(answer => (answer.trim() === BLANK ? '' : answer.trim()));

const questionColumns = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `questão ${index + 1}`);

const mostAnswers = (rows: { answers: string[] }[]): number =>
  Math.max(0, ...rows.map(row => row.answers.length));

/**
 * One row per exam. The sheet always has at least one question column, so an
 * exam without answers is an answer key with an empty question, not a sheet
 * without question columns.
 */
export const answerKeysSheet = (keys: AnswerKey[], alternatives: number): Sheet => ({
  fileName: 'answer-keys.csv',
  header: ['número da prova', 'alternativas', ...questionColumns(Math.max(1, mostAnswers(keys)))],
  rows: keys.map(key => [key.exam, String(alternatives), ...key.answers])
});

/**
 * One row per response, with as many question columns as the longest one. A
 * row is not padded: a student who gave fewer answers has a shorter row.
 */
export const responsesSheet = (responses: StudentResponse[]): Sheet => ({
  fileName: 'responses.csv',
  header: ['Carimbo de data/hora', 'nome', 'e-mail', 'CPF', 'número da prova', ...questionColumns(mostAnswers(responses))],
  rows: responses.map((response, index) => [
    `2026/11/17 10:30:${String(index).padStart(2, '0')}`,
    response.name,
    `${response.name.toLowerCase()}@email.com`,
    response.cpf,
    response.exam,
    ...response.answers
  ])
});

/** The same sheet without the given column. */
const withoutColumn = (sheet: Sheet, title: string): Sheet => {
  const index = sheet.header.indexOf(title);
  if (index < 0) {
    throw new Error(`The sheet has no column "${title}"`);
  }
  const remove = (cells: string[]) => cells.filter((_, column) => column !== index);
  return { ...sheet, header: remove(sheet.header), rows: sheet.rows.map(remove) };
};

/** The same sheet with every cell of the given column replaced by `value`. */
const withColumnValue = (sheet: Sheet, title: string, value: string): Sheet => {
  const index = sheet.header.indexOf(title);
  return { ...sheet, rows: sheet.rows.map(row => row.map((cell, column) => (column === index ? value : cell))) };
};

/** The problems the GUI feature puts in a spreadsheet, by the name it gives them. */
const PROBLEMS: Record<string, (sheet: Sheet) => Sheet> = {
  'missing exam number column': sheet => withoutColumn(sheet, 'número da prova'),
  'missing question 3 column': sheet => withoutColumn(sheet, 'questão 3'),
  'missing student identifier column': sheet => withoutColumn(sheet, 'CPF'),
  'exam number not in answer keys': sheet => withColumnValue(sheet, 'número da prova', '99'),
  'invalid file extension (.txt)': sheet => ({ ...sheet, fileName: sheet.fileName.replace(/\.csv$/, '.txt') }),
  'header only': sheet => ({ ...sheet, rows: [] })
};

export const withProblem = (sheet: Sheet, problem: string): Sheet => {
  const apply = PROBLEMS[problem];
  if (!apply) {
    throw new Error(`Unknown spreadsheet problem "${problem}"`);
  }
  return apply(sheet);
};

const csvCell = (cell: string): string => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);

/** The sheet as the text of a CSV file. */
export const toCsv = (sheet: Sheet): string =>
  [sheet.header, ...sheet.rows].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
