import { Router } from 'express';
import { StudentSet } from '../models/StudentSet';
import { Student } from '../models/Student';
import { cleanCPF } from '../models/CPF';
import { badRequest, notFound } from './HttpError';
import { isString } from './validation';

/**
 * Routes for registering, listing, updating and removing students.
 * Mounted at /api/students.
 *
 * @param students the student collection to operate on
 * @param onStateChanged called after every successful modification
 */
export function studentRoutes(students: StudentSet, onStateChanged: () => void): Router {
  const router = Router();

  // GET /api/students - Get all students
  router.get('/', (req, res) => {
    res.json(students.getAllStudents().map(s => s.toJSON()));
  });

  // POST /api/students - Add a new student
  router.post('/', (req, res) => {
    const { name, cpf, email } = req.body;
    if (!name || !cpf || !email) {
      throw badRequest('Name, CPF, and email are required');
    }
    if (!isString(name) || !isString(cpf) || !isString(email)) {
      throw badRequest('Name, CPF, and email must be strings');
    }
    // Create student with basic information only - evaluations handled through enrollments
    const addedStudent = students.addStudent(new Student(name, cpf, email));
    onStateChanged();
    res.status(201).json(addedStudent.toJSON());
  });

  // PUT /api/students/:cpf - Update a student
  router.put('/:cpf', (req, res) => {
    const { cpf } = req.params;
    const { name, email } = req.body;
    if (!name || !email) {
      throw badRequest('Name and email are required for update');
    }
    if (!isString(name) || !isString(email)) {
      throw badRequest('Name and email must be strings');
    }
    // Create a Student object for update - evaluations handled through enrollments
    const result = students.updateStudent(new Student(name, cpf, email));
    onStateChanged();
    res.json(result.toJSON());
  });

  // DELETE /api/students/:cpf - Delete a student
  router.delete('/:cpf', (req, res) => {
    const removed = students.removeStudent(cleanCPF(req.params.cpf));
    if (!removed) {
      throw notFound('Student not found');
    }
    onStateChanged();
    res.status(204).send();
  });

  // PUT /api/students/:cpf/evaluation - Update a specific evaluation
  // DEPRECATED: Evaluations are now handled through class enrollments
  /*
  router.put('/:cpf/evaluation', (req, res) => {
    const { cpf } = req.params;
    const { goal, grade } = req.body;
    if (!goal) {
      throw badRequest('Goal is required');
    }
    const student = students.findStudentByCPF(cleanCPF(cpf));
    if (!student) {
      throw notFound('Student not found');
    }
    if (grade === '' || grade === null || grade === undefined) {
      student.removeEvaluation(goal);
    } else {
      if (!isGrade(grade)) {
        throw badRequest('Invalid grade. Must be MANA, MPA, or MA');
      }
      student.addOrUpdateEvaluation(goal, grade);
    }
    onStateChanged();
    res.json(student.toJSON());
  });
  */

  // GET /api/students/:cpf - Get a specific student
  router.get('/:cpf', (req, res) => {
    const student = students.findStudentByCPF(cleanCPF(req.params.cpf));
    if (!student) {
      throw notFound('Student not found');
    }
    res.json(student.toJSON());
  });

  return router;
}
