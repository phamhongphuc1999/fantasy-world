# Fantasy World

Fantasy World is a deterministic procedural world-map generator built with Next.js 16, React 19, TypeScript, and Canvas rendering.

## What This App Does

Fantasy World helps you generate and explore a complete synthetic world map from a seed.

You can:

- Generate repeatable maps (same seed => same world)
- Tune terrain style (balanced, ranges, rifted, archipelago)
- Simulate rivers, lakes, climate impact, and terrain transitions
- Simulate population and economy distribution
- Auto-build geopolitical layers:
  - Nations
  - Provinces
  - Ethnic regions
  - Capitals and economic hubs
- Inspect map layers visually on Canvas (terrain, rivers, borders, fills, heatmaps, labels)
- Open detail dialogs for deeper nation/ethnic statistics
- Use logistics route overlay mode to inspect route behavior

## How World Generation Works

The app generates a world through a staged pipeline:

1. Mesh (Voronoi/Delaunay geometry)
2. Topography (elevation + terrain classification)
3. Hydrology (flow, rivers, lakes, climate-driven adjustments)
4. Population
5. Geopolitics (nations, provinces, ethnic regions, capitals/hubs)

## Typical User Workflow

1. Pick a seed and generation settings
2. Generate map
3. Toggle visualization layers
4. Inspect nations/ethnic regions and map statistics
5. Adjust settings and regenerate until you get the world style you want

## Current Capabilities

- Deterministic map generation from seed
- Terrain presets + editable terrain ratios
- Hydrology with rivers/lakes and erosion/deposition effects
- Population simulation on land cells
- Nation generation with post-processing for contiguity and minimum area
- Province generation inside nations
- Ethnic region generation
- Capitals and economic hubs selection
- Canvas visualization layers:
  - Terrain
  - Rivers
  - Nation border / nation fill (independent)
  - Ethnic border / ethnic fill (independent)
  - Province border
  - Labels
- Detail dialogs:
  - Nation detail
  - Ethnic detail (when ethnic layers are active without nation layers)
- Logistics route overlay mode

## Tech Stack

- Next.js `16.2.4` (App Router)
- React `19.2.4`
- TypeScript (strict)
- Tailwind CSS v4
- Zustand
- `d3-delaunay`
- Vitest

## Getting Started

Install dependencies:

```bash
yarn install
```

Run development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

Production domain: [https://fantasy.peter-present.xyz/](https://fantasy.peter-present.xyz/)

## Scripts

```bash
yarn dev
yarn build
yarn start
yarn test
yarn test:watch
yarn bench:map
yarn eslint
yarn format
```

## Notes

- Generation is designed to be deterministic for the same input config/seed.
- Read and follow `AGENTS.md` for project coding rules before contributing.
