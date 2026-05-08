import { useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function SeaLevelPanel() {
  const { seaLevel, setSeaLevel } = useMapExplorerStore();
  const [seaLevelDraft, setSeaLevelDraft] = useState(seaLevel);

  function applySeaLevel() {
    setSeaLevel(seaLevelDraft);
  }

  return (
    <BlurCard title="Sea Level">
      <Input
        type="number"
        min={0.1}
        max={0.9}
        step={0.01}
        value={seaLevelDraft}
        onChange={(event) => setSeaLevelDraft(Number(event.target.value))}
        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-sm text-white outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-300">Applied: {seaLevel.toFixed(2)}</p>
        <Button type="button" onClick={applySeaLevel}>
          Confirm
        </Button>
      </div>
    </BlurCard>
  );
}
