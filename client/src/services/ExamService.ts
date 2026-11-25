import { CreateExamRequest, Exam, ExamDetail } from '../types/Exam';
import { get, sendJson } from './apiClient';

const EXAMS = '/api/exams';

/** STAND-IN written from the integration guide; keep the integrated branch's version when merging. */
export const examService = {
  getAllExams: (): Promise<Exam[]> => get(EXAMS, 'Failed to fetch exams'),

  getExamByCode: (code: string): Promise<ExamDetail> =>
    get(`${EXAMS}/${encodeURIComponent(code)}`, 'Failed to fetch exam'),

  createExam: (request: CreateExamRequest): Promise<Exam> => sendJson('POST', EXAMS, request, 'Failed to create exam')
};
