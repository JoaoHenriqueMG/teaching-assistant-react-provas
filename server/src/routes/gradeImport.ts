import { Router } from 'express';
import multer from 'multer';
import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { notFound, badRequest } from './HttpError';
import {
  gradeExam,
  applyGradingToClass,
  parseCellValue,
  AutoGradingOutput,
  AnswerKeyEntry,
  StudentResponseEntry
} from '../models/AutoGrading';

/**
 * Routes for auto-grading exams from spreadsheets. Mounted at /api/classes.
 *
 * POST /api/classes/:classId/auto-grade
 * Accepts multipart/form-data with two files:
 * - answerKey: spreadsheet with exam numbers and answer keys
 * - studentResponses: spreadsheet with student responses
 */
export function gradeImportRoutes(classes: Classes): Router {
  const router = Router();

  // Configure multer for memory storage (files are small)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 2
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo inválido. Use CSV ou Excel (.xlsx, .xls)'));
      }
    }
  });

  // POST /api/classes/:classId/auto-grade - Auto-grade exams from spreadsheets
  router.post(
    '/:classId/auto-grade',
    upload.fields([
      { name: 'answerKey', maxCount: 1 },
      { name: 'studentResponses', maxCount: 1 }
    ]),
    async (req, res) => {
      try {
        const classId = req.params.classId;
        const classObj = classes.findClassById(classId);

        if (!classObj) {
          throw notFound('Turma não encontrada');
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Validate both files are present
        if (!files.answerKey || !files.studentResponses) {
          throw badRequest('Ambas as planilhas (gabarito e respostas) são obrigatórias');
        }

        const answerKeyFile = files.answerKey[0];
        const studentResponsesFile = files.studentResponses[0];

        // Parse CSV files
        const answerKeyData = parseCSV(answerKeyFile.buffer.toString('utf-8'));
        const studentResponsesData = parseCSV(studentResponsesFile.buffer.toString('utf-8'));

        // Validate answer key format
        const answerKeyValidation = validateAnswerKeyFormat(answerKeyData);
        if (answerKeyValidation) {
          throw badRequest(`Planilha de gabarito inválida: ${answerKeyValidation}`);
        }

        // Validate student responses format
        const studentResponsesValidation = validateStudentResponsesFormat(studentResponsesData);
        if (studentResponsesValidation) {
          throw badRequest(`Planilha de respostas inválida: ${studentResponsesValidation}`);
        }

        // Parse answer keys
        const answerKeys = parseAnswerKeys(answerKeyData);

        // Parse student responses
        const studentResponses = parseStudentResponses(studentResponsesData);

        // Determine expected number of questions from answer keys
        const expectedQuestions = Math.max(...answerKeys.map(k => k.answers.length), 0);

        if (expectedQuestions === 0) {
          throw badRequest('Gabarito não possui questões');
        }

        // Perform auto-grading
        const gradingOutput: AutoGradingOutput = gradeExam(
          answerKeys,
          studentResponses,
          expectedQuestions
        );

        // Apply grades to class enrollments
        const { updated, notFound: notFoundStudents } = applyGradingToClass(classObj, gradingOutput);

        // Prepare response
        const response = {
          success: true,
          message: `Notas cadastradas para ${updated} aluno(s)`,
          results: gradingOutput.results.map((r, index) => ({
            rank: index + 1,
            studentName: r.studentName,
            studentId: r.studentId,
            examNumber: r.examNumber,
            percentage: r.percentage,
            questionDetails: r.questionResults.map(qr => ({
              question: qr.questionIndex + 1,
              answerKey: qr.answerKey,
              studentAnswer: qr.studentAnswer,
              isValid: qr.isValid,
              percentage: qr.percentage,
              warning: qr.warning
            })),
            warnings: r.warnings
          })),
          globalWarnings: gradingOutput.globalWarnings,
          studentsNotFoundInClass: notFoundStudents,
          summary: {
            totalGraded: gradingOutput.totalStudentsGraded,
            totalWithWarnings: gradingOutput.totalStudentsWithWarnings,
            totalUpdated: updated,
            totalNotFound: notFoundStudents.length
          }
        };

        res.json(response);
      } catch (error) {
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'Arquivo muito grande (máximo 5MB)' });
            return;
          }
          if (error.code === 'LIMIT_FILE_COUNT') {
            res.status(400).json({ error: 'Muitos arquivos (máximo 2)' });
            return;
          }
          res.status(400).json({ error: `Erro no upload: ${error.message}` });
          return;
        }

        if (error instanceof Error && error.message.includes('Tipo de arquivo inválido')) {
          res.status(400).json({ error: error.message });
          return;
        }

        // Re-throw HttpErrors to be handled by errorHandler
        throw error;
      }
    }
  );

  return router;
}