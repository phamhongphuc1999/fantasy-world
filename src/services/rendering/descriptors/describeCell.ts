import { clamp } from 'src/services/utils/math';
import { terrainLabel } from 'src/services/terrain/rules';
import { TCell, TCellDescription } from 'src/types/map.types';

export function describeCell(cell: TCell): TCellDescription {
  const terrainType = terrainLabel(cell.terrain);
  const suitabilityPercent = Math.round(clamp(cell.suitability, 0, 1) * 100);
  const temperatureC = Math.round(-12 + cell.temperature * 44);
  const precipitationPercent = Math.round(cell.precipitation * 100);
  const rainShadowPercent = Math.round(cell.rainShadow * 100);

  return {
    terrainType,
    elevation: cell.elevation.toFixed(3),
    biome: cell.biome,
    flow: cell.flow.toFixed(2),
    suitability: `${suitabilityPercent}%`,
    population: String(cell.population),
    riverState: cell.isRiver ? (cell.downstreamId === null ? 'River Mouth' : 'River') : 'No',
    temperature: `${temperatureC}C`,
    precipitation: `${precipitationPercent}%`,
    rainShadow: `${rainShadowPercent}%`,
    nationId: cell.nationId !== null ? String(cell.nationId) : 'None',
    provinceId: cell.provinceId !== null ? String(cell.provinceId) : 'None',
    ethnicId: cell.ethnicId !== null ? String(cell.ethnicId) : 'None',
    zoneType: cell.zoneType,
  };
}
