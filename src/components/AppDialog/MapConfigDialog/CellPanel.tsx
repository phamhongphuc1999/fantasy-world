import { MAP_VIEWPORT_CONFIG } from 'src/configs/mapConfig';
import { useMapContext } from 'src/contexts/map.context';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

const minCells = MAP_VIEWPORT_CONFIG.minCells;
const maxCells = MAP_VIEWPORT_CONFIG.maxCells;

export default function CellPanel() {
  const { cellCount } = useMapExplorerStore();
  const { handleCellCountChange } = useMapContext();

  return (
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
        onChange={(event) => handleCellCountChange(Number(event.target.value))}
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
          if (!Number.isNaN(nextValue)) handleCellCountChange(nextValue);
        }}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
      />
    </div>
  );
}
