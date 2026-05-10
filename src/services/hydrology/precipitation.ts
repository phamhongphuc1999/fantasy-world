import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TCell } from 'src/types/map.types';
import { clamp } from '../utils/math';
import { TWindVector } from './wind';

type TAdvancedPrecipitationInput = {
  cells: TCell[];
  height: number;
  seaLevel: number;
  flow: Float32Array;
  waterInfluence: Float32Array;
  windField: TWindVector[];
};

type TAdvancedPrecipitationOutput = {
  precipitation: Float32Array;
  rainShadow: Float32Array;
};

function dot(x1: number, y1: number, x2: number, y2: number) {
  return x1 * x2 + y1 * y2;
}

function getLatitudeFactor(y: number, height: number) {
  const latitude = Math.abs((y / Math.max(1, height)) * 2 - 1);
  return 1 - latitude;
}

function getAlongWindGradient(cell: TCell, cells: TCell[], wind: TWindVector) {
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

function getUpwindMoisture(cell: TCell, cells: TCell[], wind: TWindVector, moisture: Float32Array) {
  let totalWeight = 0;
  let totalMoisture = 0;

  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    const dx = cell.site[0] - neighbor.site[0];
    const dy = cell.site[1] - neighbor.site[1];
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.000001) continue;
    const projected = dot(dx / distance, dy / distance, wind.x, wind.y);
    if (projected <= 0) continue;
    totalWeight += projected;
    totalMoisture += moisture[neighborId] * projected;
  }

  if (totalWeight <= 0) return 0;
  return totalMoisture / totalWeight;
}

export function computeAdvancedPrecipitation({
  cells,
  height,
  seaLevel,
  flow,
  waterInfluence,
  windField,
}: TAdvancedPrecipitationInput): TAdvancedPrecipitationOutput {
  const cellCount = cells.length;
  const moisture = new Float32Array(cellCount);
  const nextMoisture = new Float32Array(cellCount);
  const cloud = new Float32Array(cellCount);
  const hydro = new Float32Array(cellCount);
  const precipitation = new Float32Array(cellCount);
  const rainShadow = new Float32Array(cellCount);
  const dryMemory = new Float32Array(cellCount);

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    moisture[cellIndex] = clamp(
      waterInfluence[cellIndex] * HYDROLOGY_CONFIG.moistureAdvection.maxSource,
      0,
      1
    );
  }

  for (
    let iteration = 0;
    iteration < HYDROLOGY_CONFIG.moistureAdvection.iterations;
    iteration += 1
  ) {
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      const cell = cells[cellIndex];
      const wind = windField[cellIndex];
      const upwindMoisture = getUpwindMoisture(cell, cells, wind, moisture);
      const advectedMoisture =
        upwindMoisture * HYDROLOGY_CONFIG.moistureAdvection.carry +
        moisture[cellIndex] * HYDROLOGY_CONFIG.moistureAdvection.selfCarry;
      const recharge =
        waterInfluence[cellIndex] *
        HYDROLOGY_CONFIG.moistureAdvection.localRecharge *
        (iteration + 1);
      const localMoisture = clamp(
        Math.max(moisture[cellIndex], advectedMoisture + recharge),
        0,
        1.25
      );

      const gradient = getAlongWindGradient(cell, cells, wind) * wind.speed * 100;
      const uplift = Math.max(0, gradient);
      const descent = Math.max(0, -gradient);

      const cloudSource = uplift * HYDROLOGY_CONFIG.orographic.upliftScale * localMoisture;
      const cloudLoss = cloud[cellIndex] / HYDROLOGY_CONFIG.microphysics.tauCloud;
      const nextCloud = Math.max(0, cloud[cellIndex] + cloudSource - cloudLoss);
      const hydroGain = cloudLoss;
      const hydroLoss = hydro[cellIndex] / HYDROLOGY_CONFIG.microphysics.tauFallout;
      const nextHydro = Math.max(0, hydro[cellIndex] + hydroGain - hydroLoss);
      const mountainRain = hydroLoss;

      const leeDrying =
        descent *
        HYDROLOGY_CONFIG.orographic.leeDryingScale *
        Math.pow(Math.max(0, localMoisture), HYDROLOGY_CONFIG.orographic.shieldingPow);

      const rainShadowIndex = clamp(
        dryMemory[cellIndex] * HYDROLOGY_CONFIG.orographic.rainShadowDecay +
          leeDrying * HYDROLOGY_CONFIG.orographic.rainShadowGain,
        0,
        1
      );

      const elevationRain = clamp(
        Math.max(0, cell.elevation - HYDROLOGY_CONFIG.oroElevStart) * HYDROLOGY_CONFIG.oroW,
        0,
        HYDROLOGY_CONFIG.oroMax
      );
      const latitudeRain = getLatitudeFactor(cell.site[1], height) * HYDROLOGY_CONFIG.precipLatW;
      const flowRain = Math.log2(flow[cellIndex] + 1) * HYDROLOGY_CONFIG.precipFlowW;
      const baseRain = waterInfluence[cellIndex] * HYDROLOGY_CONFIG.precipWaterW;
      const totalPrecipitation = clamp(
        baseRain + latitudeRain + flowRain + elevationRain + mountainRain - rainShadowIndex,
        0,
        1
      );

      const consumed = cloudSource * HYDROLOGY_CONFIG.microphysics.cloudDrawdown + leeDrying;
      nextMoisture[cellIndex] = clamp(
        localMoisture - consumed + totalPrecipitation * 0.08,
        0,
        1.25
      );
      cloud[cellIndex] = nextCloud;
      hydro[cellIndex] = nextHydro;
      precipitation[cellIndex] = totalPrecipitation;
      rainShadow[cellIndex] = rainShadowIndex;
      dryMemory[cellIndex] = rainShadowIndex;
    }

    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      moisture[cellIndex] = nextMoisture[cellIndex];
    }
  }

  // Preserve ocean/lake humidity and avoid noisy artifacts exactly at sea level boundaries.
  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const cell = cells[cellIndex];
    if (cell.isWater || cell.elevation <= seaLevel) {
      rainShadow[cellIndex] = 0;
      precipitation[cellIndex] = clamp(precipitation[cellIndex] + 0.06, 0, 1);
    }
  }

  return { precipitation, rainShadow };
}
