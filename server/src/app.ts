import express, { Express } from 'express';
import cors from 'cors';
import { StudentSet } from './models/StudentSet';
import { Classes } from './models/Classes';
import { ExamSubmissionSet } from './models/ExamSubmissionSet';
import { AppStateRepository } from './persistence/AppStateRepository';
import { studentRoutes } from './routes/students';
import { classRoutes } from './routes/classes';
import { enrollmentRoutes } from './routes/enrollments';
import { reportRoutes } from './routes/reports';
import { gradeImportRoutes } from './routes/gradeImport';
import { errorHandler } from './routes/HttpError';
import { QuestionBank } from './models/QuestionBank';
import { questionRoutes } from './routes/questions';
import { ExamBank } from './models/ExamBank';
import { examRoutes } from './routes/exams';
import { examSubmissionRoutes } from './routes/examSubmissions';

/** Everything the HTTP application needs, injected by the composition root. */
export interface AppDependencies {
  students: StudentSet;
  classes: Classes;
  repository: AppStateRepository;
  questionBank: QuestionBank;
  onQuestionsChanged: () => void;
  examBank: ExamBank;
  onExamsChanged: () => void;
  examSubmissions?: ExamSubmissionSet;
}

/**
 * Builds the Express application that exposes the REST API.
 *
 * The application owns no state of its own: it operates on the given
 * collections and asks the repository to persist them after each change.
 * Persistence is deferred (setImmediate) so that responses are not delayed
 * by disk access.
 */
export function createApp({
  students,
  classes,
  repository,
  questionBank,
  onQuestionsChanged,
  examBank,
  onExamsChanged,
  examSubmissions = new ExamSubmissionSet()
}: AppDependencies): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const onStateChanged = (): void => {
    setImmediate(() => repository.save(students, classes, examSubmissions));
  };

  app.use('/api/students', studentRoutes(students, onStateChanged));
  app.use('/api/classes', classRoutes(classes, onStateChanged));
  app.use('/api/classes', enrollmentRoutes(classes, students, onStateChanged));
  app.use('/api/classes', reportRoutes(classes));
  app.use('/api/classes', gradeImportRoutes());
  app.use('/api/questions', questionRoutes(questionBank, onQuestionsChanged));
  app.use('/api/exams', examRoutes(examBank, onExamsChanged));
  app.use('/api/exam-submissions', examSubmissionRoutes(examSubmissions, students, onStateChanged));
  app.use(errorHandler);

  return app;
}
