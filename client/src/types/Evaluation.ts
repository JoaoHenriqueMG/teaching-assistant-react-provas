/** The grades a student can get for a learning goal, from worst to best. */
export const GRADES = ['MANA', 'MPA', 'MA'] as const;

export const NUMERIC_GRADE_MIN = 0;
export const NUMERIC_GRADE_MAX = 10;

export type ConceptGrade = typeof GRADES[number];

export type Grade = ConceptGrade | number;

export interface Evaluation {
  goal: string;
  grade: Grade;
}

/** The learning goals graded in every class (same list as the server's). */
export const DEFAULT_EVALUATION_GOALS = [
  'Requirements',
  'Configuration Management', 
  'Project Management',
  'Design',
  'Tests',
  'Refactoring'
] as const;

export type EvaluationGoal = typeof DEFAULT_EVALUATION_GOALS[number];

/** The colour band of a grade, as a CSS class suffix shared by concept and */
export function gradeBand(grade: Grade | string | undefined | null): 'ma' | 'mpa' | 'mana' | '' {
  if (grade === undefined || grade === null || grade === '') return '';
  if (typeof grade === 'string' && (GRADES as readonly string[]).includes(grade)) {
    return grade.toLowerCase() as 'ma' | 'mpa' | 'mana';
  }
  const value = Number(grade);
  if (!Number.isFinite(value)) return '';
  if (value >= 7) return 'ma';
  if (value >= 5) return 'mpa';
  return 'mana';
}

/** A grade as shown: concepts as they are, numbers with one decimal place (8.7, 10.0). */
export const formatGrade = (grade: Grade | string): string =>
  typeof grade === 'number' ? grade.toFixed(1) : grade;
