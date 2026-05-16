import { Input } from 'src/components/ui/input';
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
      <Input
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
        label="Landform"
        checked={displaySettings.landform}
        onChange={(checked) => setDisplayLayer('landform', checked)}
      />
      <LayerToggle
        label="Landform 2.5D"
        checked={displaySettings.landformRelief}
        onChange={(checked) => setDisplayLayer('landformRelief', checked)}
      />
      <LayerToggle
        label="Isometric 3D"
        checked={displaySettings.isometric}
        onChange={(checked) => setDisplayLayer('isometric', checked)}
      />
      <LayerToggle
        label="3D (Three.js)"
        checked={displaySettings.threeDim}
        onChange={(checked) => setDisplayLayer('threeDim', checked)}
      />
      <LayerToggle
        label="Biome"
        checked={displaySettings.biome}
        onChange={(checked) => setDisplayLayer('biome', checked)}
      />
      <LayerToggle
        label="Biome 2.5D"
        checked={displaySettings.biomeRelief}
        onChange={(checked) => setDisplayLayer('biomeRelief', checked)}
      />
      <LayerToggle
        label="Population"
        checked={displaySettings.population}
        onChange={(checked) => setDisplayLayer('population', checked)}
      />
      <LayerToggle
        label="Temperature"
        checked={displaySettings.temperature}
        onChange={(checked) => setDisplayLayer('temperature', checked)}
      />
      <LayerToggle
        label="Precipitation"
        checked={displaySettings.precipitation}
        onChange={(checked) => setDisplayLayer('precipitation', checked)}
      />
      <LayerToggle
        label="Rain Shadow"
        checked={displaySettings.rainShadow}
        onChange={(checked) => setDisplayLayer('rainShadow', checked)}
      />
      <LayerToggle
        label="Economy"
        checked={displaySettings.economy}
        onChange={(checked) => setDisplayLayer('economy', checked)}
      />
      <LayerToggle
        label="Rivers"
        checked={displaySettings.rivers}
        onChange={(checked) => setDisplayLayer('rivers', checked)}
      />
      <LayerToggle
        label="Nation Borders"
        checked={displaySettings.nationBorders}
        onChange={(checked) => setDisplayLayer('nationBorders', checked)}
      />
      <LayerToggle
        label="Nation Fill"
        checked={displaySettings.nationFill}
        onChange={(checked) => setDisplayLayer('nationFill', checked)}
      />
      <LayerToggle
        label="Province Borders"
        checked={displaySettings.provinceBorders}
        disabled={!displaySettings.nationBorders}
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
        label="Ethnic Labels"
        checked={displaySettings.ethnicLabels}
        onChange={(checked) => setDisplayLayer('ethnicLabels', checked)}
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
