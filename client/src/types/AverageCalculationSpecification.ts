import { Grade } from './Evaluation';

/**
 * How a class computes a student's average, as sent by the server: points
 * per grade and weight per learning goal (plain objects, since Maps do not
 * survive JSON).
 */
export interface AverageCalculationSpecification {
  gradeWeights: Record<Grade, number>;
  goalWeights: Record<string, number>;
}
