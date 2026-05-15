import { TOPOGRAPHY_CONFIG } from 'src/configs/map/topography';
import { TDelaunayMesh, TLine, TTopographyCell, TTopographyParams } from 'src/types/map.types';
import { createSeededRandom, hashSeed } from '../core/seededRandom';
import { distanceToSegment } from '../utils/geometry';
import { clamp, smoothStep } from '../utils/math';
import { applyTopography } from './preset';

type TBoundaryLine = TLine & {
  kind: 'collision' | 'rift';
  strength: number;
};

type TReliefSeed = {
  x: number;
  y: number;
  radius: number;
  amplitude: number;
};

type TNoiseSampler = {
  value: (x: number, y: number, seedHash: number) => number;
  fractal: (x: number, y: number, seedHash: number) => number;
  ridged: (x: number, y: number, seedHash: number) => number;
  billow: (x: number, y: number, seedHash: number) => number;
};

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

function hashGrid(gridX: number, gridY: number, seedHash: number) {
  let value = seedHash ^ Math.imul(gridX, 374761393) ^ Math.imul(gridY, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function sampleValueNoise(x: number, y: number, seedHash: number) {
  const floorX = Math.floor(x);
  const floorY = Math.floor(y);
  const localX = x - floorX;
  const localY = y - floorY;
  const smoothX = smoothStep(localX);
  const smoothY = smoothStep(localY);

  const topLeft = hashGrid(floorX, floorY, seedHash);
  const topRight = hashGrid(floorX + 1, floorY, seedHash);
  const bottomLeft = hashGrid(floorX, floorY + 1, seedHash);
  const bottomRight = hashGrid(floorX + 1, floorY + 1, seedHash);
  const top = lerp(topLeft, topRight, smoothX);
  const bottom = lerp(bottomLeft, bottomRight, smoothX);

  return lerp(top, bottom, smoothY);
}

function sampleFractalNoise(x: number, y: number, seedHash: number) {
  const { octaves, persistence, lacunarity } = NOISE.fbm;
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total +=
      sampleValueNoise(x * frequency, y * frequency, seedHash ^ (octave * 374761393)) * amplitude;
    weight += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return weight > 0 ? total / weight : 0;
}

function sampleRidgedNoise(x: number, y: number, seedHash: number) {
  const { octaves, persistence, lacunarity, sharpness } = NOISE.ridged;
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const base = sampleValueNoise(x * frequency, y * frequency, seedHash ^ (octave * 668265263));
    const ridge = Math.pow(1 - Math.abs(base * 2 - 1), sharpness);
    total += ridge * amplitude;
    weight += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return weight > 0 ? total / weight : 0;
}

function sampleBillowyNoise(x: number, y: number, seedHash: number) {
  const { octaves, persistence, lacunarity } = NOISE.billow;
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const base = sampleValueNoise(x * frequency, y * frequency, seedHash ^ (octave * 1274126177));
    const billow = Math.abs(base * 2 - 1);
    total += billow * amplitude;
    weight += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return weight > 0 ? total / weight : 0;
}

function createNoiseSampler(): TNoiseSampler {
  return {
    value: sampleValueNoise,
    fractal: sampleFractalNoise,
    ridged: sampleRidgedNoise,
    billow: sampleBillowyNoise,
  };
}

const BOUNDARY = TOPOGRAPHY_CONFIG.boundary;
const SEEDS = TOPOGRAPHY_CONFIG.seeds;
function buildBoundaryLines(seed: string, width: number, height: number): TBoundaryLine[] {
  const random = createSeededRandom(`${seed}:boundaries`);
  const diagonal = Math.sqrt(width ** 2 + height ** 2);
  const lines: TBoundaryLine[] = [];

  const collisionCount =
    BOUNDARY.collisionBaseCount + Math.floor(random() * BOUNDARY.collisionExtraCount);
  const riftCount = BOUNDARY.riftBaseCount + Math.floor(random() * BOUNDARY.riftExtraCount);

  for (let index = 0; index < collisionCount + riftCount; index += 1) {
    const cx = random() * width;
    const cy = random() * height;
    const theta = random() * Math.PI * 2;
    const halfLength = diagonal * (BOUNDARY.halfLengthMin + random() * BOUNDARY.halfLengthRange);

    lines.push({
      x1: clamp(cx - Math.cos(theta) * halfLength, 0, width),
      y1: clamp(cy - Math.sin(theta) * halfLength, 0, height),
      x2: clamp(cx + Math.cos(theta) * halfLength, 0, width),
      y2: clamp(cy + Math.sin(theta) * halfLength, 0, height),
      kind: index < collisionCount ? 'collision' : 'rift',
      strength: BOUNDARY.strengthBase + random() * BOUNDARY.strengthRange,
    });
  }

  return lines;
}

function buildReliefSeeds(
  seed: string,
  key: string,
  count: number,
  positive: boolean
): TReliefSeed[] {
  const random = createSeededRandom(`${seed}:${key}`);
  const seeds: TReliefSeed[] = [];

  for (let index = 0; index < count; index += 1) {
    seeds.push({
      x: SEEDS.xMargin + random() * SEEDS.span,
      y: SEEDS.yMargin + random() * SEEDS.span,
      radius:
        (positive ? SEEDS.upliftRadiusBase : SEEDS.basinRadiusBase) +
        random() * (positive ? SEEDS.upliftRadiusRange : SEEDS.basinRadiusRange),
      amplitude:
        (positive ? SEEDS.upliftAmplitudeBase : SEEDS.basinAmplitudeBase) +
        random() * (positive ? SEEDS.upliftAmplitudeRange : SEEDS.basinAmplitudeRange),
    });
  }
  return seeds;
}

function sampleSeedField(nx: number, ny: number, seeds: TReliefSeed[]) {
  let value = 0;

  for (const seed of seeds) {
    const dx = nx - seed.x;
    const dy = ny - seed.y;
    const distanceSquared = dx * dx + dy * dy;
    const influence = Math.exp(-distanceSquared / (2 * seed.radius * seed.radius));
    value += seed.amplitude * influence;
  }

  return value;
}

function buildCellTopography(elevation: number, seaLevel: number): TTopographyCell {
  return { elevation, isWater: elevation < seaLevel };
}

function reinforceHighMountains(elevations: Float32Array, seaLevel: number) {
  const landElevations: number[] = [];
  for (let index = 0; index < elevations.length; index += 1) {
    if (elevations[index] > seaLevel) landElevations.push(elevations[index]);
  }
  if (landElevations.length < 12) return elevations;

  landElevations.sort((a, b) => a - b);
  const startIndex = Math.floor(
    (landElevations.length - 1) * TOPOGRAPHY_CONFIG.mountainRecovery.quantileStart
  );
  const threshold = landElevations[startIndex];
  if (!Number.isFinite(threshold) || threshold >= 0.995) return elevations;

  const boosted = Float32Array.from(elevations);
  for (let index = 0; index < boosted.length; index += 1) {
    const elevation = boosted[index];
    if (elevation <= threshold) continue;
    const normalized = (elevation - threshold) / Math.max(0.0001, 1 - threshold);
    const uplift = normalized * normalized * TOPOGRAPHY_CONFIG.mountainRecovery.peakBoostMax;
    boosted[index] = clamp(elevation + uplift, 0, 1);
  }
  return boosted;
}

const BLEND = TOPOGRAPHY_CONFIG.blend;
const WARP = TOPOGRAPHY_CONFIG.warp;
const NOISE = TOPOGRAPHY_CONFIG.noise;
export function buildTopography(params: TTopographyParams): TDelaunayMesh {
  const { mesh, seed, seaLevel, topography } = params;
  const noise = createNoiseSampler();
  const macroHash = hashSeed(`${seed}:macro`);
  const warpHash = hashSeed(`${seed}:warp`);
  const detailHash = hashSeed(`${seed}:detail`);
  const boundaries = buildBoundaryLines(seed, mesh.width, mesh.height);
  const upliftSeeds = buildReliefSeeds(seed, 'uplift-seeds', SEEDS.upliftCount, true);
  const basinSeeds = buildReliefSeeds(seed, 'basin-seeds', SEEDS.basinCount, false);
  const diagonal = Math.sqrt(mesh.width ** 2 + mesh.height ** 2);
  const baseElevations = new Float32Array(mesh.cells.length);

  for (let cellIndex = 0; cellIndex < mesh.cells.length; cellIndex += 1) {
    const cell = mesh.cells[cellIndex];
    const nx = cell.site[0] / mesh.width;
    const ny = cell.site[1] / mesh.height;

    // Domain warping breaks up smooth symmetric contours.
    const warpX = noise.value(nx * WARP.frequency, ny * WARP.frequency, warpHash) - 0.5;
    const warpY =
      noise.value(nx * WARP.frequency, ny * WARP.frequency, warpHash ^ 0x27d4eb2d) - 0.5;
    const warpedPrimaryX = clamp(nx + warpX * WARP.strength, 0, 1);
    const warpedPrimaryY = clamp(ny + warpY * WARP.strength, 0, 1);
    const warpSecondaryX =
      noise.value(
        warpedPrimaryX * WARP.secondaryFrequency,
        warpedPrimaryY * WARP.secondaryFrequency,
        warpHash ^ 0x85ebca6b
      ) - 0.5;
    const warpSecondaryY =
      noise.value(
        warpedPrimaryX * WARP.secondaryFrequency,
        warpedPrimaryY * WARP.secondaryFrequency,
        warpHash ^ 0x9e3779b9
      ) - 0.5;
    const warpedX = clamp(warpedPrimaryX + warpSecondaryX * WARP.secondaryStrength, 0, 1);
    const warpedY = clamp(warpedPrimaryY + warpSecondaryY * WARP.secondaryStrength, 0, 1);

    const macroNoise = noise.fractal(warpedX, warpedY, macroHash) / NOISE.macroDivisor;
    const secondaryNoise =
      noise.fractal(
        warpedX * NOISE.secondaryFrequency,
        warpedY * NOISE.secondaryFrequency,
        macroHash ^ 0x85ebca6b
      ) / NOISE.secondaryDivisor;
    const ridgedNoise = noise.ridged(warpedX * 1.35, warpedY * 1.35, macroHash ^ 0x27d4eb2d);
    const billowNoise = noise.billow(warpedX * 1.15, warpedY * 1.15, macroHash ^ 0x165667b1);
    const erosionMask = noise.fractal(warpedX * 2.8, warpedY * 2.8, detailHash ^ 0x7feb352d);
    const coastNoise = noise.value(
      warpedX * NOISE.coastFrequency,
      warpedY * NOISE.coastFrequency,
      detailHash
    );

    const upliftField = sampleSeedField(warpedX, warpedY, upliftSeeds);
    const basinField = sampleSeedField(warpedX, warpedY, basinSeeds);

    let tectonicUplift = 0;
    let tectonicRift = 0;

    for (const boundary of boundaries) {
      const distance = distanceToSegment(cell.site[0], cell.site[1], boundary) / diagonal;
      const influence = clamp(1 - distance / BOUNDARY.influenceWidth, 0, 1);
      if (influence === 0) continue;

      const jaggedness =
        NOISE.jaggedBase +
        noise.value(
          warpedX * NOISE.jaggedFrequency,
          warpedY * NOISE.jaggedFrequency,
          detailHash ^ cellIndex
        ) *
          NOISE.jaggedRange;
      const value = influence * influence * boundary.strength * jaggedness;

      if (boundary.kind === 'collision') tectonicUplift += value;
      else tectonicRift += value;
    }

    tectonicUplift = clamp(tectonicUplift * BOUNDARY.collisionScale, 0, BLEND.maxUplift);
    tectonicRift = clamp(tectonicRift * BOUNDARY.riftScale, 0, BLEND.maxRift);

    // Keep a weak ocean shelf near borders, but not as a dominant elevation driver.
    const edgeDistance = Math.min(nx, 1 - nx, ny, 1 - ny);
    const shelf = smoothStep(
      (edgeDistance - TOPOGRAPHY_CONFIG.shelf.edgeOffset) / TOPOGRAPHY_CONFIG.shelf.edgeRange
    );

    baseElevations[cellIndex] = clamp(
      macroNoise * BLEND.macro +
        secondaryNoise * BLEND.secondary +
        ridgedNoise * BLEND.ridged +
        billowNoise * BLEND.billow +
        erosionMask * BLEND.erosionMask +
        upliftField * BLEND.upliftField +
        tectonicUplift * BLEND.tectonicUplift +
        coastNoise * BLEND.coastNoise +
        shelf * TOPOGRAPHY_CONFIG.shelf.weight -
        basinField * BLEND.basinField -
        tectonicRift * BLEND.tectonicRift,
      0,
      1
    );
  }

  const presetElevations = applyTopography({
    mesh,
    seed,
    topography,
    elevations: baseElevations,
  });
  const elevations = reinforceHighMountains(presetElevations, seaLevel);

  const cells = mesh.cells.map((cell) => ({
    ...cell,
    ...buildCellTopography(elevations[cell.id], seaLevel),
  }));

  return { ...mesh, cells };
}
