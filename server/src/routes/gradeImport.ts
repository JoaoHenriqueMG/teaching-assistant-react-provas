import * as path from 'path';
import { RequestHandler, Router } from 'express';
import multer from 'multer';
import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { formatCPF } from '../models/CPF';
import { rank } from '../models/Ranking';
import { gradeExam } from '../models/AutoGrading';
import { applyGrades, assertClassGoal, percentageToGrade, splitByEnrollment } from '../models/ApplyToClass';
import { parseCsv, readAnswerKeys, readResponses } from '../models/Spreadsheet';
import { badRequest, notFound } from './HttpError';
import { isNonEmptyString } from './validation';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

type UploadedFiles = { [field: string]: Express.Multer.File[] };

/**
 * Routes for correcting exams automatically from the answer key and the
 * students' responses sheets. Mounted at /api/classes.
 * *
 * - POST /api/classes/:classId/auto-grade/preview  grades and ranks, saves nothing
 * - POST /api/classes/:classId/auto-grade          the same, and saves the grades
 *
 * @param classes the class collection to operate on
 * @param onStateChanged called after every successful modification
 */
export function gradeImportRoutes(classes: Classes, onStateChanged: () => void): Router {
  const router = Router();

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 2 } })
    .fields([{ name: 'answerKey', maxCount: 1 }, { name: 'responses', maxCount: 1 }]);

  // Reports upload problems (e.g. a file that is too large) as 400, not 500
  const receiveFiles: RequestHandler = (req, res, next) => {
    upload(req, res, error => {
      next(error instanceof multer.MulterError ? badRequest(`Failed to upload the files: ${error.message}`) : error);
    });
  };

  const findClass = (classId: string): Class => {
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      throw notFound('Class not found');
    }
    return classObj;
  };

  const grade = (commit: boolean): RequestHandler => (req, res) => {
    const classObj = findClass(req.params.classId);

    const files = (req.files ?? {}) as UploadedFiles;
    const answerKeyFile = files.answerKey?.[0];
    const responsesFile = files.responses?.[0];
    if (!answerKeyFile || !responsesFile) {
      throw badRequest('Send the answer key spreadsheet (answerKey) and the responses spreadsheet (responses)');
    }
    for (const file of [answerKeyFile, responsesFile]) {
      if (path.extname(file.originalname).toLowerCase() !== '.csv') {
        throw badRequest(`Invalid format: "${file.originalname}" is not a .csv file`);
      }
    }

    const { goal } = req.body ?? {};
    if (!isNonEmptyString(goal)) {
      throw badRequest('The goal that receives the grades is required');
    }
    assertClassGoal(classObj, goal);

    const output = gradeExam({
      keys: readAnswerKeys(parseCsv(answerKeyFile.buffer.toString('utf8'))),
      responses: readResponses(parseCsv(responsesFile.buffer.toString('utf8')))
    });
    if (output.errors.length > 0) {
      res.status(400).json({ error: output.errors.map(error => error.message).join('; '), errors: output.errors });
      return;
    }

    const { enrolled, notInClass } = splitByEnrollment(classObj, output.results);
    const gradeType = classObj.getGradeType();

    const ranking = rank(
      enrolled,
      ({ result }) => result.percentage,
      (a, b) => a.enrollment.getStudent().getName().localeCompare(b.enrollment.getStudent().getName())
    ).map(({ item: { result, enrollment }, rank: position }) => ({
      rank: position,
      studentId: formatCPF(enrollment.getStudent().getCPF()), // as the rest of the API shows it
      studentName: enrollment.getStudent().getName(),
      examNumber: result.examNumber,
      alternatives: result.alternatives,
      percentage: result.percentage,
      grade: percentageToGrade(result.percentage, gradeType),
      warnings: result.warnings,
      questionResults: result.questionResults
    }));

    if (commit) {
      applyGrades(classObj, enrolled, goal);
      onStateChanged();
    }

    res.json({
      saved: commit,
      goal,
      ranking,
      notInClass: notInClass.map(({ studentId, studentName, percentage }) => ({ studentId, studentName, percentage })),
      warnings: output.warnings
    });
  };

  router.post('/:classId/auto-grade/preview', receiveFiles, grade(false));
  router.post('/:classId/auto-grade', receiveFiles, grade(true));

  return router;
}