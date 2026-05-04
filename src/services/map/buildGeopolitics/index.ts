import { TMapMeshWithDelaunay } from 'src/types/map.types';
import { pickEconomicAndCapital } from './capitals';
import { buildEthnicRegions } from './ethnic';
import {
  assignMaritimeZones,
  getNationCount,
  isLand,
  limitMountainClusterSplit,
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
  enforceMinimumProvinceArea,
  enforceProvinceContiguity,
} from './provinces';

type TBuildGeopoliticsOptions = {
  mesh: TMapMeshWithDelaunay;
  seed: string;
  nationCount: number;
};

type TNationAssignment = {
  owner: Int32Array;
  preserveNationCount: number;
};

function runNationStabilityPass(
  cells: TMapMeshWithDelaunay['cells'],
  owner: Int32Array,
  preserveNationCount: number
) {
  alignNaturalTerrainClusters(cells, owner);
  limitMountainClusterSplit(cells, owner, 'country');
  enforceMinimumNationArea(cells, owner, preserveNationCount);
}

function runNationClaimReconciliationPass(
  cells: TMapMeshWithDelaunay['cells'],
  owner: Int32Array,
  preserveNationCount: number
) {
  reconcileNationClaims(cells, owner, preserveNationCount);
}

function assignNations(
  mesh: TMapMeshWithDelaunay,
  seed: string,
  nationCount: number
): TNationAssignment {
  const landCellCount = mesh.cells.filter(isLand).length;
  const targetNationCount = getNationCount(nationCount, landCellCount);
  const preserveNationCount = targetNationCount;
  const owner = buildLandNations(mesh.cells, seed, nationCount);
  return { owner, preserveNationCount };
}

function postProcessNations(
  cells: TMapMeshWithDelaunay['cells'],
  owner: Int32Array,
  preserveNationCount: number,
  seed: string
) {
  runNationStabilityPass(cells, owner, preserveNationCount);
  enforceMainlandContiguity(cells, owner);
  runNationStabilityPass(cells, owner, preserveNationCount);
  runNationClaimReconciliationPass(cells, owner, preserveNationCount);
  diversifySmallNationSizes(cells, owner, seed);
  runNationClaimReconciliationPass(cells, owner, preserveNationCount);
}

function assignProvinces(cells: TMapMeshWithDelaunay['cells'], owner: Int32Array, seed: string) {
  return { provinceOwner: buildNationProvinces(cells, owner, seed) };
}

function postProcessProvinces(
  cells: TMapMeshWithDelaunay['cells'],
  owner: Int32Array,
  provinceOwner: Int32Array
) {
  limitMountainClusterSplit(cells, provinceOwner, 'province', owner);
  enforceProvinceContiguity(cells, owner, provinceOwner);
  enforceMinimumProvinceArea(cells, owner, provinceOwner);
  enforceProvinceContiguity(cells, owner, provinceOwner);
  enforceMinimumProvinceArea(cells, owner, provinceOwner);
}

function assignEthnic(cells: TMapMeshWithDelaunay['cells'], owner: Int32Array, seed: string) {
  const { ethnicOwner, ethnicGroups } = buildEthnicRegions(cells, owner, seed);
  return { ethnicOwner, ethnicGroups };
}

function finalizeOwnershipProjection(
  mesh: TMapMeshWithDelaunay,
  owner: Int32Array,
  provinceOwner: Int32Array,
  ethnicOwner: Int32Array,
  ethnicGroups: TMapMeshWithDelaunay['ethnicGroups'],
  seed: string
) {
  const { waterOwner, zoneType } = assignMaritimeZones(mesh.cells);
  const nations = pickEconomicAndCapital(mesh.cells, owner, seed, mesh.width, mesh.height);

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

export function buildGeopolitics({
  mesh,
  seed,
  nationCount,
}: TBuildGeopoliticsOptions): TMapMeshWithDelaunay {
  const { owner, preserveNationCount } = assignNations(mesh, seed, nationCount);
  postProcessNations(mesh.cells, owner, preserveNationCount, seed);
  const { provinceOwner } = assignProvinces(mesh.cells, owner, seed);
  postProcessProvinces(mesh.cells, owner, provinceOwner);
  const { ethnicOwner, ethnicGroups } = assignEthnic(mesh.cells, owner, seed);
  return finalizeOwnershipProjection(mesh, owner, provinceOwner, ethnicOwner, ethnicGroups, seed);
}
