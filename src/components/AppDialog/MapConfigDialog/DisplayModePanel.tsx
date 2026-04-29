import { useMapExplorerStore } from 'src/store/mapExplorerStore';

type TLayerToggleProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function LayerToggle({ label, checked, disabled = false, onChange }: TLayerToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2">
      <span className={disabled ? 'text-slate-500' : 'text-sm text-slate-100'}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

export default function DisplayModePanel() {
  const { displaySettings, setDisplayLayer } = useMapExplorerStore();

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
        Map Layers
      </span>
      <div className="space-y-2">
        <LayerToggle
          label="Terrain"
          checked={displaySettings.showTerrain}
          onChange={(checked) => setDisplayLayer('showTerrain', checked)}
        />
        <LayerToggle
          label="Rivers"
          checked={displaySettings.showRivers}
          onChange={(checked) => setDisplayLayer('showRivers', checked)}
        />
        <LayerToggle
          label="Country Borders"
          checked={displaySettings.showCountryBorders}
          onChange={(checked) => setDisplayLayer('showCountryBorders', checked)}
        />
        <LayerToggle
          label="Province Borders"
          checked={displaySettings.showProvinceBorders}
          disabled={!displaySettings.showCountryBorders}
          onChange={(checked) => setDisplayLayer('showProvinceBorders', checked)}
        />
      </div>
    </div>
  );
}
