import { Router } from 'express';
import { Classes } from '../models/Classes';
import { Report } from '../models/Report';
import { notFound } from './HttpError';

/**
 * Routes for class statistics reports. Mounted at /api/classes.
 *
 * @param classes the class collection to report on
 */
export function reportRoutes(classes: Classes): Router {
  const router = Router();

  // GET /api/classes/:classId/report - Generate statistics report for a class
  router.get('/:classId/report', (req, res) => {
    const classObj = classes.findClassById(req.params.classId);
    if (!classObj) {
      throw notFound('Class not found');
    }
    res.json(new Report(classObj).toJSON());
  });

  return router;
}
