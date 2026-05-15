import { DEFAULT_CONFIG } from 'src/configs/map/common';
import { TDelaunayMesh, TGenerationConfig, TGenerationStages } from 'src/types/map.types';
import { describe, expect, it } from 'vitest';
import { MapGenerator } from './pipeline/MapGenerator';

type TStageSignature = {
  cells: number;
  edges: number;
  vertices: number;
  landCells: number;
  riverCells: number;
  lakeCells: number;
  totalPopulation: number;
  nationCount: number;
  ethnicGroupCount: number;
  hash: string;
};

type TPipelineSignature = {
  mesh: TStageSignature;
  topography: TStageSignature;
  hydrology: TStageSignature;
  population: TStageSignature;
  geopolitics: TStageSignature;
};

function runMapGenerationStages(config: TGenerationConfig): TGenerationStages {
  const generator = new MapGenerator(config);
  return generator.generate();
}

function fnv1a64Hex(parts: readonly string[]) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= BigInt(part.charCodeAt(index));
      hash = (hash * prime) & 0xffffffffffffffffn;
    }
  }

  return hash.toString(16).padStart(16, '0');
}

function toStageSignature(mesh: TDelaunayMesh): TStageSignature {
  let landCells = 0;
  let riverCells = 0;
  let lakeCells = 0;
  let totalPopulation = 0;
  const hashParts: string[] = [];

  for (const cell of mesh.cells) {
    if (!cell.isWater) landCells += 1;
    if (cell.isRiver) riverCells += 1;
    if (cell.isLake) lakeCells += 1;
    totalPopulation += cell.population;

    hashParts.push(
      [
        cell.id,
        Math.round(cell.site[0] * 1000),
        Math.round(cell.site[1] * 1000),
        Math.round(cell.elevation * 1_000_000),
        cell.isWater ? 1 : 0,
        cell.landform,
        cell.biome,
        Math.round(cell.flow * 1000),
        cell.downstreamId ?? -99,
        Math.round(cell.erosion * 1_000_000),
        cell.isRiver ? 1 : 0,
        cell.isLake ? 1 : 0,
        Math.round(cell.temperature * 1_000_000),
        Math.round(cell.precipitation * 1_000_000),
        Math.round(cell.rainShadow * 1_000_000),
        cell.population,
        Math.round(cell.waterAccessScore * 1_000_000),
        cell.nationId ?? -1,
        cell.provinceId ?? -1,
        cell.ethnicId ?? -1,
        cell.zoneType,
        cell.isCapital ? 1 : 0,
        cell.isEconomicHub ? 1 : 0,
      ].join('|')
    );
  }

  return {
    cells: mesh.cells.length,
    edges: mesh.edges.length,
    vertices: mesh.vertices.length,
    landCells,
    riverCells,
    lakeCells,
    totalPopulation,
    nationCount: mesh.nations.length,
    ethnicGroupCount: mesh.ethnics.length,
    hash: fnv1a64Hex(hashParts),
  };
}

function toPipelineSignature(config: TGenerationConfig): TPipelineSignature {
  const stages = runMapGenerationStages(config);
  return {
    mesh: toStageSignature(stages.mesh),
    topography: toStageSignature(stages.topography),
    hydrology: toStageSignature(stages.hydrology),
    population: toStageSignature(stages.population),
    geopolitics: toStageSignature(stages.geopolitics),
  };
}

function makeConfig(seed: string): TGenerationConfig {
  return {
    width: DEFAULT_CONFIG.width,
    height: DEFAULT_CONFIG.height,
    seed,
    cellCount: 2000,
    seaLevel: DEFAULT_CONFIG.seaLevel,
    topography: DEFAULT_CONFIG.topography,
    nationCount: DEFAULT_CONFIG.nationCount,
    climateControl: DEFAULT_CONFIG.climateControl,
  };
}

const BASELINE_CONFIGS: TGenerationConfig[] = [
  makeConfig('world-deterministic-001'),
  makeConfig('world-deterministic-002'),
  makeConfig('world-deterministic-003'),
  {
    ...makeConfig('world-deterministic-004'),
    cellCount: 1600,
    seaLevel: 0.5,
    topography: 'archipelago',
  },
  {
    ...makeConfig('world-deterministic-005'),
    cellCount: 2400,
    seaLevel: 0.58,
    topography: 'ranges',
    nationCount: 10,
    climateControl: {
      ...DEFAULT_CONFIG.climateControl,
      temperatureOffset: -0.06,
      precipitationScale: 0.9,
      humanImpact: 0.35,
    },
  },
];

describe('runMapGenerationStages deterministic snapshots', () => {
  it('returns identical stage signatures for same config', () => {
    const config = makeConfig('world-deterministic-001');
    const first = toPipelineSignature(config);
    const second = toPipelineSignature(config);
    expect(second).toEqual(first);
  });

  it('matches locked snapshot for baseline seed and config', () => {
    const signature = toPipelineSignature(makeConfig('world-deterministic-001'));
    expect(signature).toMatchInlineSnapshot(`
      {
        "geopolitics": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 13,
          "hash": "17ccb34ddbc848ef",
          "lakeCells": 99,
          "landCells": 756,
          "nationCount": 10,
          "riverCells": 108,
          "totalPopulation": 2015659,
          "vertices": 4002,
        },
        "hydrology": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "911082cc8eeb15d9",
          "lakeCells": 99,
          "landCells": 756,
          "nationCount": 0,
          "riverCells": 108,
          "totalPopulation": 0,
          "vertices": 4002,
        },
        "mesh": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "4e5ccd9f78425bb3",
          "lakeCells": 0,
          "landCells": 2000,
          "nationCount": 0,
          "riverCells": 0,
          "totalPopulation": 0,
          "vertices": 4002,
        },
        "population": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "608d53c83651f31d",
          "lakeCells": 99,
          "landCells": 756,
          "nationCount": 0,
          "riverCells": 108,
          "totalPopulation": 548130,
          "vertices": 4002,
        },
        "topography": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "b659df3b9c49fce0",
          "lakeCells": 0,
          "landCells": 848,
          "nationCount": 0,
          "riverCells": 0,
          "totalPopulation": 0,
          "vertices": 4002,
        },
      }
    `);
  });

  it('matches locked snapshots for baseline config matrix', () => {
    const signatures = BASELINE_CONFIGS.map((config) => ({
      seed: config.seed,
      cellCount: config.cellCount,
      seaLevel: config.seaLevel,
      topography: config.topography,
      nationCount: config.nationCount,
      climateControl: config.climateControl,
      signature: toPipelineSignature(config),
    }));
    expect(signatures).toMatchInlineSnapshot(`
      [
        {
          "cellCount": 2000,
          "climateControl": {
            "humanImpact": 0.5,
            "precipitationOffset": 0.3,
            "precipitationScale": 1.5,
            "temperatureContrast": 1.5,
            "temperatureOffset": 0.2,
          },
          "nationCount": 10,
          "seaLevel": 0.5,
          "seed": "world-deterministic-001",
          "signature": {
            "geopolitics": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 13,
              "hash": "17ccb34ddbc848ef",
              "lakeCells": 99,
              "landCells": 756,
              "nationCount": 10,
              "riverCells": 108,
              "totalPopulation": 2015659,
              "vertices": 4002,
            },
            "hydrology": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "911082cc8eeb15d9",
              "lakeCells": 99,
              "landCells": 756,
              "nationCount": 0,
              "riverCells": 108,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "mesh": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "4e5ccd9f78425bb3",
              "lakeCells": 0,
              "landCells": 2000,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "population": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "608d53c83651f31d",
              "lakeCells": 99,
              "landCells": 756,
              "nationCount": 0,
              "riverCells": 108,
              "totalPopulation": 548130,
              "vertices": 4002,
            },
            "topography": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "b659df3b9c49fce0",
              "lakeCells": 0,
              "landCells": 848,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
          },
          "topography": "balanced",
        },
        {
          "cellCount": 2000,
          "climateControl": {
            "humanImpact": 0.5,
            "precipitationOffset": 0.3,
            "precipitationScale": 1.5,
            "temperatureContrast": 1.5,
            "temperatureOffset": 0.2,
          },
          "nationCount": 10,
          "seaLevel": 0.5,
          "seed": "world-deterministic-002",
          "signature": {
            "geopolitics": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 15,
              "hash": "faaefafd90043051",
              "lakeCells": 121,
              "landCells": 534,
              "nationCount": 10,
              "riverCells": 34,
              "totalPopulation": 1652532,
              "vertices": 4002,
            },
            "hydrology": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "ad2d5790031b71ae",
              "lakeCells": 121,
              "landCells": 534,
              "nationCount": 0,
              "riverCells": 34,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "mesh": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "9f7c4a421dd264b7",
              "lakeCells": 0,
              "landCells": 2000,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "population": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "0dc62588f477f5ed",
              "lakeCells": 121,
              "landCells": 534,
              "nationCount": 0,
              "riverCells": 34,
              "totalPopulation": 934431,
              "vertices": 4002,
            },
            "topography": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "5bfec93230189283",
              "lakeCells": 0,
              "landCells": 620,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
          },
          "topography": "balanced",
        },
        {
          "cellCount": 2000,
          "climateControl": {
            "humanImpact": 0.5,
            "precipitationOffset": 0.3,
            "precipitationScale": 1.5,
            "temperatureContrast": 1.5,
            "temperatureOffset": 0.2,
          },
          "nationCount": 10,
          "seaLevel": 0.5,
          "seed": "world-deterministic-003",
          "signature": {
            "geopolitics": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 28,
              "hash": "84f2499f36161c6d",
              "lakeCells": 142,
              "landCells": 561,
              "nationCount": 10,
              "riverCells": 0,
              "totalPopulation": 2998314,
              "vertices": 4002,
            },
            "hydrology": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "9fe7752d485ce814",
              "lakeCells": 142,
              "landCells": 561,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "mesh": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "499cdb455de6ebc9",
              "lakeCells": 0,
              "landCells": 2000,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "population": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "d8ffc09f262c2522",
              "lakeCells": 142,
              "landCells": 561,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 953191,
              "vertices": 4002,
            },
            "topography": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "55558e813ebcd712",
              "lakeCells": 0,
              "landCells": 696,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
          },
          "topography": "balanced",
        },
        {
          "cellCount": 1600,
          "climateControl": {
            "humanImpact": 0.5,
            "precipitationOffset": 0.3,
            "precipitationScale": 1.5,
            "temperatureContrast": 1.5,
            "temperatureOffset": 0.2,
          },
          "nationCount": 10,
          "seaLevel": 0.5,
          "seed": "world-deterministic-004",
          "signature": {
            "geopolitics": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 16,
              "hash": "0b43ac4b6716bf0a",
              "lakeCells": 12,
              "landCells": 363,
              "nationCount": 10,
              "riverCells": 46,
              "totalPopulation": 1792887,
              "vertices": 3202,
            },
            "hydrology": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 0,
              "hash": "18f8d5b4376d2ccb",
              "lakeCells": 12,
              "landCells": 363,
              "nationCount": 0,
              "riverCells": 46,
              "totalPopulation": 0,
              "vertices": 3202,
            },
            "mesh": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 0,
              "hash": "ac12a4ed4dc479ae",
              "lakeCells": 0,
              "landCells": 1600,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 3202,
            },
            "population": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 0,
              "hash": "c1c4930be34005b7",
              "lakeCells": 12,
              "landCells": 363,
              "nationCount": 0,
              "riverCells": 46,
              "totalPopulation": 430063,
              "vertices": 3202,
            },
            "topography": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 0,
              "hash": "ec4ccdc838c7adf1",
              "lakeCells": 0,
              "landCells": 374,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 3202,
            },
          },
          "topography": "archipelago",
        },
        {
          "cellCount": 2400,
          "climateControl": {
            "humanImpact": 0.35,
            "precipitationOffset": 0.3,
            "precipitationScale": 0.9,
            "temperatureContrast": 1.5,
            "temperatureOffset": -0.06,
          },
          "nationCount": 10,
          "seaLevel": 0.58,
          "seed": "world-deterministic-005",
          "signature": {
            "geopolitics": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 15,
              "hash": "6aa2f57102613321",
              "lakeCells": 5,
              "landCells": 706,
              "nationCount": 10,
              "riverCells": 18,
              "totalPopulation": 5241018,
              "vertices": 4802,
            },
            "hydrology": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 0,
              "hash": "3dea0cb46698820b",
              "lakeCells": 5,
              "landCells": 706,
              "nationCount": 0,
              "riverCells": 18,
              "totalPopulation": 0,
              "vertices": 4802,
            },
            "mesh": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 0,
              "hash": "c2a8187839e58c2a",
              "lakeCells": 0,
              "landCells": 2400,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4802,
            },
            "population": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 0,
              "hash": "36b82cdb47a8d632",
              "lakeCells": 5,
              "landCells": 706,
              "nationCount": 0,
              "riverCells": 18,
              "totalPopulation": 1865587,
              "vertices": 4802,
            },
            "topography": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 0,
              "hash": "44db43829280a9f5",
              "lakeCells": 0,
              "landCells": 710,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4802,
            },
          },
          "topography": "ranges",
        },
      ]
    `);
  });
});
