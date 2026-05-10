import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TCell } from 'src/types/map.types';
import { hashSeed } from '../core/seededRandom';

export type TWindVector = {
  x: number;
  y: number;
  speed: number;
};

function normalize(x: number, y: number) {
  const length = Math.hypot(x, y);
  if (length <= 0.000001) return { x: 1, y: 0 };
  return { x: x / length, y: y / length };
}

function signedLatitude(y: number, height: number) {
  return (y / Math.max(1, height)) * 2 - 1;
}

function baseWind(latitude: number) {
  const absLat = Math.abs(latitude);
  const toEquator = latitude > 0 ? 1 : -1;
  const toPole = latitude > 0 ? -1 : 1;

  if (absLat <= HYDROLOGY_CONFIG.wind.tradeLatMax) {
    const equatorBlend = 1 - absLat / Math.max(0.0001, HYDROLOGY_CONFIG.wind.tradeLatMax);
    return {
      x: -1,
      y: toEquator * HYDROLOGY_CONFIG.wind.equatorBlend * equatorBlend,
      speed: HYDROLOGY_CONFIG.wind.tradeSpeed,
    };
  }

  if (absLat <= HYDROLOGY_CONFIG.wind.westerlyLatMax) {
    return {
      x: 1,
      y: toPole * 0.2,
      speed: HYDROLOGY_CONFIG.wind.westerlySpeed,
    };
  }

  return {
    x: -1,
    y: toEquator * 0.15,
    speed: HYDROLOGY_CONFIG.wind.polarSpeed,
  };
}

export function buildWindField(cells: TCell[], height: number, seed: string): TWindVector[] {
  const noiseStrength = HYDROLOGY_CONFIG.wind.noise;

  return cells.map((cell) => {
    const latitude = signedLatitude(cell.site[1], height);
    const base = baseWind(latitude);
    const noiseHash = hashSeed(`${seed}:wind:${cell.id}`);
    const noise = ((noiseHash % 10000) / 9999) * 2 - 1;
    const nx = base.x + noise * noiseStrength;
    const ny = base.y + noise * noiseStrength * 0.7;
    const direction = normalize(nx, ny);
    return {
      x: direction.x,
      y: direction.y,
      speed: base.speed,
    };
  });
}
