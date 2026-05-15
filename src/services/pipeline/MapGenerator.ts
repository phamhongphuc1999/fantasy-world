import { buildGeopolitics } from 'src/services/geopolitics';
import { buildPopulation } from 'src/services/geopolitics/population';
import { buildHydrology } from 'src/services/hydrology';
import { buildTopography } from 'src/services/terrain/buildTopography';
import { buildMesh } from 'src/services/terrain/mesh';
import { TDelaunayMesh, TGenerationConfig, TGenerationStages } from 'src/types/map.types';

export class MapGenerator {
  private readonly config: TGenerationConfig;

  constructor(config: TGenerationConfig) {
    this.config = config;
  }

  private buildMesh() {
    const { width, height, seed, cellCount } = this.config;
    return buildMesh({ width, height, seed, cellCount });
  }

  private buildTopography(mesh: TDelaunayMesh) {
    const { seed, seaLevel, topography } = this.config;
    return buildTopography({ mesh, seed, seaLevel, topography });
  }

  private buildHydrology(mesh: TDelaunayMesh) {
    const { seed, seaLevel, climateControl } = this.config;
    return buildHydrology({ mesh, seaLevel, seed, climateControl });
  }

  private buildPopulation(mesh: TDelaunayMesh) {
    return buildPopulation({ mesh, seed: this.config.seed });
  }

  private buildGeopolitics(mesh: TDelaunayMesh) {
    return buildGeopolitics({ mesh, seed: this.config.seed, nationCount: this.config.nationCount });
  }

  generate(): TGenerationStages {
    const mesh = this.buildMesh();
    const topography = this.buildTopography(mesh);
    const hydrology = this.buildHydrology(topography);
    const population = this.buildPopulation(hydrology);
    const geopolitics = this.buildGeopolitics(population);
    return { mesh, topography, hydrology, population, geopolitics };
  }
}
