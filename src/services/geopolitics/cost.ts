import { BORDER_CONFIG } from 'src/configs/MapConfig';
import { TBorderType, TCell } from 'src/types/map.types';

export default class Cost {
  static logistics(cell: TCell) {
    let base = 1;
    if (cell.landform === 'mountain' || cell.landform === 'volcanic_field') base += 2.8;
    else if (cell.landform === 'hills') base += 1.6;
    else if (cell.landform === 'plateau') base += 1.25;
    else if (cell.landform === 'valley' || cell.landform === 'plain') base += 0.35;
    else if (cell.landform === 'coast') base += 0.6;

    if (cell.biome === 'wetland') base += 1.4;
    else if (cell.biome === 'desert_hot' || cell.biome === 'desert_cold') base += 1.15;
    else if (cell.biome === 'tundra' || cell.biome === 'ice') base += 0.9;
    else if (cell.biome === 'boreal_forest' || cell.biome === 'temperate_forest') base += 0.65;

    if (cell.isRiver) base += 0.45;
    if (cell.isLake) base += 1;
    return base;
  }

  static ethnic(cell: TCell, config: { strength: number }) {
    const strength = config.strength;
    if (cell.landform === 'plain' || cell.landform === 'valley' || cell.landform === 'coast')
      return strength;
    if (cell.biome === 'temperate_forest' || cell.biome === 'tropical_forest')
      return 1.35 * strength;
    if (cell.biome === 'wetland') return 1.75 * strength;
    if (cell.landform === 'hills') return 1.5 * strength;
    if (cell.landform === 'plateau') return 1.6 * strength;
    if (cell.landform === 'mountain' || cell.landform === 'volcanic_field') return 2.45 * strength;
    if (cell.biome === 'desert_hot' || cell.biome === 'desert_cold' || cell.biome === 'steppe')
      return 1.65 * strength;
    if (cell.biome === 'tundra' || cell.biome === 'ice') return 1.55 * strength;
    return 1.25 * strength;
  }

  static border(cell: TCell, borderType: TBorderType) {
    const profile = BORDER_CONFIG[borderType];
    const landformCost = profile.landformCost[cell.landform];
    const biomeCost = profile.biomeCost[cell.biome];
    return landformCost * 0.7 + biomeCost * 0.3;
  }
}
