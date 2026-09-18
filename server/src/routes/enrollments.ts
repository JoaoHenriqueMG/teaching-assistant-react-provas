import { Router } from 'express';
import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { StudentSet } from '../models/StudentSet';
import { cleanCPF } from '../models/CPF';
import { isGrade } from '../models/Evaluation';
import { badRequest, notFound } from './HttpError';

/**
 * Routes for enrolling students in classes and grading their learning goals.
 * Mounted at /api/classes.
 *
 * @param classes the class collection to operate on
 * @param students the student collection, used to resolve CPFs
 * @param onStateChanged called after every successful modification
 */
export function enrollmentRoutes(classes: Classes, students: StudentSet, onStateChanged: () => void): Router {
  const router = Router();

  const findClass = (classId: string): Class => {
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      throw notFound('Class not found');
    }
    return classObj;
  };

  const findEnrollment = (classId: string, studentCPF: string): Enrollment => {
    const enrollment = findClass(classId).findEnrollmentByStudentCPF(cleanCPF(studentCPF));
    if (!enrollment) {
      throw notFound('Student not enrolled in this class');
    }
    return enrollment;
  };

  // POST /api/classes/:classId/enroll - Enroll a student in a class
  router.post('/:classId/enroll', (req, res) => {
    const { studentCPF } = req.body;
    if (!studentCPF) {
      throw badRequest('Student CPF is required');
    }
    const classObj = findClass(req.params.classId);
    const student = students.findStudentByCPF(cleanCPF(studentCPF));
    if (!student) {
      throw notFound('Student not found');
    }
    const enrollment = classObj.addEnrollment(student);
    onStateChanged();
    res.status(201).json(enrollment.toJSON());
  });

  // DELETE /api/classes/:classId/enroll/:studentCPF - Remove student enrollment from a class
  router.delete('/:classId/enroll/:studentCPF', (req, res) => {
    const removed = findClass(req.params.classId).removeEnrollment(cleanCPF(req.params.studentCPF));
    if (!removed) {
      throw notFound('Student not enrolled in this class');
    }
    onStateChanged();
    res.status(204).send();
  });

  // GET /api/classes/:classId/enrollments - Get all enrollments for a class
  router.get('/:classId/enrollments', (req, res) => {
    res.json(findClass(req.params.classId).getEnrollments().map(e => e.toJSON()));
  });

  // GET /api/classes/:classId/enrollments/:studentCPF/evaluation - Get the student's average and final average for a class
  router.get('/:classId/enrollments/:studentCPF/evaluation', (req, res) => {
    const enrollment = findEnrollment(req.params.classId, req.params.studentCPF);
    res.json({
      student: enrollment.getStudent().toJSON(),
      average: enrollment.getMediaPreFinal(),
      final_average: enrollment.getMediaPosFinal()
    });
  });

  // PUT /api/classes/:classId/enrollments/:studentCPF/evaluation - Update evaluation for an enrolled student
  router.put('/:classId/enrollments/:studentCPF/evaluation', (req, res) => {
    const { goal, grade } = req.body;
    if (!goal) {
      throw badRequest('Goal is required');
    }
    const enrollment = findEnrollment(req.params.classId, req.params.studentCPF);
    if (grade === '' || grade === null || grade === undefined) {
      enrollment.removeEvaluation(goal);
    } else {
      if (!isGrade(grade)) {
        throw badRequest('Invalid grade. Must be MANA, MPA, or MA');
      }
      enrollment.addOrUpdateEvaluation(goal, grade);
    }
    onStateChanged();
    res.json(enrollment.toJSON());
  });

  return router;
}
