import { MAP_EXPLORER_DEFAULT_CONFIG } from 'src/configs/mapConfig';
import { TTerrainRatioKey, TTerrainRatioMap } from 'src/types/global';

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeTerrainRatios(input: Partial<TTerrainRatioMap>): TTerrainRatioMap {
  const defaults = MAP_EXPLORER_DEFAULT_CONFIG.terrainRatios;
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

export function rebalanceTerrainRatioAfterChange(
  current: TTerrainRatioMap,
  changedKey: TTerrainRatioKey,
  nextValue: number
): TTerrainRatioMap {
  const clampedNext = clamp(nextValue, MIN_RATIO, 0.92);
  const totalRemaining = 1 - clampedNext;
  const otherKeys = TERRAIN_RATIO_FIELDS.map((field) => field.key).filter(
    (key) => key !== changedKey
  );

  const currentOtherSum = otherKeys.reduce((acc, key) => acc + current[key], 0);
  const nextRatios = { ...current, [changedKey]: clampedNext };

  if (currentOtherSum <= 0) {
    const even = totalRemaining / otherKeys.length;
    for (const key of otherKeys) nextRatios[key] = even;
    return normalizeTerrainRatios(nextRatios);
  }

  for (const key of otherKeys) {
    nextRatios[key] = (current[key] / currentOtherSum) * totalRemaining;
  }

  return normalizeTerrainRatios(nextRatios);
}
