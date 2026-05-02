import { TDeterministicMinHeap } from './heap';

type TExpandOptions<TState> = {
  seeds: TState[];
  getPriority: (state: TState) => number;
  isStale: (state: TState) => boolean;
  expand: (state: TState, push: (next: TState) => void) => void;
};

export function runMultiSourceExpansion<TState>({
  seeds,
  getPriority,
  isStale,
  expand,
}: TExpandOptions<TState>) {
  const frontier = new TDeterministicMinHeap<TState>();

  for (const seedState of seeds) {
    frontier.push(seedState, getPriority(seedState));
  }

  while (frontier.size > 0) {
    const current = frontier.pop();
    if (current === undefined) break;
    if (isStale(current)) continue;
    expand(current, (next) => {
      frontier.push(next, getPriority(next));
    });
  }
}
