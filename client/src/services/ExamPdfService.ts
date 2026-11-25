import { GenerateExamPdfsRequest, GeneratedPdfPackage } from '../types/Exam';
import { postJsonForFile } from './apiClient';

/** Access to the PDF generation of the server. */
export const examPdfService = {
  /** Generates one exam per student plus the answer-key spreadsheet, as a ZIP archive. */
  generatePdfs: async (examCode: string, request: GenerateExamPdfsRequest): Promise<GeneratedPdfPackage> => {
    const { blob, fileName, warning } = await postJsonForFile(
      `/api/exams/${encodeURIComponent(examCode)}/pdfs`,
      request,
      'Failed to generate exams'
    );
    return { blob, fileName: fileName || 'provas.zip', warning };
  }
};
