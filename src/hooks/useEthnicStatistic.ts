'use client';

import { useMemo } from 'react';
import { toPercent } from 'src/services';
import { TMapMeshWithDelaunay } from 'src/types/map.types';

export default function useEthnicStatistic(
  ethnicGroupId: number | null,
  mesh: TMapMeshWithDelaunay
) {
  const data = useMemo(() => {
    if (ethnicGroupId === null) return null;
    const ethnicGroup = mesh.ethnicGroups.find((group) => group.id === ethnicGroupId);
    if (!ethnicGroup) return null;

    const ethnicCells = mesh.cells.filter(
      (cell) => !cell.isWater && cell.ethnicGroupId === ethnicGroupId
    );
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

    return { ethnicGroup, ethnicCells, totalPopulation, nations, terrains };
  }, [ethnicGroupId, mesh.cells, mesh.ethnicGroups, mesh.nations]);

  return { data };
}
