import { useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function SeedPanel() {
  const { seed, setSeed } = useMapExplorerStore();
  const [seedDraft, setSeedDraft] = useState(seed);

  function applySeed() {
    const normalizedSeed = seedDraft.trim() || 'world000';
    setSeed(normalizedSeed);
  }

  function generateRandomSeed() {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      const values = new Uint32Array(1);
      cryptoApi.getRandomValues(values);
      const randomNumber = (values[0] as number) % 1_000_000;
      return `world${randomNumber.toString().padStart(6, '0')}`;
    }
    const fallback = Math.floor(Math.random() * 1_000_000);
    return `world${fallback.toString().padStart(6, '0')}`;
  }

  function applyRandomSeed() {
    const nextSeed = generateRandomSeed();
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
