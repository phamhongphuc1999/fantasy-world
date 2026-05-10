import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TCell } from 'src/types/map.types';
import { hashSeed } from '../core/seededRandom';
import { clamp } from '../utils/math';
import { isMarineWaterTerrain } from '../terrain/rules';
import { TWindVector } from './wind';

type TComputeAdvancedTemperatureInput = {
  cells: TCell[];
  seaLevel: number;
  seed: string;
  waterInfluence: Float32Array;
  precipitation: Float32Array;
  flow: Float32Array;
  reliefByCell: Float32Array;
  windField: TWindVector[];
  height: number;
};

function dot(x1: number, y1: number, x2: number, y2: number) {
  return x1 * x2 + y1 * y2;
}

function buildMarineDistance(cells: TCell[]) {
  const distance = new Int16Array(cells.length);
  distance.fill(-1);
  const queue: number[] = [];

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (!isMarineWaterTerrain(cells[cellIndex].terrain)) continue;
    distance[cellIndex] = 0;
    queue.push(cellIndex);
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head] as number;
    head += 1;
    const nextDistance = distance[current] + 1;
    for (const neighborId of cells[current].neighbors) {
      if (distance[neighborId] >= 0) continue;
      distance[neighborId] = nextDistance;
      queue.push(neighborId);
    }
  }

  return distance;
}

function getAlongWindSlope(cell: TCell, cells: TCell[], wind: TWindVector) {
  let numerator = 0;
  let denominator = 0;
  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    const dx = neighbor.site[0] - cell.site[0];
    const dy = neighbor.site[1] - cell.site[1];
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.000001) continue;
    const along = dot(dx / distance, dy / distance, wind.x, wind.y);
    if (Math.abs(along) <= 0.000001) continue;
    numerator += ((neighbor.elevation - cell.elevation) / distance) * along;
    denominator += Math.abs(along);
  }
  if (denominator <= 0.000001) return 0;
  return numerator / denominator;
}

function smoothTemperature(cells: TCell[], temperature: Float32Array) {
  const next = new Float32Array(temperature.length);
  for (let pass = 0; pass < HYDROLOGY_CONFIG.temperatureModel.smoothingPasses; pass += 1) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (cell.neighbors.length === 0) {
        next[cellIndex] = temperature[cellIndex] as number;
        continue;
      }
      let total = temperature[cellIndex];
      for (const neighborId of cell.neighbors) total += temperature[neighborId];
      next[cellIndex] = total / (cell.neighbors.length + 1);
    }
    for (let cellIndex = 0; cellIndex < temperature.length; cellIndex += 1) {
      temperature[cellIndex] = next[cellIndex] as number;
    }
  }
}

export function computeAdvancedTemperature({
  cells,
  seaLevel,
  seed,
  waterInfluence,
  precipitation,
  flow,
  reliefByCell,
  windField,
  height,
}: TComputeAdvancedTemperatureInput) {
  const temperature = new Float32Array(cells.length);
  const marineDistance = buildMarineDistance(cells);
  const seasonNoise = ((hashSeed(`${seed}:temperature:season`) % 10000) / 9999) * 2 - 1;
  const seasonPhase = HYDROLOGY_CONFIG.temperatureModel.seasonPhase + seasonNoise * 0.08;
  const seasonOffset = Math.sin(Math.PI * 2 * seasonPhase) * 0.04;

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    const latitude = Math.abs((cell.site[1] / height) * 2 - 1);
    const latitudeCooling =
      Math.pow(latitude, HYDROLOGY_CONFIG.temperatureModel.latCurve) *
      HYDROLOGY_CONFIG.temperatureModel.latBase;

    const moistFactor = clamp(precipitation[cellIndex], 0, 1);
    const lapseRate =
      HYDROLOGY_CONFIG.temperatureModel.lapseDry -
      moistFactor * HYDROLOGY_CONFIG.temperatureModel.precipLapseInfluence;
    const effectiveLapse = Math.max(HYDROLOGY_CONFIG.temperatureModel.lapseMoistMin, lapseRate);
    const elevationCooling = Math.max(0, cell.elevation - seaLevel) * effectiveLapse;

    const marineDist = marineDistance[cellIndex];
    const maritimeInfluence =
      marineDist < 0
        ? 0
        : clamp(
            1 - marineDist / Math.max(1, HYDROLOGY_CONFIG.temperatureModel.maritimeRadius),
            0,
            1
          );
    const maritimeModeration =
      (waterInfluence[cellIndex] * 0.5 + maritimeInfluence * 0.5) *
      HYDROLOGY_CONFIG.temperatureModel.maritimeStrength;

    const alongWindSlope = getAlongWindSlope(cell, cells, windField[cellIndex] as TWindVector);
    const aspectCooling =
      clamp(alongWindSlope * 80, -1, 1) * HYDROLOGY_CONFIG.temperatureModel.aspectStrength;
    const coldPool =
      Math.max(0, -reliefByCell[cellIndex]) *
      Math.max(0, 1 - flow[cellIndex] / 4) *
      HYDROLOGY_CONFIG.temperatureModel.coldPoolStrength;

    temperature[cellIndex] = clamp(
      1 -
        latitudeCooling -
        elevationCooling +
        maritimeModeration -
        aspectCooling -
        coldPool +
        seasonOffset,
      0,
      1
    );
  }

  smoothTemperature(cells, temperature);
  return temperature;
}
