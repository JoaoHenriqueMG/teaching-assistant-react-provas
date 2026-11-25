import { Router } from 'express';
import { ExamBank } from '../models/ExamBank';
import { notFound } from './HttpError';

/** STAND-IN (see models/Question.ts) for the exams API of the integration guide. Mounted at /api/exams. */
export function examRoutes(bank: ExamBank): Router {
  const router = Router();
  router.get('/', (req, res) => {
    res.json(bank.getAllExams().map(e => e.toJSON()));
  });
  router.post('/', (req, res) => {
    res.status(201).json(bank.addExam(req.body ?? {}).toJSON());
  });
  router.get('/:code', (req, res) => {
    const exam = bank.findExamByCode(req.params.code);
    if (!exam) throw notFound('Prova não encontrada');
    res.json({
      ...exam.toJSON(),
      questions: bank.getQuestionsForExam(exam.code).map(q => q.toJSON()),
      subjects: bank.getSubjectsForExam(exam.code)
    });
  });
  return router;
}
