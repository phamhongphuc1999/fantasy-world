import { TNationMode, TMapMeshWithDelaunay } from 'src/types/global';
import { pickEconomicAndCapital } from './capitals';
import { buildEthnicRegions } from './ethnic';
import {
  alignNaturalTerrainClusters,
  buildLandNations,
  diversifySmallNationSizes,
  enforceMainlandContiguity,
  enforceMinimumNationArea,
  ensureAllLandClaimed,
  fillUnclaimedLand,
} from './nations';
import {
  buildNationProvinces,
  enforceMinimumProvinceArea,
  enforceProvinceContiguity,
} from './provinces';
import { assignMaritimeZones, getNationCount, isLand, limitMountainClusterSplit } from './shared';

type TBuildGeopoliticsOptions = {
  mesh: TMapMeshWithDelaunay;
  seed: string;
  nationMode: TNationMode;
  nationCount: number;
};

export function buildGeopolitics({
  mesh,
  seed,
  nationMode,
  nationCount,
}: TBuildGeopoliticsOptions): TMapMeshWithDelaunay {
  const landCellCount = mesh.cells.filter(isLand).length;
  const targetNationCount = getNationCount(nationMode, nationCount, seed, landCellCount);
  const preserveNationCount = nationMode === 'balanced' ? targetNationCount : 0;
  const owner = buildLandNations(mesh.cells, seed, nationMode, nationCount);
  alignNaturalTerrainClusters(mesh.cells, owner);
  limitMountainClusterSplit(mesh.cells, owner, 'country');
  enforceMinimumNationArea(mesh.cells, owner, preserveNationCount);
  enforceMainlandContiguity(mesh.cells, owner);
  alignNaturalTerrainClusters(mesh.cells, owner);
  limitMountainClusterSplit(mesh.cells, owner, 'country');
  fillUnclaimedLand(mesh.cells, owner);
  ensureAllLandClaimed(mesh.cells, owner);
  enforceMinimumNationArea(mesh.cells, owner, preserveNationCount);
  ensureAllLandClaimed(mesh.cells, owner);
  if (nationMode === 'balanced') {
    diversifySmallNationSizes(mesh.cells, owner, seed);
    enforceMinimumNationArea(mesh.cells, owner, preserveNationCount);
    ensureAllLandClaimed(mesh.cells, owner);
  }

  const { waterOwner, zoneType } = assignMaritimeZones(mesh.cells);
  const provinceOwner = buildNationProvinces(mesh.cells, owner, seed);
  limitMountainClusterSplit(mesh.cells, provinceOwner, 'province', owner);
  enforceProvinceContiguity(mesh.cells, owner, provinceOwner);
  enforceMinimumProvinceArea(mesh.cells, owner, provinceOwner);
  enforceProvinceContiguity(mesh.cells, owner, provinceOwner);
  enforceMinimumProvinceArea(mesh.cells, owner, provinceOwner);
  const { ethnicOwner, ethnicGroups } = buildEthnicRegions(mesh.cells, owner, seed);
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
