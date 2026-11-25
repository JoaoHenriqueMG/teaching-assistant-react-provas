import { randomUUID } from 'crypto';
import { DomainError } from './DomainError';
import { Exam } from './Exam';
import { Question } from './Question';
import { QuestionBank } from './QuestionBank';

/** STAND-IN (see Question.ts): in-memory exams with the query methods of the integration guide. */
export class ExamBank {
  private readonly exams = new Map<string, Exam>();

  constructor(private readonly questionBank: QuestionBank) {}

  addExam(data: { name?: unknown; questionCodes?: unknown }): Exam {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) throw new DomainError('Nome da prova é obrigatório');
    const codes = data.questionCodes;
    if (!Array.isArray(codes) || codes.length === 0 || codes.some(c => typeof c !== 'string')) {
      throw new DomainError('A prova deve ter pelo menos uma questão');
    }
    if (new Set(codes).size !== codes.length) throw new DomainError('A prova não admite questões repetidas');
    codes.forEach(code => this.questionBank.require(code));
    if (this.getAllExams().some(e => e.name.toLowerCase() === name.toLowerCase())) {
      throw new DomainError('Já existe uma prova com esse nome');
    }
    const exam = new Exam(randomUUID(), name, codes);
    this.exams.set(exam.code, exam);
    return exam;
  }

  getAllExams(): Exam[] {
    return Array.from(this.exams.values());
  }

  findExamByCode(code: string): Exam | undefined {
    return this.exams.get(code);
  }

  /** The questions of the exam, in the order of its questionCodes. */
  getQuestionsForExam(examCode: string): Question[] {
    const exam = this.findExamByCode(examCode);
    return exam ? exam.getQuestionCodes().map(code => this.questionBank.require(code)) : [];
  }

  getSubjectsForExam(examCode: string): string[] {
    return Array.from(new Set(this.getQuestionsForExam(examCode).map(q => q.subject)));
  }
}
