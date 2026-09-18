/**
 * Utilities for the Brazilian CPF identifier, as shown by the interface:
 * 11 digits formatted as 000.000.000-00.
 */

/**
 * Formats what the user typed as a CPF, keeping only digits and adding the
 * dots and hyphen once all 11 digits are there. Extra digits are dropped.
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
