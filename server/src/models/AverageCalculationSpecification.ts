import { EVALUATION_GOALS, Grade } from './Evaluation';
import { DomainError } from './DomainError';

type Goal = string;

/**
 * Specifies how a student's average is computed from the grades of the
 * learning goals: each grade (MA, MPA, MANA) is worth a number of points and
 * each goal has a weight. The average is the weighted mean of the points.
 *
 * Instances are immutable.
 */
export class AverageCalculationSpecification {
    private readonly gradeWeights: Map<Grade, number>; // MA, MPA, MANA
    private readonly goalWeights: Map<Goal, number>; // "Configuration Management", "Project Management", etc.
    private readonly goalWeightsSum: number;

    constructor(initialGradeWeights: Map<Grade, number>, initialGoalWeights: Map<Goal, number>) 
    {
        // copies the maps, so that later changes to the arguments have no effect
        this.gradeWeights = new Map(initialGradeWeights);
        this.goalWeights = new Map(initialGoalWeights);

        // precomputes the sum of the goal weights (the denominator)
        this.goalWeightsSum = Array.from(initialGoalWeights).reduce((acc, v) => acc + v[1], 0);

        if (this.goalWeightsSum === 0)
            throw new DomainError("The sum of the goal weights cannot be zero.");
    }

    /**
     * Computes the weighted average of the student's grades.
     * @param gradesByGoal the grade obtained for each goal.
     * @returns the weighted average.
    */
    calculateAverage(gradesByGoal: Map<Goal, Grade>): number 
    {
        let total = 0;

        for (const [goal, grade] of gradesByGoal.entries()) 
        {
            const gradeWeight = this.gradeWeights.get(grade)!;
            const goalWeight = this.goalWeights.get(goal)!;
            total += goalWeight * gradeWeight;
        }

        return total / this.goalWeightsSum;
    }

    // Exports the data in a serializable format
    toJSON() 
    {
        const mapToObject = <K>(map: Map<K, number>) =>
            Object.fromEntries(Array.from(map.entries()) as [any, number][]);

        return {
            gradeWeights: mapToObject(this.gradeWeights),
            goalWeights: mapToObject(this.goalWeights)
        };
    }

    /**
     * Rebuilds an instance from serialized data, accepting the key names and
     * the map encodings used by previous versions of the system, so that data
     * files and payloads written by them are not lost.
     *
     * Falls back to the default specification when the data carries no
     * weights at all.
     */
    static fromJSON(data: any): AverageCalculationSpecification {
        const normalize = (x: any): Map<string, number> => {
            if (!x) return new Map();
            // already an object { key: value, ... }
            if (!Array.isArray(x) && typeof x === 'object') {
            return new Map(Object.entries(x).map(([k, v]) => [k, Number(v)]));
            }
            // legacy formats: array of { key, value } or array of [key, value]
            if (Array.isArray(x)) {
            // array of objects {key, value}
            if (x.length > 0 && typeof x[0] === 'object' && 'key' in x[0]) {
                return new Map(x.map((entry: any) => [entry.key, Number(entry.value)]));
            }
            // array of pairs [key, value]
            return new Map(x.map((entry: any) => [entry[0], Number(entry[1])]));
            }
            // fallback
            return new Map();
        };

        // pesosDosConceitos and pesosDasMetas are the names used before the
        // identifiers of this class were translated to English
        const gradeWeights = normalize(data?.gradeWeights ?? data?.pesosDosConceitos);
        const goalWeights = normalize(data?.goalWeights ?? data?.pesosDasMetas);

        if (goalWeights.size === 0) {
            return DEFAULT_AVERAGE_CALCULATION_SPECIFICATION;
        }

        return new AverageCalculationSpecification(gradeWeights as Map<any, number>, goalWeights as Map<any, number>);
    }

}


const DEFAULT_GRADE_WEIGHTS = new Map<Grade, number>([
  ['MA', 10],
  ['MPA', 7],
  ['MANA', 0],
]);

// Every evaluation goal has the same weight by default
const DEFAULT_GOAL_WEIGHTS = new Map<Goal, number>(EVALUATION_GOALS.map(goal => [goal, 1]));

export const DEFAULT_AVERAGE_CALCULATION_SPECIFICATION = new AverageCalculationSpecification(
  DEFAULT_GRADE_WEIGHTS,
  DEFAULT_GOAL_WEIGHTS
);
