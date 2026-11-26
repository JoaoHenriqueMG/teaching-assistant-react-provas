/**
 * Exam answer submissions, as exchanged with the server
 * (/api/exam-submissions) and, for the exams, with the exam bank of the
 * "criar questões e provas" feature (/api/exams).
 */

/** Largest sum accepted when the exam does not say how many alternatives it has (6 alternatives). */
export const DEFAULT_MAX_SUM = 63;

/**
 * Largest number of alternatives per question. Matches the server and the
 * auto-grading module: JavaScript bitwise operators are only safe up to 30 bits.
 */
export const MAX_ALTERNATIVES = 30;

/** Largest valid sum of a question with the given number of alternatives: 2^n - 1. */
export const maxSumForAlternatives = (alternatives: number): number =>
  2 ** Math.min(Math.max(alternatives, 1), MAX_ALTERNATIVES) - 1;

/** The alternatives (1, 2, 4, 8...) that make up a sum; the same decoding the server does. */
export function decodePropositions(sum: number): number[] {
  const propositions: number[] = [];
  if (!Number.isInteger(sum) || sum <= 0) {
    return propositions;
  }
  for (let weight = 1; weight <= sum; weight *= 2) {
    if ((sum & weight) !== 0) {
      propositions.push(weight);
    }
  }
  return propositions;
}

export interface QuestionAnswerInput {
  label: string;
  sum: number;
}

export interface QuestionAnswerSummary {
  label: string;
  sum: number;
  propositions: number[];
}

export interface ExamSubmission {
  studentName: string;
  studentCpf: string;
  studentEmail: string;
  examTitle: string;
  tipoProva: string;
  submittedAt: string;
  questions: QuestionAnswerSummary[];
}

export interface CreateExamSubmissionRequest {
  studentCpf: string;
  examTitle: string;
  tipoProva: string;
  questions: QuestionAnswerInput[];
  /** Largest sum the exam allows; the server uses 63 when omitted. */
  maxSum?: number;
}

/** An exam of the exam bank (GET /api/exams). */
export interface AvailableExamSummary {
  code: string;
  name: string;
  questionCodes: string[];
}

/** An exam with its questions (GET /api/exams/:code). */
export interface AvailableExamDetail extends AvailableExamSummary {
  questions?: Array<{
    code: string;
    subject: string;
    statement: string;
    alternatives?: Array<{ text: string; isTrue: boolean }>;
  }>;
  subjects?: string[];
}
