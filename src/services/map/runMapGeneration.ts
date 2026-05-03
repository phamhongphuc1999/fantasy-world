import { TMapGenerationConfig, TMapGenerationStages } from 'src/types/map.types';
import { MapGenerator } from './map.generator';

export function runMapGenerationStages(config: TMapGenerationConfig): TMapGenerationStages {
  const generator = new MapGenerator(config);
  return generator.generateStages();
}
