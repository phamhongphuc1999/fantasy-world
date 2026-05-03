import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, MAP_VIEWPORT_CONFIG } from 'src/configs/mapConfig';
import { TMapGenerationConfig, TMapMeshWithDelaunay } from 'src/types/map.types';
import { runMapGenerationStages } from './runMapGeneration';

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

function toStageSignature(mesh: TMapMeshWithDelaunay): TStageSignature {
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
        cell.terrain,
        Math.round(cell.flow * 1000),
        cell.downstreamId ?? -99,
        Math.round(cell.erosion * 1_000_000),
        cell.isRiver ? 1 : 0,
        cell.isLake ? 1 : 0,
        Math.round(cell.temperature * 1_000_000),
        Math.round(cell.precipitation * 1_000_000),
        Math.round(cell.rainShadow * 1_000_000),
        cell.population,
        Math.round(cell.waterAccessibility * 1_000_000),
        cell.nationId ?? -1,
        cell.provinceId ?? -1,
        cell.ethnicGroupId ?? -1,
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
    ethnicGroupCount: mesh.ethnicGroups.length,
    hash: fnv1a64Hex(hashParts),
  };
}

function toPipelineSignature(config: TMapGenerationConfig): TPipelineSignature {
  const stages = runMapGenerationStages(config);
  return {
    mesh: toStageSignature(stages.mesh),
    topography: toStageSignature(stages.topography),
    hydrology: toStageSignature(stages.hydrology),
    population: toStageSignature(stages.population),
    geopolitics: toStageSignature(stages.geopolitics),
  };
}

function makeConfig(seed: string): TMapGenerationConfig {
  return {
    width: MAP_VIEWPORT_CONFIG.width,
    height: MAP_VIEWPORT_CONFIG.height,
    seed,
    cellCount: 2000,
    seaLevel: DEFAULT_CONFIG.seaLevel,
    terrainPreset: DEFAULT_CONFIG.terrainPreset,
    terrainRatios: DEFAULT_CONFIG.terrainRatios,
    nationCount: DEFAULT_CONFIG.nationCount,
  };
}

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
          "ethnicGroupCount": 16,
          "hash": "874c10d4ef31e4db",
          "lakeCells": 123,
          "landCells": 727,
          "nationCount": 8,
          "riverCells": 59,
          "totalPopulation": 8745008,
          "vertices": 4002,
        },
        "hydrology": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "e64b1e9edb4ef5de",
          "lakeCells": 123,
          "landCells": 727,
          "nationCount": 0,
          "riverCells": 59,
          "totalPopulation": 0,
          "vertices": 4002,
        },
        "mesh": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "f57a7b89b4abf3d5",
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
          "hash": "25dcaace4e43363f",
          "lakeCells": 123,
          "landCells": 727,
          "nationCount": 0,
          "riverCells": 59,
          "totalPopulation": 8745008,
          "vertices": 4002,
        },
        "topography": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "f30ebd081de5d2a0",
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
});
