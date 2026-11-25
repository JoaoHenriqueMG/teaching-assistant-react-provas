/** An item together with its position in a ranking. */
export interface Ranked<T> {
  item: T;
  rank: number; // 1 is the best
}

/**
 * Ranks items by score, highest first. Items with the same score share the
 * same rank and the next rank is skipped (1, 2, 2, 4: "competition ranking").
 *
 * It knows nothing about students or grades: the caller says how to read an
 * item's score, so the same function serves the result of an auto-grading, a
 * list of enrollments or anything else that has to be ordered.
 *
 * @param tieBreak optional order among items with the same score, e.g. by name;
 *                 it does not change their shared rank
 */
export function rank<T>(
  items: readonly T[],
  scoreOf: (item: T) => number,
  tieBreak?: (a: T, b: T) => number
): Ranked<T>[] {
  const sorted = [...items].sort((a, b) => scoreOf(b) - scoreOf(a) || (tieBreak ? tieBreak(a, b) : 0));

  const ranked: Ranked<T>[] = [];
  sorted.forEach((item, index) => {
    const previous = ranked[index - 1];
    const sameScoreAsPrevious = previous !== undefined && scoreOf(previous.item) === scoreOf(item);
    ranked.push({ item, rank: sameScoreAsPrevious ? previous.rank : index + 1 });
  });
  return ranked;
}