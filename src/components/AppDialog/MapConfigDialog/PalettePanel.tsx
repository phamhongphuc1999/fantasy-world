'use client';

import { BIOME_CONFIG, LANDFORM_CONFIG } from 'src/configs/map/landform-biome';

type TProps = Record<string, never>;

function renderLegendItem(key: string, item: { label: string; icon: string; color: string }) {
  return (
    <div
      key={key}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-200"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{item.icon}</span>
        <span className="font-medium">{item.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">{item.color}</span>
        <span
          className="inline-block size-3 rounded-full border border-white/20"
          style={{ backgroundColor: item.color }}
        />
      </div>
    </div>
  );
}

export default function PalettePanel(_props: TProps) {
  const landformEntries = Object.entries(LANDFORM_CONFIG);
  const biomeEntries = Object.entries(BIOME_CONFIG);

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Landform</h3>
        <div className="space-y-2">
          {landformEntries.map(([key, item]) => renderLegendItem(`landform-${key}`, item))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Biome</h3>
        <div className="space-y-2">
          {biomeEntries.map(([key, item]) => renderLegendItem(`biome-${key}`, item))}
        </div>
      </section>
    </div>
  );
}
