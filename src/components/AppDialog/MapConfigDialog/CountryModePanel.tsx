import { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TNationMode } from 'src/types/map.types';

type TModeOption = {
  value: TNationMode;
  label: string;
};

const MODE_OPTIONS: TModeOption[] = [
  { value: 'dominant', label: 'Type A: Dominant large country' },
  { value: 'balanced', label: 'Type B: Balanced distribution' },
];

export default function CountryModePanel() {
  const { nationMode, nationCount, setNationMode, setNationCount } = useMapExplorerStore();
  const [draftCount, setDraftCount] = useState(String(nationCount));
  const [error, setError] = useState('');

  const helperText = useMemo(() => {
    if (nationMode === 'dominant') {
      return 'Creates one clearly dominant large country, with total countries <= 5.';
    }
    return 'Creates exactly the country count you entered (2-40), with relatively balanced sizes.';
  }, [nationMode]);

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
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
        Custom Country Mode
      </span>

      <div className="space-y-2">
        <label className="text-xs text-slate-300">Country generation type</label>
        <Select value={nationMode} onValueChange={(value) => setNationMode(value as TNationMode)}>
          <SelectTrigger>
            <SelectValue placeholder="Select generation type" />
          </SelectTrigger>
          <SelectContent>
            {MODE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <p className="text-xs text-slate-300">{helperText}</p>
    </div>
  );
}
