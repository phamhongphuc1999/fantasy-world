import { TMapDisplaySettings, TTerrainPreset, TTerrainRatioMap } from 'src/types/map.types';

export const NATION_COLOR = [
  '#e6194b', // red
  '#3cb44b', // green
  '#f58231', // orange
  '#f032e6', // magenta (kept - distinct enough)
  '#bcf60c', // lime
  '#fabebe', // pink
  '#008080', // teal (kept - borderline but still distinguishable)
  '#9a6324', // brown
  '#fffac8', // light yellow
  '#800000', // maroon
  '#aaffc3', // light green
  '#808000', // olive
  '#ffd8b1', // peach
  '#ff7f00', // vivid amber
  '#00ff7f', // spring green
  '#ff1493', // deep pink
  '#ff4500', // orange red
  '#2e8b57', // sea green
  '#8b0000', // dark red
  '#daa520', // goldenrod
  '#ffcc00', // strong yellow
  '#ff8c00', // dark orange
  '#cc5500', // burnt orange
  '#556b2f', // dark olive green
  '#8fbc8f', // muted green
  '#cd853f', // peru (earth tone)
  '#a0522d', // sienna
  '#deb887', // burlywood
];

export const DEFAULT_CONFIG: {
  seed: string;
  cellCount: number;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
  nationCount: number;
  terrainRatios: TTerrainRatioMap;
  displaySettings: TMapDisplaySettings;
} = {
  seed: 'world-001',
  cellCount: 10000,
  seaLevel: 0.5,
  terrainPreset: 'balanced',
  nationCount: 8,
  terrainRatios: {
    plains: 0.35,
    forest: 0.2,
    swamp: 0.12,
    desert: 0.07,
    hills: 0.1,
    mountains: 0.08,
    plateau: 0.08,
  },
  displaySettings: {
    terrain: true,
    rivers: false,
    countryBorders: false,
    countryFill: false,
    provinceBorders: false,
    ethnicBorders: false,
    ethnicFill: false,
    labels: false,
    cellData: false,
  },
};

export const MAP_VIEWPORT_CONFIG = {
  width: 1200,
  height: 760,
  minCells: 100,
  maxCells: 10000,
};

export const TERRAIN_CONFIG = {
  deepWaterOffset: 0.15,
  coastBand: 0.02,
  plainsMax: 0.62,
  hillsMax: 0.76,
  mountainsMax: 0.9,
};

export const TOPOGRAPHY_CONFIG = {
  boundary: {
    collisionBaseCount: 7,
    collisionExtraCount: 4,
    riftBaseCount: 4,
    riftExtraCount: 3,
    halfLengthMin: 0.11,
    halfLengthRange: 0.25,
    strengthBase: 0.75,
    strengthRange: 0.6,
    influenceWidth: 0.12,
    collisionScale: 0.26,
    riftScale: 0.2,
  },
  seeds: {
    upliftCount: 10,
    basinCount: 8,
    xMargin: 0.03,
    yMargin: 0.03,
    span: 0.94,
    upliftRadiusBase: 0.06,
    upliftRadiusRange: 0.1,
    basinRadiusBase: 0.08,
    basinRadiusRange: 0.12,
    upliftAmplitudeBase: 0.2,
    upliftAmplitudeRange: 0.22,
    basinAmplitudeBase: 0.16,
    basinAmplitudeRange: 0.18,
  },
  warp: {
    frequency: 2.2,
    strength: 0.2,
    secondaryFrequency: 5.1,
    secondaryStrength: 0.08,
  },
  noise: {
    macroDivisor: 1.58,
    secondaryFrequency: 1.6,
    secondaryDivisor: 1.95,
    coastFrequency: 8.4,
    jaggedFrequency: 5.2,
    jaggedBase: 0.72,
    jaggedRange: 0.62,
    fbm: {
      octaves: 8,
      persistence: 0.53,
      lacunarity: 2.08,
    },
    ridged: {
      octaves: 7,
      persistence: 0.49,
      lacunarity: 2.2,
      sharpness: 1.75,
    },
    billow: {
      octaves: 7,
      persistence: 0.5,
      lacunarity: 1.96,
    },
  },
  shelf: {
    edgeOffset: 0.005,
    edgeRange: 0.18,
    weight: 0.05,
  },
  blend: {
    macro: 0.3,
    secondary: 0.18,
    ridged: 0.22,
    billow: 0.14,
    erosionMask: 0.12,
    upliftField: 0.3,
    tectonicUplift: 0.38,
    coastNoise: 0.08,
    basinField: 0.26,
    tectonicRift: 0.24,
    maxUplift: 1.2,
    maxRift: 1,
  },
  mountainRecovery: {
    quantileStart: 0.86,
    peakBoostMax: 0.14,
  },
};

export const PRESET_CONFIG = {
  balanced: {
    rangeBands: { count: 7, amplitude: 0.2, width: 0.11 },
    valleyBands: { count: 5, depth: 0.12, width: 0.12 },
    edgeShelfStrength: 0.24,
    smoothFactor: 0.2,
  },
  ranges: {
    rangeBands: { count: 10, amplitude: 0.24, width: 0.09 },
    valleyBands: { count: 4, depth: 0.1, width: 0.1 },
    edgeShelfStrength: 0.2,
    smoothFactor: 0.16,
  },
  rifted: {
    rangeBands: { count: 8, amplitude: 0.17, width: 0.1 },
    valleyBands: { count: 8, depth: 0.16, width: 0.08 },
    globalScale: { offset: -0.02, scale: 0.98 },
    edgeShelfStrength: 0.22,
    smoothFactor: 0.18,
  },
  archipelago: {
    majorIslandMin: 1,
    majorIslandMax: 2,
    mediumIslandBase: 4,
    mediumIslandExtra: 3,
    smallIslandBase: 16,
    smallIslandExtra: 8,
    valleyBands: { count: 7, depth: 0.1, width: 0.1 },
    edgeShelfStrength: 0.3,
    smoothFactor: 0.14,
  },
};

export const HYDROLOGY_CONFIG = {
  coastOutletId: -2,
  waterInfluenceIterations: 6,
  waterInfluenceSelfWeight: 1.2,
  rainShadowMinElevationDelta: 0.03,
  rainShadowScale: 2.8,
  deepWaterOffset: 0.14,
  coastBand: 0.015,
  valleyReliefThreshold: -0.01,
  valleyPrecipitationMin: 0.42,
  tundraTemperatureMax: 0.18,
  tundraElevationMin: 0.9,
  mountainElevationMin: 0.78,
  hillElevationMin: 0.66,
  plateauElevationMin: 0.68,
  reliefMountainMin: 0.075,
  reliefHillMin: 0.04,
  plateauReliefMax: 0.016,
  emergedLandBand: 0.06,
  desertTemperatureMin: 0.54,
  desertPrecipitationMax: 0.18,
  desertRainShadowMin: 0.34,
  swampPrecipitationMin: 0.76,
  swampElevationMax: 0.61,
  swampReliefMax: 0.009,
  forestPrecipitationMin: 0.56,
  erosionMax: 0.08,
  erosionSlopeWeight: 0.2,
  erosionFlowWeight: 0.012,
  depositFactor: 0.42,
  lakeSinkFlowMin: 8.8,
  lakeSinkPrecipitationMin: 0.62,
  riverFlowMin: 5.3,
  dryRiverFlowPenalty: 2.4,
  dryRiverPrecipitationMax: 0.27,
  dryRiverRainShadowMin: 0.26,
  lakeExpansionMaxCells: 5,
  lakeExpansionElevationSlack: 0.018,
  lakeExpansionRainShadowMax: 0.34,
  lakeExpansionPrecipitationMin: 0.28,
  maxLakeCount: 12,
  largeLakeMinCells: 4,
  enclosedLakeMaxCells: 199,
  enclosedWaterElevationBuffer: 0.04,
  enclosedWaterPersistentDepthMin: 0.055,
  enclosedWaterDepthShoreFactor: 0.7,
  enclosedWaterDepthShoreMax: 0.09,
  riverSourceElevationMin: 0.78,
  plainRiverSourceFlowMin: 3.8,
  tundraRiverSourceFlowMin: 4.8,
  riverMinLength: 6,
  riverTargetLandThreshold: 2200,
  largeRiverMinCountLargeLand: 2,
  largeRiverMaxCountLargeLand: 3,
  smallRiverTargetLargeLand: 14,
  largeRiverCountSmallLand: 1,
  smallRiverTargetSmallLand: 5,
  minRiverCount: 16,
  largePlainMinCells: 90,
  veryLargePlainMinCells: 50,
  largeRiverPlainPriorityBonus: 4,
  veryLargePlainRiverBonus: 8.5,
  veryLargePlainSeaOutletBonus: 4.8,
  veryLargePlainMinRiverCount: 10,
  riverLengthPriorityWeight: 0.56,
  tributaryJoinBonus: 4.2,
  tributaryMaxOverlapRatio: 1,
  inlandPlainTributaryMinFlow: 2.2,
  inlandPlainTributaryMinLength: 10,
  inlandPlainTributaryMaxPerPlain: 10,
  highlandRiverExtensionMaxSteps: 26,
  highlandRiverExtensionMinFlow: 1.6,
  highlandRiverTargetElevationMin: 0.64,
  relaxedRiverSourceElevationDrop: 0.14,
  relaxedRiverMinLength: 4,
  relaxedRiverFlowMin: 2.8,
  temperatureLatitudeWeight: 0.85,
  temperatureElevationWeight: 0.72,
  temperatureWaterWeight: 0.08,
  precipitationWaterWeight: 0.56,
  precipitationLatitudeWeight: 0.18,
  precipitationFlowWeight: 0.08,
  precipitationRainShadowWeight: 0.38,
  orographicElevationStart: 0.6,
  orographicWeight: 0.25,
  orographicMax: 0.25,
  regionalization: {
    minRegionBase: 6,
    minRegionScale: 0.35,
    smoothingPasses: 2,
    dominantMinCount: 3,
    dominantScoreBonus: 0.24,
    currentScoreBonus: 0.15,
    switchMargin: 0.2,
  },
  terrainBalance: {
    plainsMinShare: 0.3,
    plainsMaxShare: 0.4,

    forestMinShare: 0.18,
    forestMaxShare: 0.26,

    swampMinShare: 0.12,
    swampMaxShare: 0.2,

    desertMinShare: 0.05,
    desertMaxShare: 0.1,

    badlandsMaxShare: 0.07,

    volcanicMaxShare: 0.04,

    hillsMinShare: 0.08,
    hillsMaxShare: 0.15,

    mountainsMinShare: 0.06,
    mountainsMaxShare: 0.13,

    plateauMinShare: 0.05,
    plateauMaxShare: 0.1,
  },
  terrainClusterMinCells: {
    forest: 10,
    mountains: 8,
    hills: 7,
    swamp: 6,
    desert: 6,
    badlands: 5,
    volcanic: 4,
    valley: 5,
    plateau: 7,
  },
  antiAlias: {
    isolatedNeighborMax: 1,
    dominantNeighborMin: 3,
    passes: 2,
  },
};

export const GEOPOLITICAL_CONFIG = {
  targetLandCellsPerNation: 620,
  minNationLandRatio: 0,
  minNationLandCells: 10,
  territorialRadiusMinCells: 3,
  territorialRadiusMaxCells: 3,
  narrowStraitThresholdCells: 6,
  frontierNoiseWeight: 0.22,
  borderLevels: {
    country: {
      terrainCost: {
        plains: 1.1,
        valley: 0.95,
        coast: 0.9,
        forest: 1.2,
        swamp: 1.9,
        hills: 1.9,
        plateau: 1.8,
        mountains: 7.8,
        volcanic: 8.6,
        desert: 2.1,
        badlands: 2.4,
        tundra: 1.8,
      },
      featurePenalty: {
        riverCross: 7.8,
        lakeCross: 8.4,
        ridgeCross: 10.5,
        shorelineEdgeBias: -0.3,
      },
      fragmentation: {
        maxMountainOwnersPerCluster: 2,
        largeMountainClusterMinCells: 10,
        clusterSplitPenalty: 2.8,
      },
      smoothness: {
        edgeNoiseWeight: 0.16,
        jaggedPenalty: 0.5,
      },
    },
    province: {
      terrainCost: {
        plains: 1,
        valley: 0.95,
        coast: 1.15,
        forest: 1.35,
        swamp: 1.85,
        hills: 1.6,
        plateau: 1.7,
        mountains: 3.5,
        volcanic: 4.2,
        desert: 1.9,
        badlands: 2.1,
        tundra: 1.6,
      },
      featurePenalty: {
        riverCross: 3.4,
        lakeCross: 4.2,
        ridgeCross: 4.8,
        shorelineEdgeBias: -0.2,
      },
      fragmentation: {
        maxMountainOwnersPerCluster: 3,
        largeMountainClusterMinCells: 7,
        clusterSplitPenalty: 1.4,
      },
      smoothness: {
        edgeNoiseWeight: 0.08,
        jaggedPenalty: 0.25,
      },
    },
  },
  hubCount: {
    smallNationMinLand: 450,
    mediumNationMinLand: 900,
    maxHubsPerNation: 3,
  },
  ethnic: {
    majorGroupCountMin: 6,
    majorGroupCountMax: 12,
    dominantShareMin: 0.5,
    dominantShareMax: 0.8,
    secondaryShareMin: 0.1,
    secondaryShareMax: 0.3,
    crossBorderBlend: 0.72,
    fragmentationLevel: 0.38,
    terrainInfluenceStrength: 1,
    distancePenalty: 0.045,
    smoothingPasses: 1,
    minorityClusterMinCells: 5,
  },
};
