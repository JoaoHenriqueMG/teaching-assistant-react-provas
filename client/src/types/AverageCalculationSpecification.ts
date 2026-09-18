export type Grade = 'MANA' | 'MPA' | 'MA';
type Goal = string;

export interface AverageCalculationSpecification {
    gradeWeights: Map<Grade, number>;
    goalWeights: Map<Goal, number>;
}

// TODO: Check, after the integration with 'Creation and Maintenance of Goals',
// whether a default value for goalWeights is still needed
export const DEFAULT_AVERAGE_CALCULATION_SPECIFICATION: AverageCalculationSpecification = {
    gradeWeights: new Map<Grade, number>([
        ['MA', 10],
        ['MPA', 7],
        ['MANA', 4],
    ]),
    goalWeights: new Map<Goal, number>([ 
        ['Requirements', 1],
        ['Configuration Management', 1], 
        ['Project Management', 1],
        ['Design', 1],
        ['Tests', 1],
        ['Refactoring', 1]
    ]),
};
