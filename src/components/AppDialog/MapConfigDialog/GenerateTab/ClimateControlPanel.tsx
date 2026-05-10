import { useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

type TDraft = {
  temperatureOffset: number;
  temperatureContrast: number;
  precipitationScale: number;
  precipitationOffset: number;
  humanImpact: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ClimateControlPanel() {
  const { climateControl, setClimateControl } = useMapExplorerStore();
  const [draft, setDraft] = useState<TDraft>(climateControl);

  function setDraftField<K extends keyof TDraft>(field: K, value: string) {
    const parsed = Number(value);
    setDraft((prev) => ({ ...prev, [field]: Number.isFinite(parsed) ? parsed : 0 }));
  }

  function apply() {
    setClimateControl({
      temperatureOffset: clamp(draft.temperatureOffset, -0.45, 0.45),
      temperatureContrast: clamp(draft.temperatureContrast, 0.35, 1.9),
      precipitationScale: clamp(draft.precipitationScale, 0.3, 2.2),
      precipitationOffset: clamp(draft.precipitationOffset, -0.45, 0.45),
      humanImpact: clamp(draft.humanImpact, 0, 1),
    });
  }

  return (
    <BlurCard title="Climate Model">
      <div className="space-y-2">
        <label className="text-xs text-slate-300">Temperature Offset (-0.45 to 0.45)</label>
        <Input
          type="number"
          min={-0.45}
          max={0.45}
          step={0.01}
          value={draft.temperatureOffset}
          onChange={(event) => setDraftField('temperatureOffset', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Temperature Contrast (0.35 to 1.9)</label>
        <Input
          type="number"
          min={0.35}
          max={1.9}
          step={0.01}
          value={draft.temperatureContrast}
          onChange={(event) => setDraftField('temperatureContrast', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Precipitation Scale (0.3 to 2.2)</label>
        <Input
          type="number"
          min={0.3}
          max={2.2}
          step={0.01}
          value={draft.precipitationScale}
          onChange={(event) => setDraftField('precipitationScale', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Precipitation Offset (-0.45 to 0.45)</label>
        <Input
          type="number"
          min={-0.45}
          max={0.45}
          step={0.01}
          value={draft.precipitationOffset}
          onChange={(event) => setDraftField('precipitationOffset', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Human Impact (0 to 1)</label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={draft.humanImpact}
          onChange={(event) => setDraftField('humanImpact', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-300">Apply to regenerate climate, terrain and biome.</p>
          <Button type="button" onClick={apply}>
            Apply
          </Button>
        </div>
      </div>
    </BlurCard>
  );
}
