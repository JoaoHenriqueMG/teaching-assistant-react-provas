import * as fs from 'fs';
import * as path from 'path';
import { AppStateRepository } from './AppStateRepository';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import { AverageCalculationSpecification } from '../models/AverageCalculationSpecification';
<<<<<<< HEAD
import { callbackify } from 'util';
=======
import { ExamSubmission, MAX_ALLOWED_SUM } from '../models/ExamSubmission';
import { ExamSubmissionSet } from '../models/ExamSubmissionSet';
>>>>>>> origin/develop

/**
 * Keeps the application state in a single JSON file.
 *
 * File format:
 * {
 *   "students": [{ "name", "cpf" (11 digits), "email" }],
 *   "classes": [{
 *     "topic", "semester", "year", "averageCalculationSpecification",
 *     "enrollments": [{
 *       "studentCPF" (11 digits), "evaluations": [{ "goal", "grade" }],
 *       "averageBeforeFinalExam", "averageAfterFinalExam" (numbers or null), "failedByAbsence" (boolean)
 *     }]
 *   }],
 *   "examSubmissions": [{
 *     "studentName", "studentCpf" (11 digits), "studentEmail", "examTitle", "tipoProva", "submittedAt",
 *     "questions": [{ "label", "sum", "propositions" }]
 *   }]
 * }
 *
 * Loading is lenient: entries that cannot be rebuilt are reported on the
 * console and skipped, so that one bad record does not prevent the server
 * from starting.
 */
export class JsonFileRepository implements AppStateRepository {
  constructor(private readonly filePath: string) {}

  save(students: StudentSet, classes: Classes, examSubmissions?: ExamSubmissionSet): void {
    try {
      const data: Record<string, unknown> = {
        students: students.getAllStudents().map(student => ({
          name: student.getName(),
          cpf: student.getCPF(),
          email: student.getEmail()
        })),
        classes: classes.getAllClasses().map(classObj => ({
          topic: classObj.getTopic(),
          semester: classObj.getSemester(),
          year: classObj.getYear(),
          gradeType: classObj.getGradeType(),
          goals: classObj.getGoals(),
          averageCalculationSpecification: classObj.getAverageCalculationSpecification().toJSON(),
          enrollments: classObj.getEnrollments().map(enrollment => ({
            studentCPF: enrollment.getStudent().getCPF(),
            evaluations: enrollment.getEvaluations().map(evaluation => evaluation.toJSON()),
            averageBeforeFinalExam: enrollment.getAverageBeforeFinalExam(),
            averageAfterFinalExam: enrollment.getAverageAfterFinalExam(),
            failedByAbsence: enrollment.getFailedByAbsence()
          }))
        }))
      };

      if (examSubmissions) {
        data.examSubmissions = examSubmissions.getAllSubmissions().map(submission =>
          submission.toPersistenceJSON()
        );
      }

      this.ensureDataDirectory();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving students to file:', error);
    }
  }

  load(students: StudentSet, classes: Classes, examSubmissions?: ExamSubmissionSet): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      this.loadStudents(data, students);
      this.loadClasses(data, students, classes);
      if (examSubmissions) {
        this.loadExamSubmissions(data, students, examSubmissions);
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
    }
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadStudents(data: any, students: StudentSet): void {
    if (!Array.isArray(data.students)) {
      return;
    }
    data.students.forEach((studentData: any) => {
      try {
        students.addStudent(new Student(studentData.name, studentData.cpf, studentData.email));
      } catch (error) {
        console.error(`Error adding student ${studentData.name}:`, error);
      }
    });
  }

  private loadClasses(data: any, students: StudentSet, classes: Classes): void {
    if (!Array.isArray(data.classes)) {
      return;
    }
    data.classes.forEach((classData: any) => {
      try {
        const classObj = new Class(
          classData.topic,
          classData.semester,
          classData.year,
          classData.gradeType,
          classData.goals,
          // averageCalculationSpecification was named
          // especificacaoDoCalculoDaMedia in files written by previous versions
          AverageCalculationSpecification.fromJSON(
            classData.averageCalculationSpecification ?? classData.especificacaoDoCalculoDaMedia
          )
        );
        classes.addClass(classObj);
        this.loadEnrollments(classData, classObj, students);
      } catch (error) {
        console.error(`Error adding class ${classData.topic}:`, error);
      }
    });
  }

  private loadEnrollments(classData: any, classObj: Class, students: StudentSet): void {
    if (!Array.isArray(classData.enrollments)) {
      return;
    }
    classData.enrollments.forEach((enrollmentData: any) => {
      const student = students.findStudentByCPF(enrollmentData.studentCPF);
      if (!student) {
        console.error(`Student with CPF ${enrollmentData.studentCPF} not found for enrollment`);
        return;
      }
      const enrollment = classObj.addEnrollment(student);
      if (Array.isArray(enrollmentData.evaluations)) {
        enrollmentData.evaluations.forEach((evalData: any) => {
          const evaluation = Evaluation.fromJSON(evalData);
          enrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
        });
      }
      // Averages and attendance status, when present in the file. The names
      // on the right of each ?? are the ones used by previous versions.
      const averageBeforeFinalExam = enrollmentData.averageBeforeFinalExam ?? enrollmentData.mediaPreFinal;
      const averageAfterFinalExam = enrollmentData.averageAfterFinalExam ?? enrollmentData.mediaPosFinal;
      const failedByAbsence = enrollmentData.failedByAbsence ?? enrollmentData.reprovadoPorFalta;
      if (typeof averageBeforeFinalExam !== 'undefined') {
        enrollment.setAverageBeforeFinalExam(averageBeforeFinalExam);
      }
      if (typeof averageAfterFinalExam !== 'undefined') {
        enrollment.setAverageAfterFinalExam(averageAfterFinalExam);
      }
      if (typeof failedByAbsence !== 'undefined') {
        enrollment.setFailedByAbsence(Boolean(failedByAbsence));
      }
    });
  }

  private loadExamSubmissions(
    data: any,
    students: StudentSet,
    examSubmissions: ExamSubmissionSet
  ): void {
    if (!Array.isArray(data.examSubmissions)) {
      return;
    }
    data.examSubmissions.forEach((submissionData: any) => {
      try {
        const student = students.findStudentByCPF(submissionData.studentCpf);
        if (!student) {
          console.error(`Student with CPF ${submissionData.studentCpf} not found for exam submission`);
          return;
        }
        // The sums were validated against their exam when saved, so only the absolute limit applies here
        const submission = new ExamSubmission(
          student.getName(),
          student.getCPF(),
          submissionData.examTitle,
          submissionData.tipoProva,
          submissionData.questions,
          {
            studentEmail: submissionData.studentEmail ?? student.getEmail(),
            submittedAt: submissionData.submittedAt,
            maxSum: MAX_ALLOWED_SUM
          }
        );
        examSubmissions.addSubmission(submission);
      } catch (error) {
        console.error(`Error adding exam submission for ${submissionData?.studentCpf}:`, error);
      }
    });
  }
}
