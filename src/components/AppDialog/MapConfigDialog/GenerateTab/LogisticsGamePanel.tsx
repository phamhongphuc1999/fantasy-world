import { useEffect } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { useMapContext } from 'src/contexts/map.context';
import { useLogisticsGameStore } from 'src/store/logisticsGameStore';

export default function LogisticsGamePanel() {
  const { mesh } = useMapContext();
  const {
    enabled,
    startCellId,
    goalCellId,
    budget,
    roadEdges,
    routeDistance,
    routeRisk,
    routeScore,
    routeTotalCost,
    setEnabled,
    recalculateRoute,
    buildRoadOnCurrentRoute,
    resetRouteSelection,
    resetGame,
  } = useLogisticsGameStore();

  useEffect(() => {
    if (!enabled) return;
    recalculateRoute(mesh);
  }, [enabled, mesh, recalculateRoute, startCellId, goalCellId, roadEdges]);

  return (
    <BlurCard title="Logistics">
      <div className="space-y-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="size-4 accent-sky-400"
        />
        <p className="text-xs text-slate-300">
          Click map cells: first click sets <b>Start</b>, second click sets <b>Goal</b>.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
          <span className="text-slate-400">Start</span>
          <span>{startCellId ?? '-'}</span>
          <span className="text-slate-400">Goal</span>
          <span>{goalCellId ?? '-'}</span>
          <span className="text-slate-400">Budget</span>
          <span>{budget}</span>
          <span className="text-slate-400">Road Edges</span>
          <span>{roadEdges.length}</span>
          <span className="text-slate-400">Cost</span>
          <span>{routeTotalCost.toFixed(2)}</span>
          <span className="text-slate-400">Distance</span>
          <span>{routeDistance}</span>
          <span className="text-slate-400">Risk</span>
          <span>{routeRisk.toFixed(2)}</span>
          <span className="text-slate-400">Score</span>
          <span>{routeScore.toFixed(1)}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={buildRoadOnCurrentRoute}
            disabled={!enabled || routeDistance < 2 || budget < 2}
          >
            Build Road On Route
          </Button>
          <Button type="button" onClick={resetRouteSelection}>
            Clear A/B
          </Button>
          <Button type="button" onClick={resetGame}>
            Reset
          </Button>
        </div>
      </div>
    </BlurCard>
  );
}
