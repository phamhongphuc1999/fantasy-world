import { createSeededRandom } from 'src/services/map/seededRandom';
import { TMapMeshWithDelaunay, TTerrainBand } from 'src/types/global';

interface TBuildPopulationOptions {
  mesh: TMapMeshWithDelaunay;
  seed: string;
}

function terrainBaseWeight(terrain: TTerrainBand) {
  if (terrain === 'deep-water' || terrain === 'shallow-water' || terrain === 'inland-sea') return 0;
  if (terrain === 'lake') return 0;
  if (terrain === 'plains') return 1;
  if (terrain === 'valley') return 0.9;
  if (terrain === 'coast') return 0.85;
  if (terrain === 'forest') return 0.6;
  if (terrain === 'swamp') return 0.3;
  if (terrain === 'hills') return 0.42;
  if (terrain === 'plateau') return 0.38;
  if (terrain === 'mountains' || terrain === 'volcanic') return 0.2;
  if (terrain === 'desert' || terrain === 'badlands') return 0.1;
  if (terrain === 'tundra') return 0.16;
  return 0.4;
}

function terrainCityFactor(terrain: TTerrainBand) {
  if (terrain === 'plains' || terrain === 'valley') return 1;
  if (terrain === 'coast') return 0.92;
  if (terrain === 'forest') return 0.7;
  if (terrain === 'hills') return 0.45;
  if (terrain === 'swamp') return 0.32;
  if (terrain === 'mountains' || terrain === 'volcanic') return 0.16;
  if (terrain === 'desert' || terrain === 'badlands') return 0.14;
  if (terrain === 'plateau') return 0.3;
  if (terrain === 'tundra') return 0.2;
  return 0.4;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function populationMultiplier(
  cell: TMapMeshWithDelaunay['cells'][number],
  cells: TMapMeshWithDelaunay['cells']
) {
  if (cell.terrain === 'plains') {
    const nearWater = cell.neighbors.some((neighborId) => cells[neighborId]?.isWater);
    return nearWater ? 15 : 10;
  }
  if (cell.terrain === 'coast') return 9;
  if (cell.terrain === 'valley') return 10;
  if (cell.terrain === 'swamp') return 2;
  if (cell.terrain === 'hills') return 3;
  return 1;
}

export function buildPopulation({ mesh, seed }: TBuildPopulationOptions): TMapMeshWithDelaunay {
  const cells = mesh.cells;
  const random = createSeededRandom(`${seed}:population`);
  const score = new Float64Array(cells.length);

  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    const cell = cells[cellId];
    if (cell.isWater) {
      score[cellId] = 0;
      continue;
    }

    let value = terrainBaseWeight(cell.terrain);
    if (cell.terrain === 'coast') value += 0.3;
    if (cell.isRiver) value += 0.24;
    if (cell.isLake) value += 0.2;

    let waterAdj = 0;
    let riverAdj = 0;
    for (const neighborId of cell.neighbors) {
      const neighbor = cells[neighborId];
      if (neighbor.isWater) waterAdj += 0.08;
      if (neighbor.isRiver || neighbor.isLake) riverAdj += 0.06;
    }

    value += Math.min(0.34, waterAdj) + Math.min(0.24, riverAdj);
    value *= 0.75 + cell.suitability * 0.55;
    value *= 0.86 + random() * 0.28;
    score[cellId] = Math.max(0, value);
  }

  const urbanCandidates = cells
    .map((cell) => ({
      id: cell.id,
      score:
        cell.isWater || cell.terrain === 'mountains' || cell.terrain === 'desert'
          ? -1
          : score[cell.id] + cell.suitability * 0.6,
    }))
    .filter((entry) => entry.score > 0.25)
    .sort((a, b) => b.score - a.score);

  const landCellCount = cells.filter((cell) => !cell.isWater).length;
  const cityCount = Math.max(4, Math.min(18, Math.floor(landCellCount / 900)));
  const citySeeds: number[] = [];

  for (const candidate of urbanCandidates) {
    if (citySeeds.length >= cityCount) break;
    const point = cells[candidate.id].site;
    const tooClose = citySeeds.some((seedId) => {
      const seedPoint = cells[seedId].site;
      return Math.hypot(point[0] - seedPoint[0], point[1] - seedPoint[1]) < 55;
    });
    if (tooClose) continue;
    citySeeds.push(candidate.id);
  }

  for (const seedId of citySeeds) {
    const seedPoint = cells[seedId].site;
    const radius = 95 + random() * 55;
    const boost = 0.9 + random() * 0.7;

    for (let cellId = 0; cellId < cells.length; cellId += 1) {
      const cell = cells[cellId];
      if (cell.isWater) continue;
      const distance = Math.hypot(cell.site[0] - seedPoint[0], cell.site[1] - seedPoint[1]);
      if (distance > radius) continue;
      const distanceFactor = 1 - distance / radius;
      const terrainFactor = terrainCityFactor(cell.terrain);
      score[cellId] += distanceFactor * boost * terrainFactor;
    }
  }

  for (let pass = 0; pass < 2; pass += 1) {
    const next = Float64Array.from(score);
    for (let cellId = 0; cellId < cells.length; cellId += 1) {
      if (cells[cellId].isWater) {
        next[cellId] = 0;
        continue;
      }
      let sum = score[cellId];
      for (const neighborId of cells[cellId].neighbors) {
        sum += score[neighborId];
      }
      const avg = sum / (cells[cellId].neighbors.length + 1);
      next[cellId] = score[cellId] * 0.58 + avg * 0.42;
    }
    score.set(next);
  }

  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    const cell = cells[cellId];
    if (cell.isWater) continue;
    if (cell.terrain !== 'mountains' && cell.terrain !== 'desert' && cell.terrain !== 'badlands')
      continue;
    let neighborAvg = 0;
    for (const neighborId of cell.neighbors) {
      neighborAvg += score[neighborId];
    }
    neighborAvg /= Math.max(1, cell.neighbors.length);
    score[cellId] = Math.min(score[cellId], neighborAvg * 1.35);
  }

  let maxScore = 0;
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (cells[cellId].isWater) continue;
    maxScore = Math.max(maxScore, score[cellId]);
  }

  const normalizedMax = Math.max(0.0001, maxScore);
  const nextCells = cells.map((cell) => {
    if (cell.isWater) return { ...cell, population: 0 };
    const density = clamp(score[cell.id] / normalizedMax, 0, 1);
    const shaped = Math.pow(density, 1.08);
    const basePopulation = Math.round(shaped * 5000);
    const population = Math.round(basePopulation * populationMultiplier(cell, cells));
    return { ...cell, population };
  });

  return { ...mesh, cells: nextCells };
}
