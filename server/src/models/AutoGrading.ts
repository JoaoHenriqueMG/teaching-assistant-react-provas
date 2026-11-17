import { cleanCPF } from '../models/CPF';

/**
 * Bounds for the number of alternatives. JavaScript bitwise operators work on
 * 32 bits, so 30 is the largest count whose answers (up to 2^30 - 1) are safe.
 */
export const MIN_ALTERNATIVES = 1;
export const MAX_ALTERNATIVES = 30;
export const DEFAULT_ALTERNATIVES = 5;

export const isValidAlternativesCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= MIN_ALTERNATIVES && (value as number) <= MAX_ALTERNATIVES;

/** The largest valid answer: every alternative marked (31 with 5 alternatives). */
export const maxValidAnswer = (alternatives: number): number => 2 ** alternatives - 1;

/** A spreadsheet cell as read from a file. */
export type RawCell = string | number | null | undefined;

export interface AnswerKeyEntry {
  examNumber: string;
  answers: RawCell[]; // One per question
}

export interface StudentResponseEntry {
  studentId: string; // The CPF, formatted or not
  studentName: string;
  examNumber: string;
  answers: RawCell[]; // One per question
}

export type ParsedAnswer =
  | { kind: 'answer'; value: number }
  | { kind: 'invalid'; raw: string };

export type GradingErrorCode =
  | 'INVALID_ALTERNATIVES'
  | 'NO_ANSWER_KEYS'
  | 'NO_RESPONSES'
  | 'DUPLICATE_EXAM_IN_ANSWER_KEY'
  | 'INVALID_ANSWER_KEY'
  | 'EXAM_NOT_IN_ANSWER_KEY'
  | 'ANSWER_COUNT_MISMATCH';

/** A problem with the files as a whole: when there is one, nothing is graded. */
export interface GradingError {
  code: GradingErrorCode;
  message: string;
}

export interface QuestionResult {
  questionIndex: number; // 0-based
  answerKey: number;
  answer: ParsedAnswer;
  correctAlternatives: number; // 0 when the answer is invalid
  percentage: number; // Of this question, 0-100
}

export interface GradingResult {
  studentId: string;
  studentName: string;
  examNumber: string;
  percentage: number; // Of the exam, rounded to the nearest integer
  questionResults: QuestionResult[];
  warnings: string[]; // One per invalid answer
}

export interface GradingInput {
  alternatives: number;
  keys: AnswerKeyEntry[];
  responses: StudentResponseEntry[];
}

export interface GradingOutput {
  errors: GradingError[]; // When not empty, results is empty
  warnings: string[]; // Not tied to one student, e.g. duplicate submissions
  results: GradingResult[]; // In the order of the responses, not ranked
}

/**
 * TRULY NECESSARY? SHOULD I CHANGE ON THE FEATURES?
 * Exam numbers are compared without leading zeros, because spreadsheet
 * programs turn "01" into 1.
 */
export function normalizeExamNumber(raw: unknown): string {
  const text = String(raw ?? '').trim();
  return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, '') : text;
}

/** Reads an answer cell: only whole numbers from 0 to 2^n - 1 are valid. */
export function parseAnswer(raw: RawCell, alternatives: number): ParsedAnswer {
  const text = String(raw ?? '').trim();
  if (!/^\d+$/.test(text)) {
    return { kind: 'invalid', raw: text }; // 'B', '2.5', '-1', '' ...
  }
  const value = Number(text);
  return value <= maxValidAnswer(alternatives) ? { kind: 'answer', value } : { kind: 'invalid', raw: text };
}

function popcount(value: number): number {
  let count = 0;
  while (value !== 0) {
    value &= value - 1; // clears the lowest set bit
    count++;
  }
  return count;
}

/** How many of the alternatives have the same state (marked or not) in the key and in the answer. */
export function matchingAlternatives(key: number, answer: number, alternatives: number): number {
  return alternatives - popcount((key ^ answer) & maxValidAnswer(alternatives));
}

/** Integer percentage, rounded half up. Multiplying first keeps exact halves exact. */
const toPercentage = (hits: number, total: number): number =>
  total === 0 ? 0 : Math.round((hits * 100) / total);

const describe = (raw: string): string => (raw === '' ? 'vazia' : raw);

/**
 * Checks everything that makes the files unusable as a whole. Returns every
 * problem found, not only the first.
 */
export function validateGradingInput({ alternatives, keys, responses }: GradingInput): GradingError[] {
  if (!isValidAlternativesCount(alternatives)) {
    return [{
      code: 'INVALID_ALTERNATIVES',
      message: `O número de alternativas deve ser um inteiro entre ${MIN_ALTERNATIVES} e ${MAX_ALTERNATIVES}`
    }];
  }

  const errors: GradingError[] = [];
  if (keys.length === 0) {
    errors.push({ code: 'NO_ANSWER_KEYS', message: 'A planilha de gabaritos não possui nenhum gabarito' });
  }
  if (responses.length === 0) {
    errors.push({ code: 'NO_RESPONSES', message: 'A planilha de respostas não possui nenhuma resposta' });
  }

  const knownExams = new Set<string>();
  const questionCounts = new Map<string, number>(); // only for usable keys
  for (const key of keys) {
    const exam = normalizeExamNumber(key.examNumber);
    if (knownExams.has(exam)) {
      errors.push({ code: 'DUPLICATE_EXAM_IN_ANSWER_KEY', message: `A prova ${exam} aparece mais de uma vez no gabarito` });
      continue;
    }
    knownExams.add(exam);

    if (key.answers.length === 0) {
      errors.push({ code: 'INVALID_ANSWER_KEY', message: `O gabarito da prova ${exam} não possui questões` });
      continue;
    }
    let usable = true;
    key.answers.forEach((cell, index) => {
      const parsed = parseAnswer(cell, alternatives);
      if (parsed.kind === 'invalid') {
        usable = false;
        errors.push({
          code: 'INVALID_ANSWER_KEY',
          message: `Gabarito da prova ${exam}, questão ${index + 1}: resposta inválida (${describe(parsed.raw)})`
        });
      }
    });
    if (usable) {
      questionCounts.set(exam, key.answers.length);
    }
  }

  const reportedMissing = new Set<string>();
  for (const response of responses) {
    const exam = normalizeExamNumber(response.examNumber);
    if (!knownExams.has(exam)) {
      if (!reportedMissing.has(exam)) {
        reportedMissing.add(exam);
        errors.push({ code: 'EXAM_NOT_IN_ANSWER_KEY', message: `A prova ${exam} não existe no gabarito` });
      }
      continue;
    }
    const expected = questionCounts.get(exam);
    if (expected !== undefined && response.answers.length !== expected) {
      errors.push({
        code: 'ANSWER_COUNT_MISMATCH',
        message: `${response.studentName || response.studentId}: ${response.answers.length} respostas, mas o gabarito da prova ${exam} tem ${expected} questões`
      });
    }
  }

  return errors;
}

function gradeStudent(response: StudentResponseEntry, answerKey: number[], alternatives: number): GradingResult {
  const warnings: string[] = [];
  let totalHits = 0;

  const questionResults = answerKey.map((key, index): QuestionResult => {
    const answer = parseAnswer(response.answers[index], alternatives);
    let hits = 0;
    if (answer.kind === 'answer') {
      hits = matchingAlternatives(key, answer.value, alternatives);
    } else {
      warnings.push(`Questão ${index + 1}: resposta inválida (${describe(answer.raw)})`);
    }
    totalHits += hits;
    return {
      questionIndex: index,
      answerKey: key,
      answer,
      correctAlternatives: hits,
      percentage: toPercentage(hits, alternatives)
    };
  });

  return {
    studentId: response.studentId,
    studentName: response.studentName,
    examNumber: normalizeExamNumber(response.examNumber),
    // Rounded once, over all the alternatives of the exam
    percentage: toPercentage(totalHits, alternatives * answerKey.length),
    questionResults,
    warnings
  };
}

/**
 * Grades every student response against the answer key of its exam.
 *
 * If the files have any problem as a whole (see validateGradingInput) nothing
 * is graded and the problems are returned in `errors`. Otherwise every
 * student is graded; invalid answers score 0 and produce a warning. A student
 * who submitted more than once is graded on the last submission.
 */
export function gradeExam(input: GradingInput): GradingOutput {
  const errors = validateGradingInput(input);
  if (errors.length > 0) {
    return { errors, warnings: [], results: [] };
  }

  const { alternatives } = input;
  const answerKeys = new Map<string, number[]>();
  for (const key of input.keys) {
    answerKeys.set(
      normalizeExamNumber(key.examNumber),
      key.answers.flatMap(cell => {
        const parsed = parseAnswer(cell, alternatives);
        return parsed.kind === 'answer' ? [parsed.value] : []; // all are valid here
      })
    );
  }

  const warnings: string[] = [];
  const lastResponseOf = new Map<string, StudentResponseEntry>();
  for (const response of input.responses) {
    const student = cleanCPF(response.studentId.trim());
    if (lastResponseOf.has(student)) {
      warnings.push(`${response.studentName || response.studentId} enviou mais de uma resposta: a última foi considerada`);
    }
    lastResponseOf.set(student, response);
  }

  const results = Array.from(lastResponseOf.values()).map(response =>
    gradeStudent(response, answerKeys.get(normalizeExamNumber(response.examNumber))!, alternatives)
  );

  return { errors: [], warnings, results };
}