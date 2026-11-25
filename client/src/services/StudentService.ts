import { Student, CreateStudentRequest, UpdateStudentRequest } from '../types/Student';
import { get, remove, sendJson } from './apiClient';

const STUDENTS = '/api/students';
const studentPath = (cpf: string) => `${STUDENTS}/${encodeURIComponent(cpf)}`;

/** Access to the students kept by the server. */
export const studentService = {
  getAllStudents: (): Promise<Student[]> =>
    get(STUDENTS, 'Failed to fetch students'),

  getStudentByCPF: (cpf: string): Promise<Student> =>
    get(studentPath(cpf), 'Failed to fetch student'),

  createStudent: (student: CreateStudentRequest): Promise<Student> =>
    sendJson('POST', STUDENTS, student, 'Failed to create student'),

  /** Updates name and email; the CPF identifies the student and cannot change. */
  updateStudent: (cpf: string, updates: UpdateStudentRequest): Promise<Student> =>
    sendJson('PUT', studentPath(cpf), updates, 'Failed to update student'),

  deleteStudent: (cpf: string): Promise<void> =>
    remove(studentPath(cpf), 'Failed to delete student'),

  /**
   * @deprecated the server no longer offers PUT /api/students/:cpf/evaluation;
   * evaluations belong to enrollments (see enrollmentService.updateEvaluation).
   */
  updateEvaluation: (cpf: string, goal: string, grade: string): Promise<Student> =>
    sendJson('PUT', `${studentPath(cpf)}/evaluation`, { goal, grade }, 'Failed to update evaluation')
};
