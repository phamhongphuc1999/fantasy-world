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

const T_CLIMATE_LIMITS = {
  temperatureOffset: { min: -0.45, max: 0.45, step: 0.01 },
  temperatureContrast: { min: 0.35, max: 1.9, step: 0.01 },
  precipitationScale: { min: 0.3, max: 2.2, step: 0.01 },
  precipitationOffset: { min: -0.45, max: 0.45, step: 0.01 },
  humanImpact: { min: 0, max: 1, step: 0.01 },
} as const;

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
      temperatureOffset: clamp(
        nextTemperatureOffset,
        T_CLIMATE_LIMITS.temperatureOffset.min,
        T_CLIMATE_LIMITS.temperatureOffset.max
      ),
      temperatureContrast: clamp(
        nextTemperatureContrast,
        T_CLIMATE_LIMITS.temperatureContrast.min,
        T_CLIMATE_LIMITS.temperatureContrast.max
      ),
      precipitationScale: clamp(
        nextPrecipitationScale,
        T_CLIMATE_LIMITS.precipitationScale.min,
        T_CLIMATE_LIMITS.precipitationScale.max
      ),
      precipitationOffset: clamp(
        nextPrecipitationOffset,
        T_CLIMATE_LIMITS.precipitationOffset.min,
        T_CLIMATE_LIMITS.precipitationOffset.max
      ),
      humanImpact: clamp(
        nextHumanImpact,
        T_CLIMATE_LIMITS.humanImpact.min,
        T_CLIMATE_LIMITS.humanImpact.max
      ),
    });
  }

  return (
    <BlurCard title="Climate Model">
      <div className="space-y-2">
        <label className="text-xs text-slate-300">Temperature Offset (-0.45 to 0.45)</label>
        <Input
          type="number"
          step={T_CLIMATE_LIMITS.temperatureOffset.step}
          min={T_CLIMATE_LIMITS.temperatureOffset.min}
          max={T_CLIMATE_LIMITS.temperatureOffset.max}
          value={draft.temperatureOffset}
          onChange={(event) => setDraftField('temperatureOffset', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Temperature Contrast (0.35 to 1.9)</label>
        <Input
          type="number"
          step={T_CLIMATE_LIMITS.temperatureContrast.step}
          min={T_CLIMATE_LIMITS.temperatureContrast.min}
          max={T_CLIMATE_LIMITS.temperatureContrast.max}
          value={draft.temperatureContrast}
          onChange={(event) => setDraftField('temperatureContrast', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Precipitation Scale (0.3 to 2.2)</label>
        <Input
          type="number"
          step={T_CLIMATE_LIMITS.precipitationScale.step}
          min={T_CLIMATE_LIMITS.precipitationScale.min}
          max={T_CLIMATE_LIMITS.precipitationScale.max}
          value={draft.precipitationScale}
          onChange={(event) => setDraftField('precipitationScale', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Precipitation Offset (-0.45 to 0.45)</label>
        <Input
          type="number"
          step={T_CLIMATE_LIMITS.precipitationOffset.step}
          min={T_CLIMATE_LIMITS.precipitationOffset.min}
          max={T_CLIMATE_LIMITS.precipitationOffset.max}
          value={draft.precipitationOffset}
          onChange={(event) => setDraftField('precipitationOffset', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
        />

        <label className="text-xs text-slate-300">Human Impact (0 to 1)</label>
        <Input
          type="number"
          step={T_CLIMATE_LIMITS.humanImpact.step}
          min={T_CLIMATE_LIMITS.humanImpact.min}
          max={T_CLIMATE_LIMITS.humanImpact.max}
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
