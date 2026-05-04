import { GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { createSeededRandom, hashSeed } from 'src/services/map/seededRandom';
import { TBorderLevelKey, TMapCell, TTerrainBand, TZoneType } from 'src/types/map.types';

export const CAPITAL_VIEWPORT_MARGIN = 14;
export type TBorderLevelProfile = (typeof GEOPOLITICAL_CONFIG.borderLevels)[TBorderLevelKey];

const starts = [
  'Al',
  'Bel',
  'Cor',
  'Dor',
  'El',
  'Fal',
  'Gal',
  'Har',
  'Is',
  'Kor',
  'Lor',
  'Mar',
  'Nor',
  'Or',
  'Pel',
  'Quel',
  'Riv',
  'Sel',
  'Tor',
  'Val',
  'Wen',
  'Yar',
  'Zor',

  // new
  'Ar',
  'Bar',
  'Cer',
  'Drak',
  'Eld',
  'Fen',
  'Gor',
  'Hel',
  'Ith',
  'Jar',
  'Kel',
  'Lun',
  'Mor',
  'Ner',
  'Ost',
  'Pra',
  'Quin',
  'Ran',
  'Sar',
  'Thal',
  'Ul',
  'Var',
  'Vor',
  'Xan',
  'Yel',
  'Zen',

  // more “regional” flavor
  'Bao',
  'Dai',
  'Hua',
  'Kyo',
  'Min',
  'Shen',
  'Tian',
  'Xia',
  'Kaz',
  'Uz',
  'Tur',
  'Alt',
  'Bukh',
  'Nov',
  'Petro',
  'Vlad',
  'Zem',
];

const mids = [
  'a',
  'e',
  'i',
  'o',
  'u',
  'ae',
  'ia',
  'oa',
  'ei',

  // new
  'ai',
  'au',
  'ou',
  'ie',
  'ui',
  'aa',
  'eo',
  'io',

  // consonant blends (adds realism)
  'ar',
  'or',
  'ir',
  'ur',
  'an',
  'en',
  'in',
  'on',
  'al',
  'el',
  'il',
  'ol',

  // exotic flavor
  'ya',
  'yo',
  'yu',
  'kh',
  'zh',
  'sh',
];

const ends = [
  'dor',
  'land',
  'ria',
  'mar',
  'vale',
  'stan',
  'mere',
  'gard',
  'wyn',
  'crest',

  // new classic
  'nia',
  'lia',
  'via',
  'tan',
  'ron',
  'ros',
  'tis',
  'nus',
  'grad',
  'burg',
  'heim',
  'hold',
  'ford',
  'port',

  // regional
  'khan',
  'abad',
  'istan',
  'pur',
  'jing',
  'zhou',
  'shan',
  'sk',
  'vich',
  'ova',

  // softer / fantasy
  'lune',
  'thia',
  'dell',
  'vara',
  'mora',
  'zeth',
];

export function edgeNoise(seedHash: number, leftId: number, rightId: number) {
  const low = Math.min(leftId, rightId);
  const high = Math.max(leftId, rightId);
  const mix = (low * 73856093) ^ (high * 19349663) ^ seedHash;
  const s = Math.sin(mix * 0.000173) * 43758.5453;
  return Math.abs(s - Math.floor(s));
}

export function createRegionalName(seed: string, namespace: string, id: number, prefix?: string) {
  const random = createSeededRandom(`${seed}:${namespace}:${id}:name`);
  const start = starts[Math.floor(random() * starts.length)] as string;
  const mid = mids[Math.floor(random() * mids.length)] as string;
  const end = ends[Math.floor(random() * ends.length)] as string;
  const root = `${start}${mid}${end}`;
  return prefix ? `${prefix} ${root}` : root;
}

export function isLand(cell: TMapCell) {
  return !cell.isWater;
}

function isRidgeBarrier(left: TMapCell, right: TMapCell) {
  const ruggedLeft =
    left.terrain === 'mountains' || left.terrain === 'hills' || left.terrain === 'volcanic';
  const ruggedRight =
    right.terrain === 'mountains' || right.terrain === 'hills' || right.terrain === 'volcanic';
  return ruggedLeft && ruggedRight;
}

function getTerrainCrossCost(cell: TMapCell, profile: TBorderLevelProfile) {
  const terrainCost = profile.terrainCost[cell.terrain as keyof typeof profile.terrainCost];
  return terrainCost ?? 1.2;
}

function getNaturalBarrierPenalty(left: TMapCell, right: TMapCell, profile: TBorderLevelProfile) {
  let penalty = 0;
  if (left.isRiver || right.isRiver) {
    penalty +=
      profile.featurePenalty.riverCross + Math.log2(Math.max(left.flow, right.flow) + 1) * 0.7;
  }
  if (left.isLake || right.isLake || left.isWater || right.isWater) {
    penalty += profile.featurePenalty.lakeCross;
  }
  if (isRidgeBarrier(left, right)) {
    penalty += profile.featurePenalty.ridgeCross + Math.abs(left.elevation - right.elevation) * 6;
  }
  return penalty;
}

function isShorelineEdge(left: TMapCell, right: TMapCell) {
  return left.isWater !== right.isWater || left.isLake !== right.isLake;
}

function countOwnedNeighbors(
  cells: TMapCell[],
  owner: Int32Array,
  cellId: number,
  ownerId: number
) {
  let count = 0;
  for (const neighborId of cells[cellId].neighbors) {
    if (owner[neighborId] === ownerId) count += 1;
  }
  return count;
}

export function getBoundaryStepCost(
  cells: TMapCell[],
  owner: Int32Array,
  currentId: number,
  neighborId: number,
  ownerId: number,
  seedHash: number,
  profile: TBorderLevelProfile
) {
  const currentCell = cells[currentId];
  const neighbor = cells[neighborId];
  let step = getTerrainCrossCost(neighbor, profile);
  step += getNaturalBarrierPenalty(currentCell, neighbor, profile);
  if (isShorelineEdge(currentCell, neighbor)) step += profile.featurePenalty.shorelineEdgeBias;
  const sameOwnerNeighbors = countOwnedNeighbors(cells, owner, neighborId, ownerId);
  step += (2 - Math.min(2, sameOwnerNeighbors)) * profile.smoothness.jaggedPenalty;
  const noise = (edgeNoise(seedHash, currentId, neighborId) - 0.5) * 2;
  step += noise * profile.smoothness.edgeNoiseWeight;
  return Math.max(0.25, step);
}

export function getNationNeighborCounts(cells: TMapCell[], owner: Int32Array, cellId: number) {
  const counts = new Map<number, number>();
  for (const neighborId of cells[cellId].neighbors) {
    if (!isLand(cells[neighborId])) continue;
    const neighborNationId = owner[neighborId];
    if (neighborNationId < 0) continue;
    counts.set(neighborNationId, (counts.get(neighborNationId) || 0) + 1);
  }
  return counts;
}

export function collectTerrainClusters(cells: TMapCell[], terrain: TTerrainBand) {
  const visited = new Set<number>();
  const clusters: number[][] = [];
  for (const cell of cells) {
    if (cell.terrain !== terrain || cell.isWater || visited.has(cell.id)) continue;
    const queue = [cell.id];
    const cluster: number[] = [];
    visited.add(cell.id);
    while (queue.length > 0) {
      const current = queue.pop() as number;
      cluster.push(current);
      for (const neighborId of cells[current].neighbors) {
        if (visited.has(neighborId)) continue;
        if (cells[neighborId].terrain !== terrain || cells[neighborId].isWater) continue;
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

export function limitMountainClusterSplit(
  cells: TMapCell[],
  owner: Int32Array,
  level: TBorderLevelKey,
  nationOwner?: Int32Array
) {
  const profile = GEOPOLITICAL_CONFIG.borderLevels[level];
  const clusters = collectTerrainClusters(cells, 'mountains');
  for (const cluster of clusters) {
    if (cluster.length < profile.fragmentation.largeMountainClusterMinCells) continue;
    const byOwner = new Map<number, number[]>();
    for (const cellId of cluster) {
      const ownerId = owner[cellId];
      if (ownerId < 0) continue;
      if (!byOwner.has(ownerId)) byOwner.set(ownerId, []);
      (byOwner.get(ownerId) as number[]).push(cellId);
    }
    const ownerEntries = Array.from(byOwner.entries()).sort((a, b) => b[1].length - a[1].length);
    const allowed = new Set(
      ownerEntries.slice(0, profile.fragmentation.maxMountainOwnersPerCluster).map(([id]) => id)
    );
    for (const [ownerId, cellsToMove] of ownerEntries) {
      if (allowed.has(ownerId)) continue;
      for (const cellId of cellsToMove) {
        const counts = new Map<number, number>();
        for (const neighborId of cells[cellId].neighbors) {
          const candidateId = owner[neighborId];
          if (candidateId < 0 || !allowed.has(candidateId)) continue;
          if (nationOwner && nationOwner[neighborId] !== nationOwner[cellId]) continue;
          counts.set(candidateId, (counts.get(candidateId) || 0) + 1);
        }
        let bestOwnerId = ownerId;
        let bestCount = -1;
        for (const [candidateId, count] of counts) {
          if (count > bestCount) {
            bestCount = count;
            bestOwnerId = candidateId;
          }
        }
        if (bestOwnerId !== ownerId && bestCount >= profile.fragmentation.clusterSplitPenalty) {
          owner[cellId] = bestOwnerId;
        }
      }
    }
  }
}

export function assignMaritimeZones(cells: TMapCell[]) {
  const zoneType: TZoneType[] = Array.from({ length: cells.length }, () => 'international-waters');
  const waterOwner = new Int32Array(cells.length);
  waterOwner.fill(-1);

  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (isLand(cells[cellId])) zoneType[cellId] = 'land';
  }
  return { waterOwner, zoneType };
}

export function getNationCount(nationCount: number, landCellCount: number) {
  if (landCellCount <= 0) return 0;
  const maxNationsByMinLandRule = Math.floor(landCellCount / 10) - 2;
  const maxNations = Math.max(1, Math.min(40, maxNationsByMinLandRule));
  const requested = Math.max(2, Math.floor(nationCount));
  return Math.min(requested, maxNations);
}

export function makeFrontierHash(seed: string, suffix: string) {
  return hashSeed(`${seed}:${suffix}`);
}
