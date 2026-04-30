import { MAP_GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { hashSeed } from 'src/services/map/seededRandom';
import { TMapCell } from 'src/types/global';
import { getBoundaryStepCost, isLand } from './shared';

function getProvinceTargetCount(cells: TMapCell[]) {
  const plainsCount = cells.filter(
    (cell) => cell.terrain === 'plains' || cell.terrain === 'valley'
  ).length;
  const base = Math.max(1, Math.floor(cells.length / 170));
  const plainsBonus = Math.floor((plainsCount / Math.max(1, cells.length)) * 9);
  return Math.max(1, base + plainsBonus);
}

function getProvinceSeedScore(cell: TMapCell) {
  if (!isLand(cell)) return -1000;
  if (cell.terrain === 'plains') return 7 + cell.suitability * 2;
  if (cell.terrain === 'valley') return 6.5 + cell.suitability * 2;
  if (cell.terrain === 'coast') return 5.2 + cell.suitability * 1.8;
  if (cell.terrain === 'forest') return 3.5 + cell.suitability;
  if (cell.terrain === 'hills' || cell.terrain === 'plateau') return 1.8 + cell.suitability * 0.8;
  if (cell.terrain === 'mountains' || cell.terrain === 'desert' || cell.terrain === 'volcanic')
    return -4;
  return 1.2 + cell.suitability * 0.8;
}

function assignNationProvincesBySeeds(
  cells: TMapCell[],
  owner: Int32Array,
  nationId: number,
  seeds: number[],
  provinceOwner: Int32Array,
  startProvinceId: number,
  noiseHash: number
) {
  const profile = MAP_GEOPOLITICAL_CONFIG.borderLevels.province;
  const localCost = new Float64Array(cells.length);
  localCost.fill(Number.POSITIVE_INFINITY);
  const frontier: Array<{ cellId: number; provinceId: number; cost: number }> = [];

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const cellId = seeds[seedIndex];
    const provinceId = startProvinceId + seedIndex;
    provinceOwner[cellId] = provinceId;
    localCost[cellId] = 0;
    frontier.push({ cellId, provinceId, cost: 0 });
  }

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift() as { cellId: number; provinceId: number; cost: number };
    if (current.cost > localCost[current.cellId]) continue;

    for (const neighborId of cells[current.cellId].neighbors) {
      if (owner[neighborId] !== nationId) continue;
      if (!isLand(cells[neighborId])) continue;

      const step = getBoundaryStepCost(
        cells,
        provinceOwner,
        current.cellId,
        neighborId,
        current.provinceId,
        noiseHash,
        profile
      );

      const nextCost = current.cost + Math.max(0.25, step);
      if (nextCost < localCost[neighborId]) {
        localCost[neighborId] = nextCost;
        provinceOwner[neighborId] = current.provinceId;
        frontier.push({ cellId: neighborId, provinceId: current.provinceId, cost: nextCost });
      }
    }
  }
}

export function buildNationProvinces(cells: TMapCell[], owner: Int32Array, seed: string) {
  const provinceOwner = new Int32Array(cells.length);
  provinceOwner.fill(-1);
  let nextProvinceId = 0;
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);

  for (const nationId of nationIds) {
    const nationCells = cells.filter((cell) => isLand(cell) && owner[cell.id] === nationId);
    if (nationCells.length === 0) continue;

    const scored = nationCells
      .map((cell) => ({ cellId: cell.id, score: getProvinceSeedScore(cell) }))
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) continue;

    const seeds: number[] = [];
    const initialTarget = getProvinceTargetCount(nationCells);
    for (const entry of scored) {
      if (seeds.length >= initialTarget) break;
      const candidate = cells[entry.cellId];
      const requiredDistance =
        candidate.terrain === 'plains' || candidate.terrain === 'valley' ? 42 : 72;
      const tooClose = seeds.some((seedCellId) => {
        const seedCell = cells[seedCellId];
        return (
          Math.hypot(candidate.site[0] - seedCell.site[0], candidate.site[1] - seedCell.site[1]) <
          requiredDistance
        );
      });
      if (tooClose) continue;
      seeds.push(entry.cellId);
    }
    if (seeds.length === 0) seeds.push(scored[0].cellId);

    const nationStartProvinceId = nextProvinceId;
    const noiseHash = hashSeed(`${seed}:province:${nationId}`);

    for (let splitIteration = 0; splitIteration < 8; splitIteration += 1) {
      for (const cell of nationCells) {
        provinceOwner[cell.id] = -1;
      }

      assignNationProvincesBySeeds(
        cells,
        owner,
        nationId,
        seeds,
        provinceOwner,
        nationStartProvinceId,
        noiseHash
      );

      const provinceToCells = new Map<number, number[]>();
      for (const cell of nationCells) {
        const provinceId = provinceOwner[cell.id];
        if (provinceId < 0) continue;
        if (!provinceToCells.has(provinceId)) provinceToCells.set(provinceId, []);
        (provinceToCells.get(provinceId) as number[]).push(cell.id);
      }

      let addedSeed = false;
      for (const [provinceId, provinceCells] of provinceToCells) {
        const share = provinceCells.length / nationCells.length;
        const plainsCount = provinceCells.filter((cellId) => {
          const terrain = cells[cellId].terrain;
          return terrain === 'plains' || terrain === 'valley' || terrain === 'coast';
        }).length;
        const plainsShare = plainsCount / Math.max(1, provinceCells.length);
        const maxShare = plainsShare >= 0.45 ? 0.15 : 0.25;
        if (share <= maxShare) continue;

        const seedCellId = seeds[provinceId - nationStartProvinceId];
        let farthestCellId = seedCellId;
        let farthestDistance = -1;
        for (const cellId of provinceCells) {
          const distance = Math.hypot(
            cells[cellId].site[0] - cells[seedCellId].site[0],
            cells[cellId].site[1] - cells[seedCellId].site[1]
          );
          if (distance > farthestDistance) {
            farthestDistance = distance;
            farthestCellId = cellId;
          }
        }

        const tooClose = seeds.some((existingSeedId) => {
          if (existingSeedId === seedCellId) return false;
          return (
            Math.hypot(
              cells[existingSeedId].site[0] - cells[farthestCellId].site[0],
              cells[existingSeedId].site[1] - cells[farthestCellId].site[1]
            ) < 26
          );
        });
        if (tooClose) continue;

        seeds.push(farthestCellId);
        addedSeed = true;
        break;
      }
      if (!addedSeed) break;
    }
    nextProvinceId = nationStartProvinceId + seeds.length;
  }
  return provinceOwner;
}

export function enforceProvinceContiguity(
  cells: TMapCell[],
  owner: Int32Array,
  provinceOwner: Int32Array
) {
  const provinceIds = Array.from(new Set(provinceOwner)).filter((provinceId) => provinceId >= 0);
  for (const provinceId of provinceIds) {
    const provinceCells = cells.filter(
      (cell) => isLand(cell) && provinceOwner[cell.id] === provinceId
    );
    if (provinceCells.length <= 1) continue;
    const nationId = owner[provinceCells[0].id];

    const visited = new Set<number>();
    const components: number[][] = [];
    for (const cell of provinceCells) {
      if (visited.has(cell.id)) continue;
      const queue = [cell.id];
      const component: number[] = [];
      visited.add(cell.id);
      while (queue.length > 0) {
        const current = queue.pop() as number;
        component.push(current);
        for (const neighborId of cells[current].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          if (provinceOwner[neighborId] !== provinceId) continue;
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
      components.push(component);
    }

    if (components.length <= 1) continue;
    components.sort((a, b) => b.length - a.length);

    for (let index = 1; index < components.length; index += 1) {
      for (const cellId of components[index]) {
        const neighborCounts = new Map<number, number>();
        for (const neighborId of cells[cellId].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          const candidateProvinceId = provinceOwner[neighborId];
          if (candidateProvinceId < 0 || candidateProvinceId === provinceId) continue;
          neighborCounts.set(
            candidateProvinceId,
            (neighborCounts.get(candidateProvinceId) || 0) + 1
          );
        }
        let bestProvinceId = provinceId;
        let bestCount = -1;
        for (const [candidateProvinceId, count] of neighborCounts) {
          if (count > bestCount) {
            bestCount = count;
            bestProvinceId = candidateProvinceId;
          }
        }
        provinceOwner[cellId] = bestProvinceId;
      }
    }
  }
}
