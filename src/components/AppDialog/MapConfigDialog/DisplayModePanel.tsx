import { useMapExplorerStore } from 'src/store/mapExplorerStore';

type TLayerToggleProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function LayerToggle({ label, checked, disabled = false, onChange }: TLayerToggleProps) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2">
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
    <div className="flex flex-wrap gap-2">
      <LayerToggle
        label="Terrain"
        checked={displaySettings.terrain}
        onChange={(checked) => setDisplayLayer('terrain', checked)}
      />
      <LayerToggle
        label="Population"
        checked={displaySettings.populationHeatmap}
        onChange={(checked) => setDisplayLayer('populationHeatmap', checked)}
      />
      <LayerToggle
        label="Temperature"
        checked={displaySettings.temperatureHeatmap}
        onChange={(checked) => setDisplayLayer('temperatureHeatmap', checked)}
      />
      <LayerToggle
        label="Precipitation"
        checked={displaySettings.precipitationHeatmap}
        onChange={(checked) => setDisplayLayer('precipitationHeatmap', checked)}
      />
      <LayerToggle
        label="Rain Shadow"
        checked={displaySettings.rainShadowHeatmap}
        onChange={(checked) => setDisplayLayer('rainShadowHeatmap', checked)}
      />
      <LayerToggle
        label="Rivers"
        checked={displaySettings.rivers}
        onChange={(checked) => setDisplayLayer('rivers', checked)}
      />
      <LayerToggle
        label="Country Borders"
        checked={displaySettings.countryBorders}
        onChange={(checked) => setDisplayLayer('countryBorders', checked)}
      />
      <LayerToggle
        label="Country Fill"
        checked={displaySettings.countryFill}
        onChange={(checked) => setDisplayLayer('countryFill', checked)}
      />
      <LayerToggle
        label="Province Borders"
        checked={displaySettings.provinceBorders}
        disabled={!displaySettings.countryBorders}
        onChange={(checked) => setDisplayLayer('provinceBorders', checked)}
      />
      <LayerToggle
        label="Ethnic Borders"
        checked={displaySettings.ethnicBorders}
        onChange={(checked) => setDisplayLayer('ethnicBorders', checked)}
      />
      <LayerToggle
        label="Ethnic Fill"
        checked={displaySettings.ethnicFill}
        onChange={(checked) => setDisplayLayer('ethnicFill', checked)}
      />
      <LayerToggle
        label="Labels"
        checked={displaySettings.labels}
        onChange={(checked) => setDisplayLayer('labels', checked)}
      />
      <LayerToggle
        label="Cell Data"
        checked={displaySettings.cellData}
        onChange={(checked) => setDisplayLayer('cellData', checked)}
      />
    </div>
  );
}
