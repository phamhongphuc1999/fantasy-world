type TProps = {
  label: string;
  value: string;
  detail?: string;
};

export default function MapInfoCard({ label, value, detail }: TProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p> : null}
    </article>
  );
}
