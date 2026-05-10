import BlurCard from 'src/components/BlurCard';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { TOPOGRAPHY_PRESET_OPTIONS } from 'src/configs/constance';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TTopographyPreset } from 'src/types/map.types';

export default function TerrainPresetSelect() {
  const { topographyPreset, setTopographyPreset } = useMapExplorerStore();

  return (
    <BlurCard title="Topography Preset">
      <Select
        value={topographyPreset}
        onValueChange={(value) => setTopographyPreset(value as TTopographyPreset)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Topography Preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {TOPOGRAPHY_PRESET_OPTIONS.map((option) => (
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
