'use client';

import { useMemo } from 'react';
import { toPercent } from 'src/services';
import { TDelaunayMesh } from 'src/types/map.types';

export default function useEthnicStatistic(ethnicId: number | null, mesh: TDelaunayMesh) {
  const data = useMemo(() => {
    if (ethnicId === null) return null;
    const ethnics = mesh.ethnics.find((group) => group.id === ethnicId);
    if (!ethnics) return null;

    const ethnicCells = mesh.cells.filter((cell) => !cell.isWater && cell.ethnicId === ethnicId);
    const totalPopulation = ethnicCells.reduce((sum, cell) => sum + cell.population, 0);

    const nationNameById = new Map(mesh.nations.map((nation) => [nation.id, nation.name]));
    const populationByNation = new Map<number, number>();
    const terrainCount = new Map<string, number>();

    for (const cell of ethnicCells) {
      if (cell.nationId !== null) {
        populationByNation.set(
          cell.nationId,
          (populationByNation.get(cell.nationId) || 0) + cell.population
        );
      }
      terrainCount.set(cell.terrain, (terrainCount.get(cell.terrain) || 0) + 1);
    }

    const nations = Array.from(populationByNation.entries())
      .map(([nationId, population]) => ({
        nationId,
        nationName: nationNameById.get(nationId) || `Nation #${nationId}`,
        population,
      }))
      .sort((a, b) => b.population - a.population);

    const terrains = Array.from(terrainCount.entries())
      .map(([terrain, count]) => ({
        terrain,
        count,
        percent: toPercent(count, ethnicCells.length),
      }))
      .sort((a, b) => b.count - a.count);

    return { ethnics, ethnicCells, totalPopulation, nations, terrains };
  }, [ethnicId, mesh.cells, mesh.ethnics, mesh.nations]);

  return { data };
}
