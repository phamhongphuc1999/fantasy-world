import { useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

type TDraft = {
  temperatureOffset: string;
  temperatureContrast: string;
  precipitationScale: string;
  precipitationOffset: string;
  humanImpact: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ClimateControlPanel() {
  const { climateControl, setClimateControl } = useMapExplorerStore();
  const [draft, setDraft] = useState<TDraft>({
    temperatureOffset: String(climateControl.temperatureOffset),
    temperatureContrast: String(climateControl.temperatureContrast),
    precipitationScale: String(climateControl.precipitationScale),
    precipitationOffset: String(climateControl.precipitationOffset),
    humanImpact: String(climateControl.humanImpact),
  });

  function setDraftField<K extends keyof TDraft>(field: K, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function parseNumber(raw: string, fallback: number) {
    const normalized = raw.trim().replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function apply() {
    const nextTemperatureOffset = parseNumber(
      draft.temperatureOffset,
      climateControl.temperatureOffset
    );
    const nextTemperatureContrast = parseNumber(
      draft.temperatureContrast,
      climateControl.temperatureContrast
    );
    const nextPrecipitationScale = parseNumber(
      draft.precipitationScale,
      climateControl.precipitationScale
    );
    const nextPrecipitationOffset = parseNumber(
      draft.precipitationOffset,
      climateControl.precipitationOffset
    );
    const nextHumanImpact = parseNumber(draft.humanImpact, climateControl.humanImpact);

    setClimateControl({
      temperatureOffset: clamp(nextTemperatureOffset, -0.45, 0.45),
      temperatureContrast: clamp(nextTemperatureContrast, 0.35, 1.9),
      precipitationScale: clamp(nextPrecipitationScale, 0.3, 2.2),
      precipitationOffset: clamp(nextPrecipitationOffset, -0.45, 0.45),
      humanImpact: clamp(nextHumanImpact, 0, 1),
    });
  }

  return (
    <BlurCard title="Climate Model">
      <div className="space-y-2">
        <label className="text-xs text-slate-300">Temperature Offset (-0.45 to 0.45)</label>
        <Input
          type="text"
          inputMode="decimal"
          value={draft.temperatureOffset}
          onChange={(event) => setDraftField('temperatureOffset', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Temperature Contrast (0.35 to 1.9)</label>
        <Input
          type="text"
          inputMode="decimal"
          value={draft.temperatureContrast}
          onChange={(event) => setDraftField('temperatureContrast', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Precipitation Scale (0.3 to 2.2)</label>
        <Input
          type="text"
          inputMode="decimal"
          value={draft.precipitationScale}
          onChange={(event) => setDraftField('precipitationScale', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Precipitation Offset (-0.45 to 0.45)</label>
        <Input
          type="text"
          inputMode="decimal"
          value={draft.precipitationOffset}
          onChange={(event) => setDraftField('precipitationOffset', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Human Impact (0 to 1)</label>
        <Input
          type="text"
          inputMode="decimal"
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
