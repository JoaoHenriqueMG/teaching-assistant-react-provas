import { cleanCPF, formatCPF, isCleanCPFValid } from './CPF';

export class Student {
  constructor(
    public name: string,
    public cpf: string,
    public email: string
  ) {
    this.cpf = cleanCPF(cpf); // Store only clean CPF internally
    this.validateCPF(this.cpf);
    this.validateEmail(email);
  }

  private validateCPF(cleanCPF: string): void {
    if (!isCleanCPFValid(cleanCPF)) {
      throw new Error('Invalid CPF format');
    }
  }

  private validateEmail(email: string): void {
    // Check for empty or whitespace-only strings
    if (!email || email.trim().length === 0) {
      throw new Error('Invalid email format');
    }

    // Check for any whitespace in the email (including leading/trailing)
    if (email !== email.trim() || /\s/.test(email)) {
      throw new Error('Invalid email format');
    }

    // More comprehensive email validation regex
    // Requirements:
    // - Local part: alphanumeric, dots, hyphens, underscores, plus signs (not starting/ending with dot)
    // - @ symbol required
    // - Domain: alphanumeric, hyphens (not starting/ending with hyphen), dots between labels
    // - TLD: at least 2 characters
    const emailRegex = /^[a-zA-Z0-9]+([._+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Additional checks for edge cases
    if (email.includes('..') || email.includes('@.') || email.includes('.@')) {
      throw new Error('Invalid email format');
    }

    // Check for hyphen at start or end of domain parts
    const domainPart = email.split('@')[1];
    if (domainPart && (domainPart.startsWith('-') || domainPart.includes('.-') || domainPart.includes('-.'))) {
      throw new Error('Invalid email format');
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