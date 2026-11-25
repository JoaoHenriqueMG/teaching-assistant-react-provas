import { Student } from './Student';
import { DomainError } from './DomainError';

/**
 * The registered students, with at most one student per CPF.
 * Lookups expect a clean CPF (11 digits), as stored by Student.
 */
export class StudentSet {
  private students: Student[] = [];

  constructor() {
    // StudentSet is now independent of persistence
  }

  // Add a new student
  addStudent(student: Student): Student {
    // Check if CPF already exists (the student stores a clean CPF)
    if (this.findStudentByCPF(student.getCPF())) {
      throw new DomainError('Student with this CPF already exists');
    }

    this.students.push(student);
    return student;
  }

  // Remove student by CPF (expects clean CPF)
  removeStudent(cpf: string): boolean {
    const index = this.students.findIndex(s => s.getCPF() === cpf);
    
    if (index === -1) {
      return false;
    }

    this.students.splice(index, 1);
    return true;
  }

  // Update student by CPF
  updateStudent(updatedStudent: Student): Student {
    const existingStudent = this.findStudentByCPF(updatedStudent.getCPF());
    
    if (!existingStudent) {
      throw new DomainError('Student not found');
    }

    // Update basic fields only (the CPF is the identifier and never changes)
    existingStudent.updateWith(updatedStudent);
    return existingStudent;
  }

  // Find student by CPF (expects clean CPF)
  findStudentByCPF(cpf: string): Student | undefined {
    return this.students.find(s => s.getCPF() === cpf);
  }

  // Get all students
  getAllStudents(): Student[] {
    return [...this.students]; // Return a copy to prevent external modification
  }

  // Get students count
  getCount(): number {
    return this.students.length;
  }
}