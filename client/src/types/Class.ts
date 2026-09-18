import { AverageCalculationSpecification } from './AverageCalculationSpecification';
import { Enrollment } from './Enrollment';

export interface Class {
  id: string;
  topic: string;
  semester: number;
  year: number;
  averageCalculationSpecification: AverageCalculationSpecification;
  enrollments: Enrollment[];
}

/** Fields a client provides to create or update a class (the server assigns the default average specification). */
export interface CreateClassRequest {
  topic: string;
  semester: number;
  year: number;
}

export interface UpdateClassRequest {
  topic?: string;
  semester?: number;
  year?: number;
}

// Helper function to generate class ID
export const getClassId = (classObj: { topic: string; year: number; semester: number }): string => {
  return `${classObj.topic}-${classObj.year}-${classObj.semester}`;
};
