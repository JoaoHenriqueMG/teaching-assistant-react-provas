/** The grades a student can get for a learning goal, from worst to best. */
export const GRADES = ['MANA', 'MPA', 'MA'] as const;

export type Grade = typeof GRADES[number];

export interface Evaluation {
  goal: string;
  grade: Grade;
}

/** The learning goals graded in every class (same list as the server's). */
export const EVALUATION_GOALS = [
  'Requirements',
  'Configuration Management', 
  'Project Management',
  'Design',
  'Tests',
  'Refactoring'
] as const;

export type EvaluationGoal = typeof EVALUATION_GOALS[number];