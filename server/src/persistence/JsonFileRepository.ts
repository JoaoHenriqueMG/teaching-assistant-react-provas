import * as fs from 'fs';
import * as path from 'path';
import { AppStateRepository } from './AppStateRepository';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import { AverageCalculationSpecification } from '../models/AverageCalculationSpecification';

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
 *   }]
 * }
 *
 * Loading is lenient: entries that cannot be rebuilt are reported on the
 * console and skipped, so that one bad record does not prevent the server
 * from starting.
 */
export class JsonFileRepository implements AppStateRepository {
  constructor(private readonly filePath: string) {}

  save(students: StudentSet, classes: Classes): void {
    try {
      const data = {
        students: students.getAllStudents().map(student => ({
          name: student.getName(),
          cpf: student.getCPF(),
          email: student.getEmail()
        })),
        classes: classes.getAllClasses().map(classObj => ({
          topic: classObj.getTopic(),
          semester: classObj.getSemester(),
          year: classObj.getYear(),
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

      this.ensureDataDirectory();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving students to file:', error);
    }
  }

  load(students: StudentSet, classes: Classes): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      this.loadStudents(data, students);
      this.loadClasses(data, students, classes);
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
          AverageCalculationSpecification.fromJSON(classData.averageCalculationSpecification)
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
      // Averages and attendance status, when present in the file
      if (typeof enrollmentData.averageBeforeFinalExam !== 'undefined') {
        enrollment.setAverageBeforeFinalExam(enrollmentData.averageBeforeFinalExam);
      }
      if (typeof enrollmentData.averageAfterFinalExam !== 'undefined') {
        enrollment.setAverageAfterFinalExam(enrollmentData.averageAfterFinalExam);
      }
      if (typeof enrollmentData.failedByAbsence !== 'undefined') {
        enrollment.setFailedByAbsence(Boolean(enrollmentData.failedByAbsence));
      }
    });
  }
}
