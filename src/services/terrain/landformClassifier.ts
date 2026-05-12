import { LANDFORM_CLASSIFIER_CONFIG, LANDFORM_ELEVATION_BANDS } from 'src/configs/map/terrain';
import { TCell, TLandform } from 'src/types/map.types';
import { TClimateTerrainTag } from '../hydrology/climate';
import { clamp } from '../utils/math';

type TClassifyLandformsInput = {
  cells: TCell[];
  seaLevel: number;
  reliefByCell: Float32Array;
  flow: Float32Array;
  climateTerrainByCell: TClimateTerrainTag[];
};

function hasMarineNeighbor(cell: TCell, cells: TCell[]) {
  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (!neighbor.isWater) continue;
    if (neighbor.isLake) continue;
    return true;
  }
  return false;
}

function getSlopeSignal(relief: number) {
  return clamp(relief * 12, -1, 1);
}

function getFlowSignal(localFlow: number) {
  return clamp(Math.log2(localFlow + 1) / 5, 0, 1);
}

function isValleyContext(
  cell: TCell,
  cells: TCell[],
  elevationAboveSea: number,
  slopeSignal: number,
  flowSignal: number,
  seaLevel: number
) {
  const model = LANDFORM_CLASSIFIER_CONFIG;
  if (elevationAboveSea > LANDFORM_ELEVATION_BANDS.valleyAboveSeaMax) return false;
  if (slopeSignal > model.valleyMax) return false;
  if (flowSignal < model.valleyMinFlowSignal) return false;

  let validNeighbors = 0;
  let higherNeighbors = 0;
  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (neighbor.isWater || neighbor.isLake) continue;
    validNeighbors += 1;
    const higherDelta = neighbor.elevation - cell.elevation;
    if (
      higherDelta >= model.valleyMinHigherNeighborDelta &&
      neighbor.elevation - seaLevel >= elevationAboveSea
    ) {
      higherNeighbors += 1;
    }
  }

  if (validNeighbors === 0) return false;
  return higherNeighbors / validNeighbors >= model.valleyEnclosureMinRatio;
}

function classifyLandformForCell(
  cell: TCell,
  relief: number,
  localFlow: number,
  seaLevel: number,
  climateTerrain: TClimateTerrainTag,
  cells: TCell[]
): TLandform {
  const model = LANDFORM_CLASSIFIER_CONFIG;

  if (cell.isWater) {
    if (cell.isLake) return 'lake';
    if (cell.elevation < seaLevel - 0.12) return 'marine_deep';
    return 'marine_shallow';
  }

  if (
    cell.elevation <= seaLevel + LANDFORM_ELEVATION_BANDS.coastAboveSeaMax ||
    climateTerrain === 'coast' ||
    hasMarineNeighbor(cell, cells)
  ) {
    return 'coast';
  }

  const elevationAboveSea = Math.max(0, cell.elevation - seaLevel);
  const slopeSignal = getSlopeSignal(relief);
  const flowSignal = getFlowSignal(localFlow);
  const inHighland = elevationAboveSea >= LANDFORM_ELEVATION_BANDS.highlandAboveSeaMin;
  const inMountainBand = elevationAboveSea >= LANDFORM_ELEVATION_BANDS.mountainAboveSeaMin;

  const scoreMountain = elevationAboveSea * 1.25 + Math.max(0, slopeSignal) * 0.85;
  const scoreHills = elevationAboveSea * 0.7 + Math.max(0, slopeSignal) * 0.95;
  const scorePlateau = elevationAboveSea * 1.05 + Math.max(0, 0.45 - Math.abs(slopeSignal)) * 0.65;
  const scoreValley = Math.max(0, -slopeSignal) * 0.95 + flowSignal * 0.75;
  const scorePlain =
    Math.max(0, 0.8 - Math.abs(slopeSignal)) * 0.9 + Math.max(0, 0.6 - elevationAboveSea) * 0.5;
  const scoreVolcanic =
    (climateTerrain === 'volcanic' ? 1 : 0) * 1.3 +
    Math.max(0, elevationAboveSea - 0.22) * 0.8 +
    Math.max(0, slopeSignal - 0.12) * 0.5;

  const allowPlain = elevationAboveSea <= LANDFORM_ELEVATION_BANDS.plainAboveSeaMax && !inHighland;
  const allowValley = isValleyContext(
    cell,
    cells,
    elevationAboveSea,
    slopeSignal,
    flowSignal,
    seaLevel
  );
  const allowHills = !inMountainBand;
  const allowPlateau = true;
  const allowMountain = inMountainBand || slopeSignal >= model.mountainMinSlope;
  const allowVolcanic =
    climateTerrain === 'volcanic' &&
    elevationAboveSea >= LANDFORM_ELEVATION_BANDS.volcanicAboveSeaMin;

  let best: TLandform = inHighland ? 'plateau' : 'plain';
  let bestScore = allowPlain ? scorePlain : Number.NEGATIVE_INFINITY;

  if (!allowPlain && allowHills) {
    best = 'hills';
    bestScore = scoreHills;
  }
  if (allowValley && scoreValley > bestScore) {
    best = 'valley';
    bestScore = scoreValley;
  }
  if (allowHills && scoreHills > bestScore) {
    best = 'hills';
    bestScore = scoreHills;
  }

  const plateauBonus =
    inHighland && Math.abs(slopeSignal) <= model.plateauFlatnessMaxAbsSlope ? 0.5 : 0;
  if (allowPlateau && scorePlateau + plateauBonus > bestScore) {
    best = 'plateau';
    bestScore = scorePlateau + plateauBonus;
  }

  const mountainBonus = inMountainBand ? 0.45 : 0;
  if (allowMountain && scoreMountain + mountainBonus > bestScore) {
    best = 'mountain';
    bestScore = scoreMountain + mountainBonus;
  }

  if (allowVolcanic && scoreVolcanic > bestScore) {
    best = 'volcanic_field';
  }

  if (best === 'plateau' && cell.elevation >= 0.9) {
    return 'mountain';
  }

  return best;
}

export function classifyLandforms({
  cells,
  seaLevel,
  reliefByCell,
  flow,
  climateTerrainByCell,
}: TClassifyLandformsInput): TLandform[] {
  return cells.map((cell, cellIndex) =>
    classifyLandformForCell(
      cell,
      reliefByCell[cellIndex] as number,
      flow[cellIndex] as number,
      seaLevel,
      climateTerrainByCell[cellIndex] as TClimateTerrainTag,
      cells
    )
  );
}
