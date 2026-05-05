import { TGenerationConfig, TGenerationStages } from 'src/types/map.types';
import { MapGenerator } from './map.generator';

export function runMapGenerationStages(config: TGenerationConfig): TGenerationStages {
  const generator = new MapGenerator(config);
  return generator.generateStages();
}
