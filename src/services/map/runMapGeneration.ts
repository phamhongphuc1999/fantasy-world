import { TMapMeshWithDelaunay, TNationMode, TTerrainPreset, TTerrainRatioMap } from 'src/types/global';
import { MapGenerator } from './map.generator';

export type TGenerationConfig = {
  width: number;
  height: number;
  seed: string;
  cellCount: number;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
  terrainRatios: TTerrainRatioMap;
  nationMode: TNationMode;
  nationCount: number;
};

export type TGenerationStages = {
  mesh: TMapMeshWithDelaunay;
  topography: TMapMeshWithDelaunay;
  hydrology: TMapMeshWithDelaunay;
  population: TMapMeshWithDelaunay;
  geopolitics: TMapMeshWithDelaunay;
};

export function runMapGenerationStages(config: TGenerationConfig): TGenerationStages {
  const generator = new MapGenerator(config);
  return generator.generateStages();
}
