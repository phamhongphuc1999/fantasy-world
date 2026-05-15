# Fantasy World

**Fantasy World** is a deterministic procedural world-map generator. Given a seed string, it generates a complete synthetic world — from terrain elevation and river networks to nations, provinces, ethnic regions, capitals, and economic hubs — all deterministically repeatable.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript (strict)**, and **Canvas HTML5 rendering**.

Production URL: [https://fantasy.peter-present.xyz/](https://fantasy.peter-present.xyz/)

---

## 🌍 What You Can Do

- Generate repeatable worlds from a seed — same seed = same map
- Choose from 4 terrain presets: Balanced, Ranges, Rifted, Archipelago
- Adjust sea level, temperature, precipitation, nation count, cell count
- Inspect map layers: landform, biome, population, temperature, precipitation, rain shadow, economy, rivers, nation/ethnic fills and borders, labels
- Explore nation/province/ethnic boundaries, capitals, and economic hubs
- Hover for cell-level stats, click to open nation/ethnic detail dialogs
- Find optimal logistics routes between two points (Dijkstra)
- Export/Import world snapshots

---

## 🏗 How World Generation Works

The pipeline runs in **5 sequential stages** via `MapGenerator`:

### 1. Mesh

Jittered grid points → Delaunay triangulation → Voronoi diagram via **d3-delaunay**. Each cell has a site, polygon, vertices, edges, and neighbors. Default: **15,000 cells**.

### 2. Topography

Multi-octave noise (FBM, Ridged, Billow) + domain warping + tectonic boundary lines (collision/rift) + radial uplift/basin seeds + coastal shelf. Produces elevation → classified into 10 landforms: `marine_deep`, `marine_shallow`, `coast`, `lake`, `plain`, `valley`, `hills`, `mountain`, `plateau`, `volcanic_field`.

### 3. Hydrology

- **Temperature**: latitude cooling + elevation lapse + maritime moderation
- **Wind**: 3-zone global circulation (trade winds, westerlies, polar)
- **Precipitation**: moisture advection + orographic uplift + rain shadow
- **Rivers**: depression-filling → flow accumulation → hierarchical river graph (river/fork/branch/creek) with meanders, width progression, and auto-naming
- **Lakes**: formed at elevation sinks, limited to 12 large lakes
- **Erosion**: slope-based erosion & deposition

Biomes classified from climate: `plain`, `ice`, `tundra`, `boreal_forest`, `temperate_forest`, `tropical_forest`, `grassland`, `savanna`, `steppe`, `desert_hot`, `desert_cold`, `wetland`, `montane_shrub`, `freshwater`, `marine`.

### 4. Population

Water access (BFS distance decay) × climate suitability × landform/biome factors → population per cell. Urban seeds boost surrounding areas (urban sprawl). Economy derived from population × landform × water access × synergy.

### 5. Geopolitics

- **Nations**: scored seed selection → multi-source cost-based frontier expansion → post-processing (terrain alignment, mountain-split limiting, minimum area, contiguity, size diversification)
- **Provinces**: scored seeds per nation → cost expansion → population balancing (~500K target, ~1.5M max)
- **Ethnic regions**: seeded per landmass → cross-border blending → dominance enforcement → mountain fragmentation
- **Capitals**: weighted by population, economy, centrality, safety, terrain flatness
- **Economic hubs**: scored by economy, geography, water access

---

## 🗺 Visualization

Canvas-rendered with toggleable layers: Landform, Biome, Population (heatmap), Temperature (heatmap), Precipitation, Rain Shadow, Economy (heatmap), Rivers, Nation Borders/Fill, Province Borders, Ethnic Borders/Fill/Labels, Labels, Cell Data. Includes relief shading, river glow, and capital/hub markers.

Dialogs: **Map Config** (settings + layers + export/import), **Nation Detail** (population, economy, ethnicity), **Ethnic Detail** (breakdown, spread), and **Hover Tooltip** (cell-level stats).

---

## 🛠 Tech Stack

| Technology       | Version | Purpose            |
| ---------------- | ------- | ------------------ |
| **Next.js**      | 16.2.4  | App Router         |
| **React**        | 19.2.4  | UI                 |
| **TypeScript**   | ^5      | Strict mode        |
| **Tailwind CSS** | v4      | Styling            |
| **Zustand**      | ^5.0.12 | State (persistent) |
| **d3-delaunay**  | ^6.0.4  | Voronoi/Delaunay   |
| **Radix UI**     | ^1.4.3  | UI primitives      |
| **Lucide React** | ^1.12.0 | Icons              |
| **@visx**        | ^3.12.0 | Charts             |
| **Vitest**       | ^4.1.5  | Testing            |
| **Canvas API**   | —       | Map rendering      |

---

## 🚀 Getting Started

```bash
yarn install
yarn dev
# Open http://localhost:3000
```

## 📜 Scripts

```bash
yarn dev        # Dev server
yarn build      # Production build
yarn start      # Production server
yarn test       # Run tests
yarn bench:map  # Benchmark
yarn eslint     # Lint
yarn format     # Prettier
```

---

## 🧪 Key Design Decisions

- **Determinism**: all randomness via `createSeededRandom(seed)` (FNV-1a + LCG) — same seed = identical world
- **Layered pipeline**: each stage feeds into the next; intermediate states accessible via `TGenerationStages`
- **Cost-based expansion**: nations, provinces, and ethnic regions use `runMultiSourceExpansion` (Dijkstra-like frontier with terrain/biome/barrier costs)
- **Spatial index**: `delaunay.find(x, y)` for O(log n) hover/click detection
- **Cell classification**: `TTerrain` (14 types, intermediate) → `TLandform` (10 types, final) → `TBiome` (16 types, ecological)

---

## 📝 Notes

- Generation is **client-side only**, no backend
- Config persists to localStorage with versioned migration
- All randomness must use `createSeededRandom()` — never `Math.random()` for generation
- Types prefixed with `T` (e.g., `TCell`, `TNation`)
- See [AGENTS.md](./AGENTS.md) for coding conventions before contributing
