import { useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { DEFAULT_CONFIG } from 'src/configs/map/common';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function CellCountPanel() {
  const { cellCount, setCellCount } = useMapExplorerStore();
  const [draftCount, setDraftCount] = useState(String(cellCount));
  const [error, setError] = useState('');

  function handleApplyCount() {
    const nextValue = Number(draftCount);
    if (
      !Number.isFinite(nextValue) ||
      !Number.isInteger(nextValue) ||
      nextValue < DEFAULT_CONFIG.minCells ||
      nextValue > DEFAULT_CONFIG.maxCells
    ) {
      setError(
        `Cell count must be an integer between ${DEFAULT_CONFIG.minCells} and ${DEFAULT_CONFIG.maxCells}.`
      );
      return;
    }

    setCellCount(nextValue);
    setError('');
  }

  return (
    <BlurCard title="Mesh Density">
      <div className="space-y-2">
        <label className="text-xs text-slate-300">
          Cell count ({DEFAULT_CONFIG.minCells}-{DEFAULT_CONFIG.maxCells})
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={DEFAULT_CONFIG.minCells}
            max={DEFAULT_CONFIG.maxCells}
            step={1}
            value={draftCount}
            onChange={(event) => setDraftCount(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
          />
          <Button
            type="button"
            onClick={handleApplyCount}
            className="rounded-xl bg-sky-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
          >
            Apply
          </Button>
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    </BlurCard>
  );
}
