'use client';

import { RefObject, useEffect, useMemo } from 'react';
import { BIOME_CONFIG, LANDFORM_CONFIG } from 'src/configs/map/landform-biome';
import { NATION_COLORS } from 'src/configs/map/common';
import { drawPolygon } from 'src/services/rendering/canvas/shared';
import { getNationColor } from 'src/services/utils';
import { TCell, TDelaunayMesh, TDisplaySettings } from 'src/global';

type TNationMiniMapDisplay = 'terrain' | 'biome' | 'nation' | 'ethnic';

const DISPLAY_MAP: Record<TNationMiniMapDisplay, TDisplaySettings> = {
  terrain: {
    landform: true,
    biome: false,
    nationFill: false,
    nationBorders: false,
    ethnicFill: false,
    ethnicBorders: false,
    provinceBorders: false,
    population: false,
    temperature: false,
    precipitation: false,
    rainShadow: false,
    economy: false,
    rivers: false,
    labels: false,
    ethnicLabels: false,
    cellData: false,
    landformRelief: false,
    biomeRelief: false,
    isometric: false,
    threeDim: false,
  },
  biome: {
    landform: false,
    biome: true,
    nationFill: false,
    nationBorders: false,
    ethnicFill: false,
    ethnicBorders: false,
    provinceBorders: false,
    population: false,
    temperature: false,
    precipitation: false,
    rainShadow: false,
    economy: false,
    rivers: false,
    labels: false,
    ethnicLabels: false,
    cellData: false,
    landformRelief: false,
    biomeRelief: false,
    isometric: false,
    threeDim: false,
  },
  nation: {
    landform: false,
    biome: false,
    nationFill: true,
    nationBorders: false,
    ethnicFill: false,
    ethnicBorders: false,
    provinceBorders: true,
    population: false,
    temperature: false,
    precipitation: false,
    rainShadow: false,
    economy: false,
    rivers: false,
    labels: false,
    ethnicLabels: false,
    cellData: false,
    landformRelief: false,
    biomeRelief: false,
    isometric: false,
    threeDim: false,
  },
  ethnic: {
    landform: false,
    biome: false,
    nationFill: false,
    nationBorders: false,
    ethnicFill: true,
    ethnicBorders: true,
    provinceBorders: false,
    population: false,
    temperature: false,
    precipitation: false,
    rainShadow: false,
    economy: false,
    rivers: false,
    labels: false,
    ethnicLabels: false,
    cellData: false,
    landformRelief: false,
    biomeRelief: false,
    isometric: false,
    threeDim: false,
  },
};

type TProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  mesh: TDelaunayMesh;
  nationId: number;
  displayMode: TNationMiniMapDisplay;
};

export { type TNationMiniMapDisplay };

export default function useNationMiniMap({ canvasRef, mesh, nationId, displayMode }: TProps) {
  const displaySettings = DISPLAY_MAP[displayMode];

  const { nationCells, cellColorMap, bgCells } = useMemo(() => {
    const nCells: TCell[] = [];
    const colorMap = new Map<number, string>();
    const bCells: TCell[] = [];

    for (const cell of mesh.cells) {
      if (cell.isWater) continue;

      if (cell.nationId === nationId) {
        nCells.push(cell);
        if (displaySettings.landform) {
          colorMap.set(cell.id, LANDFORM_CONFIG[cell.landform].color);
        } else if (displaySettings.biome) {
          colorMap.set(cell.id, BIOME_CONFIG[cell.biome].color);
        } else if (displaySettings.nationFill) {
          // Each province gets a distinct color from NATION_COLORS
          const pId = cell.provinceId ?? 0;
          colorMap.set(cell.id, NATION_COLORS[Math.abs(pId) % NATION_COLORS.length]);
        } else if (displaySettings.ethnicFill) {
          colorMap.set(cell.id, getNationColor(cell.ethnicId ?? 0));
        } else {
          colorMap.set(cell.id, '#3f3f46');
        }
      } else if (cell.nationId !== nationId) {
        // Check if any neighbor is in this nation -> bordering cell
        for (const nbId of cell.neighbors) {
          const nb = mesh.cells[nbId];
          if (nb && nb.nationId === nationId) {
            bCells.push(cell);
            break;
          }
        }
      }
    }

    return { nationCells: nCells, cellColorMap: colorMap, bgCells: bCells };
  }, [mesh.cells, nationId, displaySettings]);

  const { canvasW, canvasH, scale, worldCX, worldCY } = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    const allCells = [...nationCells, ...bgCells];
    for (const cell of allCells) {
      for (const [px, py] of cell.polygon) {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }

    if (allCells.length === 0) return { canvasW: 0, canvasH: 0, scale: 0, worldCX: 0, worldCY: 0 };

    const pad = 30;
    const bboxW = maxX - minX + pad * 2;
    const bboxH = maxY - minY + pad * 2;
    const s = Math.min(1, 900 / Math.max(bboxW, bboxH));

    return {
      canvasW: Math.floor(bboxW * s),
      canvasH: Math.floor(bboxH * s),
      scale: s,
      worldCX: (minX + maxX) / 2,
      worldCY: (minY + maxY) / 2,
    };
  }, [nationCells, bgCells]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasW === 0 || canvasH === 0) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const ctx = (() => {
      canvas.width = canvasW * pixelRatio;
      canvas.height = canvasH * pixelRatio;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return context;
    })();
    if (!ctx) return;

    const toCanvas = (px: number, py: number): [number, number] => [
      canvasW / 2 + (px - worldCX) * scale,
      canvasH / 2 + (py - worldCY) * scale,
    ];

    // Background
    ctx.fillStyle = '#09131f';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw background (bordering) cells first
    for (const cell of bgCells) {
      const poly = cell.polygon.map(([px, py]) => toCanvas(px, py));
      drawPolygon(ctx, poly);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
    }

    // Draw nation cells — fill only, no cell borders
    for (const cell of nationCells) {
      const poly = cell.polygon.map(([px, py]) => toCanvas(px, py));
      drawPolygon(ctx, poly);
      ctx.fillStyle = cellColorMap.get(cell.id) ?? '#3f3f46';
      ctx.fill();
    }

    // --- Draw borders based on display mode ---

    if (displaySettings.provinceBorders) {
      // Province borders: stroke edges between cells of different provinces
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.0;
      for (const cell of nationCells) {
        if (cell.provinceId === null) continue;
        for (const nbId of cell.neighbors) {
          const nb = mesh.cells[nbId];
          if (!nb || nb.nationId !== nationId || nb.provinceId === cell.provinceId) continue;
          // Draw shared edge between cell and nb — find 2 common polygon vertices
          const poly = cell.polygon;
          for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            // Check if both a and b exist in nb's polygon
            const hasA = nb.polygon.some(([nx, ny]) => Math.hypot(nx - a[0], ny - a[1]) < 0.5);
            const hasB = nb.polygon.some(([nx, ny]) => Math.hypot(nx - b[0], ny - b[1]) < 0.5);
            if (hasA && hasB) {
              const [ax, ay] = toCanvas(a[0], a[1]);
              const [bx, by] = toCanvas(b[0], b[1]);
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }
          }
        }
      }
    }

    if (displaySettings.ethnicBorders) {
      // Ethnic borders: stroke edges between cells of different ethnic groups
      ctx.strokeStyle = 'rgba(255,200,100,0.5)';
      ctx.lineWidth = 1.2;
      for (const cell of nationCells) {
        if (cell.ethnicId === null) continue;
        for (const nbId of cell.neighbors) {
          const nb = mesh.cells[nbId];
          if (!nb || nb.nationId !== nationId || nb.ethnicId === cell.ethnicId) continue;
          const poly = cell.polygon;
          for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            const hasA = nb.polygon.some(([nx, ny]) => Math.hypot(nx - a[0], ny - a[1]) < 0.5);
            const hasB = nb.polygon.some(([nx, ny]) => Math.hypot(nx - b[0], ny - b[1]) < 0.5);
            if (hasA && hasB) {
              const [ax, ay] = toCanvas(a[0], a[1]);
              const [bx, by] = toCanvas(b[0], b[1]);
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }
          }
        }
      }
    }

    // Outer nation border (separate from background cells)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    for (const cell of nationCells) {
      for (const nbId of cell.neighbors) {
        const nb = mesh.cells[nbId];
        if (!nb || nb.nationId === nationId) continue;
        const poly = cell.polygon;
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i];
          const b = poly[(i + 1) % poly.length];
          const hasA = nb.polygon.some(([nx, ny]) => Math.hypot(nx - a[0], ny - a[1]) < 0.5);
          const hasB = nb.polygon.some(([nx, ny]) => Math.hypot(nx - b[0], ny - b[1]) < 0.5);
          if (hasA && hasB) {
            const [ax, ay] = toCanvas(a[0], a[1]);
            const [bx, by] = toCanvas(b[0], b[1]);
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }
    }
  }, [
    canvasRef,
    nationCells,
    bgCells,
    cellColorMap,
    canvasW,
    canvasH,
    scale,
    worldCX,
    worldCY,
    displaySettings,
    mesh.cells,
    nationId,
  ]);
}
