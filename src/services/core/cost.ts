import { TERRAIN_CONFIG } from 'src/configs/constance';
import { BORDER_CONFIG } from 'src/configs/mapConfig';
import { TBorderType, TCell, TTerrain } from 'src/types/map.types';

export default class Cost {
  static logistics(terrain: TTerrain) {
    return TERRAIN_CONFIG[terrain].logisticsMoveCost;
  }

  static ethnic(cell: TCell, config: { strength: number }) {
    const strength = config.strength;
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

  static terrain(cell: TCell, borderType: TBorderType) {
    const terrainCost = BORDER_CONFIG[borderType].cost[cell.terrain];
    return terrainCost;
  }
}
