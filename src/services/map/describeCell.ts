import { TMapCell, TMapMesh } from 'src/types/global';

export type TCellDescription = {
  terrainType: string;
  elevation: string;
  biome: string;
  flow: string;
  suitability: string;
  riverState: string;
  temperature: string;
  precipitation: string;
  rainShadow: string;
  nationId: string;
  provinceId: string;
  zoneType: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAverageNeighborElevation(cell: TMapCell, mesh: TMapMesh) {
  if (cell.neighbors.length === 0) return cell.elevation;

  let total = 0;
  for (const neighborId of cell.neighbors) {
    total += mesh.cells[neighborId].elevation;
  }
  return total / cell.neighbors.length;
}

function getTerrainType(cell: TMapCell, mesh: TMapMesh): string {
  if (cell.terrain === 'deep-water') return 'Ocean';
  if (cell.terrain === 'shallow-water') return 'Sea';
  if (cell.terrain === 'inland-sea') return 'Inland Sea';
  if (cell.terrain === 'lake') return 'Lake';
  if (cell.terrain === 'coast') return 'Coast';
  if (cell.terrain === 'plateau') return 'Plateau';
  if (cell.terrain === 'desert') return 'Desert';
  if (cell.terrain === 'badlands') return 'Badlands';
  if (cell.terrain === 'forest') return 'Forest';
  if (cell.terrain === 'swamp') return 'Swamp';
  if (cell.terrain === 'valley') return 'Valley';
  if (cell.terrain === 'hills') return 'Hill';
  if (cell.terrain === 'mountains') return 'Mountain';
  if (cell.terrain === 'volcanic') return 'Volcanic';
  if (cell.terrain === 'tundra') return 'Tundra';

  const averageNeighborElevation = getAverageNeighborElevation(cell, mesh);
  if (cell.elevation - averageNeighborElevation > 0.018) return 'Plateau';
  return 'Plain';
}

export function describeCell(cell: TMapCell, mesh: TMapMesh): TCellDescription {
  const terrainType = getTerrainType(cell, mesh);
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
    riverState: cell.isRiver ? (cell.downstreamId === null ? 'River Mouth' : 'River') : 'No',
    temperature: `${temperatureC}C`,
    precipitation: `${precipitationPercent}%`,
    rainShadow: `${rainShadowPercent}%`,
    nationId: cell.nationId !== null ? String(cell.nationId) : 'None',
    provinceId: cell.provinceId !== null ? String(cell.provinceId) : 'None',
    zoneType: cell.zoneType,
  };
}
