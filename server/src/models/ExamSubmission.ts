import { cleanCPF, formatCPF, isCleanCPFValid } from './CPF';
import { DomainError } from './DomainError';

export const DEFAULT_MAX_SUM = 63;
/** Matches AutoGrading.ts (MAX_ALTERNATIVES = 30 -> 2^30 - 1). */
export const MAX_ALLOWED_SUM = 2 ** 30 - 1;

export interface QuestionAnswerInput {
  label: string;
  sum: number;
}

export interface QuestionAnswerSummary {
  label: string;
  sum: number;
  propositions: number[];
}

export interface ExamSubmissionJSON {
  studentName: string;
  studentCpf: string;
  studentEmail: string;
  examTitle: string;
  tipoProva: string;
  submittedAt: string;
  questions: QuestionAnswerSummary[];
}

/** Decodes any non-negative integer bitmask into its power-of-two proposition weights. */
export function decodePropositions(sum: number): number[] {
  const propositions: number[] = [];
  if (!Number.isInteger(sum) || sum <= 0) {
    return propositions;
  }
  let bit = 1;
  while (bit <= sum) {
    if ((sum & bit) !== 0) {
      propositions.push(bit);
    }
    bit *= 2;
  }
  return propositions;
}

/** What a submission can carry besides who answered what. */
export interface ExamSubmissionOptions {
  /** The student's e-mail, kept for the spreadsheet sent to the auto-grading. */
  studentEmail?: string;
  /** When the answers were sent (ISO 8601); now when omitted. */
  submittedAt?: string;
  /** Largest sum a question accepts (2^n - 1 for n alternatives); DEFAULT_MAX_SUM when omitted. */
  maxSum?: number;
}

/**
 * A student's submitted answers for an exam, uniquely identified by
 * (clean student CPF, examTitle).
 */
export class ExamSubmission {
  private readonly studentName: string;
  private readonly studentCpf: string;
  private readonly studentEmail: string;
  private readonly examTitle: string;
  private readonly tipoProva: string;
  private readonly submittedAt: string;
  private readonly questions: QuestionAnswerSummary[];

  constructor(
    studentName: string,
    studentCpf: string,
    examTitle: string,
    tipoProva: string,
    questions: QuestionAnswerInput[],
    options: ExamSubmissionOptions = {}
  ) {
    const { studentEmail = '', submittedAt, maxSum = DEFAULT_MAX_SUM } = options;
    this.studentCpf = cleanCPF(studentCpf);
    this.validateCPF(this.studentCpf);

    if (!Number.isInteger(maxSum) || maxSum < 1 || maxSum > MAX_ALLOWED_SUM) {
      throw new DomainError(`O limite máximo da soma deve ser um inteiro entre 1 e ${MAX_ALLOWED_SUM}`);
    }
    if (!studentName || studentName.trim().length === 0) {
      throw new DomainError('Nome do estudante é obrigatório');
    }
    if (!examTitle || examTitle.trim().length === 0) {
      throw new DomainError('A avaliação é obrigatória');
    }
    if (!tipoProva || tipoProva.trim().length === 0) {
      throw new DomainError('O tipo da prova é obrigatório');
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new DomainError('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
    }

    this.studentName = studentName.trim();
    this.studentEmail = studentEmail.trim();
    this.examTitle = examTitle.trim();
    this.tipoProva = tipoProva.trim();
    this.submittedAt = ExamSubmission.parseSubmittedAt(submittedAt);
    this.questions = questions.map((question) => this.buildQuestionSummary(question, maxSum));
  }

  private static parseSubmittedAt(submittedAt: string | undefined): string {
    if (submittedAt === undefined || submittedAt.trim().length === 0) {
      return new Date().toISOString();
    }
    if (Number.isNaN(Date.parse(submittedAt))) {
      throw new DomainError('A data de envio é inválida');
    }
    return submittedAt.trim();
  }

  private validateCPF(cpf: string): void {
    if (!isCleanCPFValid(cpf)) {
      throw new DomainError('Invalid CPF format');
    }
  }

  private buildQuestionSummary(question: QuestionAnswerInput, maxSum: number): QuestionAnswerSummary {
    if (!question || typeof question.label !== 'string' || question.label.trim().length === 0) {
      throw new DomainError('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
    }
    if (question.sum === null || question.sum === undefined || (typeof question.sum === 'string' && String(question.sum).trim() === '')) {
      throw new DomainError('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
    }
    if (typeof question.sum !== 'number' || !Number.isInteger(question.sum) || question.sum < 0 || question.sum > maxSum) {
      throw new DomainError(`A soma de cada questão deve ser um valor entre 0 e ${maxSum}`);
    }

    return {
      label: question.label.trim(),
      sum: question.sum,
      propositions: decodePropositions(question.sum)
    };
  }

  getStudentName(): string {
    return this.studentName;
  }

  getStudentEmail(): string {
    return this.studentEmail;
  }

  /** Clean 11-digit CPF, matching Student.getCPF(). */
  getStudentCPF(): string {
    return this.studentCpf;
  }

  /** Formatted CPF (000.000.000-00) for API responses. */
  getFormattedStudentCPF(): string {
    return formatCPF(this.studentCpf);
  }

  getExamTitle(): string {
    return this.examTitle;
  }

  getTipoProva(): string {
    return this.tipoProva;
  }

  getSubmittedAt(): string {
    return this.submittedAt;
  }

  getQuestions(): QuestionAnswerSummary[] {
    return this.questions.map((q) => ({
      label: q.label,
      sum: q.sum,
      propositions: [...q.propositions]
    }));
  }

  /** JSON representation for API responses (formatted CPF). */
  toJSON(): ExamSubmissionJSON {
    return {
      studentName: this.studentName,
      studentCpf: this.getFormattedStudentCPF(),
      studentEmail: this.studentEmail,
      examTitle: this.examTitle,
      tipoProva: this.tipoProva,
      submittedAt: this.submittedAt,
      questions: this.getQuestions()
    };
  }

  /** Persistence representation for app-data.json (clean 11-digit CPF). */
  toPersistenceJSON(): ExamSubmissionJSON {
    return {
      studentName: this.studentName,
      studentCpf: this.studentCpf,
      studentEmail: this.studentEmail,
      examTitle: this.examTitle,
      tipoProva: this.tipoProva,
      submittedAt: this.submittedAt,
      questions: this.getQuestions()
    };
  }
}
