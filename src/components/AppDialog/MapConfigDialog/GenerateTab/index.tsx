import CountryModePanel from './CountryModePanel';
import LogisticsGamePanel from './LogisticsGamePanel';
import SeaLevelPanel from './SeaLevelPanel';
import SeedPanel from './SeedPanel';

export default function GenerateTab() {
  return (
    <div className="space-y-4">
      <SeedPanel />
      <SeaLevelPanel />
      <CountryModePanel />
      <LogisticsGamePanel />
    </div>
  );
}
