# Fantasy World

Fantasy World is a deterministic procedural world-map generator built with Next.js 16, React 19, TypeScript, and Canvas rendering.

The app generates a world through a staged pipeline:

1. Mesh (Voronoi/Delaunay geometry)
2. Topography (elevation + terrain classification)
3. Hydrology (flow, rivers, lakes, climate-driven adjustments)
4. Population
5. Geopolitics (nations, provinces, ethnic regions, capitals/hubs)

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
  - Country border / country fill (independent)
  - Ethnic border / ethnic fill (independent)
  - Province border
  - Labels
- Detail dialogs:
  - Nation detail
  - Ethnic detail (when ethnic layers are active without country layers)
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
