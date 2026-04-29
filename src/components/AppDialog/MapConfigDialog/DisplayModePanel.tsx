import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TMapRenderMode } from 'src/types/global';

export default function DisplayModePanel() {
  const { renderMode, setRenderMode } = useMapExplorerStore();

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
        Display Mode
      </span>
      <Select value={renderMode} onValueChange={(value) => setRenderMode(value as TMapRenderMode)}>
        <SelectTrigger>
          <SelectValue placeholder="Display Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="cells">Cell mode</SelectItem>
            <SelectItem value="seamless">Seamless mode</SelectItem>
            <SelectItem value="rivers">River mode</SelectItem>
            <SelectItem value="nations">Nation border mode</SelectItem>
            <SelectItem value="political-flat">Political Flat</SelectItem>
            <SelectItem value="political-tinted">Political Tinted</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
