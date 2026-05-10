import { NATION_COLORS } from 'src/configs/MapConfig';

export function getNationColor(nationId: number | null) {
  if (nationId === null) return '#334155';
  const paletteIndex = Math.abs(nationId) % NATION_COLORS.length;
  return NATION_COLORS[paletteIndex];
}
