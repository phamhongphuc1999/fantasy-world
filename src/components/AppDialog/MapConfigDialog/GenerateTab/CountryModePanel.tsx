import { useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function CountryModePanel() {
  const { nationCount, setNationCount } = useMapExplorerStore();
  const [draftCount, setDraftCount] = useState(String(nationCount));
  const [error, setError] = useState('');

  function handleApplyCount() {
    const nextValue = Number(draftCount);
    if (
      !Number.isFinite(nextValue) ||
      !Number.isInteger(nextValue) ||
      nextValue < 2 ||
      nextValue > 40
    ) {
      setError('Country count must be an integer between 2 and 40.');
      return;
    }
    const success = setNationCount(nextValue);
    if (!success) {
      setError('Country count must be an integer between 2 and 40.');
      return;
    }
    setError('');
  }

  return (
    <BlurCard title="Country Mode">
      <div className="space-y-2">
        <label className="text-xs text-slate-300">Country count (2-40)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={2}
            max={40}
            step={1}
            value={draftCount}
            onChange={(event) => setDraftCount(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={handleApplyCount}
            className="rounded-xl bg-sky-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
          >
            Apply
          </button>
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    </BlurCard>
  );
}
