import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { useMapContext } from 'src/contexts/map.context';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function GeneratePanel() {
  const { seedDraft, setSeedDraft } = useMapExplorerStore();
  const { handleApplySeed, handleRandomizeSeed } = useMapContext();

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <label className="block space-y-2">
        <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">Seed</span>
        <Input
          value={seedDraft}
          onChange={(event) => setSeedDraft(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
          placeholder="world-001"
        />
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={handleApplySeed}>
          Apply seed
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={handleRandomizeSeed}>
          Randomize
        </Button>
      </div>
    </div>
  );
}
