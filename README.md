# Fantasy World

**Fantasy World** is a deterministic procedural world-map generator. Given a seed string, it generates a complete synthetic world — from terrain elevation and river networks to nations, provinces, ethnic regions, capitals, and economic hubs — all deterministically repeatable.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript (strict)**, and **Canvas HTML5 rendering**.

Production URL: [https://fantasy.peter-present.xyz/](https://fantasy.peter-present.xyz/)

---

## 🌍 What You Can Do

- Generate repeatable worlds from a seed — same seed = same map
- Choose from **6 terrain presets**: `balanced`, `ranges`, `rifted`, `archipelago`, `volcanic`, `continental`
- Adjust sea level, temperature offset/contrast, precipitation scale/offset, human impact, nation count, cell count
- Interactive map with toggleable layers: Landform, Biome, Population (heatmap), Temperature (heatmap), Precipitation, Rain Shadow, Economy (heatmap), Rivers, Nation borders/fill, Province borders, Ethnic borders/fill/labels, Labels, Cell data
- Hover for cell-level stats, click to open nation/ethnic detail dialogs
- Find optimal logistics routes between two points (Dijkstra)
- Export/Import world snapshots (JSON)
- 3D isometric view and Three.js 3D globe rendering

---

## 🏗 How World Generation Works

The pipeline runs in **5 sequential stages** via `MapGenerator`:

### 1. Mesh

Jittered grid points → Delaunay triangulation → Voronoi diagram via **d3-delaunay**. Each cell has a site, polygon, vertices, edges, and neighbors. Default: **15,000 cells** (configurable 4,000–15,000).

### 2. Topography (`src/services/terrain/`)

- **Noise**: Multi-octave noise (FBM, Ridged, Billow) + domain warping via `simplex2D`
- **Tectonic boundaries**: Collision/rift line systems with seed-based positioning
- **Preset shapes**: Range chains with foothills, escarpments + plateaus, archipelago seed islands, volcanic hotspots
- **Post-processing**: Edge shelf (coastal shelf), hill bands, valley bands, elevation smoothing
- **Erosion**: Thermal erosion with slope-based transport + isostasy (Airy compensation)
- **6 presets**: `balanced` (moderate mixed terrain), `ranges` (mountain chains), `rifted` (escapments+rifting), `archipelago` (island chains), `volcanic` (hotspots), `continental` (broad plates)

Elevation outputs classified into **15 terrain types** (`TTerrain`), then resolved to **10 landforms** (`TLandform`):

| Landform         | Description                        |
| ---------------- | ---------------------------------- |
| `marine_deep`    | Deep ocean                         |
| `marine_shallow` | Shallow waters / continental shelf |
| `coast`          | Coastal land/beach zone            |
| `lake`           | Inland lake                        |
| `plain`          | Flat lowlands                      |
| `valley`         | Low-lying areas between hills      |
| `hills`          | Rolling terrain                    |
| `mountain`       | High elevation peaks               |
| `plateau`        | Elevated flat regions              |
| `volcanic_field` | Volcanic highlands                 |

### 3. Hydrology (`src/services/hydrology/`)

- **Temperature**: Latitude cooling + elevation lapse rate + maritime moderation (water influence)
- **Wind**: 3-zone global circulation model (trade winds, westerlies, polar easterlies) with cell-based directional field
- **Precipitation**: Moisture advection from wind + orographic uplift (mountain barriers) + rain shadow effect on lee side
- **Rivers**: `runRiverGeneration()` pipeline:
  1. `prepareTerrain()` — adjust coastal elevations, build land mask
  2. `fillDepressions()` — iterative depression filling with epsilon
  3. `accumulateFlow()` — flow direction + accumulation from precipitation
  4. `buildRiverGraph()` — source selection → downstream tracing → confluence resolution → tail extension → meander insertion → width smoothing → bank geometry construction
  - River hierarchy: `river` (peakFlow ≥ 150) → `fork` (≥ 80) → `branch` (≥ 45) → `creek`
- **Lakes**: Formed at elevation sinks → expanded with precipitation/rain-shadow constraints → filtered to 12 largest lakes → inland water classification
- **Erosion**: Slope-based erosion & sediment deposition (pre-climate)

Climate outputs classified into **16 biomes** (`TBiome`):

`unknown`, `plain`, `ice`, `tundra`, `boreal_forest`, `temperate_forest`, `tropical_forest`, `grassland`, `savanna`, `steppe`, `desert_hot`, `desert_cold`, `wetland`, `montane_shrub`, `freshwater`, `marine`

### 4. Population (`src/services/geopolitics/population.ts`)

- **Water access**: BFS distance-decay to ocean cells → rating per cell
- **Climate suitability**: Ideal temperature/precipitation curves with tolerance
- **Landform/biome factors**: `BIOME_CONFIG.populationFactor` + `humanSettlementBoost()` (plain=1.35, wetland=0.85, desert=0.75)
- **Noise**: Seeded jitter per cell
- **Urban sprawl**: Seed cities (scored by population + suitability) → radial boost with distance decay → 2 passes of neighbor averaging
- **Economy**: Derived from population _ landform factor _ water access factor \* population/water synergy, then pow(1.12)

### 5. Geopolitics (`src/services/geopolitics/`)

- **Nations** (cost-based frontier expansion):
  1. Seed selection via `selectNationSeeds()` — scored suitability + component-aware soft geography bias
  2. Floor expansion — grow nations toward minimum size first
  3. `runMultiSourceExpansion()` — Dijkstra-like frontier with terrain/biome/noise costs
  4. Post-processing: `alignNaturalTerrainClusters()`, `limitMountainSplit()`, `enforceMinNationArea()`, `enforceMainlandContiguity()`, `finalizeNationBorders()`, `diversifySmallNationSizes()`
- **Provinces**: Per-nation scored seed placement → cost expansion → split over-cap provinces (20 iterations) → population balancing (~500K target, ~1.5M max) → contiguity enforcement
- **Ethnic regions**: Per-landmass seeded expansion → nation dominance enforcement → cross-border blending → mountain fragmentation → smoothing
- **Capitals**: Weighted by population, economy, centrality, safety (`LANDFORM_CONFIG.safetyScore`), terrain flatness
- **Economic hubs**: Scored by economy, landform suitability, and water access

---

## 🗺 Visualization

Canvas-rendered with toggleable layers:

| Layer                      | Description                                        |
| -------------------------- | -------------------------------------------------- |
| Landform                   | Colored by landform type + optional relief shading |
| Biome                      | Colored by biome classification                    |
| Population                 | Heatmap (green → red)                              |
| Temperature                | Heatmap (blue → red)                               |
| Precipitation              | Blue intensity                                     |
| Rain Shadow                | Gray-scale orographic effect                       |
| Economy                    | Heatmap                                            |
| Rivers                     | Blue with glow, width-scaled by river order        |
| Nation Borders/Fill        | Colored by nation, with stroke borders             |
| Province Borders           | Sub-national boundaries                            |
| Ethnic Borders/Fill/Labels | Ethnic region coloring                             |
| Labels                     | Nation/ethnic names                                |
| Cell Data                  | Detailed per-cell popup                            |

Includes **3D isometric** mode (pseudo-3D via offsets) and **Three.js 3D** globe rendering.

Dialogs: **Map Config** (settings + layers + export/import), **Nation Detail** (population, economy, ethnicity pie chart via @visx), **Ethnic Detail** (breakdown, spread), **Route Finder** (Dijkstra logistics), and **Hover Tooltip** (cell-level stats).

---

## 🛠 Tech Stack

| Technology       | Version  | Purpose            |
| ---------------- | -------- | ------------------ |
| **Next.js**      | 16.2.4   | App Router         |
| **React**        | 19.2.0   | UI                 |
| **TypeScript**   | ^5       | Strict mode        |
| **Tailwind CSS** | v4       | Styling            |
| **Zustand**      | ^5.0.12  | State (persistent) |
| **d3-delaunay**  | ^6.0.4   | Voronoi/Delaunay   |
| **Radix UI**     | ^1.4.3   | UI primitives      |
| **Lucide React** | ^1.12.0  | Icons              |
| **@visx**        | ^3.12.0  | Charts             |
| **Three.js**     | ^0.175.0 | 3D rendering       |
| **Vitest**       | ^4.1.5   | Testing            |
| **Canvas API**   | —        | Map rendering      |

---

## 🚀 Getting Started

```bash
yarn install
yarn dev
# Open http://localhost:3000
```

## 📜 Scripts

```bash
yarn dev          # Dev server
yarn build        # Production build
yarn start        # Production server
yarn test         # Run tests
yarn bench:map    # Benchmark
yarn eslint       # Lint
yarn format       # Prettier
```

---

## 🧪 Key Design Decisions

- **Determinism**: all randomness via `createSeededRandom(seed)` (FNV-1a hash + LCG) — same seed = identical world every time
- **Layered pipeline**: 5 stages (Mesh → Topography → Hydrology → Population → Geopolitics), each feeding into the next; intermediate states accessible via `TGenerationStages`
- **Cost-based expansion**: Nations, provinces, and ethnic regions use `runMultiSourceExpansion` (Dijkstra-like frontier with terrain/biome/barrier costs) — enables natural-looking boundaries
- **Spatial index**: `delaunay.find(x, y)` for O(log n) hover/click detection
- **Caching**: LRU cache (`CacheManager`) avoids regenerating identical configs; mesh-level fast path skips mesh rebuild when seed+dimensions unchanged
- **3-tier classification pipeline**: Noise → `TTerrain` (15 intermediate types) → `TLandform` (10 final types) → `TBiome` (16 ecological zones)

---

## 📝 Notes

- Generation is **client-side only**, no backend
- Config persists to localStorage with versioned migration
- All randomness must use `createSeededRandom()` — never `Math.random()` for generation
- Types prefixed with `T` (e.g., `TCell`, `TNation`, `TLandform`)
- See [AGENTS.md](./AGENTS.md) for coding conventions before contributing
- See [documents/](./documents/) for detailed, implementation-level reimplementation specs for each geopolitics component
