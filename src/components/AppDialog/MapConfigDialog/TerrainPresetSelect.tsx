import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { TERRAIN_PRESET_OPTIONS } from 'src/configs/constance';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TTerrainPreset } from 'src/types/global';

export default function TerrainPresetSelect() {
  const { terrainPreset, setTerrainPreset } = useMapExplorerStore();

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
          Terrain Preset
        </span>
      </div>
      <Select
        value={terrainPreset}
        onValueChange={(value) => setTerrainPreset(value as TTerrainPreset)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Terrain Preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {TERRAIN_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
