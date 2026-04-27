import { TMapMesh } from 'src/types/global';

interface TBlobOptions {
  amount: number;
  count: number;
  decay: number;
}

interface TChainOptions {
  amount: number;
  count: number;
  width: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function applyBlob(
  mesh: TMapMesh,
  random: () => number,
  elevations: Float32Array,
  { amount, count, decay }: TBlobOptions
) {
  for (let iteration = 0; iteration < count; iteration += 1) {
    const queue = [Math.floor(random() * mesh.cells.length)];
    const visited = new Uint8Array(mesh.cells.length);
    const changes = new Float32Array(mesh.cells.length);
    changes[queue[0]] = amount;
    visited[queue[0]] = 1;

    while (queue.length) {
      const cellId = queue.shift() as number;
      const nextAmount = changes[cellId] * decay * (0.88 + random() * 0.2);

      elevations[cellId] = clamp(elevations[cellId] + changes[cellId], 0, 1);
      if (Math.abs(nextAmount) < 0.015) continue;

      for (const neighborId of mesh.cells[cellId].neighbors) {
        if (visited[neighborId]) continue;

        visited[neighborId] = 1;
        changes[neighborId] = nextAmount;
        queue.push(neighborId);
      }
    }
  }
}

function getPath(mesh: TMapMesh, random: () => number, startCellId: number, endCellId: number) {
  const used = new Uint8Array(mesh.cells.length);
  const path = [startCellId];
  let currentCellId = startCellId;
  used[startCellId] = 1;

  while (currentCellId !== endCellId && path.length < mesh.cells.length / 3) {
    let nextCellId = -1;
    let bestScore = Infinity;

    for (const neighborId of mesh.cells[currentCellId].neighbors) {
      if (used[neighborId]) continue;

      const [targetX, targetY] = mesh.cells[endCellId].site;
      const [neighborX, neighborY] = mesh.cells[neighborId].site;
      let score = (targetX - neighborX) ** 2 + (targetY - neighborY) ** 2;
      if (random() > 0.82) score /= 2;

      if (score < bestScore) {
        bestScore = score;
        nextCellId = neighborId;
      }
    }
    if (nextCellId === -1) break;
    used[nextCellId] = 1;
    path.push(nextCellId);
    currentCellId = nextCellId;
  }
  return path;
}

export function applyChain(
  mesh: TMapMesh,
  random: () => number,
  elevations: Float32Array,
  { amount, count, width }: TChainOptions
) {
  for (let iteration = 0; iteration < count; iteration += 1) {
    const path = getPath(
      mesh,
      random,
      Math.floor(random() * mesh.cells.length),
      Math.floor(random() * mesh.cells.length)
    );
    const visited = new Uint8Array(mesh.cells.length);
    let frontier = path.slice();
    let currentAmount = amount;

    for (const cellId of frontier) {
      visited[cellId] = 1;
    }

    for (let layer = 0; layer < width && frontier.length; layer += 1) {
      const nextFrontier: number[] = [];

      for (const cellId of frontier) {
        elevations[cellId] = clamp(
          elevations[cellId] + currentAmount * (0.84 + random() * 0.24),
          0,
          1
        );

        for (const neighborId of mesh.cells[cellId].neighbors) {
          if (visited[neighborId]) continue;
          visited[neighborId] = 1;
          nextFrontier.push(neighborId);
        }
      }
      currentAmount *= 0.72;
      frontier = nextFrontier;
    }
  }
}

export function smoothElevations(mesh: TMapMesh, elevations: Float32Array, factor: number) {
  const smoothed = new Float32Array(elevations.length);

  for (let cellIndex = 0; cellIndex < mesh.cells.length; cellIndex += 1) {
    let total = elevations[cellIndex];

    for (const neighborId of mesh.cells[cellIndex].neighbors) {
      total += elevations[neighborId];
    }

    const average = total / (mesh.cells[cellIndex].neighbors.length + 1);
    smoothed[cellIndex] = clamp(elevations[cellIndex] * (1 - factor) + average * factor, 0, 1);
  }

  elevations.set(smoothed);
}

export function applyMask(mesh: TMapMesh, elevations: Float32Array, strength: number) {
  for (let cellIndex = 0; cellIndex < mesh.cells.length; cellIndex += 1) {
    const [x, y] = mesh.cells[cellIndex].site;
    const nx = (2 * x) / mesh.width - 1;
    const ny = (2 * y) / mesh.height - 1;
    const mask = clamp((1 - nx * nx) * (1 - ny * ny), 0, 1);

    elevations[cellIndex] = clamp(
      elevations[cellIndex] * (1 - strength) + elevations[cellIndex] * mask * strength,
      0,
      1
    );
  }
}
