import { useRef, useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { createSeededRandom } from 'src/services/map/seededRandom';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function SeedPanel() {
  const randomizeCountRef = useRef(0);
  const { seed, setSeed } = useMapExplorerStore();
  const [seedDraft, setSeedDraft] = useState(seed);

  function applySeed() {
    const normalizedSeed = seedDraft.trim() || 'world000';
    setSeed(normalizedSeed);
  }

  function applyRandomSeed() {
    randomizeCountRef.current += 1;
    const random = createSeededRandom(`${seed}:${randomizeCountRef.current}:seed-randomize`);
    const nextSeed = `world${Math.floor(random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`;
    setSeedDraft(nextSeed);
    setSeed(nextSeed);
  }

  return (
    <BlurCard title="Seed">
      <Input
        value={seedDraft}
        onChange={(event) => setSeedDraft(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
        placeholder="world000"
      />
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={applySeed}>
          Apply seed
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={applyRandomSeed}>
          Randomize
        </Button>
      </div>
    </BlurCard>
  );
}
