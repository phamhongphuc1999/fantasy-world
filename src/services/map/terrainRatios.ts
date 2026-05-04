import { DEFAULT_CONFIG } from 'src/configs/mapConfig';
import { clamp } from 'src/services';
import { TTerrainRatioKey, TTerrainRatioMap } from 'src/types/map.types';

export const TERRAIN_RATIO_FIELDS: Array<{ key: TTerrainRatioKey; label: string }> = [
  { key: 'plains', label: 'Plains' },
  { key: 'forest', label: 'Forest' },
  { key: 'swamp', label: 'Swamp' },
  { key: 'desert', label: 'Desert' },
  { key: 'hills', label: 'Hills' },
  { key: 'mountains', label: 'Mountains' },
  { key: 'plateau', label: 'Plateau' },
];

const MIN_RATIO = 0.01;

export function normalizeTerrainRatios(input: Partial<TTerrainRatioMap>): TTerrainRatioMap {
  const defaults = DEFAULT_CONFIG.terrainRatios;
  const merged = TERRAIN_RATIO_FIELDS.reduce((acc, field) => {
    const rawValue = input[field.key] ?? defaults[field.key];
    acc[field.key] = Number.isFinite(rawValue) ? Math.max(0, rawValue) : defaults[field.key];
    return acc;
  }, {} as TTerrainRatioMap);

  let sum = TERRAIN_RATIO_FIELDS.reduce((acc, field) => acc + merged[field.key], 0);
  if (sum <= 0) return defaults;

  const normalized = { ...merged };
  for (const field of TERRAIN_RATIO_FIELDS) {
    normalized[field.key] = normalized[field.key] / sum;
  }

  for (const field of TERRAIN_RATIO_FIELDS) {
    normalized[field.key] = clamp(normalized[field.key], MIN_RATIO, 1);
  }

  sum = TERRAIN_RATIO_FIELDS.reduce((acc, field) => acc + normalized[field.key], 0);
  for (const field of TERRAIN_RATIO_FIELDS) {
    normalized[field.key] /= sum;
  }
  return normalized;
}

export function rebalanceTerrainRatio(
  current: TTerrainRatioMap,
  changedKey: TTerrainRatioKey,
  nextValue: number
): TTerrainRatioMap {
  const otherKeys = TERRAIN_RATIO_FIELDS.map((field) => field.key).filter(
    (key) => key !== changedKey
  );
  const minOtherTotal = otherKeys.length * MIN_RATIO;
  const safeMaxForChanged = Math.max(MIN_RATIO, 1 - minOtherTotal);
  const clampedNext = clamp(nextValue, MIN_RATIO, Math.min(0.92, safeMaxForChanged));
  const totalRemaining = Math.max(minOtherTotal, 1 - clampedNext);

  const currentOtherSum = otherKeys.reduce((acc, key) => acc + current[key], 0);
  const nextRatios = { ...current, [changedKey]: clampedNext };

  if (currentOtherSum <= 0) {
    const even = totalRemaining / otherKeys.length;
    for (const key of otherKeys) nextRatios[key] = even;
  } else {
    for (const key of otherKeys) {
      nextRatios[key] = (current[key] / currentOtherSum) * totalRemaining;
    }
  }

  // Keep changed key stable; only rebalance others with min floor.
  for (const key of otherKeys) {
    nextRatios[key] = Math.max(MIN_RATIO, nextRatios[key]);
  }
  let currentOtherTotal = otherKeys.reduce((acc, key) => acc + nextRatios[key], 0);
  if (currentOtherTotal <= 0) {
    const even = totalRemaining / otherKeys.length;
    for (const key of otherKeys) nextRatios[key] = even;
    currentOtherTotal = totalRemaining;
  }
  const scale = totalRemaining / currentOtherTotal;
  for (const key of otherKeys) {
    nextRatios[key] *= scale;
  }

  // Final tiny floating fix; do not move changed key.
  const otherTotalAfterScale = otherKeys.reduce((acc, key) => acc + nextRatios[key], 0);
  const drift = totalRemaining - otherTotalAfterScale;
  if (Math.abs(drift) > 1e-9 && otherKeys.length > 0) {
    const key = otherKeys[otherKeys.length - 1] as TTerrainRatioKey;
    nextRatios[key] = Math.max(MIN_RATIO, nextRatios[key] + drift);
  }

  return nextRatios;
}
