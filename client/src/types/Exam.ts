import { Question } from './Question';

/** STAND-IN written from the integration guide; keep the integrated branch's version when merging. */
export interface Exam {
  code: string;
  name: string;
  questionCodes: string[];
}

export interface CreateExamRequest {
  name: string;
  questionCodes: string[];
}

export interface ExamDetail extends Exam {
  questions: Question[];
  subjects: string[];
}

/** Data the professor gives to generate the PDFs of a registered exam. */
export interface GenerateExamPdfsRequest {
  evaluationType: string;
  evaluationDate: string;
  studentCount: number;
}

/** The archive produced by the server. */
export interface GeneratedPdfPackage {
  blob: Blob;
  fileName: string;
  /** Present when the archive was produced with a caveat, e.g. repeated exams. */
  warning?: string;
}
