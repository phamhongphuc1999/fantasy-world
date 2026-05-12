import { BIOME_CONFIG } from 'src/configs/map/terrain';
import { TBiome, TLandform } from 'src/types/map.types';
import { clamp } from '../utils/math';

type TClassifyBiomesInput = {
  landforms: TLandform[];
  temperature: Float32Array;
  precipitation: Float32Array;
  aridityIndex: Float32Array;
  temperatureSeasonality: Float32Array;
  precipitationSeasonality: Float32Array;
  elevationAboveSea: Float32Array;
  flow: Float32Array;
  neighborsByCell: number[][];
  isRiverByCell: Uint8Array;
  isLakeByCell: Uint8Array;
  humanImpact: number;
};

function bestScore(entries: Array<{ biome: TBiome; score: number }>) {
  let best = entries[0] as { biome: TBiome; score: number };
  for (let index = 1; index < entries.length; index += 1) {
    const next = entries[index] as { biome: TBiome; score: number };
    if (next.score > best.score) best = next;
  }
  return best.biome;
}

function classifyLandBiome(
  landform: TLandform,
  t: number,
  p: number,
  ai: number,
  tSeason: number,
  pSeason: number,
  elevSea: number,
  flow: number
): TBiome {
  const model = BIOME_CONFIG.desert;
  if (landform === 'marine_deep' || landform === 'marine_shallow') return 'marine';
  if (landform === 'lake') return 'freshwater';

  if (landform === 'mountain') {
    if (t < 0.14) return 'ice';
    if (t < 0.24) return 'tundra';
    return 'montane_shrub';
  }

  const dry = clamp(1 - ai, 0, 1);
  const humid = clamp(ai / 1.15, 0, 1);

  const scoreWetland =
    (landform === 'valley' ? 0.4 : 0) +
    p * 0.7 +
    humid * 0.55 +
    clamp(Math.log2(flow + 1) / 5, 0, 1) * 0.4 -
    tSeason * 0.2;

  const scoreTropicalForest =
    clamp((t - 0.55) * 2, 0, 1) * 0.8 + p * 0.45 + humid * 0.35 - pSeason * 0.2;
  const scoreTemperateForest =
    (1 - Math.abs(t - 0.5) * 1.35) * 0.75 + p * 0.38 + humid * 0.2 + (1 - tSeason) * 0.2;
  const scoreBorealForest =
    clamp(0.58 - t, 0, 1) * 0.68 + p * 0.24 + humid * 0.25 + clamp(elevSea - 0.12, 0, 1) * 0.2;
  const scoreSavanna =
    clamp((t - 0.45) * 1.9, 0, 1) * 0.65 +
    clamp(1 - Math.abs(p - 0.42) * 1.6, 0, 1) * 0.45 +
    pSeason * 0.22;
  const scoreGrassland =
    clamp(1 - Math.abs(p - 0.35) * 1.8, 0, 1) * 0.5 +
    clamp(1 - Math.abs(t - 0.45) * 1.5, 0, 1) * 0.35 +
    tSeason * 0.2;
  const scoreSteppe =
    dry * 0.62 +
    clamp(1 - Math.abs(t - 0.4) * 1.8, 0, 1) * 0.3 +
    pSeason * 0.2 +
    clamp(elevSea - 0.08, 0, 1) * 0.12;
  const flowSignal = clamp(Math.log2(flow + 1) / 5, 0, 1);
  const plainLike = landform === 'plain' || landform === 'valley' || landform === 'coast';
  const hotAridityMax = plainLike ? model.hotPlainAridityMax : model.hotAridityMax;
  const hotPrecipMax = plainLike ? model.hotPlainPrecipMax : model.hotPrecipMax;
  const allowHotDesert = t >= model.hotTempMin && ai <= hotAridityMax && p <= hotPrecipMax;
  const allowColdDesert =
    t <= model.coldTempMax && ai <= model.coldAridityMax && p <= model.coldPrecipMax;

  const hotHumidPenalty = clamp((ai - hotAridityMax) / 0.3, 0, 1) * model.humidPenaltyScale;
  const hotFlowPenalty = flowSignal * model.flowPenaltyScale;
  const scoreDesertHotCore =
    clamp((t - model.hotTempMin) * 2.3, 0, 1) * 0.8 + dry * 0.7 + pSeason * 0.1;
  const scoreDesertHot = allowHotDesert
    ? scoreDesertHotCore - hotHumidPenalty - hotFlowPenalty
    : Number.NEGATIVE_INFINITY;
  const scoreDesertCold = allowColdDesert
    ? clamp((model.coldTempMax - t) * 2.2, 0, 1) * 0.65 + dry * 0.65 + elevSea * 0.15
    : Number.NEGATIVE_INFINITY;
  const scoreTundra = clamp((0.26 - t) * 3, 0, 1) * 0.9 + elevSea * 0.2;
  const steppeTransitionBoost =
    t >= model.transitionTempMin && t <= model.transitionTempMax ? 0.18 : 0;

  return bestScore([
    { biome: 'wetland', score: scoreWetland },
    { biome: 'tropical_forest', score: scoreTropicalForest },
    { biome: 'temperate_forest', score: scoreTemperateForest },
    { biome: 'boreal_forest', score: scoreBorealForest },
    { biome: 'savanna', score: scoreSavanna },
    { biome: 'grassland', score: scoreGrassland },
    { biome: 'steppe', score: scoreSteppe + steppeTransitionBoost },
    { biome: 'desert_hot', score: scoreDesertHot },
    { biome: 'desert_cold', score: scoreDesertCold },
    { biome: 'tundra', score: scoreTundra },
  ]);
}

function postProcessDesertNoise(
  biomes: TBiome[],
  landforms: TLandform[],
  neighborsByCell: number[][]
) {
  const model = BIOME_CONFIG.desert;
  const next = [...biomes];
  const drySet = new Set<TBiome>(['desert_hot', 'desert_cold', 'steppe']);

  for (let cellIndex = 0; cellIndex < biomes.length; cellIndex += 1) {
    const biome = biomes[cellIndex] as TBiome;
    if (biome !== 'desert_hot' && biome !== 'desert_cold') continue;
    const landform = landforms[cellIndex] as TLandform;
    if (landform === 'mountain' || landform === 'marine_deep' || landform === 'marine_shallow') {
      continue;
    }
    const neighbors = neighborsByCell[cellIndex] || [];
    if (neighbors.length === 0) continue;
    let dryNeighbors = 0;
    for (const neighborId of neighbors) {
      if (drySet.has(biomes[neighborId] as TBiome)) dryNeighbors += 1;
    }
    const ratio = dryNeighbors / neighbors.length;
    if (ratio < model.singleCellDryNeighborRatioMin) {
      next[cellIndex] = 'steppe';
    }
  }

  return next;
}

function postProcessHumanPlain(
  biomes: TBiome[],
  landforms: TLandform[],
  temperature: Float32Array,
  precipitation: Float32Array,
  flow: Float32Array,
  neighborsByCell: number[][],
  isRiverByCell: Uint8Array,
  isLakeByCell: Uint8Array,
  humanImpact: number
) {
  const model = BIOME_CONFIG.humanPlain;
  const sourceBiomes = new Set<TBiome>([
    'temperate_forest',
    'tropical_forest',
    'boreal_forest',
    'grassland',
    'savanna',
    'steppe',
  ]);
  const desertBiomes = new Set<TBiome>(['desert_hot', 'desert_cold']);
  const next = [...biomes];
  const normalizedImpact = clamp(humanImpact, 0, 1);
  const threshold = model.baseThreshold - normalizedImpact * model.impactGain;

  for (let cellIndex = 0; cellIndex < biomes.length; cellIndex += 1) {
    const biome = biomes[cellIndex] as TBiome;
    const landform = landforms[cellIndex] as TLandform;
    const wetlandConvertible = biome === 'wetland' && landform === 'plain';
    if (!sourceBiomes.has(biome) && !wetlandConvertible) continue;
    if (landform === 'mountain' || landform === 'volcanic_field') continue;

    const neighbors = neighborsByCell[cellIndex] || [];
    let nearWater = isLakeByCell[cellIndex] === 1 ? 1 : 0;
    let desertNeighbors = 0;
    let nearbyWaterNeighbors = 0;
    for (const neighborId of neighbors) {
      const neighborBiome = biomes[neighborId] as TBiome;
      if (desertBiomes.has(neighborBiome)) desertNeighbors += 1;
      const neighborLandform = landforms[neighborId] as TLandform;
      if (
        neighborLandform === 'lake' ||
        neighborLandform === 'marine_shallow' ||
        isRiverByCell[neighborId] === 1 ||
        isLakeByCell[neighborId] === 1
      ) {
        nearbyWaterNeighbors += 1;
      }
    }
    if (isRiverByCell[cellIndex] === 1) nearWater += 1;
    const waterSignal =
      nearWater * model.waterBonusRiver +
      clamp(nearbyWaterNeighbors / Math.max(1, neighbors.length), 0, 1) * model.waterBonusNearby;

    const temp = temperature[cellIndex] as number;
    const tempSignal = clamp(1 - Math.abs(temp - model.tempIdeal) / model.tempTolerance, 0, 1);
    const precipSignal = clamp(precipitation[cellIndex], 0, 1) * 0.3;
    const flowSignal = clamp(Math.log2((flow[cellIndex] as number) + 1) / 6, 0, 1) * 0.2;
    const desertRatio = desertNeighbors / Math.max(1, neighbors.length);
    if (desertRatio > model.maxDesertNeighborRatio) continue;
    const desertPenalty = desertRatio * model.desertNeighborPenalty;

    const suitabilityScore =
      tempSignal * 0.45 + waterSignal + precipSignal + flowSignal - desertPenalty;
    if (suitabilityScore >= threshold) next[cellIndex] = 'plain';
  }

  for (let pass = 0; pass < model.neighborSmoothingPasses; pass += 1) {
    const smooth = [...next];
    for (let cellIndex = 0; cellIndex < smooth.length; cellIndex += 1) {
      if (next[cellIndex] !== 'plain') continue;
      const neighbors = neighborsByCell[cellIndex] || [];
      if (neighbors.length === 0) continue;
      let plainNeighbors = 0;
      let favorableNeighbors = 0;
      for (const neighborId of neighbors) {
        const neighborBiome = next[neighborId] as TBiome;
        if (neighborBiome === 'plain') plainNeighbors += 1;
        if (sourceBiomes.has(neighborBiome) || neighborBiome === 'plain') favorableNeighbors += 1;
      }
      if (plainNeighbors < 1 && favorableNeighbors < Math.ceil(neighbors.length * 0.34)) {
        smooth[cellIndex] = 'grassland';
      }
    }
    next.splice(0, next.length, ...smooth);
  }

  return next;
}

export function classifyBiomes({
  landforms,
  temperature,
  precipitation,
  aridityIndex,
  temperatureSeasonality,
  precipitationSeasonality,
  elevationAboveSea,
  flow,
  neighborsByCell,
  isRiverByCell,
  isLakeByCell,
  humanImpact,
}: TClassifyBiomesInput): TBiome[] {
  const biomes = new Array<TBiome>(landforms.length);

  for (let cellIndex = 0; cellIndex < landforms.length; cellIndex += 1) {
    biomes[cellIndex] = classifyLandBiome(
      landforms[cellIndex] as TLandform,
      temperature[cellIndex] as number,
      precipitation[cellIndex] as number,
      aridityIndex[cellIndex] as number,
      temperatureSeasonality[cellIndex] as number,
      precipitationSeasonality[cellIndex] as number,
      elevationAboveSea[cellIndex] as number,
      flow[cellIndex] as number
    );
  }

  const noDesertNoise = postProcessDesertNoise(biomes, landforms, neighborsByCell);
  return postProcessHumanPlain(
    noDesertNoise,
    landforms,
    temperature,
    precipitation,
    flow,
    neighborsByCell,
    isRiverByCell,
    isLakeByCell,
    humanImpact
  );
}
