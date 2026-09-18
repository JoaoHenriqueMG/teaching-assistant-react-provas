import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonFileRepository } from '../persistence/JsonFileRepository';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { AverageCalculationSpecification } from '../models/AverageCalculationSpecification';

/**
 * Data files written before the average specification and the enrollment
 * fields were renamed to English must still be readable: they hold the data
 * of whoever was using the system, and loading them incompletely would lose
 * it as soon as the state is saved again.
 *
 * src/__tests__/legacy/app-data-2025.json is a verbatim copy of the file the
 * previous version produced.
 */
describe('Data files written by the previous version', () => {
  let directory: string;
  let filePath: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ta-legacy-'));
    filePath = path.join(directory, 'app-data.json');
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const load = (content: unknown) => {
    fs.writeFileSync(filePath, JSON.stringify(content));
    const students = new StudentSet();
    const classes = new Classes();
    new JsonFileRepository(filePath).load(students, classes);
    return { students, classes };
  };

  test('are loaded whole: students, classes, enrollments and evaluations', () => {
    const legacy = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'legacy/app-data-2025.json'), 'utf-8'));
    const { students, classes } = load(legacy);

    expect(students.getCount()).toBe(legacy.students.length);
    expect(classes.getCount()).toBe(legacy.classes.length);

    const firstLegacyClass = legacy.classes[0];
    const firstClass = classes.findClassById(
      `${firstLegacyClass.topic}-${firstLegacyClass.year}-${firstLegacyClass.semester}`
    );
    expect(firstClass).toBeDefined();
    expect(firstClass!.getEnrollments()).toHaveLength(firstLegacyClass.enrollments.length);

    const legacyEnrollment = firstLegacyClass.enrollments[0];
    const enrollment = firstClass!.findEnrollmentByStudentCPF(legacyEnrollment.studentCPF);
    expect(enrollment).toBeDefined();
    expect(enrollment!.getEvaluations().map(e => e.toJSON())).toEqual(legacyEnrollment.evaluations);
  });

  test('keep the weights of their average specification, under the previous key names', () => {
    const { classes } = load({
      students: [],
      classes: [{
        topic: 'SE',
        semester: 1,
        year: 2025,
        especificacaoDoCalculoDaMedia: {
          pesosDosConceitos: { MA: 10, MPA: 7, MANA: 0 },
          pesosDasMetas: { Design: 3, Tests: 1 }
        },
        enrollments: []
      }]
    });

    const specification = classes.findClassById('SE-2025-1')!.getAverageCalculationSpecification();
    expect(specification.toJSON()).toEqual({
      gradeWeights: { MA: 10, MPA: 7, MANA: 0 },
      goalWeights: { Design: 3, Tests: 1 }
    });
    expect(specification.calculateAverage(new Map([['Design', 'MA'], ['Tests', 'MPA']])))
      .toBeCloseTo((3 * 10 + 1 * 7) / 4);
  });

  test('keep the enrollment averages and absence status, under the previous key names', () => {
    const { classes } = load({
      students: [{ name: 'Ana Lima', cpf: '12345678901', email: 'ana@cin.ufpe.br' }],
      classes: [{
        topic: 'SE',
        semester: 1,
        year: 2025,
        especificacaoDoCalculoDaMedia: { pesosDosConceitos: { MA: 10 }, pesosDasMetas: { Design: 1 } },
        enrollments: [{
          studentCPF: '12345678901',
          evaluations: [],
          mediaPreFinal: 7.5,
          mediaPosFinal: 8,
          reprovadoPorFalta: true
        }]
      }]
    });

    const enrollment = classes.findClassById('SE-2025-1')!.getEnrollments()[0];
    expect(enrollment.getAverageBeforeFinalExam()).toBe(7.5);
    expect(enrollment.getAverageAfterFinalExam()).toBe(8);
    expect(enrollment.getFailedByAbsence()).toBe(true);
  });

  test('a class whose specification is missing altogether still loads, with the default one', () => {
    const { classes } = load({
      students: [],
      classes: [{ topic: 'SE', semester: 1, year: 2025, enrollments: [] }]
    });
    expect(classes.getCount()).toBe(1);
  });
});

describe('AverageCalculationSpecification.fromJSON', () => {
  test('reads the previous key names', () => {
    const specification = AverageCalculationSpecification.fromJSON({
      pesosDosConceitos: { MA: 10, MPA: 7, MANA: 0 },
      pesosDasMetas: { Design: 1 }
    });
    expect(specification.toJSON()).toEqual({ gradeWeights: { MA: 10, MPA: 7, MANA: 0 }, goalWeights: { Design: 1 } });
  });

  test('falls back to the default specification when there is nothing to read', () => {
    for (const data of [undefined, null, {}]) {
      expect(() => AverageCalculationSpecification.fromJSON(data)).not.toThrow();
      expect(Object.keys(AverageCalculationSpecification.fromJSON(data).toJSON().goalWeights).length)
        .toBeGreaterThan(0);
    }
  });
});
