import { TERRAIN_PRESET_OPTIONS } from 'src/configs/constance';
import { TTerrainPreset } from 'src/types/global';

type TProps = {
  terrainPreset: TTerrainPreset;
  onTerrainPresetChange: (value: TTerrainPreset) => void;
};

export default function TerrainPresetSelect({ terrainPreset, onTerrainPresetChange }: TProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
          Terrain Preset
        </span>
      </div>
      <select
        value={terrainPreset}
        onChange={(event) => onTerrainPresetChange(event.target.value as TTerrainPreset)}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
      >
        {TERRAIN_PRESET_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
