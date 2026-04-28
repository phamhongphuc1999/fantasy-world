import { applyTerrainPreset } from 'src/services/map/applyTerrainPreset';
import { classifyTerrain } from 'src/services/map/classifyTerrain';
import { createSeededRandom, hashSeed } from 'src/services/map/seededRandom';
import { MAP_TOPOGRAPHY_CONFIG } from 'src/configs/mapConfig';
import { TMapMeshWithDelaunay, TTerrainPreset, TTopographyCellData } from 'src/types/global';

interface TBuildTopographyOptions {
  mesh: TMapMeshWithDelaunay;
  seed: string;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
}

type TBoundaryLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'collision' | 'rift';
  strength: number;
};

type TReliefSeed = {
  x: number;
  y: number;
  radius: number;
  amplitude: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothStep(value: number) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

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
  const octaveA = sampleValueNoise(x * 0.75, y * 0.75, seedHash);
  const octaveB = sampleValueNoise(x * 1.55, y * 1.55, seedHash ^ 0x9e3779b9);
  const octaveC = sampleValueNoise(x * 3.7, y * 3.7, seedHash ^ 0x85ebca6b);

  return octaveA + octaveB * 0.5 + octaveC * 0.25;
}

function distanceToSegment(x: number, y: number, line: TBoundaryLine): number {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const denominator = dx * dx + dy * dy;

  if (denominator === 0) {
    return Math.sqrt((x - line.x1) ** 2 + (y - line.y1) ** 2);
  }

  const t = clamp(((x - line.x1) * dx + (y - line.y1) * dy) / denominator, 0, 1);
  const px = line.x1 + t * dx;
  const py = line.y1 + t * dy;

  return Math.sqrt((x - px) ** 2 + (y - py) ** 2);
}

function buildBoundaryLines(seed: string, width: number, height: number): TBoundaryLine[] {
  const random = createSeededRandom(`${seed}:boundaries`);
  const diagonal = Math.sqrt(width ** 2 + height ** 2);
  const lines: TBoundaryLine[] = [];

  const collisionCount =
    MAP_TOPOGRAPHY_CONFIG.boundary.collisionBaseCount +
    Math.floor(random() * MAP_TOPOGRAPHY_CONFIG.boundary.collisionExtraCount);
  const riftCount =
    MAP_TOPOGRAPHY_CONFIG.boundary.riftBaseCount +
    Math.floor(random() * MAP_TOPOGRAPHY_CONFIG.boundary.riftExtraCount);

  for (let index = 0; index < collisionCount + riftCount; index += 1) {
    const cx = random() * width;
    const cy = random() * height;
    const theta = random() * Math.PI * 2;
    const halfLength =
      diagonal *
      (MAP_TOPOGRAPHY_CONFIG.boundary.halfLengthMin +
        random() * MAP_TOPOGRAPHY_CONFIG.boundary.halfLengthRange);

    lines.push({
      x1: clamp(cx - Math.cos(theta) * halfLength, 0, width),
      y1: clamp(cy - Math.sin(theta) * halfLength, 0, height),
      x2: clamp(cx + Math.cos(theta) * halfLength, 0, width),
      y2: clamp(cy + Math.sin(theta) * halfLength, 0, height),
      kind: index < collisionCount ? 'collision' : 'rift',
      strength:
        MAP_TOPOGRAPHY_CONFIG.boundary.strengthBase +
        random() * MAP_TOPOGRAPHY_CONFIG.boundary.strengthRange,
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
      x: MAP_TOPOGRAPHY_CONFIG.seeds.xMargin + random() * MAP_TOPOGRAPHY_CONFIG.seeds.span,
      y: MAP_TOPOGRAPHY_CONFIG.seeds.yMargin + random() * MAP_TOPOGRAPHY_CONFIG.seeds.span,
      radius:
        (positive
          ? MAP_TOPOGRAPHY_CONFIG.seeds.upliftRadiusBase
          : MAP_TOPOGRAPHY_CONFIG.seeds.basinRadiusBase) +
        random() *
          (positive
            ? MAP_TOPOGRAPHY_CONFIG.seeds.upliftRadiusRange
            : MAP_TOPOGRAPHY_CONFIG.seeds.basinRadiusRange),
      amplitude:
        (positive
          ? MAP_TOPOGRAPHY_CONFIG.seeds.upliftAmplitudeBase
          : MAP_TOPOGRAPHY_CONFIG.seeds.basinAmplitudeBase) +
        random() *
          (positive
            ? MAP_TOPOGRAPHY_CONFIG.seeds.upliftAmplitudeRange
            : MAP_TOPOGRAPHY_CONFIG.seeds.basinAmplitudeRange),
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

export function buildTopography({
  mesh,
  seed,
  seaLevel,
  terrainPreset,
}: TBuildTopographyOptions): TMapMeshWithDelaunay {
  const macroHash = hashSeed(`${seed}:macro`);
  const warpHash = hashSeed(`${seed}:warp`);
  const detailHash = hashSeed(`${seed}:detail`);
  const boundaries = buildBoundaryLines(seed, mesh.width, mesh.height);
  const upliftSeeds = buildReliefSeeds(
    seed,
    'uplift-seeds',
    MAP_TOPOGRAPHY_CONFIG.seeds.upliftCount,
    true
  );
  const basinSeeds = buildReliefSeeds(
    seed,
    'basin-seeds',
    MAP_TOPOGRAPHY_CONFIG.seeds.basinCount,
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
      sampleValueNoise(
        nx * MAP_TOPOGRAPHY_CONFIG.warp.frequency,
        ny * MAP_TOPOGRAPHY_CONFIG.warp.frequency,
        warpHash
      ) - 0.5;
    const warpY =
      sampleValueNoise(
        nx * MAP_TOPOGRAPHY_CONFIG.warp.frequency,
        ny * MAP_TOPOGRAPHY_CONFIG.warp.frequency,
        warpHash ^ 0x27d4eb2d
      ) - 0.5;
    const warpedX = clamp(nx + warpX * MAP_TOPOGRAPHY_CONFIG.warp.strength, 0, 1);
    const warpedY = clamp(ny + warpY * MAP_TOPOGRAPHY_CONFIG.warp.strength, 0, 1);

    const macroNoise =
      sampleFractalNoise(warpedX, warpedY, macroHash) / MAP_TOPOGRAPHY_CONFIG.noise.macroDivisor;
    const secondaryNoise =
      sampleFractalNoise(
        warpedX * MAP_TOPOGRAPHY_CONFIG.noise.secondaryFrequency,
        warpedY * MAP_TOPOGRAPHY_CONFIG.noise.secondaryFrequency,
        macroHash ^ 0x85ebca6b
      ) / MAP_TOPOGRAPHY_CONFIG.noise.secondaryDivisor;
    const coastNoise = sampleValueNoise(
      warpedX * MAP_TOPOGRAPHY_CONFIG.noise.coastFrequency,
      warpedY * MAP_TOPOGRAPHY_CONFIG.noise.coastFrequency,
      detailHash
    );

    const upliftField = sampleSeedField(warpedX, warpedY, upliftSeeds);
    const basinField = sampleSeedField(warpedX, warpedY, basinSeeds);

    let tectonicUplift = 0;
    let tectonicRift = 0;

    for (const boundary of boundaries) {
      const distance = distanceToSegment(cell.site[0], cell.site[1], boundary) / diagonal;
      const influence = clamp(1 - distance / MAP_TOPOGRAPHY_CONFIG.boundary.influenceWidth, 0, 1);
      if (influence === 0) continue;

      const jaggedness =
        MAP_TOPOGRAPHY_CONFIG.noise.jaggedBase +
        sampleValueNoise(
          warpedX * MAP_TOPOGRAPHY_CONFIG.noise.jaggedFrequency,
          warpedY * MAP_TOPOGRAPHY_CONFIG.noise.jaggedFrequency,
          detailHash ^ cellIndex
        ) *
          MAP_TOPOGRAPHY_CONFIG.noise.jaggedRange;
      const value = influence * influence * boundary.strength * jaggedness;

      if (boundary.kind === 'collision') {
        tectonicUplift += value;
      } else {
        tectonicRift += value;
      }
    }

    tectonicUplift = clamp(
      tectonicUplift * MAP_TOPOGRAPHY_CONFIG.boundary.collisionScale,
      0,
      MAP_TOPOGRAPHY_CONFIG.blend.maxUplift
    );
    tectonicRift = clamp(
      tectonicRift * MAP_TOPOGRAPHY_CONFIG.boundary.riftScale,
      0,
      MAP_TOPOGRAPHY_CONFIG.blend.maxRift
    );

    // Keep a weak ocean shelf near borders, but not as a dominant elevation driver.
    const edgeDistance = Math.min(nx, 1 - nx, ny, 1 - ny);
    const shelf = smoothStep(
      (edgeDistance - MAP_TOPOGRAPHY_CONFIG.shelf.edgeOffset) /
        MAP_TOPOGRAPHY_CONFIG.shelf.edgeRange
    );

    baseElevations[cellIndex] = clamp(
      macroNoise * MAP_TOPOGRAPHY_CONFIG.blend.macro +
        secondaryNoise * MAP_TOPOGRAPHY_CONFIG.blend.secondary +
        upliftField * MAP_TOPOGRAPHY_CONFIG.blend.upliftField +
        tectonicUplift * MAP_TOPOGRAPHY_CONFIG.blend.tectonicUplift +
        coastNoise * MAP_TOPOGRAPHY_CONFIG.blend.coastNoise +
        shelf * MAP_TOPOGRAPHY_CONFIG.shelf.weight -
        basinField * MAP_TOPOGRAPHY_CONFIG.blend.basinField -
        tectonicRift * MAP_TOPOGRAPHY_CONFIG.blend.tectonicRift,
      0,
      1
    );
  }

  const elevations = applyTerrainPreset({
    mesh,
    seed,
    preset: terrainPreset,
    elevations: baseElevations,
  });

  const cells = mesh.cells.map((cell) => ({
    ...cell,
    ...buildCellTopography(elevations[cell.id], seaLevel),
  }));

  return { ...mesh, cells };
}
