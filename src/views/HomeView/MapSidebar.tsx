import MapInfoCard from 'src/views/HomeView/MapInfoCard';
import MapCellInspector from 'src/views/HomeView/MapCellInspector';
import TerrainPresetSelect from 'src/views/HomeView/TerrainPresetSelect';
import { TMapCell, TMapMesh, TTerrainPreset } from 'src/types/global';

type TProps = {
  seedDraft: string;
  cellCount: number;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
  minCells: number;
  maxCells: number;
  hoveredCell: TMapCell | null;
  selectedCell: TMapCell | null;
  mesh: TMapMesh;
  onSeedDraftChange: (value: string) => void;
  onApplySeed: () => void;
  onRandomizeSeed: () => void;
  onCellCountChange: (value: number) => void;
  onSeaLevelChange: (value: number) => void;
  onTerrainPresetChange: (value: TTerrainPreset) => void;
};

export default function MapSidebar({
  seedDraft,
  cellCount,
  seaLevel,
  terrainPreset,
  minCells,
  maxCells,
  hoveredCell,
  selectedCell,
  mesh,
  onSeedDraftChange,
  onApplySeed,
  onRandomizeSeed,
  onCellCountChange,
  onSeaLevelChange,
  onTerrainPresetChange,
}: TProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.28em] text-sky-300/80 uppercase">Phase 3</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Hydrology Explorer</h1>
        <p className="max-w-md text-sm leading-6 text-slate-300">
          Route water across the terrain, accumulate flow, carve rivers, and form sink lakes from
          the current topography layer.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="block space-y-2">
          <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
            Seed
          </span>
          <input
            value={seedDraft}
            onChange={(event) => onSeedDraftChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="world-001"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApplySeed}
            className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
          >
            Apply seed
          </button>
          <button
            type="button"
            onClick={onRandomizeSeed}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            Randomize
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
            Cells
          </span>
          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm font-medium text-sky-100">
            {cellCount}
          </span>
        </div>

        <input
          type="range"
          min={minCells}
          max={maxCells}
          step={20}
          value={cellCount}
          onChange={(event) => onCellCountChange(Number(event.target.value))}
          className="w-full accent-sky-400"
        />

        <input
          type="number"
          min={minCells}
          max={maxCells}
          step={20}
          value={cellCount}
          onChange={(event) => {
            const nextValue = Number(event.target.value);

            if (!Number.isNaN(nextValue)) {
              onCellCountChange(nextValue);
            }
          }}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
            Sea Level
          </span>
          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm font-medium text-sky-100">
            {seaLevel.toFixed(2)}
          </span>
        </div>

        <input
          type="range"
          min={0.2}
          max={0.7}
          step={0.01}
          value={seaLevel}
          onChange={(event) => onSeaLevelChange(Number(event.target.value))}
          className="w-full accent-sky-400"
        />
      </div>

      <TerrainPresetSelect
        terrainPreset={terrainPreset}
        onTerrainPresetChange={onTerrainPresetChange}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <MapCellInspector
          label="Hovered Cell"
          cell={hoveredCell}
          mesh={mesh}
          emptyMessage="Move across the mesh to inspect cells."
        />
        <MapCellInspector
          label="Selected Cell"
          cell={selectedCell}
          mesh={mesh}
          emptyMessage="Click any polygon to pin its metadata."
        />
        <MapInfoCard
          label="Hydrology"
          value={`${mesh.cells.filter((cell) => cell.isRiver).length} rivers`}
          detail={`${mesh.cells.filter((cell) => cell.isLake).length} sink lakes across the mesh.`}
        />
      </div>
    </div>
  );
}
