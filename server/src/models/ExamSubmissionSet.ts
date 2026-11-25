import { ExamSubmission } from './ExamSubmission';
import { DomainError } from './DomainError';

/**
 * The registered exam submissions, with at most one submission per
 * (student CPF, examTitle). Lookups expect a clean CPF (11 digits).
 */
export class ExamSubmissionSet {
  private submissions: ExamSubmission[] = [];

  constructor() {
    // Independent of persistence, matching StudentSet
  }

  addSubmission(submission: ExamSubmission): ExamSubmission {
    if (this.findSubmission(submission.getStudentCPF(), submission.getExamTitle())) {
      throw new DomainError('Você já enviou as respostas desta avaliação');
    }

    this.submissions.push(submission);
    return submission;
  }

  removeSubmission(studentCpf: string, examTitle: string): boolean {
    const normalizedTitle = examTitle.trim();
    const index = this.submissions.findIndex(
      (s) => s.getStudentCPF() === studentCpf && s.getExamTitle() === normalizedTitle
    );

    if (index === -1) {
      return false;
    }

    this.submissions.splice(index, 1);
    return true;
  }

  findSubmission(studentCpf: string, examTitle: string): ExamSubmission | undefined {
    const normalizedTitle = examTitle.trim();
    return this.submissions.find(
      (s) => s.getStudentCPF() === studentCpf && s.getExamTitle() === normalizedTitle
    );
  }

  findSubmissionsByStudentCPF(studentCpf: string): ExamSubmission[] {
    return this.submissions.filter((s) => s.getStudentCPF() === studentCpf);
  }

  findSubmissionsByExamTitle(examTitle: string): ExamSubmission[] {
    const normalizedTitle = examTitle.trim();
    return this.submissions.filter((s) => s.getExamTitle() === normalizedTitle);
  }

  getAllSubmissions(): ExamSubmission[] {
    return [...this.submissions];
  }

  getCount(): number {
    return this.submissions.length;
  }
}
