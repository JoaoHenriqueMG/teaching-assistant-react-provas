import { cleanCPF } from '../models/CPF';

/**
 * Automatic grading of multiple-answer exams.
 *
 * Every question has n alternatives worth 1, 2, 4, 8, ... (powers of two) and
 * an answer is the sum of the marked alternatives, so it is an integer from 0
 * to 2^n - 1. Each alternative is worth 1/n of the question and counts as
 * correct when its state (marked or not) matches the answer key.
 *
 * The number of alternatives n comes with the answer key, one value per exam
 * (a column of the answer key sheet), so each exam can have its own.
 *
 * This module is pure: it knows nothing about HTTP, files or classes.
 */

/**
 * Bounds for the number of alternatives. JavaScript bitwise operators work on
 * 32 bits, so 30 is the largest count whose answers (up to 2^30 - 1) are safe.
 */
export const MIN_ALTERNATIVES = 1;
export const MAX_ALTERNATIVES = 30;

/** The largest valid answer: every alternative marked (31 with 5 alternatives). */
export const maxValidAnswer = (alternatives: number): number => 2 ** alternatives - 1;

/** A spreadsheet cell as read from a file. */
export type RawCell = string | number | null | undefined;

export interface AnswerKeyEntry {
  examNumber: string;
  alternatives: RawCell; // How many alternatives each question of this exam has
  answers: RawCell[]; // One per question
}

export interface StudentResponseEntry {
  studentId: string; // The CPF, formatted or not
  studentName: string;
  examNumber: string;
  answers: RawCell[]; // One per question
}

/**
 * An answer cell read as a number. All answers of the form are mandatory, so
 * there is no "blank" answer: an empty cell is just an invalid one.
 */
export type ParsedAnswer =
  | { kind: 'answer'; value: number }
  | { kind: 'invalid'; raw: string };

export type GradingErrorCode =
  | 'NO_ANSWER_KEYS'
  | 'NO_RESPONSES'
  | 'DUPLICATE_EXAM_IN_ANSWER_KEY'
  | 'INVALID_ALTERNATIVES'
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
  alternatives: number; // Per question, as set in the answer key for this exam
  percentage: number; // Of the exam, rounded to the nearest integer
  questionResults: QuestionResult[];
  warnings: string[]; // One per invalid answer
}

export interface GradingInput {
  keys: AnswerKeyEntry[];
  responses: StudentResponseEntry[];
}

export interface GradingOutput {
  errors: GradingError[]; // When not empty, results is empty
  warnings: string[]; // Not tied to one student, e.g. duplicate submissions
  results: GradingResult[]; // In the order of the responses, not ranked
}

/**
 * Exam numbers are compared without leading zeros, because spreadsheet
 * programs turn "01" into 1.
 */
export function normalizeExamNumber(raw: unknown): string {
  const text = String(raw ?? '').trim();
  return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, '') : text;
}

/** Reads the number of alternatives of an exam: a whole number from MIN_ALTERNATIVES to MAX_ALTERNATIVES. */
export function parseAlternatives(raw: RawCell): number | undefined {
  const text = String(raw ?? '').trim();
  if (!/^\d+$/.test(text)) return undefined;
  const value = Number(text);
  return value >= MIN_ALTERNATIVES && value <= MAX_ALTERNATIVES ? value : undefined;
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

/** An invalid cell as shown in messages, with the reason when it is a number that is too large. */
function describeInvalid(raw: string, alternatives: number): string {
  if (raw === '') return 'vazia';
  return /^\d+$/.test(raw) ? `${raw}; the maximum with ${alternatives} alternatives is ${maxValidAnswer(alternatives)}` : raw;
}

interface ExamKey {
  alternatives: number;
  answers: number[];
}

/**
 * Checks everything that makes the files unusable as a whole. Returns every
 * problem found, not only the first.
 */
export function validateGradingInput({ keys, responses }: GradingInput): GradingError[] {
  const errors: GradingError[] = [];
  if (keys.length === 0) {
    errors.push({ code: 'NO_ANSWER_KEYS', message: 'The answer key spreadsheet has no answer keys' });
  }
  if (responses.length === 0) {
    errors.push({ code: 'NO_RESPONSES', message: 'The responses spreadsheet has no responses' });
  }

  const knownExams = new Set<string>();
  const usableKeys = new Map<string, { alternatives: number; questions: number }>();
  for (const key of keys) {
    const exam = normalizeExamNumber(key.examNumber);
    if (knownExams.has(exam)) {
      errors.push({ code: 'DUPLICATE_EXAM_IN_ANSWER_KEY', message: `A prova ${exam} aparece mais de uma vez no gabarito` });
      continue;
    }
    knownExams.add(exam);

    const alternatives = parseAlternatives(key.alternatives);
    if (alternatives === undefined) {
      errors.push({
        code: 'INVALID_ALTERNATIVES',
        message: `Exam ${exam}: invalid number of alternatives (${String(key.alternatives ?? '').trim() || 'empty'}); use an integer from ${MIN_ALTERNATIVES} to ${MAX_ALTERNATIVES}`
      });
      continue;
    }

    if (key.answers.length === 0) {
      errors.push({ code: 'INVALID_ANSWER_KEY', message: `The answer key of exam ${exam} has no questions` });
      continue;
    }
    let usable = true;
    key.answers.forEach((cell, index) => {
      const parsed = parseAnswer(cell, alternatives);
      if (parsed.kind === 'invalid') {
        usable = false;
        errors.push({
          code: 'INVALID_ANSWER_KEY',
          message: `Answer key of exam ${exam}, question ${index + 1}: invalid answer (${describeInvalid(parsed.raw, alternatives)})`
        });
      }
    });
    if (usable) {
      usableKeys.set(exam, { alternatives, questions: key.answers.length });
    }
  }

  const reportedMissing = new Set<string>();
  for (const response of responses) {
    const exam = normalizeExamNumber(response.examNumber);
    if (!knownExams.has(exam)) {
      if (!reportedMissing.has(exam)) {
        reportedMissing.add(exam);
        errors.push({ code: 'EXAM_NOT_IN_ANSWER_KEY', message: `Exam ${exam} does not exist in the answer key` });
      }
      continue;
    }
    const expected = usableKeys.get(exam)?.questions;
    if (expected !== undefined && response.answers.length !== expected) {
      errors.push({
        code: 'ANSWER_COUNT_MISMATCH',
        message: `${response.studentName || response.studentId}: ${response.answers.length} answers, but the answer key of exam ${exam} has ${expected} questions`
      });
    }
  }

  return errors;
}

function gradeStudent(response: StudentResponseEntry, exam: ExamKey): GradingResult {
  const { alternatives } = exam;
  const warnings: string[] = [];
  let totalHits = 0;

  const questionResults = exam.answers.map((key, index): QuestionResult => {
    const answer = parseAnswer(response.answers[index], alternatives);
    let hits = 0;
    if (answer.kind === 'answer') {
      hits = matchingAlternatives(key, answer.value, alternatives);
    } else {
      warnings.push(`Question ${index + 1}: invalid answer (${describeInvalid(answer.raw, alternatives)})`);
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
    alternatives,
    // Rounded once, over all the alternatives of the exam
    percentage: toPercentage(totalHits, alternatives * exam.answers.length),
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

  const exams = new Map<string, ExamKey>();
  for (const key of input.keys) {
    const alternatives = parseAlternatives(key.alternatives) as number; // validated above
    exams.set(normalizeExamNumber(key.examNumber), {
      alternatives,
      answers: key.answers.flatMap(cell => {
        const parsed = parseAnswer(cell, alternatives);
        return parsed.kind === 'answer' ? [parsed.value] : []; // all are valid here
      })
    });
  }

  const warnings: string[] = [];
  const lastResponseOf = new Map<string, StudentResponseEntry>();
  for (const response of input.responses) {
    const student = cleanCPF(response.studentId.trim());
    if (lastResponseOf.has(student)) {
      warnings.push(`${response.studentName || response.studentId} submitted more than once: the last submission was used`);
    }
    lastResponseOf.set(student, response);
  }

  const results = Array.from(lastResponseOf.values()).map(response =>
    gradeStudent(response, exams.get(normalizeExamNumber(response.examNumber))!)
  );

  return { errors: [], warnings, results };
}