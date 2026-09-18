import { Router } from 'express';
import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { badRequest, notFound } from './HttpError';

/**
 * Routes for creating, listing, updating and removing classes.
 * Mounted at /api/classes.
 *
 * @param classes the class collection to operate on
 * @param onStateChanged called after every successful modification
 */
export function classRoutes(classes: Classes, onStateChanged: () => void): Router {
  const router = Router();

  // GET /api/classes - Get all classes
  router.get('/', (req, res) => {
    res.json(classes.getAllClasses().map(c => c.toJSON()));
  });

  // POST /api/classes - Add a new class
  router.post('/', (req, res) => {
    const { topic, semester, year } = req.body;
    if (!topic || !semester || !year) {
      throw badRequest('Topic, semester, and year are required');
    }
    const newClass = classes.addClass(new Class(topic, semester, year, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA));
    onStateChanged();
    res.status(201).json(newClass.toJSON());
  });

  // PUT /api/classes/:id - Update a class
  router.put('/:id', (req, res) => {
    const { topic, semester, year } = req.body;
    if (!topic || !semester || !year) {
      throw badRequest('Topic, semester, and year are required');
    }
    const existingClass = classes.findClassById(req.params.id);
    if (!existingClass) {
      throw notFound('Class not found');
    }
    existingClass.setTopic(topic);
    existingClass.setSemester(semester);
    existingClass.setYear(year);
    onStateChanged();
    res.json(existingClass.toJSON());
  });

  // DELETE /api/classes/:id - Delete a class
  router.delete('/:id', (req, res) => {
    const removed = classes.removeClass(req.params.id);
    if (!removed) {
      throw notFound('Class not found');
    }
    onStateChanged();
    res.status(204).send();
  });

  return router;
}
