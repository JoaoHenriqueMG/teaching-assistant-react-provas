/** What the student marked in one question: a valid answer or something that could not be read. */
export type StudentAnswer =
  | { kind: 'answer'; value: number }
  | { kind: 'invalid'; raw: string };

export interface QuestionResult {
  questionIndex: number; // 0-based
  answerKey: number;
  answer: StudentAnswer;
  correctAlternatives: number;
  percentage: number; // of this question, 0-100
}

/** A student of the class, with the exam result. The list comes ordered by rank. */
export interface RankedStudent {
  rank: number; // students with the same score share the rank
  studentId: string; // formatted CPF, as in Student.cpf
  studentName: string;
  examNumber: string;
  alternatives: number; // per question, as written in the answer key sheet for this exam
  percentage: number; // of the exam, integer
  grade: string | number; // as saved: a concept or a number from 0 to 10
  warnings: string[]; // one per invalid answer
  questionResults: QuestionResult[];
}

/** Someone in the responses sheet who is not enrolled in the class: no grade is saved. */
export interface StudentNotInClass {
  studentId: string;
  studentName: string;
  percentage: number;
}

export interface AutoGradingResponse {
  saved: boolean; // false for a preview
  goal: string;
  ranking: RankedStudent[];
  notInClass: StudentNotInClass[];
  warnings: string[]; // not tied to one student, e.g. a student who submitted twice
}

export interface AutoGradingRequest {
  answerKey: File;
  responses: File;
  goal: string; // a goal of the class, which receives the grades
}
/** The two spreadsheets sent for the correction. */
export type Sheet = 'answerKey' | 'responses';

/** Codes of the problems the server finds in the content of the spreadsheets (as in the server's GradingErrorCode). */
export type GradingErrorCode =
  | 'NO_ANSWER_KEYS'
  | 'NO_RESPONSES'
  | 'DUPLICATE_EXAM_IN_ANSWER_KEY'
  | 'INVALID_ALTERNATIVES'
  | 'INVALID_ANSWER_KEY'
  | 'EXAM_NOT_IN_ANSWER_KEY'
  | 'ANSWER_COUNT_MISMATCH';

/** Something that stopped the correction: when there is one, nothing was graded or saved. */
export interface AutoGradingProblem {
  message: string;
  sheet?: Sheet; // the spreadsheet to fix, when it is known
}
