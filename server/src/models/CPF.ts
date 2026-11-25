/**
 * Utilities for the Brazilian CPF identifier.
 *
 * Internally the system stores a CPF as its 11 digits ("clean" form) and
 * shows it formatted as 000.000.000-00.
 */

/**
 * Removes the dots and hyphen of a formatted CPF.
 * Other characters are deliberately kept so that malformed input is still
 * rejected by {@link isCleanCPFValid}.
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/[.-]/g, '');
}

/** Formats a clean CPF (11 digits) as 000.000.000-00. */
export function formatCPF(cleanCPF: string): string {
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** A clean CPF is valid when it consists of exactly 11 digits. */
export function isCleanCPFValid(cleanCPF: string): boolean {
  return cleanCPF.length === 11 && /^\d+$/.test(cleanCPF);
}
