/** Factorial as a BigInt (the number of exam variants grows very fast). */
export function factorial(n: number): bigint {
  let result = BigInt(1);
  for (let i = 2; i <= n; i++) result *= BigInt(i);
  return result;
}

/**
 * The permutation of [0..size-1] with the given rank in lexicographic order
 * (rank 0 is the identity). Requires 0 <= rank < size!.
 */
export function unrankPermutation(size: number, rank: bigint): number[] {
  const available = Array.from({ length: size }, (_, i) => i);
  const result: number[] = [];
  let remaining = rank;
  for (let i = size; i > 0; i--) {
    const block = factorial(i - 1);
    const index = Number(remaining / block);
    remaining = remaining % block;
    result.push(available.splice(index, 1)[0]);
  }
  return result;
}

/** Fisher–Yates shuffle, in place. */
export function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** A uniformly (enough) distributed BigInt in [0, limit), built from random() draws. */
export function randomBelow(limit: bigint, random: () => number): bigint {
  const chunks = Math.ceil(limit.toString(2).length / 30) + 2; // 2 spare chunks make the modulo bias negligible
  let value = BigInt(0);
  for (let i = 0; i < chunks; i++) {
    value = (value << BigInt(30)) | BigInt(Math.floor(random() * 2 ** 30));
  }
  return value % limit;
}
