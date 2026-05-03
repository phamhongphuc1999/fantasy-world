export function sortStableDescByScore<T extends { score: number; cellId: number }>(items: T[]) {
  items.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.cellId - right.cellId;
  });
  return items;
}
