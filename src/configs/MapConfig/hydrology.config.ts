export const CORE = {
  coastOutletId: -2,
  waterInfluence: { iterations: 6, selfWeight: 1.2 },
};

export const TERRAIN_RULES = {
  sea: { deepSeaLevel: 0.14, coastBand: 0.015, newLandWidth: 0.06 },
  cold: { tundraMaxTemp: 0.18, tundraElevMin: 0.9 },
  relief: {
    mountainElevMin: 0.78,
    hillElevMin: 0.66,
    plateauElevMin: 0.68,
    mountainMin: 0.075,
    hillMin: 0.04,
    plateauCap: 0.016,
    plateauPrecipMin: 0.22,
    plateauPrecipMax: 0.58,
    valleyMax: -0.01,
    valleyPrecipMin: 0.42,
    valley2Max: -0.008,
    valley2PrecipMin: 0.44,
    hills2Min: 0.03,
    badlandsMin: 0.012,
  },
  arid: {
    desertTempMin: 0.54,
    desertPrecipMax: 0.18,
    desertRainShadowMin: 0.34,
    aridDesertPrecipMax: 0.2,
    aridDesertRainShadowMin: 0.35,
    aridDesertTempMin: 0.56,
  },
  wet: {
    swampPrecipMin: 0.76,
    swampElevMax: 0.61,
    swampReliefCap: 0.009,
    forestPrecipMin: 0.56,
    forestTempMin: 0.22,
  },
  volcanic: {
    elevationDeltaFromMountainMin: 0.04,
    precipMax: 0.34,
    tempMin: 0.42,
  },
};

export const EROSION = {
  maxAmount: 0.08,
  slopeWeight: 0.2,
  flowWeight: 0.012,
  depositRate: 0.42,
};

export const LAKES = {
  sinkFlowMin: 8.8,
  expansion: { maxCells: 5, elevationSlack: 0.018, rainShadowMax: 0.34, precipMin: 0.28 },
  limits: { maxCount: 12 },
  enclosedWater: {
    maxLakeCells: 199,
    elevationBuffer: 0.04,
    depthMin: 0.055,
    shoreRiseFactor: 0.7,
    shoreRiseMax: 0.09,
  },
  plains: {
    largePlainMin: 90,
    veryLargePlainMin: 50,
  },
};

export const PRECIPITATION_MODEL = {
  baseWeights: {
    water: 0.56,
    latitude: 0.18,
    flow: 0.08,
  },
  orographicSimple: {
    elevationStart: 0.6,
    weight: 0.25,
    maxBonus: 0.25,
  },
  wind: {
    tradeLatMax: 0.23,
    westerlyLatMax: 0.7,
    tradeSpeed: 1,
    westerlySpeed: 1.05,
    polarSpeed: 0.75,
    equatorBlend: 0.22,
    noise: 0.18,
  },
  moistureAdvection: {
    iterations: 4,
    carry: 0.82,
    selfCarry: 0.18,
    localRecharge: 0.06,
    maxSource: 1,
  },
  orographic: {
    upliftScale: 1.1,
    leeDryingScale: 0.72,
    shieldingPow: 1.35,
    rainShadowGain: 0.75,
    rainShadowDecay: 0.8,
  },
  microphysics: {
    tauCloud: 3.2,
    tauFallout: 4.4,
    cloudDrawdown: 0.6,
  },
};

export const TEMPERATURE_MODEL = {
  seasonPhase: 0.25,
  latBase: 0.82,
  latCurve: 1.1,
  lapseDry: 0.72,
  lapseMoistMin: 0.36,
  precipLapseInfluence: 0.5,
  maritimeRadius: 18,
  maritimeStrength: 0.12,
  aspectStrength: 0.03,
  coldPoolStrength: 0.06,
  smoothingPasses: 1,
};

export const ELEVATION_CONFIG = {
  coast: 0.02,
  maxPlain: 0.24,
  maxValley: 0.3,
  minHighland: 0.34,
  minMountain: 0.52,
  minVolcanic: 0.56,
  minHill: 0.08,
  minBadland: 0.12,
};

export const LANDFORM_MODEL = {
  plateauFlatnessMaxAbsSlope: 0.12,
  mountainMinSlope: 0.16,
  valleyMax: -0.04,
  valleyMinFlowSignal: 0.22,
  valleyEnclosureMinRatio: 0.58,
  valleyMinHigherNeighborDelta: 0.035,
};

export const BIOME_MODEL = {
  desert: {
    hotTempMin: 0.62,
    hotAridityMax: 0.32,
    hotPrecipMax: 0.22,
    hotPlainAridityMax: 0.28,
    hotPlainPrecipMax: 0.2,
    coldTempMax: 0.48,
    coldAridityMax: 0.42,
    coldPrecipMax: 0.26,
    transitionTempMin: 0.5,
    transitionTempMax: 0.62,
    flowPenaltyScale: 0.18,
    humidPenaltyScale: 0.5,
    singleCellDryNeighborRatioMin: 0.34,
  },
  humanPlain: {
    baseThreshold: 0.66,
    impactGain: 0.38,
    waterBonusRiver: 0.28,
    waterBonusNearby: 0.2,
    tempIdeal: 0.55,
    tempTolerance: 0.24,
    desertNeighborPenalty: 0.42,
    maxDesertNeighborRatio: 0.4,
    neighborSmoothingPasses: 1,
  },
};
