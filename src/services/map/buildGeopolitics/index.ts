import { TCustomCountryMode, TMapMeshWithDelaunay } from 'src/types/global';
import { pickEconomicAndCapital } from './capitals';
import { buildEthnicRegions } from './ethnic';
import {
  alignNaturalTerrainClusters,
  buildLandNations,
  enforceMainlandContiguity,
  enforceMinimumNationArea,
  ensureAllLandClaimed,
  fillUnclaimedLand,
} from './nations';
import { buildNationProvinces, enforceProvinceContiguity } from './provinces';
import { assignMaritimeZones, limitMountainClusterSplit } from './shared';

type TBuildGeopoliticsOptions = {
  mesh: TMapMeshWithDelaunay;
  seed: string;
  customCountryMode: TCustomCountryMode;
  customCountryCount: number;
};

export function buildGeopolitics({
  mesh,
  seed,
  customCountryMode,
  customCountryCount,
}: TBuildGeopoliticsOptions): TMapMeshWithDelaunay {
  const owner = buildLandNations(mesh.cells, seed, customCountryMode, customCountryCount);
  alignNaturalTerrainClusters(mesh.cells, owner);
  limitMountainClusterSplit(mesh.cells, owner, 'country');
  enforceMinimumNationArea(mesh.cells, owner);
  enforceMainlandContiguity(mesh.cells, owner);
  alignNaturalTerrainClusters(mesh.cells, owner);
  limitMountainClusterSplit(mesh.cells, owner, 'country');
  fillUnclaimedLand(mesh.cells, owner);
  ensureAllLandClaimed(mesh.cells, owner);

  const { waterOwner, zoneType } = assignMaritimeZones(mesh.cells);
  const provinceOwner = buildNationProvinces(mesh.cells, owner, seed);
  limitMountainClusterSplit(mesh.cells, provinceOwner, 'province', owner);
  enforceProvinceContiguity(mesh.cells, owner, provinceOwner);
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
