import { TTerrainBand } from 'src/types/map.types';

export function sortIndicesByElevation(elevations: Float32Array) {
  const bucketCount = 1024;
  const buckets = Array.from({ length: bucketCount }, () => [] as number[]);

  for (let index = 0; index < elevations.length; index += 1) {
    const bucket = Math.max(0, Math.min(bucketCount - 1, Math.floor(elevations[index] * 1023)));
    buckets[bucket].push(index);
  }

  const indices = new Int32Array(elevations.length);
  let cursor = 0;
  for (let bucket = bucketCount - 1; bucket >= 0; bucket -= 1) {
    const bucketItems = buckets[bucket];
    for (let index = 0; index < bucketItems.length; index += 1) {
      indices[cursor] = bucketItems[index];
      cursor += 1;
    }
  }
  return indices;
}

export function isWaterTerrain(terrain: TTerrainBand) {
  return (
    terrain === 'deep-water' ||
    terrain === 'shallow-water' ||
    terrain === 'inland-sea' ||
    terrain === 'coast' ||
    terrain === 'lake'
  );
}
