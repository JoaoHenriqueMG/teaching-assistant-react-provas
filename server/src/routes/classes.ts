import { Router } from 'express';
import { Classes } from '../models/Classes';
import { Class, GRADE_TYPE, GradeType } from '../models/Class';
import { DEFAULT_AVERAGE_CALCULATION_SPECIFICATION } from '../models/AverageCalculationSpecification';
import { badRequest, notFound } from './HttpError';
import { isInteger, isNonEmptyString, isGradeType, isNonEmptyStringList } from './validation';

/**
 * Routes for creating, listing, updating and removing classes.
 * Mounted at /api/classes.
 *
 * @param classes the class collection to operate on
 * @param onStateChanged called after every successful modification
 */
interface ClassFields {
  topic: string;
  semester: number;
  year: number;
  gradeType: GradeType;
  goals: string[];
}

/** Checks that a request body carries the fields that identify a class. */
function requireClassFields(body: any): ClassFields {
  const { topic, semester, year, gradeType, goals } = body;
  if (!topic || !semester || !year || !gradeType || !goals) {
    throw badRequest('Topic, semester, and year are required');
  }
  if (!isNonEmptyString(topic)) {
    throw badRequest('Topic must be a non-empty string');
  }
  if (!isInteger(semester) || !isInteger(year)) {
    throw badRequest('Semester and year must be integers');
  }
  if (!isGradeType(gradeType)) {
    throw badRequest('');
  }
  if (!isNonEmptyStringList(goals)) {
    throw badRequest('Goals must be a non-empty string list');
  }
  return { topic, semester, year, gradeType, goals };
}

export function classRoutes(classes: Classes, onStateChanged: () => void): Router {
  const router = Router();

  // GET /api/classes - Get all classes
  router.get('/', (req, res) => {
    res.json(classes.getAllClasses().map(c => c.toJSON()));
  });

  // POST /api/classes - Add a new class
  router.post('/', (req, res) => {
    const { topic, semester, year, gradeType, goals } = requireClassFields(req.body);
    const newClass = classes.addClass(new Class(topic, semester, year, gradeType, goals, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION));
    onStateChanged();
    res.status(201).json(newClass.toJSON());
  });

  // PUT /api/classes/:id - Update a class
  router.put('/:id', (req, res) => {
    const { topic, semester, year, gradeType, goals } = requireClassFields(req.body);
    if (!classes.findClassById(req.params.id)) {
      throw notFound('Class not found');
    }
    const updatedClass = classes.updateClassIdentification(req.params.id, topic, semester, year, gradeType, goals);
    onStateChanged();
    res.json(updatedClass.toJSON());
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
