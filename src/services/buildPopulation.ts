import { TERRAIN_CONFIG } from 'src/configs/constance';
import { buildMultiSourceDistanceMap } from 'src/services/core/graph';
import { createSeededRandom } from 'src/services/seededRandom';
import { isWaterOrRiverCell } from 'src/services/terrainRules';
import { TCell, TDelaunayMesh } from 'src/types/map.types';
import { clamp } from '.';

interface TBuildPopulationOptions {
  mesh: TDelaunayMesh;
  seed: string;
}

function populationMultiplier(cell: TCell, cells: TCell[]) {
  const isNearWater = cell.neighbors.some((neighborId) => {
    const n = cells[neighborId];
    return (
      n?.terrain === 'lake' ||
      n?.terrain === 'shallow-water' ||
      n?.terrain === 'inland-sea' ||
      n?.isRiver
    );
  });

  const riverBonus = cell.isRiver ? 3 : 0;
  const waterProximityBonus = isNearWater ? 2 : 0;

  switch (cell.terrain) {
    case 'valley':
      return 10 + riverBonus + waterProximityBonus;
    case 'plains':
      return 6 + riverBonus + waterProximityBonus;
    case 'coast':
      return 9 + riverBonus;
    case 'lake':
      return 7;
    case 'forest':
      return 4 + (isNearWater ? 2 : 0);
    case 'plateau':
      return 4 + riverBonus;
    case 'hills':
      return 3 + (isNearWater ? 1 : 0);
    case 'volcanic':
      return 5;
    case 'tundra':
      return 1.2;
    case 'swamp':
      return 0.8;
    case 'desert':
      return cell.isRiver ? 4 : 0.4;
    case 'badlands':
    case 'mountains':
      return 0.5;
    case 'inland-sea':
    case 'shallow-water':
      return 0.2;
    case 'deep-water':
      return 0;
    default:
      return 0.5;
  }
}

function buildWaterAccessibility(cells: TCell[]) {
  const distances = buildMultiSourceDistanceMap(cells, {
    isSeed: (cellId) => {
      const terrain = cells[cellId].terrain;
      return terrain === 'deep-water' || terrain === 'shallow-water' || terrain === 'inland-sea';
    },
  });

  const accessibility = new Float64Array(cells.length);
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    const distance = distances[cellId];
    if (distance < 0) {
      accessibility[cellId] = 0.2;
      continue;
    }
    accessibility[cellId] = clamp(Math.exp(-distance / 22), 0.12, 1);
  }
  return accessibility;
}

export function buildPopulation({ mesh, seed }: TBuildPopulationOptions): TDelaunayMesh {
  const cells = mesh.cells;
  const random = createSeededRandom(`${seed}:population`);
  const score = new Float64Array(cells.length);
  const waterAccessibility = buildWaterAccessibility(cells);
  let landCellCount = 0;

  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    const cell = cells[cellId];
    const terrainConfig = TERRAIN_CONFIG[cell.terrain];
    if (cell.isWater) {
      score[cellId] = 0;
      continue;
    }
    landCellCount += 1;

    let value = terrainConfig.baseWeight;
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

  const urbanCandidates: Array<{ id: number; score: number }> = [];
  for (const cell of cells) {
    if (cell.isWater || cell.terrain === 'mountains' || cell.terrain === 'desert') continue;
    const candidateScore = score[cell.id] + cell.suitability * 0.6;
    if (candidateScore <= 0.25) continue;
    urbanCandidates.push({ id: cell.id, score: candidateScore });
  }
  urbanCandidates.sort((a, b) => b.score - a.score);

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
      const terrainFactor = TERRAIN_CONFIG[cell.terrain].cityFactor;
      score[cellId] += distanceFactor * boost * terrainFactor;
    }
  }

  const next = new Float64Array(score.length);
  for (let pass = 0; pass < 2; pass += 1) {
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
    if (cell.isWater)
      return {
        ...cell,
        population: 0,
        economy: 0,
        waterAccessibility: waterAccessibility[cell.id],
      };
    const density = clamp(score[cell.id] / normalizedMax, 0, 1);
    const shaped = Math.pow(density, 1.08);
    const basePopulation = Math.round(shaped * 2500);
    const population = Math.round(
      basePopulation * populationMultiplier(cell, cells) * waterAccessibility[cell.id]
    );

    const terrainFactor = TERRAIN_CONFIG[cell.terrain].economyFactor;
    const riverWaterBonus = cell.isRiver ? 0.08 : 0;
    const lakeWaterBonus = cell.isLake ? 0.06 : 0;
    const coastWaterBonus = cell.terrain === 'coast' ? 0.09 : 0;
    const nearWaterNeighborBonus = cell.neighbors.some((neighborId) => {
      const neighbor = cells[neighborId];
      return isWaterOrRiverCell(neighbor);
    })
      ? 0.16
      : 0;
    const waterFactor =
      0.72 +
      waterAccessibility[cell.id] * 1.34 +
      riverWaterBonus +
      lakeWaterBonus +
      coastWaterBonus +
      nearWaterNeighborBonus;
    const popNorm = clamp(population / 120000, 0, 1);
    const waterNorm = clamp(waterAccessibility[cell.id], 0, 1);
    const synergyMultiplier = 1 + popNorm * waterNorm * 1.35;
    const economy = Math.round(
      Math.pow(Math.max(0, population), 1.12) * terrainFactor * waterFactor * synergyMultiplier
    );

    return { ...cell, population, economy, waterAccessibility: waterAccessibility[cell.id] };
  });
  return { ...mesh, cells: nextCells };
}
