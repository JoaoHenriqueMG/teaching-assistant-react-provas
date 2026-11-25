import { Router } from 'express';
import { ExamNotFoundError, ExamGenerationError, ExamGenerationService, ExamSource } from '../services/ExamGenerationService';
import { HttpError, notFound } from './HttpError';

/**
 * Routes for generating the PDFs of a registered exam. Mounted at /api/exams.
 *
 * POST /api/exams/:code/pdfs
 *   body: { evaluationType, evaluationDate, studentCount }
 *   200: a ZIP with one PDF per student (each with its own order of
 *        questions and alternatives and a unique code) and one spreadsheet
 *        with the answer keys. When there are fewer possible variations than
 *        students the ZIP is still sent, and the header X-Warning
 *        (URL-encoded) says so.
 *   400: incomplete or invalid data, with the message in { error }.
 *   404: no exam with that code.
 *   500: the generation failed; nothing is sent.
 */
export function examPdfRoutes(source: ExamSource, service: ExamGenerationService = new ExamGenerationService()): Router {
  const router = Router();

  router.post('/:code/pdfs', (req, res) => {
    let result;
    try {
      result = service.generate(source, { ...(req.body ?? {}), examCode: req.params.code });
    } catch (error) {
      if (error instanceof ExamNotFoundError) throw notFound(error.message);
      if (error instanceof ExamGenerationError) throw new HttpError(500, error.message);
      throw error; // DomainError → 400 (by the error handler)
    }
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Warning'
    });
    if (result.warning) {
      res.set('X-Warning', encodeURIComponent(result.warning));
    }
    res.send(result.zip);
  });

  return router;
}
