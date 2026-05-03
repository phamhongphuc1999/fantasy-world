import TerrainPresetSelect from './TerrainPresetSelect';
import TerrainRatioPanel from './TerrainRatioPanel';

export default function TerrainTab() {
  return (
    <div className="space-y-4">
      <TerrainPresetSelect />
      <TerrainRatioPanel />
    </div>
  );
}
