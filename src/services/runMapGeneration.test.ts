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
          "hash": "1e5fc3d92375e383",
          "lakeCells": 125,
          "landCells": 725,
          "nationCount": 8,
          "riverCells": 74,
          "totalPopulation": 1702332,
          "vertices": 4002,
        },
        "hydrology": {
          "cells": 2000,
          "edges": 6001,
          "ethnicGroupCount": 0,
          "hash": "0e4895da010ff62e",
          "lakeCells": 125,
          "landCells": 725,
          "nationCount": 0,
          "riverCells": 74,
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
          "hash": "e3dc8b59a2f3fe0e",
          "lakeCells": 125,
          "landCells": 725,
          "nationCount": 0,
          "riverCells": 74,
          "totalPopulation": 985918,
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
});
