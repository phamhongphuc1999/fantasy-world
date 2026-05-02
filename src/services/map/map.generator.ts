import {
  TMapGenerationConfig,
  TMapGenerationStages,
  TMapMeshWithDelaunay,
} from 'src/types/map.types';
import { buildGeopolitics } from './buildGeopolitics';
import { buildHydrology } from './buildHydrology';
import { buildMesh } from './buildMesh';
import { buildPopulation } from './buildPopulation';
import { buildTopography } from './buildTopography';

export class MapGenerator {
  private readonly config: TMapGenerationConfig;

  constructor(config: TMapGenerationConfig) {
    this.config = config;
  }

  private buildMesh() {
    return buildMesh({
      width: this.config.width,
      height: this.config.height,
      seed: this.config.seed,
      cellCount: this.config.cellCount,
    });
  }

  private buildTopography(mesh: TMapMeshWithDelaunay) {
    return buildTopography({
      mesh,
      seed: this.config.seed,
      seaLevel: this.config.seaLevel,
      terrainPreset: this.config.terrainPreset,
    });
  }

  private buildHydrology(mesh: TMapMeshWithDelaunay) {
    return buildHydrology({
      mesh,
      seaLevel: this.config.seaLevel,
      terrainRatios: this.config.terrainRatios,
    });
  }

  private buildPopulation(mesh: TMapMeshWithDelaunay) {
    return buildPopulation({
      mesh,
      seed: this.config.seed,
    });
  }

  private buildGeopolitics(mesh: TMapMeshWithDelaunay) {
    return buildGeopolitics({
      mesh,
      seed: this.config.seed,
      nationMode: this.config.nationMode,
      nationCount: this.config.nationCount,
    });
  }

  generateStages(): TMapGenerationStages {
    const mesh = this.buildMesh();
    const topography = this.buildTopography(mesh);
    const hydrology = this.buildHydrology(topography);
    const population = this.buildPopulation(hydrology);
    const geopolitics = this.buildGeopolitics(population);
    return { mesh, topography, hydrology, population, geopolitics };
  }

  generate() {
    const { geopolitics } = this.generateStages();
    return geopolitics;
  }
}
