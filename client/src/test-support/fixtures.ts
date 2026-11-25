import { Class } from '../types/Class';
import { Student } from '../types/Student';

export const ana: Student = { name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' };
export const bruno: Student = { name: 'Bruno Melo', cpf: '987.654.321-00', email: 'bruno@cin.ufpe.br' };

export const softwareEngineering: Class = {
  id: 'Software Engineering-2025-1',
  topic: 'Software Engineering',
  semester: 1,
  year: 2025,
  averageCalculationSpecification: { gradeWeights: { MA: 10, MPA: 7, MANA: 0 }, goalWeights: { Design: 1 } },
  enrollments: [{ student: ana, evaluations: [{ goal: 'Design', grade: 'MPA' }] }]
};

export const databases: Class = {
  ...softwareEngineering,
  id: 'Databases-2024-2',
  topic: 'Databases',
  semester: 2,
  year: 2024,
  enrollments: []
};
