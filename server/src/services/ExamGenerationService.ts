import * as crypto from 'crypto';
import { DomainError } from '../models/DomainError';
import { QuestionData } from '../models/Question';
import { createZip } from '../exams/ZipWriter';
import { Cell, createXlsx } from '../exams/XlsxWriter';
import { PdfDocument } from '../exams/PdfWriter';
import { factorial, randomBelow, shuffle, unrankPermutation } from '../exams/Permutations';

export const MAX_STUDENTS = 1000;

export const MESSAGES = {
  noQuestions: 'Nenhuma questão selecionada',
  examNotFound: 'Prova não encontrada',
  insufficientData: 'Dados informados são insuficientes para gerar as provas',
  generationFailed: 'Ocorreu uma falha na geração das provas',
  notEnoughCombinations: (count: number) => `Não há combinações suficientes para gerar ${count} provas únicas`
};

/**
 * What the generation needs from the registered exams: the query methods of
 * ExamBank (the same instance the server already created is injected).
 */
export interface ExamSource {
  findExamByCode(code: string): { toJSON(): { code: string; name: string } } | undefined;
  getQuestionsForExam(examCode: string): { toJSON(): QuestionData }[];
  getSubjectsForExam(examCode: string): string[];
}

/** What the professor chose. Every field may be missing or malformed: it is validated here. */
export interface ExamGenerationInput {
  examCode?: unknown;
  evaluationType?: unknown;
  evaluationDate?: unknown;
  studentCount?: unknown;
}

/** A question as it appears in one exam: alternatives already shuffled. Contains no `isTrue`. */
export interface ExamQuestion {
  statement: string;
  alternatives: string[];
  /** Indexes, in `alternatives`, of the true ones (used only for the answer key). */
  trueIndexes: number[];
}

export interface GeneratedExam {
  /** Unique identifier printed on the exam and repeated in its answer key. */
  code: string;
  studentNumber: number;
  questions: ExamQuestion[];
}

export interface ExamPackage {
  /** ZIP archive with one PDF per exam and one spreadsheet with all the answer keys. */
  zip: Buffer;
  fileName: string;
  examCount: number;
  /** Set when the package was generated, but with a caveat (e.g. repeated exams). */
  warning?: string;
}

/** There is no registered exam with the given code. */
export class ExamNotFoundError extends Error {
  constructor() {
    super(MESSAGES.examNotFound);
    this.name = 'ExamNotFoundError';
  }
}

/** The generation failed for a reason that is not the client's fault. Nothing was produced. */
export class ExamGenerationError extends Error {
  constructor(message: string = MESSAGES.generationFailed) {
    super(message);
    this.name = 'ExamGenerationError';
  }
}

/** Collaborators that can be replaced, mainly by tests. */
export interface ExamGenerationOptions {
  random?: () => number;
  /** Builds the spreadsheet (.xlsx) with the answer keys of the given exams. */
  buildAnswerKeys?: (exams: GeneratedExam[]) => Buffer;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const CODE_LENGTH = 8;
const ENUMERATION_LIMIT = BigInt(5000);

interface ValidatedInput {
  examCode: string;
  evaluationType: string;
  evaluationDate: string;
  studentCount: number;
}

/**
 * Generates the individual exams (PDF) and the answer-key spreadsheet from a
 * registered exam. Each student's exam gets its own order of questions and
 * alternatives, so that neighbours cannot copy answers, and a unique code
 * that links it to its key. The registered exam and questions are never
 * modified (everything is shuffled on copies).
 *
 * Everything is built in memory and the package is returned only when all of
 * it succeeded: a failure never leaves a partial result.
 */
export class ExamGenerationService {
  private readonly random: () => number;
  private readonly buildAnswerKeys: (exams: GeneratedExam[]) => Buffer;

  constructor(options: ExamGenerationOptions = {}) {
    this.random = options.random ?? (() => crypto.randomInt(0, 2 ** 30) / 2 ** 30);
    this.buildAnswerKeys = options.buildAnswerKeys ?? buildAnswerKeySpreadsheet;
  }

  /**
   * @throws DomainError when the input is incomplete or invalid
   * @throws ExamNotFoundError when there is no exam with the given code
   * @throws ExamGenerationError when something fails while generating
   */
  generate(source: ExamSource, input: ExamGenerationInput): ExamPackage {
    const request = validate(input);
    const exam = source.findExamByCode(request.examCode);
    if (!exam) throw new ExamNotFoundError();
    const examName = exam.toJSON().name;
    try {
      const questions = source.getQuestionsForExam(request.examCode).map(q => q.toJSON());
      if (questions.length === 0) throw new DomainError(MESSAGES.noQuestions);
      const { exams, enoughCombinations } = this.buildExams(questions, request.studentCount);
      const entries = exams.map(e => ({
        name: `provas/prova_${String(e.studentNumber).padStart(3, '0')}_${e.code}.pdf`,
        data: renderExamPdf(e, examName, request.evaluationType, request.evaluationDate)
      }));
      entries.push({ name: 'gabaritos.xlsx', data: this.buildAnswerKeys(exams) });
      return {
        zip: createZip(entries),
        fileName: packageFileName(examName, request.evaluationType, request.evaluationDate),
        examCount: exams.length,
        warning: enoughCombinations ? undefined : MESSAGES.notEnoughCombinations(request.studentCount)
      };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new ExamGenerationError();
    }
  }

  /** Number of distinct exams that can be made from the questions. */
  static countVariants(questions: QuestionData[]): bigint {
    return questions.reduce((total, q) => total * factorial(q.alternatives.length), factorial(questions.length));
  }

  private buildExams(questions: QuestionData[], count: number): { exams: GeneratedExam[]; enoughCombinations: boolean } {
    const total = ExamGenerationService.countVariants(questions);
    const enoughCombinations = total >= BigInt(count);
    const ranks = enoughCombinations ? this.pickDistinctRanks(total, count) : this.allRanksRepeated(total, count);
    const codes = this.uniqueCodes(count);
    const exams = ranks.map((rank, i) => ({
      code: codes[i],
      studentNumber: i + 1,
      questions: this.variant(questions, rank)
    }));
    return { exams, enoughCombinations };
  }

  /** `count` different ranks in [0, total), in random order. */
  private pickDistinctRanks(total: bigint, count: number): bigint[] {
    if (total <= ENUMERATION_LIMIT) {
      const all = Array.from({ length: Number(total) }, (_, i) => BigInt(i));
      return shuffle(all, this.random).slice(0, count);
    }
    const chosen = new Set<bigint>();
    while (chosen.size < count) {
      chosen.add(randomBelow(total, this.random));
    }
    return Array.from(chosen);
  }

  /** Every possible rank (there are fewer than `count`), repeated in shuffled rounds until `count` are given. */
  private allRanksRepeated(total: bigint, count: number): bigint[] {
    const ranks: bigint[] = [];
    while (ranks.length < count) {
      const round = shuffle(Array.from({ length: Number(total) }, (_, i) => BigInt(i)), this.random);
      ranks.push(...round.slice(0, count - ranks.length));
    }
    return ranks;
  }

  /**
   * The exam content for a rank: the rank is read as a mixed-radix number
   * whose digits choose the order of the questions and, for each question,
   * the order of its alternatives (text and isTrue move together).
   */
  private variant(questions: QuestionData[], rank: bigint): ExamQuestion[] {
    let remaining = rank;
    const take = (size: number): number[] => {
      const base = factorial(size);
      const part = remaining % base;
      remaining = remaining / base;
      return unrankPermutation(size, part);
    };
    const questionOrder = take(questions.length);
    return questionOrder.map(index => {
      const question = questions[index];
      const alternatives = take(question.alternatives.length).map(i => question.alternatives[i]);
      return {
        statement: question.statement,
        alternatives: alternatives.map(a => a.text),
        trueIndexes: alternatives.flatMap((a, i) => (a.isTrue ? [i] : []))
      };
    });
  }

  private uniqueCodes(count: number): string[] {
    const codes = new Set<string>();
    while (codes.size < count) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(this.random() * CODE_ALPHABET.length)];
      }
      codes.add(code);
    }
    return Array.from(codes);
  }
}

function validate(input: ExamGenerationInput): ValidatedInput {
  const examCode = typeof input.examCode === 'string' ? input.examCode.trim() : '';
  if (!examCode) {
    throw new DomainError(MESSAGES.noQuestions);
  }
  const evaluationType = typeof input.evaluationType === 'string' ? input.evaluationType.trim() : '';
  const evaluationDate = typeof input.evaluationDate === 'string' ? input.evaluationDate.trim() : '';
  const rawCount = typeof input.studentCount === 'string' ? input.studentCount.trim() : input.studentCount;
  if (!evaluationType || !evaluationDate || rawCount === undefined || rawCount === null || rawCount === '') {
    throw new DomainError(MESSAGES.insufficientData);
  }
  const studentCount = Number(rawCount);
  if (!Number.isInteger(studentCount) || studentCount < 1 || studentCount > MAX_STUDENTS) {
    throw new DomainError(`A quantidade de alunos deve ser um número inteiro entre 1 e ${MAX_STUDENTS}`);
  }
  return { examCode, evaluationType, evaluationDate, studentCount };
}

/** Renders one exam as a PDF. It shows no information about which alternatives are true. */
export function renderExamPdf(exam: GeneratedExam, examName: string, evaluationType: string, evaluationDate: string): Buffer {
  const pdf = new PdfDocument(`${examName} - ${evaluationType} - ${exam.code}`);
  pdf.paragraph(examName, { size: 18, bold: true, spaceAfter: 4 });
  pdf.paragraph(`Avaliação: ${evaluationType}`, { spaceAfter: 2 });
  pdf.paragraph(`Data: ${evaluationDate}`, { spaceAfter: 2 });
  pdf.paragraph(`Código da prova: ${exam.code}`, { bold: true, spaceAfter: 2 });
  pdf.paragraph(`Aluno nº ${exam.studentNumber}`, { spaceAfter: 6 });
  pdf.paragraph('Nome: ________________________________________________', { spaceAfter: 14 });
  exam.questions.forEach((question, q) => {
    pdf.paragraph(`${q + 1}. ${question.statement}`, { bold: true, spaceAfter: 3 });
    question.alternatives.forEach((text, a) => {
      pdf.paragraph(`${LETTERS[a]}) ${text}`, { indent: 18, spaceAfter: 2 });
    });
    pdf.space(10);
  });
  return pdf.toBuffer((page, total) => `Prova ${exam.code} - Página ${page} de ${total}`);
}

/**
 * The answer of each question, in the order of the exam: the letters of its
 * true alternatives separated by commas ("B" or "A,C"), or "-" when none is true.
 */
export const answerKey = (exam: GeneratedExam): string[] =>
  exam.questions.map(q => (q.trueIndexes.length ? q.trueIndexes.map(i => LETTERS[i].toUpperCase()).join(',') : '-'));

/** Spreadsheet with one row per exam: its code, the student number and the answer to each question. */
export function buildAnswerKeySpreadsheet(exams: GeneratedExam[]): Buffer {
  const questionCount = exams[0]?.questions.length ?? 0;
  const header: Cell[] = ['Código', 'Aluno', ...Array.from({ length: questionCount }, (_, i) => `Questão ${i + 1}`)];
  const rows: Cell[][] = exams.map(exam => [exam.code, exam.studentNumber, ...answerKey(exam)]);
  return createXlsx('Gabaritos', [header, ...rows]);
}

/** ASCII-only name for the downloaded archive, e.g. "provas_prova-de-git_bimestral_25-12-2026.zip". */
export function packageFileName(examName: string, evaluationType: string, evaluationDate: string): string {
  const slug = (text: string, separator: string): string =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, separator)
      .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
  const parts = ['provas', slug(examName, '-'), slug(evaluationType, '-'), slug(evaluationDate, '-')].filter(Boolean);
  return `${parts.join('_')}.zip`;
}
