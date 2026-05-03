import { TMapCell } from 'src/types/map.types';

type TEthnicConfig = {
  terrainInfluenceStrength: number;
};

export function ethnicTerrainCost(cell: TMapCell, config: TEthnicConfig) {
  const strength = config.terrainInfluenceStrength;
  if (cell.terrain === 'plains' || cell.terrain === 'valley' || cell.terrain === 'coast')
    return strength;
  if (cell.terrain === 'forest') return 1.35 * strength;
  if (cell.terrain === 'swamp') return 1.75 * strength;
  if (cell.terrain === 'hills') return 1.5 * strength;
  if (cell.terrain === 'plateau') return 1.6 * strength;
  if (cell.terrain === 'mountains' || cell.terrain === 'volcanic') return 2.45 * strength;
  if (cell.terrain === 'desert' || cell.terrain === 'badlands') return 1.65 * strength;
  if (cell.terrain === 'tundra') return 1.55 * strength;
  return 1.3 * strength;
}
