import { Router } from 'express';
import {
  DEFAULT_MAX_SUM,
  MAX_ALLOWED_SUM,
  ExamSubmission,
  QuestionAnswerInput
} from '../models/ExamSubmission';
import { ExamSubmissionSet } from '../models/ExamSubmissionSet';
import { StudentSet } from '../models/StudentSet';
import { cleanCPF, isCleanCPFValid } from '../models/CPF';
import { badRequest, notFound } from './HttpError';
import { isNonEmptyString, isString } from './validation';

function escapeCsvCell(value: string | number): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Formats submissions as a Google Forms-compatible CSV that can be uploaded
 * as it is to the auto-grading module (Spreadsheet.ts -> readResponses),
 * which finds the "número da prova" and "CPF" columns by name and reads as
 * answers every column after them:
 * Carimbo de data/hora,nome,e-mail,CPF,número da prova,Questão 1,Questão 2,...
 *
 * The grading works on one exam at a time, so the submissions must all have
 * the same questions.
 */
function buildResponsesCsv(submissions: ExamSubmission[]): string {
  const questionLabels = submissions.length > 0
    ? submissions[0].getQuestions().map((q) => q.label)
    : [];

  const sameQuestions = submissions.every((submission) => {
    const labels = submission.getQuestions().map((q) => q.label);
    return labels.length === questionLabels.length && labels.every((label, i) => label === questionLabels[i]);
  });
  if (!sameQuestions) {
    throw badRequest('As avaliações têm quantidades de questões diferentes: escolha uma avaliação para exportar');
  }

  const header = ['Carimbo de data/hora', 'nome', 'e-mail', 'CPF', 'número da prova', ...questionLabels];
  const rows = submissions.map((submission) => [
    submission.getSubmittedAt(),
    submission.getStudentName(),
    submission.getStudentEmail(),
    submission.getFormattedStudentCPF(),
    submission.getTipoProva(),
    ...submission.getQuestions().map((q) => q.sum)
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

/**
 * Routes for registering, listing, exporting and removing exam answer submissions.
 * Mounted at /api/exam-submissions.
 *
 * @param examSubmissions the submission collection to operate on
 * @param students the registered student collection (submissions belong to registered students)
 * @param onStateChanged called after every successful modification
 */
export function examSubmissionRoutes(
  examSubmissions: ExamSubmissionSet,
  students: StudentSet,
  onStateChanged: () => void
): Router {
  const router = Router();

  // GET /api/exam-submissions - List all submissions (optional ?studentCpf=...&examTitle=...)
  router.get('/', (req, res) => {
    const { studentCpf, examTitle } = req.query;
    let list = examSubmissions.getAllSubmissions();

    if (typeof studentCpf === 'string' && studentCpf.trim().length > 0) {
      const cleaned = cleanCPF(studentCpf);
      list = list.filter((s) => s.getStudentCPF() === cleaned);
    }

    if (typeof examTitle === 'string' && examTitle.trim().length > 0) {
      const normalizedTitle = examTitle.trim();
      list = list.filter((s) => s.getExamTitle() === normalizedTitle);
    }

    res.json(list.map((s) => s.toJSON()));
  });

  // GET /api/exam-submissions/export - Export CSV compatible with auto-grading Spreadsheet.ts
  router.get('/export', (req, res) => {
    const { examTitle } = req.query;
    let list = examSubmissions.getAllSubmissions();

    if (typeof examTitle === 'string' && examTitle.trim().length > 0) {
      const normalizedTitle = examTitle.trim();
      list = list.filter((s) => s.getExamTitle() === normalizedTitle);
    }

    if (list.length === 0) {
      throw notFound('Nenhuma resposta registrada para exportar');
    }

    const csv = buildResponsesCsv(list);
    const safeName =
      typeof examTitle === 'string' && examTitle.trim().length > 0
        ? examTitle.trim().replace(/[^a-zA-Z0-9_-]+/g, '_')
        : 'todas';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="respostas-${safeName}.csv"`);
    res.status(200).send(csv);
  });

  // POST /api/exam-submissions - Register a new exam submission
  router.post('/', (req, res) => {
    const { studentCpf, examTitle, tipoProva, questions, maxSum } = req.body;

    if (!isNonEmptyString(studentCpf)) {
      throw badRequest('CPF do estudante é obrigatório');
    }

    const cleanedCpf = cleanCPF(studentCpf);
    if (!isCleanCPFValid(cleanedCpf)) {
      throw badRequest('Invalid CPF format');
    }

    const student = students.findStudentByCPF(cleanedCpf);
    if (!student) {
      throw notFound('Estudante não cadastrado');
    }

    if (!isNonEmptyString(examTitle)) {
      throw badRequest('A avaliação é obrigatória');
    }

    if (!isString(tipoProva) || tipoProva.trim().length === 0) {
      throw badRequest('O tipo da prova é obrigatório');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw badRequest('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
    }

    let effectiveMaxSum = DEFAULT_MAX_SUM;
    if (maxSum !== undefined) {
      if (typeof maxSum !== 'number' || !Number.isInteger(maxSum) || maxSum < 1 || maxSum > MAX_ALLOWED_SUM) {
        throw badRequest(`O limite máximo da soma deve ser um inteiro entre 1 e ${MAX_ALLOWED_SUM}`);
      }
      effectiveMaxSum = maxSum;
    }

    const parsedQuestions: QuestionAnswerInput[] = questions.map((item: unknown) => {
      if (!item || typeof item !== 'object') {
        throw badRequest('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
      }
      const { label, sum } = item as { label?: unknown; sum?: unknown };
      if (!isNonEmptyString(label)) {
        throw badRequest('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
      }
      if (sum === '' || sum === null || sum === undefined) {
        throw badRequest('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
      }
      const numericSum = typeof sum === 'number' ? sum : Number(sum);
      if (!Number.isInteger(numericSum) || numericSum < 0 || numericSum > effectiveMaxSum) {
        throw badRequest(`A soma de cada questão deve ser um valor entre 0 e ${effectiveMaxSum}`);
      }
      return { label: label.trim(), sum: numericSum };
    });

    const submission = new ExamSubmission(student.getName(), student.getCPF(), examTitle, tipoProva, parsedQuestions, {
      studentEmail: student.getEmail(),
      maxSum: effectiveMaxSum
    });

    const added = examSubmissions.addSubmission(submission);
    onStateChanged();
    res.status(201).json(added.toJSON());
  });

  // GET /api/exam-submissions/:cpf/:examTitle - Get a specific submission
  router.get('/:cpf/:examTitle', (req, res) => {
    const submission = examSubmissions.findSubmission(
      cleanCPF(req.params.cpf),
      req.params.examTitle
    );
    if (!submission) {
      throw notFound('Respostas da avaliação não encontradas');
    }
    res.json(submission.toJSON());
  });

  // DELETE /api/exam-submissions/:cpf/:examTitle - Delete a specific submission
  router.delete('/:cpf/:examTitle', (req, res) => {
    const removed = examSubmissions.removeSubmission(
      cleanCPF(req.params.cpf),
      req.params.examTitle
    );
    if (!removed) {
      throw notFound('Respostas da avaliação não encontradas');
    }
    onStateChanged();
    res.status(204).send();
  });

  return router;
}
