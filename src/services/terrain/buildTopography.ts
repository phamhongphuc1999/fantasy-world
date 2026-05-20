import { TOPOGRAPHY_CONFIG } from 'src/configs/map/topography';
import {
  clamp,
  createSeededRandom,
  hashSeed,
  smoothStep,
  simplex2D,
} from 'src/services/utils/math';
import { TDelaunayMesh, TTopographyCell, TTopographyParams } from 'src/types/map.types';
import { applyTopography } from './preset';
import { generatePlates, classifyBoundaryForCell } from './tectonics';
import { computeIsostaticElevation } from './isostasy';
import { simulateHydraulicErosion } from './erosion';

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

function sampleFractalNoise(x: number, y: number, seedHash: number) {
  const { octaves, persistence, lacunarity } = NOISE.fbm;
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += simplex2D(x * frequency, y * frequency, seedHash ^ (octave * 374761393)) * amplitude;
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
    const base = simplex2D(x * frequency, y * frequency, seedHash ^ (octave * 668265263));
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
    const base = simplex2D(x * frequency, y * frequency, seedHash ^ (octave * 1274126177));
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
    value: simplex2D,
    fractal: sampleFractalNoise,
    ridged: sampleRidgedNoise,
    billow: sampleBillowyNoise,
  };
}

const SEEDS = TOPOGRAPHY_CONFIG.seeds;

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
const TECTONIC = TOPOGRAPHY_CONFIG.tectonic;

export function buildTopography(params: TTopographyParams): TDelaunayMesh {
  const { mesh, seed, seaLevel, topography } = params;
  const noise = createNoiseSampler();
  const macroHash = hashSeed(`${seed}:macro`);
  const warpHash = hashSeed(`${seed}:warp`);
  const detailHash = hashSeed(`${seed}:detail`);

  // ── Tectonic plates ──────────────────────────────────────────────────────────
  const cellSites = mesh.cells.map((c) => c.site);
  const { plates, cellPlateId } = generatePlates(seed, mesh.width, mesh.height, cellSites);

  // ── Relief seeds ─────────────────────────────────────────────────────────────
  const upliftSeeds = buildReliefSeeds(seed, 'uplift-seeds', SEEDS.upliftCount, true);
  const basinSeeds = buildReliefSeeds(seed, 'basin-seeds', SEEDS.basinCount, false);

  // ── Elevation loop ───────────────────────────────────────────────────────────
  const baseElevations = new Float32Array(mesh.cells.length);

  for (let cellIndex = 0; cellIndex < mesh.cells.length; cellIndex += 1) {
    const cell = mesh.cells[cellIndex];
    const nx = cell.site[0] / mesh.width;
    const ny = cell.site[1] / mesh.height;

    // ── Domain warping ─────────────────────────────────────────────────────────
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

    // ── Multi-octave noise layers ──────────────────────────────────────────────
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

    // ── Relief seed fields ─────────────────────────────────────────────────────
    const upliftField = sampleSeedField(warpedX, warpedY, upliftSeeds);
    const basinField = sampleSeedField(warpedX, warpedY, basinSeeds);

    // ── Tectonic boundary influence ────────────────────────────────────────────
    const boundaryInfo = classifyBoundaryForCell(
      cellIndex,
      cell.site[0],
      cell.site[1],
      cell.neighbors,
      cellSites,
      plates,
      cellPlateId,
      seaLevel,
      mesh.width,
      mesh.height
    );

    // Compute minimum distance to any neighbour on a different plate
    // (used by isostasy for thermal subsidence approximation)
    let distanceToAnyBoundary = 1;
    for (const nid of cell.neighbors) {
      if (cellPlateId[nid] !== cellPlateId[cellIndex]) {
        const ns = cellSites[nid];
        const d =
          Math.hypot(cell.site[0] - ns[0], cell.site[1] - ns[1]) /
          Math.hypot(mesh.width, mesh.height);
        if (d < distanceToAnyBoundary) distanceToAnyBoundary = d;
      }
    }

    // ── Isostatic elevation ────────────────────────────────────────────────────
    const isostaticElevation = computeIsostaticElevation(
      boundaryInfo.isContinental,
      boundaryInfo,
      distanceToAnyBoundary,
      cellIndex,
      plates,
      cellPlateId[cellIndex]
    );

    let tectonicUplift = 0;
    let tectonicRift = 0;

    if (boundaryInfo.boundaryKind !== 'none') {
      const distNorm = boundaryInfo.distanceToBoundary / TECTONIC.boundaryInfluenceWidth;
      const influence = clamp(1 - distNorm, 0, 1);
      const influenceSq = influence * influence;

      // Add jaggedness via noise for organic boundary roughness
      const jaggedness =
        TOPOGRAPHY_CONFIG.noise.jaggedBase +
        noise.value(
          warpedX * TOPOGRAPHY_CONFIG.noise.jaggedFrequency,
          warpedY * TOPOGRAPHY_CONFIG.noise.jaggedFrequency,
          detailHash ^ cellIndex
        ) *
          TOPOGRAPHY_CONFIG.noise.jaggedRange;

      if (boundaryInfo.boundaryKind === 'convergent') {
        // Subduction: oceanic plate goes under continental plate → volcanic arc
        const isSubduction =
          !boundaryInfo.isContinental && boundaryInfo.neighborPlateKind === 'continental';

        let baseUplift = boundaryInfo.convergenceRate * TECTONIC.convergentUpliftScale;

        // Subduction zones get extra boost on the continental side
        if (isSubduction) {
          baseUplift *= TECTONIC.subductionArcBoost;
        }

        tectonicUplift = clamp(baseUplift * influenceSq * jaggedness * 0.5, 0, BLEND.maxUplift);
      } else if (boundaryInfo.boundaryKind === 'divergent') {
        // Mid-ocean ridge (underwater) → slight elevation bump
        // Continental rift → valley (negative)
        const baseRift = boundaryInfo.divergenceRate * TECTONIC.divergentRiftScale;

        if (!boundaryInfo.isContinental) {
          // Underwater divergent: add ridge elevation
          tectonicUplift = clamp(baseRift * influenceSq * jaggedness * 0.15, 0, BLEND.maxUplift);
        } else {
          // Continental divergent: rift valley
          tectonicRift = clamp(baseRift * influenceSq * jaggedness * 0.5, 0, BLEND.maxRift);
        }
      }
      // Transform → no vertical displacement
    }

    // ── Continental/oceanic base offset (isostatic principle) ──────────────────
    const isContinentalCell = boundaryInfo.isContinental;
    const continentalBias = isContinentalCell
      ? TECTONIC.continentalElevationBias
      : -TECTONIC.oceanicElevationBias;

    // ── Edge shelf ─────────────────────────────────────────────────────────────
    const edgeDistance = Math.min(nx, 1 - nx, ny, 1 - ny);
    const shelf = smoothStep(
      (edgeDistance - TOPOGRAPHY_CONFIG.shelf.edgeOffset) / TOPOGRAPHY_CONFIG.shelf.edgeRange
    );

    // ── Blend all layers ───────────────────────────────────────────────────────
    baseElevations[cellIndex] = clamp(
      macroNoise * BLEND.macro +
        secondaryNoise * BLEND.secondary +
        ridgedNoise * BLEND.ridged +
        billowNoise * BLEND.billow +
        erosionMask * BLEND.erosionMask +
        upliftField * BLEND.upliftField +
        tectonicUplift * BLEND.tectonicUplift +
        coastNoise * BLEND.coastNoise +
        shelf * TOPOGRAPHY_CONFIG.shelf.weight +
        continentalBias * BLEND.continentalBias +
        isostaticElevation * BLEND.isostatic -
        basinField * BLEND.basinField -
        tectonicRift * BLEND.tectonicRift,
      0,
      1
    );
  }

  // ── Post-processing ──────────────────────────────────────────────────────────
  const presetElevations = applyTopography({
    mesh,
    seed,
    topography,
    elevations: baseElevations,
  });
  const elevations = reinforceHighMountains(presetElevations, seaLevel);

  // ── Hydraulic erosion ────────────────────────────────────────────────────────
  const neighborMap = mesh.cells.map((c) => c.neighbors);
  const { elevations: erodedElevations } = simulateHydraulicErosion(
    elevations,
    cellSites,
    neighborMap,
    mesh.width,
    mesh.height,
    seed,
    seaLevel
  );

  const cells = mesh.cells.map((cell) => ({
    ...cell,
    ...buildCellTopography(erodedElevations[cell.id], seaLevel),
  }));

  return { ...mesh, cells };
}
