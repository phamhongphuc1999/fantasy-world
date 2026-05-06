import {
  TCell,
  TCellOwnerParams,
  TDelaunayMesh,
  TEthnic,
  TNumRecordTerrain,
  TTerrain,
} from 'src/types/map.types';
import { validateProvinceAssignments } from '../debug/invariants';
import { createSeededRandom } from '../seededRandom';
import { pickEconomicAndCapital } from './capitals';
import { buildEthnicRegions } from './ethnic';
import {
  assignMaritimeZones,
  getNationCount,
  isLand,
  limitMountainSplit,
} from './geopoliticsShared';
import {
  alignNaturalTerrainClusters,
  buildLandNations,
  diversifySmallNationSizes,
  enforceMainlandContiguity,
  enforceMinimumNationArea,
  reconcileNationClaims,
} from './nations';
import {
  buildNationProvinces,
  enforceProvinceConnect,
  limitProvincePopulation,
  minProvinceArea,
} from './provinces';

type TBuildGeopoliticsOptions = {
  mesh: TDelaunayMesh;
  seed: string;
  nationCount: number;
};

type TTerrainRangeMap = Record<TTerrain, [min: number, max: number]>;

const T_NATION_POPULATION_MULTIPLIER_RANGE: [number, number] = [0.1, 5.0];
const T_NATION_ECONOMY_MULTIPLIER_RANGE: [number, number] = [0.1, 20];
const T_MIN_NATION_POPULATION = 500;

const T_TERRAIN_POPULATION_MODIFIER_RANGES: TTerrainRangeMap = {
  'deep-water': [0, 0.02],
  'shallow-water': [0.05, 0.2],
  'inland-sea': [0.02, 0.1],
  coast: [0.6, 1.2],
  lake: [0.5, 0.9],
  plains: [0.4, 0.8],
  valley: [0.5, 1.0],
  forest: [0.3, 0.7],
  plateau: [0.2, 0.5],
  hills: [0.2, 0.6],
  swamp: [0.05, 0.2],
  tundra: [0.02, 0.1],
  badlands: [0.01, 0.05],
  desert: [0.01, 0.1],
  mountains: [0.1, 0.4],
  volcanic: [0.05, 0.3],
};

const T_TERRAIN_ECONOMY_MODIFIER_RANGES: TTerrainRangeMap = {
  'deep-water': [0.1, 0.5],
  'shallow-water': [0.4, 1.0],
  'inland-sea': [0.2, 0.6],
  coast: [1.2, 3.0],
  lake: [0.8, 1.4],
  plains: [0.8, 1.5],
  valley: [1.0, 1.8],
  forest: [0.7, 1.5],
  plateau: [0.5, 1.0],
  hills: [0.8, 1.8],
  swamp: [0.2, 0.7],
  tundra: [0.1, 0.6],
  badlands: [0.2, 1.2],
  desert: [0.1, 1.8],
  mountains: [1.2, 3.5],
  volcanic: [0.8, 2.5],
};

type TNationAssignment = {
  owner: Int32Array;
  preserveNationCount: number;
};

type TNationProfile = {
  populationMultiplier: number;
  economyMultiplier: number;
  terrainPopulationModifiers: TNumRecordTerrain;
  terrainEconomyModifiers: TNumRecordTerrain;
};

function randomBetween(random: () => number, min: number, max: number) {
  return min + (max - min) * random();
}

function buildNationProfiles(owner: Int32Array, seed: string) {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  const nationProfiles = new Map<number, TNationProfile>();

  for (const nationId of nationIds) {
    const random = createSeededRandom(`${seed}:nation-profile:${nationId}`);
    const terrainPopulationModifiers = Object.fromEntries(
      Object.entries(T_TERRAIN_POPULATION_MODIFIER_RANGES).map(([terrain, [min, max]]) => [
        terrain,
        randomBetween(random, min, max),
      ])
    ) as TNumRecordTerrain;
    const terrainEconomyModifiers = Object.fromEntries(
      Object.entries(T_TERRAIN_ECONOMY_MODIFIER_RANGES).map(([terrain, [min, max]]) => [
        terrain,
        randomBetween(random, min, max),
      ])
    ) as TNumRecordTerrain;

    nationProfiles.set(nationId, {
      populationMultiplier: randomBetween(
        random,
        T_NATION_POPULATION_MULTIPLIER_RANGE[0],
        T_NATION_POPULATION_MULTIPLIER_RANGE[1]
      ),
      economyMultiplier: randomBetween(
        random,
        T_NATION_ECONOMY_MULTIPLIER_RANGE[0],
        T_NATION_ECONOMY_MULTIPLIER_RANGE[1]
      ),
      terrainPopulationModifiers,
      terrainEconomyModifiers,
    });
  }

  return nationProfiles;
}

function mapNationsToCells(
  cells: TCell[],
  owner: Int32Array,
  nationProfiles: Map<number, TNationProfile>
) {
  return cells.map((cell) => {
    if (!isLand(cell)) return cell;
    const nationId = owner[cell.id];
    if (nationId < 0) return cell;
    const profile = nationProfiles.get(nationId);
    if (!profile) return cell;

    const terrainPopulationModifier = profile.terrainPopulationModifiers[cell.terrain] ?? 1;
    const terrainEconomyModifier = profile.terrainEconomyModifiers[cell.terrain] ?? 1;
    const population = Math.round(
      cell.population * profile.populationMultiplier * terrainPopulationModifier
    );
    const economy = Math.round(cell.economy * profile.economyMultiplier * terrainEconomyModifier);
    return { ...cell, population: Math.max(0, population), economy: Math.max(0, economy) };
  });
}

function limitNationPopulation(cells: TCell[], owner: Int32Array, seed: string) {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  const nextCells = [...cells];

  for (const nationId of nationIds) {
    const random = createSeededRandom(`${seed}:nation-pop-floor:${nationId}`);
    const nationCellIds: number[] = [];
    let nationPopulation = 0;
    for (let cellId = 0; cellId < owner.length; cellId += 1) {
      if (owner[cellId] !== nationId) continue;
      if (!isLand(nextCells[cellId])) continue;
      nationCellIds.push(cellId);
      nationPopulation += nextCells[cellId]?.population || 0;
    }
    if (nationCellIds.length === 0 || nationPopulation >= T_MIN_NATION_POPULATION) continue;

    const randomizedFloor = Math.round(T_MIN_NATION_POPULATION * (1.02 + random() * 0.86));
    const targetPopulation = Math.max(T_MIN_NATION_POPULATION, randomizedFloor);
    const scale = targetPopulation / Math.max(1, nationPopulation);
    for (const cellId of nationCellIds) {
      const cell = nextCells[cellId];
      if (!cell) continue;
      const scaledPopulation = Math.max(1, Math.round(cell.population * scale));
      nextCells[cellId] = { ...cell, population: scaledPopulation };
    }
  }
  return nextCells;
}

function runNationStabilityPass(cells: TCell[], owner: Int32Array, preserveNationCount: number) {
  alignNaturalTerrainClusters(cells, owner);
  limitMountainSplit(cells, owner, 'country');
  enforceMinimumNationArea(cells, owner, preserveNationCount);
}

function assignNations(mesh: TDelaunayMesh, seed: string, nationCount: number): TNationAssignment {
  const landCellCount = mesh.cells.filter(isLand).length;
  const targetNationCount = getNationCount(nationCount, landCellCount);
  const preserveNationCount = targetNationCount;
  const owner = buildLandNations(mesh.cells, seed, nationCount);
  return { owner, preserveNationCount };
}

function postProcessNations(
  cells: TCell[],
  owner: Int32Array,
  preserveNationCount: number,
  seed: string
) {
  runNationStabilityPass(cells, owner, preserveNationCount);
  enforceMainlandContiguity(cells, owner);
  runNationStabilityPass(cells, owner, preserveNationCount);
  reconcileNationClaims(cells, owner, preserveNationCount);
  diversifySmallNationSizes(cells, owner, seed);
  reconcileNationClaims(cells, owner, preserveNationCount);
}

function assignProvinces(cells: TCell[], owner: Int32Array, seed: string) {
  return { provinceOwner: buildNationProvinces(cells, owner, seed) };
}

function postProcessProvinces(params: TCellOwnerParams) {
  const { cells, owner, provinceOwner } = params;
  limitMountainSplit(cells, provinceOwner, 'province', owner);
  for (let pass = 0; pass < 2; pass += 1) {
    enforceProvinceConnect({ cells, owner, provinceOwner });
    minProvinceArea({ cells, owner, provinceOwner });
  }
  limitProvincePopulation({ cells, owner, provinceOwner });
}

function assignEthnic(cells: TCell[], owner: Int32Array, seed: string) {
  const { ethnicOwner, ethnicGroups } = buildEthnicRegions(cells, owner, seed);
  return { ethnicOwner, ethnicGroups };
}

function finalizeOwnershipProjection(
  mesh: TDelaunayMesh,
  nationProfiles: Map<number, TNationProfile>,
  owner: Int32Array,
  provinceOwner: Int32Array,
  ethnicOwner: Int32Array,
  ethnicGroups: TEthnic[],
  seed: string
) {
  const { waterOwner, zoneType } = assignMaritimeZones(mesh.cells);
  const nations = pickEconomicAndCapital(
    mesh.cells,
    owner,
    seed,
    mesh.width,
    mesh.height,
    nationProfiles
  );

  const hubCellIds = new Set<number>();
  const capitalCellIds = new Set<number>();
  for (const nation of nations) {
    for (const hubCellId of nation.economicHubCellIds) hubCellIds.add(hubCellId);
    if (nation.capitalCellId !== null) capitalCellIds.add(nation.capitalCellId);
  }

  const cells = mesh.cells.map((cell) => {
    const landNationId = owner[cell.id] >= 0 ? owner[cell.id] : null;
    const waterNationId = waterOwner[cell.id] >= 0 ? waterOwner[cell.id] : null;

    return {
      ...cell,
      nationId: zoneType[cell.id] === 'land' ? landNationId : waterNationId,
      provinceId:
        zoneType[cell.id] === 'land'
          ? provinceOwner[cell.id] >= 0
            ? provinceOwner[cell.id]
            : null
          : null,
      ethnicGroupId:
        zoneType[cell.id] === 'land'
          ? ethnicOwner[cell.id] >= 0
            ? ethnicOwner[cell.id]
            : null
          : null,
      zoneType: zoneType[cell.id],
      isEconomicHub: hubCellIds.has(cell.id),
      isCapital: capitalCellIds.has(cell.id),
    };
  });
  return { ...mesh, cells, nations, ethnicGroups };
}

export function buildGeopolitics(params: TBuildGeopoliticsOptions): TDelaunayMesh {
  const { mesh, seed, nationCount } = params;
  const { owner, preserveNationCount } = assignNations(mesh, seed, nationCount);
  postProcessNations(mesh.cells, owner, preserveNationCount, seed);
  const nationProfiles = buildNationProfiles(owner, seed);
  const scaledCells = mapNationsToCells(mesh.cells, owner, nationProfiles);
  const normalizedCells = limitNationPopulation(scaledCells, owner, seed);
  const scaledMesh = { ...mesh, cells: normalizedCells };
  const { provinceOwner } = assignProvinces(scaledMesh.cells, owner, seed);
  postProcessProvinces({ cells: scaledMesh.cells, owner, provinceOwner });
  if (process.env.NODE_ENV !== 'production') {
    validateProvinceAssignments({ cells: scaledMesh.cells, owner, provinceOwner });
  }
  const { ethnicOwner, ethnicGroups } = assignEthnic(scaledMesh.cells, owner, seed);
  return finalizeOwnershipProjection(
    scaledMesh,
    nationProfiles,
    owner,
    provinceOwner,
    ethnicOwner,
    ethnicGroups,
    seed
  );
}
