import { Button } from 'src/components/ui/button';
import { TERRAIN_RATIO_FIELDS } from 'src/services/map/terrainRatios';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TTerrainRatioKey } from 'src/types/map.types';

type TProps = {
  terrain: TTerrainRatioKey;
};

function TerrainRow({ terrain }: TProps) {
  const ratio = useMapExplorerStore((state) => state.terrainRatiosDraft[terrain]);
  const setTerrainRatioDraft = useMapExplorerStore((state) => state.setTerrainRatioDraft);
  const field = TERRAIN_RATIO_FIELDS.find((item) => item.key === terrain);

  function handleChange(nextPercent: number) {
    if (!Number.isFinite(nextPercent)) return;
    const clamped = Math.min(92, Math.max(1, nextPercent));
    setTerrainRatioDraft(terrain, clamped / 100);
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/55 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-100">{field?.label ?? terrain}</span>
        <span className="text-xs font-medium text-sky-200">{(ratio * 100).toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={1}
        max={92}
        step={1}
        value={Math.round(ratio * 100)}
        onChange={(event) => handleChange(Number(event.target.value))}
        className="w-full accent-sky-400"
      />
      <input
        type="number"
        min={1}
        max={92}
        step={1}
        value={Math.round(ratio * 100)}
        onChange={(event) => handleChange(Number(event.target.value))}
        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-xs text-white outline-none"
      />
    </div>
  );
}

export default function TerrainRatioPanel() {
  const terrainRatios = useMapExplorerStore((state) => state.terrainRatios);
  const terrainRatiosDraft = useMapExplorerStore((state) => state.terrainRatiosDraft);
  const applyTerrainRatios = useMapExplorerStore((state) => state.applyTerrainRatios);
  const cancelTerrainRatios = useMapExplorerStore((state) => state.cancelTerrainRatios);
  const total = Object.values(terrainRatiosDraft).reduce((acc, value) => acc + value, 0);
  const isDirty = TERRAIN_RATIO_FIELDS.some(
    ({ key }) => Math.abs(terrainRatios[key] - terrainRatiosDraft[key]) > 0.0001
  );

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
          Terrain Ratios
        </span>
        <span className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-slate-200">
          Total {(total * 100).toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-slate-300">
        Ratios are auto-normalized to 100%. Update draft values, then click Apply to regenerate.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TERRAIN_RATIO_FIELDS.map((field) => (
          <TerrainRow key={field.key} terrain={field.key} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={applyTerrainRatios} disabled={!isDirty}>
          Apply
        </Button>
        <Button type="button" variant="outline" onClick={cancelTerrainRatios} disabled={!isDirty}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
