import { TCell } from 'src/types/map.types';
import { findMaxBy } from 'src/services/core/sort';

export function computeEffectiveSize(cellIds: number[], effectiveCellWeightById: Float32Array) {
  let sum = 0;
  for (const cellId of cellIds) sum += effectiveCellWeightById[cellId];
  return sum;
}

export function getDistanceSquared(a: TCell, b: TCell) {
  const dx = a.site[0] - b.site[0];
  const dy = a.site[1] - b.site[1];
  return dx * dx + dy * dy;
}

export function groupNationCellsByProvince(nationCellIds: number[], provinceOwner: Int32Array) {
  const provinceToCells = new Map<number, number[]>();
  for (const cellId of nationCellIds) {
    const provinceId = provinceOwner[cellId];
    if (provinceId < 0) continue;
    if (!provinceToCells.has(provinceId)) provinceToCells.set(provinceId, []);
    (provinceToCells.get(provinceId) as number[]).push(cellId);
  }
  return provinceToCells;
}

export function buildProvinceAggregates(
  nationCellIds: number[],
  provinceOwner: Int32Array,
  cells: TCell[]
) {
  const provinceSize = new Map<number, number>();
  const provincePopulation = new Map<number, number>();
  const provinceEconomy = new Map<number, number>();
  for (const cellId of nationCellIds) {
    const provinceId = provinceOwner[cellId];
    if (provinceId < 0) continue;
    provinceSize.set(provinceId, (provinceSize.get(provinceId) || 0) + 1);
    provincePopulation.set(
      provinceId,
      (provincePopulation.get(provinceId) || 0) + cells[cellId].population
    );
    provinceEconomy.set(provinceId, (provinceEconomy.get(provinceId) || 0) + cells[cellId].economy);
  }
  return { provinceSize, provincePopulation, provinceEconomy };
}

export function getAverageTerrainFactor(cellIds: number[], effectiveCellWeightById: Float32Array) {
  if (cellIds.length === 0) return 1;
  return computeEffectiveSize(cellIds, effectiveCellWeightById) / cellIds.length;
}

export function getDominantTerrain(cellIds: number[], cells: TCell[]) {
  const counts = new Map<string, number>();
  for (const cellId of cellIds) {
    const terrain = cells[cellId].terrain;
    counts.set(terrain, (counts.get(terrain) || 0) + 1);
  }
  const dominant = findMaxBy(Array.from(counts.entries()), (entry) => entry[1]);
  return dominant?.[0] || 'plains';
}

export function getCellCapByDensity(population: number, cellCount: number) {
  const density = population / Math.max(1, cellCount);
  if (density > 10_000) return 20;
  if (density < 1_000) return 150;
  const t = (density - 1_000) / 9_000;
  return Math.round(150 - t * 130);
}
