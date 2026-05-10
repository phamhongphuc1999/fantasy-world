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
      topographyPreset: this.config.topographyPreset,
    });
  }

  private buildHydrology(mesh: TDelaunayMesh) {
    return buildHydrology({
      mesh,
      seaLevel: this.config.seaLevel,
      seed: this.config.seed,
      climateControl: this.config.climateControl,
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
