/** The grades a student can get for a learning goal, from worst to best. */
export const GRADES = ['MANA', 'MPA', 'MA'] as const;

export type ConceptGrade = typeof GRADES[number];

export type Grade = ConceptGrade | number;

/** Type guard: checks if value is a valid concept ('MANA' | 'MPA' | 'MA'). */
export function isConceptGrade(value: unknown): value is ConceptGrade {
  return (GRADES as readonly unknown[]).includes(value);
}

/** Type guard: checks if value is a valid numeric grade (0 to 10). */
export function isNumericGrade(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
}

/** Type guard: tells whether an arbitrary value is one of the known grades. */
export function isGrade(value: unknown): value is Grade {
  return (GRADES as readonly unknown[]).includes(value);
}

/** The grade a student got for one learning goal of a class. */
export class Evaluation {
  private goal: string;
  private grade: Grade;

  constructor(goal: string, grade: Grade) {
    this.goal = goal;
    this.grade = grade;
  }

  public getGoal(): string {
    return this.goal;
  }

  public getGrade(): Grade {
    return this.grade;
  }

  public setGrade(grade: Grade): void {
    this.grade = grade;
  }

  public toJSON() {
    return {
      goal: this.goal,
      grade: this.grade
    };
  }

  // Create Evaluation from JSON object
  public static fromJSON(data: { goal: string; grade: Grade }): Evaluation {
    return new Evaluation(data.goal, data.grade);
  }
}

/** The learning goals graded in every class. */
export const EVALUATION_GOALS = [
  'Requirements',
  'Configuration Management', 
  'Project Management',
  'Design',
  'Tests',
  'Refactoring'
] as const;