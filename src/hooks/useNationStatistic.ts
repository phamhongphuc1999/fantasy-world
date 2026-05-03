'use client';

import { useMemo } from 'react';
import { toPercent } from 'src/services';
import { TMapMeshWithDelaunay } from 'src/types/map.types';

export default function useNationStatistic(nationId: number | null, mesh: TMapMeshWithDelaunay) {
  const nation = useMemo(() => {
    return nationId !== null ? mesh.nations.find((item) => item.id === nationId) : undefined;
  }, [mesh.nations, nationId]);

  const data = useMemo(() => {
    if (nation) {
      const nationCells = mesh.cells.filter((cell) => !cell.isWater && cell.nationId === nation.id);
      const terrainCounts = new Map<string, number>();
      const ethnicCounts = new Map<number, number>();
      const ethnicPopulation = new Map<number, number>();
      let totalPopulation = 0;

      const provincePopulationMap = new Map<number, number>();
      const provinceCellCountMap = new Map<number, number>();

      for (const cell of nationCells) {
        terrainCounts.set(cell.terrain, (terrainCounts.get(cell.terrain) || 0) + 1);
        totalPopulation += cell.population;
        if (cell.ethnicGroupId !== null) {
          ethnicCounts.set(cell.ethnicGroupId, (ethnicCounts.get(cell.ethnicGroupId) || 0) + 1);
          ethnicPopulation.set(
            cell.ethnicGroupId,
            (ethnicPopulation.get(cell.ethnicGroupId) || 0) + cell.population
          );
        }
        if (cell.provinceId !== null) {
          provincePopulationMap.set(
            cell.provinceId,
            (provincePopulationMap.get(cell.provinceId) || 0) + cell.population
          );
          provinceCellCountMap.set(
            cell.provinceId,
            (provinceCellCountMap.get(cell.provinceId) || 0) + 1
          );
        }
      }

      const terrainStats = Array.from(terrainCounts.entries())
        .map(([terrain, count]) => ({
          terrain,
          count,
          percent: toPercent(count, nationCells.length),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const ethnicNameById = new Map(mesh.ethnicGroups.map((group) => [group.id, group.name]));
      const ethnicStats = Array.from(ethnicCounts.entries())
        .map(([ethnicId, count]) => ({
          ethnicId,
          name: ethnicNameById.get(ethnicId) || `Ethnic #${ethnicId}`,
          count,
          percent: toPercent(count, nationCells.length),
          population: ethnicPopulation.get(ethnicId) || 0,
          populationPercent: toPercent(ethnicPopulation.get(ethnicId) || 0, totalPopulation),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const provinces = Array.from(provincePopulationMap.entries())
        .map(([provinceId, population]) => ({
          provinceId,
          population,
          cellCount: provinceCellCountMap.get(provinceId) || 0,
        }))
        .sort((a, b) => b.population - a.population);

      return { nationCells, totalPopulation, terrainStats, ethnicStats, provinces };
    }
  }, [mesh.cells, mesh.ethnicGroups, nation]);

  return { nation, data };
}
