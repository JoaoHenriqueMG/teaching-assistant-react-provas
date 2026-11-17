import { Class, GradeType } from './Class';
import { Enrollment } from './Enrollment';
import { Grade } from './Evaluation';
import { cleanCPF } from './CPF';
import { DomainError } from './DomainError';
import { GradingResult } from './AutoGrading';

/**
 * The only part of auto-grading that touches a Class: it finds the enrollments
 * of the graded students and writes their grades. Grading itself is in
 * AutoGrading.ts and knows nothing about classes.
 */

/**
 * Minimum percentage for each concept in classes graded by concepts; anything
 * below MPA's minimum is MANA. Adjust here if the course uses other cut-offs.
 */
export const CONCEPT_THRESHOLDS = { MA: 70, MPA: 50 } as const;

/**
 * Converts an exam percentage into a grade of the given type: a concept in
 * classes graded by concepts, otherwise a number from 0 to 10 with one decimal
 * place (87% -> 8.7).
 */
export function percentageToGrade(percentage: number, gradeType: GradeType): Grade {
  if (gradeType === 'concept') {
    if (percentage >= CONCEPT_THRESHOLDS.MA) return 'MA';
    if (percentage >= CONCEPT_THRESHOLDS.MPA) return 'MPA';
    return 'MANA';
  }
  return Math.round(percentage) / 10;
}

/** The exam grades are saved as the evaluation of one of the goals of the class. */
export function assertClassGoal(classObj: Class, goal: string): void {
  const goals = classObj.getGoals();
  if (!goals.includes(goal)) {
    throw new DomainError(`Meta inválida: "${goal}". Use uma de: ${goals.join(', ')}`);
  }
}

export interface EnrolledResult {
  result: GradingResult;
  enrollment: Enrollment;
}

/**
 * Separates the results of students enrolled in the class from the others.
 * Students are found by CPF, formatted or not. Changes nothing.
 */
export function splitByEnrollment(
  classObj: Class,
  results: readonly GradingResult[]
): { enrolled: EnrolledResult[]; notInClass: GradingResult[] } {
  const enrolled: EnrolledResult[] = [];
  const notInClass: GradingResult[] = [];

  for (const result of results) {
    const enrollment = classObj.findEnrollmentByStudentCPF(cleanCPF(result.studentId.trim()));
    if (enrollment) {
      enrolled.push({ result, enrollment });
    } else {
      notInClass.push(result);
    }
  }
  return { enrolled, notInClass };
}

/**
 * Saves each student's grade as the evaluation of the given goal, replacing
 * the one the student already had for it.
 */
export function applyGrades(classObj: Class, enrolled: readonly EnrolledResult[], goal: string): void {
  assertClassGoal(classObj, goal);
  const gradeType = classObj.getGradeType();
  for (const { result, enrollment } of enrolled) {
    enrollment.addOrUpdateEvaluation(goal, percentageToGrade(result.percentage, gradeType));
  }
}