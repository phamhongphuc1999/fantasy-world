import { buildGeopolitics } from 'src/services/geopolitics';
import { buildPopulation } from 'src/services/geopolitics/population';
import { buildHydrology } from 'src/services/hydrology';
import { buildTopography } from 'src/services/terrain/buildTopography';
import { buildMesh } from 'src/services/terrain/mesh';
import { TGenerationConfig, TGenerationStages } from 'src/types/map.types';

export class MapGenerator {
  private readonly config: TGenerationConfig;

  constructor(config: TGenerationConfig) {
    this.config = config;
  }

  generate(): TGenerationStages {
    const {
      width,
      height,
      seed,
      cellCount,
      seaLevel,
      topography: topographyPreset,
      climateControl,
      nationCount,
    } = this.config;
    const mesh = buildMesh({ width, height, seed, cellCount });
    const topography = buildTopography({ mesh, seed, seaLevel, topography: topographyPreset });
    const hydrology = buildHydrology({ mesh: topography, seaLevel, seed, climateControl });
    const population = buildPopulation({ mesh: hydrology, seed });
    const geopolitics = buildGeopolitics({ mesh: population, seed, nationCount });
    return { mesh, topography, hydrology, population, geopolitics };
  }
}
