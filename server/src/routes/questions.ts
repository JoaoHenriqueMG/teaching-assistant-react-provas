import { Router } from 'express';
import { Question } from '../models/Question';
import { QuestionBank } from '../models/QuestionBank';

/** STAND-IN (see models/Question.ts) for the questions API of the integration guide. Mounted at /api/questions. */
export function questionRoutes(bank: QuestionBank): Router {
  const router = Router();
  router.get('/', (req, res) => {
    res.json(bank.getAllQuestions().map(q => q.toJSON()));
  });
  router.post('/', (req, res) => {
    res.status(201).json(bank.add(Question.create(req.body ?? {})).toJSON());
  });
  return router;
}
