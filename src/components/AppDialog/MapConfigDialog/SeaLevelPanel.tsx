import { Button } from 'src/components/ui/button';
import { useMapContext } from 'src/contexts/map.context';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function SeaLevelPanel() {
  const { seaLevel, seaLevelDraft, applySeaLevel } = useMapExplorerStore();
  const { handleSeaLevelDraftChange } = useMapContext();

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
          Sea Level
        </span>
        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm font-medium text-sky-100">
          {seaLevelDraft.toFixed(2)}
        </span>
      </div>

      <input
        type="number"
        min={0.1}
        max={0.9}
        step={0.01}
        value={seaLevelDraft}
        onChange={(event) => handleSeaLevelDraftChange(Number(event.target.value))}
        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-sm text-white outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-300">Applied: {seaLevel.toFixed(2)}</p>
        <Button type="button" onClick={applySeaLevel}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
