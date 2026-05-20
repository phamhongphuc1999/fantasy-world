# BÁO CÁO PHÂN TÍCH & CẢI THIỆN THUẬT TOÁN SINH ĐỊA HÌNH

## 📊 Đánh giá tổng thể mã nguồn hiện tại

Mã nguồn hiện tại đã rất tốt với kiến trúc procedural generation chuyên nghiệp. Tuy nhiên, có thể cải thiện ở 6 khía cạnh chính:

---

## 1. 🏔️ CẢI THIỆN NOISE — Simplex Noise thay vì Value Noise

### Hiện trạng:

```typescript
// buildTopography.ts — dùng value noise (hash grid)
function sampleValueNoise(x: number, y: number, seedHash: number) {
  // Grid hash + bilinear interpolation
  // Chỉ là grid-based value noise cơ bản
}
```

### Vấn đề:

- **Value noise** tạo ra artifacts hình khối rõ (blocky artifacts)
- Cần nhiều octave FBM để che đi, nhưng vẫn có directional bias
- **Không isotropic** — có xu hướng tạo đường thẳng theo trục grid

### Giải pháp: **Simplex Noise** (Perlin noise cải tiến)

```typescript
// simplex-noise.ts — [NEW FILE]
// Simplex noise là O(n²) thay vì O(2ⁿ) như Perlin gốc
// Không có directional artifacts
// Mượt hơn, ít octave hơn → nhanh hơn

export function simplex2D(x: number, y: number, seedHash: number): number {
  // Dùng skew matrix để map grid vuông → grid tam giác
  const skew = (x + y) * 0.3660254037844386; // (sqrt(3)-1)/2
  const ix = Math.floor(x + skew);
  const iy = Math.floor(y + skew);

  const unskew = (ix + iy) * 0.21132486540518713; // (3-sqrt(3))/6
  const x0 = x - (ix - unskew);
  const y0 = y - (iy - unskew);

  // Gradient vectors từ lookup table
  const grad = GRADIENT_3D[(ix * 374761393 + iy * 668265263 + seedHash) & 15];
  // ...
}
```

### Tác động:

- **Giảm 30-40% số octave** cần thiết cho cùng chất lượng
- Loại bỏ blocky artifacts
- Tái cấu trúc nhẹ: thay `sampleValueNoise` → `sampleSimplexNoise` trong `createNoiseSampler`

---

## 2. 🌋 CẢI THIỆN MẢNG KIẾN TẠO — Tectonic Plate Simulation

### Hiện trạng:

```typescript
// buildTopography.ts — boundary lines đơn giản
function buildBoundaryLines(seed, width, height): TBoundaryLine[] {
  // Chỉ tạo random line segments
  // Không có plate logic thực sự
  // Không có subduction zones, continental collision
}
```

| Hiện tại | Thực tế (địa lý) |
|----------|------------------|
| Đường thẳng ngẫu nhiên | Mảng kiến tạo với ranh giới cong phức tạp |
| Không có plate motion | Plates di chuyển, va chạm theo hướng |
| Không có isostasy | Cân bằng isostatic (vỏ lục địa dày hơn đại dương) |
| Núi chỉ là noise | Núi do va chạm, tách giãn, hoặc núi lửa |

### Giải pháp: **Plate Simulation với Mid-Ocean Ridges + Subduction Zones**

```typescript
// tectonic-plates.ts — [NEW FILE]

interface TPlate {
  id: number;
  kind: 'continental' | 'oceanic' | 'transitional';
  boundaryPoints: TPoint[];  // Voronoi cell centers của plate
  velocity: { vx: number; vy: number };
  rotation: number;  // rad/s
  rotationCenter: TPoint;
  nodes: TPlateNode[];
}

interface TPlateNode {
  point: TPoint;
  plateId: number;
  boundaryType: 'divergent' | 'convergent' | 'transform' | 'none';
  convergenceRate: number;
  subductionAngle: number;
  crustThickness: number;  // isostatic property
}

function buildPlateSystem(seed: string, width: number, height: number): TPlate[] {
  // 1. Tạo 4-7 plates với Voronoi seeds
  // 2. Gán motion vector random cho mỗi plate
  // 3. Phát hiện boundary type từ relative motion

  // divergent → mid-ocean ridge (núi lửa đáy biển)
  // convergent → subduction zone hoặc continental collision
  // transform → earthquake zone (San Andreas-style)
}

function simulateIsostasy(nodes: TPlateNode[]): number[] {
  // Crust thickness → equilibrium elevation
  // Continental crust (density ~2.7) → cao hơn
  // Oceanic crust (density ~3.3) → thấp hơn
  // Isostatic compensation: E = H * (ρ_mantle - ρ_crust) / ρ_mantle
}

function applyPlateBoundaryUplift(
  cell: TCell,
  nearestNode: TPlateNode,
  distance: number
): { uplift: number; rift: number; volcanism: number } {
  // Convergent: Himalayan-style collision
  if (boundaryType === 'convergent') {
    // Continental-continental: broad uplift
    // Oceanic-continental: subduction → volcanic arc
    // Oceanic-oceanic: island arc
  }

  // Divergent: Mid-Atlantic Ridge
  // Transform: strike-slip (không uplift)
}
```

### Tác động:

- Tạo dãy núi **giống thật hơn** (Andes, Himalayas, Rockies)
- Mid-ocean ridges cho địa hình đại dương
- Island arcs (Indonesia, Japan) cho preset `archipelago`
- Địa hình có **cấu trúc kiến tạo** thay vì noise thuần túy

---

## 3. 💧 CẢI THIỆN HYDROLOGY — Hydraulic Erosion Simulation

### Hiện trạng:

```typescript
// buildTopography.ts — erosion mask chỉ là noise
const erosionMask = noise.fractal(warpedX * 2.8, warpedY * 2.8, detailHash ^ 0x7feb352d);

// hydrology/index.ts — erosion đơn giản
const erosionAmount = slope * EROSION_CONFIG.slopeWeight +
  Math.log2(flow[cellIndex] + 1) * EROSION_CONFIG.flowWeight;
```

### Vấn đề:

- Erosion hiện tại là **post-process 1-pass** — không iterative
- Không có **sediment transport** (erosion rồi deposit ở hạ lưu)
- Không có **meander simulation** cho sông
- Không có **valley carving** — sông đào thung lũng kiểu V

### Giải pháp: **Particle-based Hydraulic Erosion (Kelly & Šavva 2019)**

```typescript
// hydraulic-erosion.ts — [NEW FILE]

interface TErosionParticle {
  x: number;
  y: number;
  velocity: number;
  sediment: number;
  waterVolume: number;
  lifetime: number;
}

function simulateHydraulicErosion(
  elevation: Float32Array,
  width: number,
  height: number,
  iterations: number
): Float32Array {
  const eroded = Float32Array.from(elevation);
  const sedimentMap = new Float32Array(elevation.length);

  for (let i = 0; i < iterations; i++) {
    const particle: TErosionParticle = {
      x: Math.random() * width,
      y: Math.random() * height,
      velocity: 0,
      sediment: 0,
      waterVolume: INITIAL_WATER,
      lifetime: MAX_LIFETIME,
    };

    while (particle.lifetime > 0) {
      // 1. Compute gradient at particle position
      const grad = sampleGradient(eroded, width, particle);

      // 2. Update velocity (momentum + gravity)
      particle.velocity = particle.velocity * 0.9 + grad.magnitude * 0.1;

      // 3. Move particle
      particle.x -= grad.dx * particle.velocity;
      particle.y -= grad.dy * particle.velocity;

      // 4. Compute sediment capacity (Einstein-Brown)
      const capacity = particle.velocity * particle.velocity * 0.1;

      // 5. Erode or deposit
      if (capacity > particle.sediment) {
        // Erode — remove sediment from terrain
        const toErode = Math.min(
          (capacity - particle.sediment) * 0.1,
          CURRENT_ELEVATION * 0.05
        );
        eroded[cellId] -= toErode;
        particle.sediment += toErode;
      } else {
        // Deposit — put sediment back
        const toDeposit = (particle.sediment - capacity) * 0.1;
        eroded[cellId] += toDeposit;
        particle.sediment -= toDeposit;
      }

      // 6. Evaporation
      particle.waterVolume *= 0.995;
      particle.lifetime -= 1;
    }
  }

  return eroded;
}
```

### Tác động:

- **Valley carving** tự nhiên (sông tạo thung lũng hình V)
- **Alluvial fans** ở chân núi
- **Meanders** cho sông đồng bằng
- Địa hình **realistic hơn rất nhiều** — đây là khác biệt lớn nhất giữa "đẹp" và "thật"

---

## 4. 🌊 CẢI THIỆN ĐẠI DƯƠNG — Ocean Floor Topography

### Hiện trạng:

```typescript
// buildTopography.ts
// Đại dương chỉ đơn giản là "dưới mực nước biển"
// Không có địa hình đáy biển
```

### Vấn đề:

- Đáy biển là flat color — không có chi tiết
- Không có continental shelf, slope, abyssal plain
- Không có seamounts, oceanic trenches

### Giải pháp:

```typescript
function buildOceanFloor(
  cells: TCell[],
  seaLevel: number,
  plateSystem: TPlate[],
  seed: string
): Float32Array {
  const oceanElevation = new Float32Array(cells.length);

  for (const cell of cells) {
    if (!cell.isWater) continue;

    // 1. Continental shelf — gentle slope từ 0 → -150m
    const shelfFactor = distanceToCoast / SHELF_WIDTH;
    if (shelfFactor < 1) {
      elevation = -seaLevel * shelfFactor * 0.3;
    }

    // 2. Continental slope — steep drop từ -150m → -3000m
    else if (shelfFactor < 1.2) {
      elevation = lerp(-150, -3000, (shelfFactor - 1) / 0.2);
    }

    // 3. Abyssal plain — flat at ~-4000m với gentle undulation
    else {
      elevation = -4000 + noise.fractal(x * 0.1, y * 0.1) * 200;
    }

    // 4. Mid-ocean ridge — từ plate boundaries
    if (nearestBoundary.kind === 'divergent') {
      elevation += RIDGE_HEIGHT * exp(-distance² / RIDGE_WIDTH²);
    }

    // 5. Oceanic trench — từ subduction zones
    if (nearestBoundary.kind === 'convergent' && nearestNode.subductionAngle > 0) {
      elevation -= TRENCH_DEPTH * exp(-distance² / TRENCH_WIDTH²);
    }

    // 6. Seamounts — random volcanic peaks
    const seamount = sampleSeamountField(x, y);
    elevation += seamount.height * exp(-seamount.distance² / seamount.radius²);
  }

  return oceanElevation;
}
```

### Tác động:

- Đại dương có địa hình chi tiết (continental shelf, abyssal plains)
- Hỗ trợ hiển thị **bathymetric map**
- Tạo điều kiện cho **marine ecology** sau này

---

## 5. 🔄 CẢI THIỆN PRESET — Đa dạng hóa địa hình

### Hiện trạng:

4 presets: `balanced`, `ranges`, `rifted`, `archipelago`

### Giải pháp: **Parametric Presets**

```typescript
// preset.ts — mở rộng

interface TTerrainPresetParams {
  noiseScale: number;          // 0.3 (smooth) → 1.2 (rugged)
  tectonicActivity: number;    // 0 (stable craton) → 1 (intense)
  erosionRate: number;         // 0 (no erosion) → 1 (heavily eroded)
  seaLevelVariation: number;   // 0 (single sea level) → 1 (variable)
  volcanism: number;           // 0 → 1
  glacialActivity: number;     // 0 → 1
  karstDevelopment: number;    // 0 → 1 (limestone caves, sinkholes)
}

// Các presets thực tế hơn:
const PRESETS: Record<string, TTerrainPresetParams> = {
  himalayan: { tectonicActivity: 0.95, erosionRate: 0.3, noiseScale: 0.9 },
  scandinavian: { glacialActivity: 0.8, erosionRate: 0.6, noiseScale: 0.5 },
  mediterranean: { tectonicActivity: 0.6, erosionRate: 0.5, volcanism: 0.4 },
  hawaiian: { volcanism: 0.95, erosionRate: 0.4, tectonicActivity: 0.3 },
  sahara: { erosionRate: 0.2, noiseScale: 0.3, glacialActivity: 0 },
  icelandic: { volcanism: 0.85, glacialActivity: 0.6, tectonicActivity: 0.7 },
};
```

### RangeBands hiện tại:

```typescript
// shape.ts — applyRangeBands tạo dãy núi parallel đều đặn
// Đây là vấn đề: dãy núi thực tế không song song đều

// Cải thiện: Range Chains với branching
function applyRangeChains(
  mesh: TMesh,
  random: () => number,
  elevations: Float32Array,
  config: TRangeBandConfig
) {
  // 1. Tạo mountain chain với branching (tree structure)
  // 2. Áp dụng fractal noise dọc theo chain
  // 3. Add lateral ranges (sub-ranges perpendicular to main chain)

  // Alps: một main arc + nhiều sub-ranges
  // Andes: một line dài + nhiều perpendicular ridges
  // Himalayas: arc + parallel ranges (Tibetan plateau behind)
}
```

---

## 6. 🧪 CẢI THIỆN HIỆU NĂNG — Web Worker + Caching

### Hiện trạng:

```typescript
// MapGenerator.ts — chạy trên main thread
generate(): TGenerationStages {
  const mesh = buildMesh({...});
  const topography = buildTopography({...});
  // ...
}
```

### Giải pháp: **Web Worker Pipeline + Elevation Cache**

```typescript
// worker/map-generation.worker.ts — [NEW FILE]

// OffscreenCanvas + Worker
// Chia generation thành chunks 1000 cells

// Cache Layer cho noise:
// Simplex noise points có thể được cache
// Nếu cùng seed + cùng tọa độ → reuse

class NoiseCache {
  private cache = new LRUCache<string, number>({
    maxSize: 1_000_000, // 1M entries
  });

  sample(x: number, y: number, seedHash: number): number {
    const key = `${x.toFixed(4)},${y.toFixed(4)},${seedHash}`;
    let value = this.cache.get(key);
    if (value === undefined) {
      value = computeSimplex2D(x, y, seedHash);
      this.cache.set(key, value);
    }
    return value;
  }
}
```

### Tác động hiệu năng ước tính:

| Cải thiện | Tốc độ |
|-----------|--------|
| Simplex → ít octave hơn | +20% |
| Web Worker (non-blocking) | UI không freeze |
| Noise Cache | +30-50% (cho noise-heavy topography) |
| Chunk-based erosion | +40% (particle erosion parallelizable) |

---

## 📋 BẢNG TỔNG HỢP ĐỀ XUẤT

| # | Cải thiện | Độ phức tạp | Tác động chất lượng | Tác động hiệu năng | Ưu tiên |
|---|-----------|:-----------:|:-------------------:|:------------------:|:-------:|
| 1 | **Simplex Noise** | 🟢 Thấp | Cải thiện vừa | Nhanh hơn 20% | ⭐⭐⭐ |
| 2 | **Hydraulic Erosion** | 🟡 Trung bình | **CẢI THIỆN LỚN** | Chậm hơn (cần worker) | ⭐⭐⭐⭐⭐ |
| 3 | **Tectonic Plates** | 🔴 Cao | Cải thiện lớn | Trung bình | ⭐⭐⭐⭐ |
| 4 | **Ocean Floor** | 🟢 Thấp | Cải thiện vừa | Không đáng kể | ⭐⭐⭐ |
| 5 | **Parametric Presets** | 🟡 Trung bình | Mở rộng đa dạng | Không đáng kể | ⭐⭐⭐ |
| 6 | **Web Worker Pipeline** | 🟡 Trung bình | Không thay đổi | **NHANH HƠN NHIỀU** | ⭐⭐⭐⭐⭐ |

---

## 💡 KHUYẾN NGHỊ LỘ TRÌNH

### Phase 1 (1-2 tuần) — Tác động lớn nhất, ít rủi ro nhất:

1. **Simplex Noise** → thay value noise
2. **Hydraulic Erosion** → particle simulation
3. **Web Worker** → non-blocking generation

### Phase 2 (2-3 tuần):

4. **Tectonic Plates** → thay boundary lines
5. **Parametric Presets** → mở rộng từ 4 → 10+ presets

### Phase 3 (1-2 tuần — optional):

6. **Ocean Floor** → bathymetry
7. **Noise Cache** → performance

---

**Tóm lại:** Cải thiện quan trọng nhất là **Hydraulic Erosion** (tác động visual lớn nhất) và **Web Worker** (tác động UX lớn nhất). Simplex Noise là cải thiện "low-hanging fruit" dễ làm nhất.
