import { TOPOGRAPHY_CONFIG } from 'src/configs/mapConfig';
import { clamp, distanceToSegment, smoothStep } from 'src/services';
import { applyTerrainPreset } from 'src/services/map/applyTerrainPreset';
import { classifyTerrain } from 'src/services/map/classifyTerrain';
import { createSeededRandom, hashSeed } from 'src/services/map/seededRandom';
import {
  TLine,
  TMapMeshWithDelaunay,
  TTerrainPreset,
  TTopographyCellData,
} from 'src/types/map.types';

interface TBuildTopographyOptions {
  mesh: TMapMeshWithDelaunay;
  seed: string;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
}

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
  const { octaves, persistence, lacunarity } = TOPOGRAPHY_CONFIG.noise.fbm;
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
  const { octaves, persistence, lacunarity, sharpness } = TOPOGRAPHY_CONFIG.noise.ridged;
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
  const { octaves, persistence, lacunarity } = TOPOGRAPHY_CONFIG.noise.billow;
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

function buildBoundaryLines(seed: string, width: number, height: number): TBoundaryLine[] {
  const random = createSeededRandom(`${seed}:boundaries`);
  const diagonal = Math.sqrt(width ** 2 + height ** 2);
  const lines: TBoundaryLine[] = [];

  const collisionCount =
    TOPOGRAPHY_CONFIG.boundary.collisionBaseCount +
    Math.floor(random() * TOPOGRAPHY_CONFIG.boundary.collisionExtraCount);
  const riftCount =
    TOPOGRAPHY_CONFIG.boundary.riftBaseCount +
    Math.floor(random() * TOPOGRAPHY_CONFIG.boundary.riftExtraCount);

  for (let index = 0; index < collisionCount + riftCount; index += 1) {
    const cx = random() * width;
    const cy = random() * height;
    const theta = random() * Math.PI * 2;
    const halfLength =
      diagonal *
      (TOPOGRAPHY_CONFIG.boundary.halfLengthMin +
        random() * TOPOGRAPHY_CONFIG.boundary.halfLengthRange);

    lines.push({
      x1: clamp(cx - Math.cos(theta) * halfLength, 0, width),
      y1: clamp(cy - Math.sin(theta) * halfLength, 0, height),
      x2: clamp(cx + Math.cos(theta) * halfLength, 0, width),
      y2: clamp(cy + Math.sin(theta) * halfLength, 0, height),
      kind: index < collisionCount ? 'collision' : 'rift',
      strength:
        TOPOGRAPHY_CONFIG.boundary.strengthBase +
        random() * TOPOGRAPHY_CONFIG.boundary.strengthRange,
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
      x: TOPOGRAPHY_CONFIG.seeds.xMargin + random() * TOPOGRAPHY_CONFIG.seeds.span,
      y: TOPOGRAPHY_CONFIG.seeds.yMargin + random() * TOPOGRAPHY_CONFIG.seeds.span,
      radius:
        (positive
          ? TOPOGRAPHY_CONFIG.seeds.upliftRadiusBase
          : TOPOGRAPHY_CONFIG.seeds.basinRadiusBase) +
        random() *
          (positive
            ? TOPOGRAPHY_CONFIG.seeds.upliftRadiusRange
            : TOPOGRAPHY_CONFIG.seeds.basinRadiusRange),
      amplitude:
        (positive
          ? TOPOGRAPHY_CONFIG.seeds.upliftAmplitudeBase
          : TOPOGRAPHY_CONFIG.seeds.basinAmplitudeBase) +
        random() *
          (positive
            ? TOPOGRAPHY_CONFIG.seeds.upliftAmplitudeRange
            : TOPOGRAPHY_CONFIG.seeds.basinAmplitudeRange),
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

function buildCellTopography(elevation: number, seaLevel: number): TTopographyCellData {
  const terrain = classifyTerrain(elevation, seaLevel);
  return { elevation, isWater: elevation < seaLevel, terrain };
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

export function buildTopography({
  mesh,
  seed,
  seaLevel,
  terrainPreset,
}: TBuildTopographyOptions): TMapMeshWithDelaunay {
  const noise = createNoiseSampler();
  const macroHash = hashSeed(`${seed}:macro`);
  const warpHash = hashSeed(`${seed}:warp`);
  const detailHash = hashSeed(`${seed}:detail`);
  const boundaries = buildBoundaryLines(seed, mesh.width, mesh.height);
  const upliftSeeds = buildReliefSeeds(
    seed,
    'uplift-seeds',
    TOPOGRAPHY_CONFIG.seeds.upliftCount,
    true
  );
  const basinSeeds = buildReliefSeeds(
    seed,
    'basin-seeds',
    TOPOGRAPHY_CONFIG.seeds.basinCount,
    false
  );
  const diagonal = Math.sqrt(mesh.width ** 2 + mesh.height ** 2);
  const baseElevations = new Float32Array(mesh.cells.length);

  for (let cellIndex = 0; cellIndex < mesh.cells.length; cellIndex += 1) {
    const cell = mesh.cells[cellIndex];
    const nx = cell.site[0] / mesh.width;
    const ny = cell.site[1] / mesh.height;

    // Domain warping breaks up smooth symmetric contours.
    const warpX =
      noise.value(
        nx * TOPOGRAPHY_CONFIG.warp.frequency,
        ny * TOPOGRAPHY_CONFIG.warp.frequency,
        warpHash
      ) - 0.5;
    const warpY =
      noise.value(
        nx * TOPOGRAPHY_CONFIG.warp.frequency,
        ny * TOPOGRAPHY_CONFIG.warp.frequency,
        warpHash ^ 0x27d4eb2d
      ) - 0.5;
    const warpedPrimaryX = clamp(nx + warpX * TOPOGRAPHY_CONFIG.warp.strength, 0, 1);
    const warpedPrimaryY = clamp(ny + warpY * TOPOGRAPHY_CONFIG.warp.strength, 0, 1);
    const warpSecondaryX =
      noise.value(
        warpedPrimaryX * TOPOGRAPHY_CONFIG.warp.secondaryFrequency,
        warpedPrimaryY * TOPOGRAPHY_CONFIG.warp.secondaryFrequency,
        warpHash ^ 0x85ebca6b
      ) - 0.5;
    const warpSecondaryY =
      noise.value(
        warpedPrimaryX * TOPOGRAPHY_CONFIG.warp.secondaryFrequency,
        warpedPrimaryY * TOPOGRAPHY_CONFIG.warp.secondaryFrequency,
        warpHash ^ 0x9e3779b9
      ) - 0.5;
    const warpedX = clamp(
      warpedPrimaryX + warpSecondaryX * TOPOGRAPHY_CONFIG.warp.secondaryStrength,
      0,
      1
    );
    const warpedY = clamp(
      warpedPrimaryY + warpSecondaryY * TOPOGRAPHY_CONFIG.warp.secondaryStrength,
      0,
      1
    );

    const macroNoise =
      noise.fractal(warpedX, warpedY, macroHash) / TOPOGRAPHY_CONFIG.noise.macroDivisor;
    const secondaryNoise =
      noise.fractal(
        warpedX * TOPOGRAPHY_CONFIG.noise.secondaryFrequency,
        warpedY * TOPOGRAPHY_CONFIG.noise.secondaryFrequency,
        macroHash ^ 0x85ebca6b
      ) / TOPOGRAPHY_CONFIG.noise.secondaryDivisor;
    const ridgedNoise = noise.ridged(warpedX * 1.35, warpedY * 1.35, macroHash ^ 0x27d4eb2d);
    const billowNoise = noise.billow(warpedX * 1.15, warpedY * 1.15, macroHash ^ 0x165667b1);
    const erosionMask = noise.fractal(warpedX * 2.8, warpedY * 2.8, detailHash ^ 0x7feb352d);
    const coastNoise = noise.value(
      warpedX * TOPOGRAPHY_CONFIG.noise.coastFrequency,
      warpedY * TOPOGRAPHY_CONFIG.noise.coastFrequency,
      detailHash
    );

    const upliftField = sampleSeedField(warpedX, warpedY, upliftSeeds);
    const basinField = sampleSeedField(warpedX, warpedY, basinSeeds);

    let tectonicUplift = 0;
    let tectonicRift = 0;

    for (const boundary of boundaries) {
      const distance = distanceToSegment(cell.site[0], cell.site[1], boundary) / diagonal;
      const influence = clamp(1 - distance / TOPOGRAPHY_CONFIG.boundary.influenceWidth, 0, 1);
      if (influence === 0) continue;

      const jaggedness =
        TOPOGRAPHY_CONFIG.noise.jaggedBase +
        noise.value(
          warpedX * TOPOGRAPHY_CONFIG.noise.jaggedFrequency,
          warpedY * TOPOGRAPHY_CONFIG.noise.jaggedFrequency,
          detailHash ^ cellIndex
        ) *
          TOPOGRAPHY_CONFIG.noise.jaggedRange;
      const value = influence * influence * boundary.strength * jaggedness;

      if (boundary.kind === 'collision') {
        tectonicUplift += value;
      } else {
        tectonicRift += value;
      }
    }

    tectonicUplift = clamp(
      tectonicUplift * TOPOGRAPHY_CONFIG.boundary.collisionScale,
      0,
      TOPOGRAPHY_CONFIG.blend.maxUplift
    );
    tectonicRift = clamp(
      tectonicRift * TOPOGRAPHY_CONFIG.boundary.riftScale,
      0,
      TOPOGRAPHY_CONFIG.blend.maxRift
    );

    // Keep a weak ocean shelf near borders, but not as a dominant elevation driver.
    const edgeDistance = Math.min(nx, 1 - nx, ny, 1 - ny);
    const shelf = smoothStep(
      (edgeDistance - TOPOGRAPHY_CONFIG.shelf.edgeOffset) / TOPOGRAPHY_CONFIG.shelf.edgeRange
    );

    baseElevations[cellIndex] = clamp(
      macroNoise * TOPOGRAPHY_CONFIG.blend.macro +
        secondaryNoise * TOPOGRAPHY_CONFIG.blend.secondary +
        ridgedNoise * TOPOGRAPHY_CONFIG.blend.ridged +
        billowNoise * TOPOGRAPHY_CONFIG.blend.billow +
        erosionMask * TOPOGRAPHY_CONFIG.blend.erosionMask +
        upliftField * TOPOGRAPHY_CONFIG.blend.upliftField +
        tectonicUplift * TOPOGRAPHY_CONFIG.blend.tectonicUplift +
        coastNoise * TOPOGRAPHY_CONFIG.blend.coastNoise +
        shelf * TOPOGRAPHY_CONFIG.shelf.weight -
        basinField * TOPOGRAPHY_CONFIG.blend.basinField -
        tectonicRift * TOPOGRAPHY_CONFIG.blend.tectonicRift,
      0,
      1
    );
  }

  const presetElevations = applyTerrainPreset({
    mesh,
    seed,
    preset: terrainPreset,
    elevations: baseElevations,
  });
  const elevations = reinforceHighMountains(presetElevations, seaLevel);

  const cells = mesh.cells.map((cell) => ({
    ...cell,
    ...buildCellTopography(elevations[cell.id], seaLevel),
  }));

  return { ...mesh, cells };
}
