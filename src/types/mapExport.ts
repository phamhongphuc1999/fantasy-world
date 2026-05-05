import { TMapDisplaySettings, TMapGenerationConfig, TMapMesh } from 'src/types/map.types';

export interface TMapExportSnapshot {
  schemaVersion: 1;
  exportedAt: string;
  config: TMapGenerationConfig;
  displaySettings: TMapDisplaySettings;
  mesh: TMapMesh;
}
