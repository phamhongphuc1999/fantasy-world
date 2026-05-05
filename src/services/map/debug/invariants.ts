import { TMapMeshWithDelaunay } from 'src/types/map.types';
import { isLand } from '../buildGeopolitics/geopoliticsShared';

export function validateProvinceAssignments(
  cells: TMapMeshWithDelaunay['cells'],
  owner: Int32Array,
  provinceOwner: Int32Array
) {
  let invalidCount = 0;
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    const cell = cells[cellId];
    if (!isLand(cell)) continue;
    if (owner[cellId] < 0) continue;
    if (provinceOwner[cellId] < 0) invalidCount += 1;
  }
  if (invalidCount > 0) {
    console.warn(`[dev-invariant] land cells without province assignment: ${invalidCount}`);
  }
}
