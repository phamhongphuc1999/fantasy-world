import { TOPOGRAPHY_CONFIG } from 'src/configs/map/topography';
import { simplex2D } from 'src/services/utils/math';

export type TNoiseSampler = {
  value: (x: number, y: number, seedHash: number) => number;
  fractal: (x: number, y: number, seedHash: number) => number;
  ridged: (x: number, y: number, seedHash: number) => number;
  billow: (x: number, y: number, seedHash: number) => number;
};

const NOISE = TOPOGRAPHY_CONFIG.noise;

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

export function createNoiseSampler(): TNoiseSampler {
  return {
    value: simplex2D,
    fractal: sampleFractalNoise,
    ridged: sampleRidgedNoise,
    billow: sampleBillowyNoise,
  };
}
