import BlurCard from 'src/components/BlurCard';
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
import { TTerrainPreset } from 'src/types/map.types';

export default function TerrainPresetSelect() {
  const { terrainPreset, setTerrainPreset } = useMapExplorerStore();

  return (
    <BlurCard title="Terrain Preset">
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
    </BlurCard>
  );
}
