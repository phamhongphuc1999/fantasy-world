import { useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { rebalanceTerrainRatio, TERRAIN_RATIO_FIELDS } from 'src/services/map/terrainRatios';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TTerrainRatioKey } from 'src/types/map.types';

type TProps = {
  ratio: number;
  terrain: TTerrainRatioKey;
  setTerrain: (terrain: TTerrainRatioKey, ratio: number) => void;
};

function TerrainRow({ ratio, terrain, setTerrain }: TProps) {
  const field = TERRAIN_RATIO_FIELDS.find((item) => item.key === terrain);

  function handleChange(nextPercent: number) {
    if (!Number.isFinite(nextPercent)) return;
    const clamped = Math.min(92, Math.max(1, nextPercent));
    setTerrain(terrain, clamped / 100);
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/55 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-100">{field?.label ?? terrain}</span>
        <span className="text-xs font-medium text-sky-200">{(ratio * 100).toFixed(1)}%</span>
      </div>
      <Input
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
  const [terrainRatiosDraft, setTerrainRatiosDraft] = useState(terrainRatios);
  const applyTerrainRatios = useMapExplorerStore((state) => state.applyTerrainRatios);
  const isDirty = TERRAIN_RATIO_FIELDS.some(
    ({ key }) => Math.abs(terrainRatios[key] - terrainRatiosDraft[key]) > 0.0001
  );

  function setTerrain(terrain: TTerrainRatioKey, ratio: number) {
    const next = rebalanceTerrainRatio(terrainRatiosDraft, terrain, ratio);
    setTerrainRatiosDraft(next);
  }

  return (
    <BlurCard title="Terrain Ratios">
      <div className="grid gap-2 sm:grid-cols-2">
        {TERRAIN_RATIO_FIELDS.map((field) => (
          <TerrainRow
            key={field.key}
            ratio={terrainRatiosDraft[field.key]}
            terrain={field.key}
            setTerrain={setTerrain}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => applyTerrainRatios(terrainRatiosDraft)}
          disabled={!isDirty}
        >
          Apply
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setTerrainRatiosDraft(terrainRatios)}
          disabled={!isDirty}
        >
          Cancel
        </Button>
      </div>
    </BlurCard>
  );
}
