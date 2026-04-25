import { Delaunay } from 'd3-delaunay';
import { classifyTerrain } from 'src/features/map/core/classifyTerrain';
import { hashSeed } from 'src/features/map/core/seededRandom';
import { TMapCell, TMapMesh, TPoint, TTopographyCellData } from 'src/types/global';

interface TBuildTopographyOptions {
  mesh: TMapMesh & { delaunay: Delaunay<TPoint> };
  seed: string;
  seaLevel: number;
}

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
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
  const octaveA = sampleValueNoise(x * 1.4, y * 1.4, seedHash);
  const octaveB = sampleValueNoise(x * 2.8, y * 2.8, seedHash ^ 0x9e3779b9);
  const octaveC = sampleValueNoise(x * 5.6, y * 5.6, seedHash ^ 0x85ebca6b);

  return octaveA + octaveB * 0.5 + octaveC * 0.25;
}

function buildCellTopography(
  cell: TMapCell,
  width: number,
  height: number,
  seedHash: number,
  seaLevel: number
): TTopographyCellData {
  const normalizedX = cell.site[0] / width;
  const normalizedY = cell.site[1] / height;
  const centeredX = normalizedX * 2 - 1;
  const centeredY = normalizedY * 2 - 1;
  const distanceFromCenter = Math.sqrt(centeredX * centeredX + centeredY * centeredY);
  const continentFalloff = Math.max(0, 1 - distanceFromCenter * 0.9);
  const noise = sampleFractalNoise(normalizedX, normalizedY, seedHash) / 1.75;
  const ridgeNoise =
    Math.abs(sampleValueNoise(normalizedX * 8.5, normalizedY * 8.5, seedHash ^ 0x27d4eb2d) - 0.5) *
    0.28;
  const elevation = Math.min(1, Math.max(0, noise * 0.72 + continentFalloff * 0.42 + ridgeNoise));
  const terrain = classifyTerrain(elevation, seaLevel);

  return {
    elevation,
    isWater: elevation < seaLevel,
    terrain,
  };
}

export function buildTopography({
  mesh,
  seed,
  seaLevel,
}: TBuildTopographyOptions): TMapMesh & { delaunay: Delaunay<TPoint> } {
  const seedHash = hashSeed(`${seed}:topography`);
  const cells = mesh.cells.map((cell) => ({
    ...cell,
    ...buildCellTopography(cell, mesh.width, mesh.height, seedHash, seaLevel),
  }));

  return {
    ...mesh,
    cells,
  };
}
