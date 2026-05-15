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
          "ethnicGroupCount": 10,
          "hash": "99176f5ea9b2bcae",
          "lakeCells": 123,
          "landCells": 727,
          "nationCount": 10,
          "riverCells": 113,
          "totalPopulation": 770926,
          "vertices": 4002,
        },
        "hydrology": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "c0f51d76a4bf1d1a",
          "lakeCells": 123,
          "landCells": 727,
          "nationCount": 0,
          "riverCells": 113,
          "totalPopulation": 0,
          "vertices": 4002,
        },
        "mesh": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "2e524b7255d02e1f",
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
          "hash": "3a8c2410b6149fc9",
          "lakeCells": 123,
          "landCells": 727,
          "nationCount": 0,
          "riverCells": 113,
          "totalPopulation": 531812,
          "vertices": 4002,
        },
        "topography": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "d158344b6a8de3a6",
          "lakeCells": 0,
          "landCells": 846,
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
              "ethnicGroupCount": 10,
              "hash": "99176f5ea9b2bcae",
              "lakeCells": 123,
              "landCells": 727,
              "nationCount": 10,
              "riverCells": 113,
              "totalPopulation": 770926,
              "vertices": 4002,
            },
            "hydrology": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "c0f51d76a4bf1d1a",
              "lakeCells": 123,
              "landCells": 727,
              "nationCount": 0,
              "riverCells": 113,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "mesh": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "2e524b7255d02e1f",
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
              "hash": "3a8c2410b6149fc9",
              "lakeCells": 123,
              "landCells": 727,
              "nationCount": 0,
              "riverCells": 113,
              "totalPopulation": 531812,
              "vertices": 4002,
            },
            "topography": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "d158344b6a8de3a6",
              "lakeCells": 0,
              "landCells": 846,
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
              "ethnicGroupCount": 13,
              "hash": "dee869ecc77662a6",
              "lakeCells": 86,
              "landCells": 571,
              "nationCount": 10,
              "riverCells": 51,
              "totalPopulation": 2800856,
              "vertices": 4002,
            },
            "hydrology": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "75e03f0638bc4abc",
              "lakeCells": 86,
              "landCells": 571,
              "nationCount": 0,
              "riverCells": 51,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "mesh": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "f7b7f0e00cddfdaf",
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
              "hash": "d80cad3b838aba88",
              "lakeCells": 86,
              "landCells": 571,
              "nationCount": 0,
              "riverCells": 51,
              "totalPopulation": 893060,
              "vertices": 4002,
            },
            "topography": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "8b51bca5c22e5669",
              "lakeCells": 0,
              "landCells": 630,
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
              "ethnicGroupCount": 31,
              "hash": "80f2a33a93834a87",
              "lakeCells": 71,
              "landCells": 630,
              "nationCount": 10,
              "riverCells": 0,
              "totalPopulation": 3561677,
              "vertices": 4002,
            },
            "hydrology": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "18d805171270b087",
              "lakeCells": 71,
              "landCells": 630,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 0,
              "vertices": 4002,
            },
            "mesh": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "a95895658d267637",
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
              "hash": "d8018deafd6d5935",
              "lakeCells": 71,
              "landCells": 630,
              "nationCount": 0,
              "riverCells": 0,
              "totalPopulation": 1079730,
              "vertices": 4002,
            },
            "topography": {
              "cells": 2000,
              "edges": 6001,
              "ethnicGroupCount": 0,
              "hash": "cb35d6ae18279471",
              "lakeCells": 0,
              "landCells": 695,
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
              "hash": "b2114c32a164c38d",
              "lakeCells": 27,
              "landCells": 359,
              "nationCount": 10,
              "riverCells": 49,
              "totalPopulation": 1706826,
              "vertices": 3202,
            },
            "hydrology": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 0,
              "hash": "ba270bedf0828bde",
              "lakeCells": 27,
              "landCells": 359,
              "nationCount": 0,
              "riverCells": 49,
              "totalPopulation": 0,
              "vertices": 3202,
            },
            "mesh": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 0,
              "hash": "e853603cedc6472e",
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
              "hash": "a3ea7bfe6b1eeb11",
              "lakeCells": 27,
              "landCells": 359,
              "nationCount": 0,
              "riverCells": 49,
              "totalPopulation": 450842,
              "vertices": 3202,
            },
            "topography": {
              "cells": 1600,
              "edges": 4801,
              "ethnicGroupCount": 0,
              "hash": "c6af59b35b24e8ad",
              "lakeCells": 0,
              "landCells": 382,
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
              "ethnicGroupCount": 12,
              "hash": "b44b521f11a1987a",
              "lakeCells": 0,
              "landCells": 724,
              "nationCount": 10,
              "riverCells": 19,
              "totalPopulation": 4739878,
              "vertices": 4802,
            },
            "hydrology": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 0,
              "hash": "e28fdf951a53636f",
              "lakeCells": 0,
              "landCells": 724,
              "nationCount": 0,
              "riverCells": 19,
              "totalPopulation": 0,
              "vertices": 4802,
            },
            "mesh": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 0,
              "hash": "f318fc30fe4e3a37",
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
              "hash": "cd0f47819cc076cb",
              "lakeCells": 0,
              "landCells": 724,
              "nationCount": 0,
              "riverCells": 19,
              "totalPopulation": 1526575,
              "vertices": 4802,
            },
            "topography": {
              "cells": 2400,
              "edges": 7201,
              "ethnicGroupCount": 0,
              "hash": "5b3f957b15d4cdf6",
              "lakeCells": 0,
              "landCells": 724,
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
