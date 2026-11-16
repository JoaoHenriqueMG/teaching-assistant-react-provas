import { AverageCalculationSpecification } from './AverageCalculationSpecification';
import { Enrollment } from './Enrollment';

// types/Class.ts
export type GradeType = 'concept' | 'numeric';

export interface Class {
  id: string;
  topic: string;
  semester: number;
  year: number;
  gradeType: GradeType;
  averageCalculationSpecification: AverageCalculationSpecification;
  enrollments: Enrollment[];
}

/** Fields a client provides to create or update a class (the server assigns the default average specification). */
export interface CreateClassRequest {
  topic: string;
  semester: number;
  year: number;
  gradeType: GradeType;
}

export interface UpdateClassRequest {
  topic?: string;
  semester?: number;
  year?: number;
  gradeType?: GradeType;
}

/** Computes a class id the way the server does; prefer the id the server sends with each class. */
export const getClassId = (classObj: { topic: string; year: number; gradeType: GradeType; semester: number }): string => {
  return `${classObj.topic}-${classObj.year}-${classObj.semester}`;
};
