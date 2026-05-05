'use client';

import { ChangeEventHandler } from 'react';
import BlurCard from 'src/components/BlurCard';
import { Button } from 'src/components/ui/button';
import { useMapContext } from 'src/contexts/map.context';
import { buildMapSvg, exportCanvasToPng, exportTextFile } from 'src/services/map/exportPipeline';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TMapExportSnapshot } from 'src/types/mapExport';

function makeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export default function ExportTab() {
  const { mesh, importFromSnapshot } = useMapContext();
  const { seed, cellCount, seaLevel, terrainPreset, terrainRatios, nationCount, displaySettings } =
    useMapExplorerStore();

  const handleExportPng = () => {
    exportCanvasToPng('map-base-canvas', `fantasy-map-${makeTimestamp()}.png`);
  };

  const handleExportSvg = () => {
    const svg = buildMapSvg(mesh, displaySettings);
    exportTextFile(svg, `fantasy-map-${makeTimestamp()}.svg`, 'image/svg+xml');
  };

  const handleExportJson = () => {
    const payload: TMapExportSnapshot = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      config: {
        width: mesh.width,
        height: mesh.height,
        seed,
        cellCount,
        seaLevel,
        terrainPreset,
        terrainRatios,
        nationCount,
      },
      displaySettings,
      mesh: {
        width: mesh.width,
        height: mesh.height,
        cells: mesh.cells,
        edges: mesh.edges,
        vertices: mesh.vertices,
        nations: mesh.nations,
        ethnicGroups: mesh.ethnicGroups,
      },
    };

    exportTextFile(
      JSON.stringify(payload, null, 2),
      `fantasy-map-${makeTimestamp()}.json`,
      'application/json'
    );
  };

  const handleImportJson: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const content = await file.text();
    try {
      const payload = JSON.parse(content) as TMapExportSnapshot;
      const result = importFromSnapshot(payload);
      if (!result.ok) {
        window.alert(result.error);
      }
    } catch {
      window.alert('Invalid JSON file.');
    }
  };

  return (
    <div className="space-y-4">
      <BlurCard title="Export Image">
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={handleExportPng}>
            Export PNG
          </Button>
          <Button type="button" onClick={handleExportSvg}>
            Export SVG
          </Button>
        </div>
      </BlurCard>
      <BlurCard title="Export Data">
        <Button type="button" onClick={handleExportJson} className="w-full">
          Export JSON Schema
        </Button>
      </BlurCard>
      <BlurCard title="Import Data">
        <label className="block text-xs text-slate-300">Import JSON Schema</label>
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleImportJson}
          className="mt-2 block w-full rounded-md border border-white/20 bg-slate-900/60 px-2 py-1 text-xs text-slate-100"
        />
      </BlurCard>
    </div>
  );
}
