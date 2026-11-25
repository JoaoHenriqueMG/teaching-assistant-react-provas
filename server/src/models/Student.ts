import { cleanCPF, formatCPF, isCleanCPFValid } from './CPF';
import { DomainError } from './DomainError';

/**
 * A student, identified by CPF. The CPF is stored clean (11 digits) and
 * never changes; name and email can be updated.
 */
export class Student {
  private name: string;
  private readonly cpf: string;
  private email: string;

  constructor(name: string, cpf: string, email: string) {
    this.cpf = cleanCPF(cpf); // Store only clean CPF internally
    this.validateCPF(this.cpf);
    this.validateEmail(email);
    this.name = name;
    this.email = email;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  /** Copies the mutable data (name and email) from another student. */
  updateWith(other: Student): void {
    this.name = other.name;
    this.email = other.email;
  }

  private validateCPF(cleanCPF: string): void {
    if (!isCleanCPFValid(cleanCPF)) {
      throw new DomainError('Invalid CPF format');
    }
  }

  private validateEmail(email: string): void {
    // Check for empty or whitespace-only strings
    if (!email || email.trim().length === 0) {
      throw new DomainError('Invalid email format');
    }

    // Check for any whitespace in the email (including leading/trailing)
    if (email !== email.trim() || /\s/.test(email)) {
      throw new DomainError('Invalid email format');
    }

    // More comprehensive email validation regex
    // Requirements:
    // - Local part: alphanumeric, dots, hyphens, underscores, plus signs (not starting/ending with dot)
    // - @ symbol required
    // - Domain: alphanumeric, hyphens (not starting/ending with hyphen), dots between labels
    // - TLD: at least 2 characters
    const emailRegex = /^[a-zA-Z0-9]+([._+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      throw new DomainError('Invalid email format');
    }

    // Additional checks for edge cases
    if (email.includes('..') || email.includes('@.') || email.includes('.@')) {
      throw new DomainError('Invalid email format');
    }

    // Check for hyphen at start or end of domain parts
    const domainPart = email.split('@')[1];
    if (domainPart && (domainPart.startsWith('-') || domainPart.includes('.-') || domainPart.includes('-.'))) {
      throw new DomainError('Invalid email format');
    }
  }

  // Format CPF for display (000.000.000-00)
  getFormattedCPF(): string {
    return formatCPF(this.cpf);
  }

  // Get CPF (stored clean internally)
  getCPF(): string {
    return this.cpf;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      name: this.name,
      cpf: this.getFormattedCPF(),
      email: this.email
    };
  }
}