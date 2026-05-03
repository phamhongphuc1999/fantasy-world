import { TMapCell } from 'src/types/map.types';

export function collectConnectedComponents(
  cells: TMapCell[],
  shouldInclude: (cell: TMapCell) => boolean,
  canTraverse: (current: TMapCell, neighbor: TMapCell) => boolean,
  sortBySizeDesc = false
) {
  const visited = new Uint8Array(cells.length);
  const components: number[][] = [];
  const stack: number[] = [];

  for (const cell of cells) {
    if (visited[cell.id] === 1) continue;
    if (!shouldInclude(cell)) continue;

    stack.length = 0;
    stack.push(cell.id);
    const component: number[] = [];
    visited[cell.id] = 1;

    while (stack.length > 0) {
      const currentId = stack.pop() as number;
      const current = cells[currentId];
      component.push(currentId);

      for (const neighborId of current.neighbors) {
        if (visited[neighborId] === 1) continue;
        const neighbor = cells[neighborId];
        if (!shouldInclude(neighbor)) continue;
        if (!canTraverse(current, neighbor)) continue;
        visited[neighborId] = 1;
        stack.push(neighborId);
      }
    }
    components.push(component);
  }
  if (sortBySizeDesc) components.sort((a, b) => b.length - a.length);
  return components;
}
