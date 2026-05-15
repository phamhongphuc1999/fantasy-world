import {
  TCell,
  TCellOwnerParams,
  TDelaunayMesh,
  TEthnic,
  TGeopoliticsParams,
} from 'src/types/map.types';
import { createSeededRandom } from '../core/seededRandom';
import { pickEconomicAndCapital } from './capitals';
import { buildEthnicRegions } from './ethnic';
import {
  alignNaturalTerrainClusters,
  buildLandNations,
  diversifySmallNationSizes,
  enforceMainlandContiguity,
  enforceMinNationArea,
  finalizeNationBorders,
} from './nations';
import {
  buildNationProvinces,
  enforceProvinceConnect,
  limitProvincePopulation,
  minProvinceArea,
} from './provinces';
import { assignMaritimeZones, getNationCount, isLand, limitMountainSplit } from './shared';

const T_NATION_POPULATION_MULTIPLIER_RANGE: [number, number] = [0.1, 5.0];
const T_NATION_ECONOMY_MULTIPLIER_RANGE: [number, number] = [0.1, 20];
const T_MIN_NATION_POPULATION = 500;

type TNationAssignment = {
  owner: Int32Array;
  preserveNationCount: number;
};

type TNationProfile = {
  populationMultiplier: number;
  economyMultiplier: number;
};

function randomBetween(random: () => number, min: number, max: number) {
  return min + (max - min) * random();
}

function buildNationProfiles(owner: Int32Array, seed: string) {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  const nationProfiles = new Map<number, TNationProfile>();

  for (const nationId of nationIds) {
    const random = createSeededRandom(`${seed}:nation-profile:${nationId}`);

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
    });
  }

  return nationProfiles;
}

function mapNationsToCells(
  cells: TCell[],
  owner: Int32Array,
  nationProfiles: Map<number, TNationProfile>
) {
  function populationModifier(cell: TCell) {
    let factor = 1;
    if (cell.landform === 'plain' || cell.landform === 'valley') factor += 0.18;
    if (cell.landform === 'mountain' || cell.landform === 'volcanic_field') factor -= 0.28;
    if (cell.biome === 'wetland') factor -= 0.14;
    if (cell.biome === 'desert_hot' || cell.biome === 'desert_cold') factor -= 0.2;
    if (cell.biome === 'temperate_forest' || cell.biome === 'tropical_forest') factor += 0.08;
    return Math.max(0.2, factor);
  }

  function economyModifier(cell: TCell) {
    let factor = 1;
    if (cell.landform === 'coast' || cell.landform === 'valley') factor += 0.22;
    if (cell.landform === 'mountain') factor -= 0.1;
    if (cell.landform === 'volcanic_field') factor += 0.08;
    if (cell.biome === 'steppe') factor += 0.05;
    if (cell.biome === 'desert_hot') factor -= 0.08;
    return Math.max(0.25, factor);
  }

  return cells.map((cell) => {
    if (!isLand(cell)) return cell;
    const nationId = owner[cell.id];
    if (nationId < 0) return cell;
    const profile = nationProfiles.get(nationId);
    if (!profile) return cell;

    const terrainPopulationModifier = populationModifier(cell);
    const terrainEconomyModifier = economyModifier(cell);
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
  limitMountainSplit(cells, owner, 'nation');
  enforceMinNationArea(cells, owner, preserveNationCount);
}

function assignNations(mesh: TDelaunayMesh, seed: string, nationCount: number): TNationAssignment {
  const landCellCount = mesh.cells.filter(isLand).length;
  const targetNationCount = getNationCount(nationCount, landCellCount);
  const preserveNationCount = targetNationCount;
  const owner = buildLandNations(mesh.cells, seed, nationCount);
  return { owner, preserveNationCount };
}

function postProcessNations(cells: TCell[], owner: Int32Array, nationCount: number, seed: string) {
  runNationStabilityPass(cells, owner, nationCount);
  enforceMainlandContiguity(cells, owner);
  runNationStabilityPass(cells, owner, nationCount);
  finalizeNationBorders(cells, owner, nationCount);
  diversifySmallNationSizes(cells, owner, seed);
  finalizeNationBorders(cells, owner, nationCount);
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

function finalizeOwnershipProjection(
  mesh: TDelaunayMesh,
  nationProfiles: Map<number, TNationProfile>,
  owner: Int32Array,
  provinceOwner: Int32Array,
  ethnicOwner: Int32Array,
  ethnics: TEthnic[],
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
    for (const hubCellId of nation.economicHubIds) hubCellIds.add(hubCellId);
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
      ethnicId:
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
  return { ...mesh, cells, nations, ethnics };
}

export function buildGeopolitics(params: TGeopoliticsParams): TDelaunayMesh {
  const { mesh, seed, nationCount } = params;
  const { owner, preserveNationCount } = assignNations(mesh, seed, nationCount);
  postProcessNations(mesh.cells, owner, preserveNationCount, seed);
  const nationProfiles = buildNationProfiles(owner, seed);
  const scaledCells = mapNationsToCells(mesh.cells, owner, nationProfiles);
  const normalizedCells = limitNationPopulation(scaledCells, owner, seed);
  const scaledMesh = { ...mesh, cells: normalizedCells };
  const { provinceOwner } = assignProvinces(scaledMesh.cells, owner, seed);
  postProcessProvinces({ cells: scaledMesh.cells, owner, provinceOwner });
  const { ethnicOwner, ethnics } = buildEthnicRegions(scaledMesh.cells, owner, seed);
  return finalizeOwnershipProjection(
    scaledMesh,
    nationProfiles,
    owner,
    provinceOwner,
    ethnicOwner,
    ethnics,
    seed
  );
}
