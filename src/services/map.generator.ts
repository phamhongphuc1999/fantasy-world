import { TGenerationConfig, TGenerationStages, TDelaunayMesh } from 'src/types/map.types';
import { buildGeopolitics } from './buildGeopolitics';
import { buildHydrology } from './buildHydrology';
import { buildMesh } from './buildMesh';
import { buildPopulation } from './buildPopulation';
import { buildTopography } from './buildTopography';

export class MapGenerator {
  private readonly config: TGenerationConfig;

  constructor(config: TGenerationConfig) {
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

  private buildTopography(mesh: TDelaunayMesh) {
    return buildTopography({
      mesh,
      seed: this.config.seed,
      seaLevel: this.config.seaLevel,
      terrainPreset: this.config.terrainPreset,
    });
  }

  private buildHydrology(mesh: TDelaunayMesh) {
    return buildHydrology({
      mesh,
      seaLevel: this.config.seaLevel,
      terrainRatios: this.config.terrainRatios,
    });
  }

  private buildPopulation(mesh: TDelaunayMesh) {
    return buildPopulation({
      mesh,
      seed: this.config.seed,
    });
  }

  private buildGeopolitics(mesh: TDelaunayMesh) {
    return buildGeopolitics({ mesh, seed: this.config.seed, nationCount: this.config.nationCount });
  }

  generateStages(): TGenerationStages {
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
