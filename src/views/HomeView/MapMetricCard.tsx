type TProps = {
  label: string;
  value: string;
};

export default function MapMetricCard({ label, value }: TProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-100">{value}</p>
    </article>
  );
}
