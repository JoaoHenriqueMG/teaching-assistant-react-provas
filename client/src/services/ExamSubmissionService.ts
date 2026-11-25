import {
  AvailableExamDetail,
  AvailableExamSummary,
  CreateExamSubmissionRequest,
  ExamSubmission
} from '../types/ExamSubmission';
import { API_BASE_URL, get, remove, sendJson } from './apiClient';

const EXAM_SUBMISSIONS = '/api/exam-submissions';
const EXAMS = '/api/exams';
const submissionPath = (cpf: string, examTitle: string) =>
  `${EXAM_SUBMISSIONS}/${encodeURIComponent(cpf)}/${encodeURIComponent(examTitle)}`;

/** Access to the exam answer submissions and available exams kept by the server. */
export const examSubmissionService = {
  getAllSubmissions: (): Promise<ExamSubmission[]> =>
    get(EXAM_SUBMISSIONS, 'Failed to fetch exam submissions'),

  getSubmission: (cpf: string, examTitle: string): Promise<ExamSubmission> =>
    get(submissionPath(cpf, examTitle), 'Failed to fetch exam submission'),

  createSubmission: (submission: CreateExamSubmissionRequest): Promise<ExamSubmission> =>
    sendJson('POST', EXAM_SUBMISSIONS, submission, 'Failed to save exam submission'),

  deleteSubmission: (cpf: string, examTitle: string): Promise<void> =>
    remove(submissionPath(cpf, examTitle), 'Failed to delete exam submission'),

  getAvailableExams: (): Promise<AvailableExamSummary[]> =>
    get(EXAMS, 'Failed to fetch available exams'),

  getExamDetail: (code: string): Promise<AvailableExamDetail> =>
    get(`${EXAMS}/${encodeURIComponent(code)}`, 'Failed to fetch exam details'),

  getExportCsvUrl: (examTitle?: string): string => {
    const query = examTitle ? `?examTitle=${encodeURIComponent(examTitle)}` : '';
    return `${API_BASE_URL}${EXAM_SUBMISSIONS}/export${query}`;
  },

  exportSubmissionsCsv: async (examTitle?: string): Promise<string> => {
    const response = await fetch(examSubmissionService.getExportCsvUrl(examTitle));
    if (!response.ok) {
      throw new Error('Falha ao exportar CSV de respostas');
    }
    return response.text();
  }
};
