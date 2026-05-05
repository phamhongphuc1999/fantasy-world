export function sortStableDescByScore<T extends { score: number; cellId: number }>(items: T[]) {
  items.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.cellId - right.cellId;
  });
  return items;
}

export function findMaxBy<T>(items: T[], toScore: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined;
  let best = items[0] as T;
  let bestScore = toScore(best);
  for (let index = 1; index < items.length; index += 1) {
    const candidate = items[index] as T;
    const candidateScore = toScore(candidate);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }
  return best;
}
