'use client';

import { useEffect, useMemo, useRef } from 'react';
import { LANDFORM_CONFIG } from 'src/configs/map/landform-biome';
import { TCell, TDelaunayMesh } from 'src/types/map.types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type TProps = {
  mesh: TDelaunayMesh;
};

/**
 * Build 3D geometry from a Voronoi cell's polygon with extrusion.
 */
function buildCellMesh(cell: TCell, elevationScale: number): THREE.BufferGeometry {
  const poly = cell.polygon;
  const elev = cell.elevation * elevationScale;
  const vertices: number[] = [];
  const indices: number[] = [];
  const n = poly.length;

  if (n < 3) return new THREE.BufferGeometry();

  // Top face (elevated polygon)
  const topStart = 0;
  for (let i = 0; i < n; i++) {
    vertices.push(poly[i][0], poly[i][1], elev);
  }

  // Bottom face (flat at elevation 0)
  const bottomStart = n;
  for (let i = 0; i < n; i++) {
    vertices.push(poly[i][0], poly[i][1], 0);
  }

  // Top face triangulation (fan from first vertex)
  for (let i = 1; i < n - 1; i++) {
    indices.push(topStart, topStart + i, topStart + i + 1);
  }

  // Bottom face triangulation (fan, reversed winding)
  for (let i = 1; i < n - 1; i++) {
    indices.push(bottomStart, bottomStart + i + 1, bottomStart + i);
  }

  // Side walls
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const a = topStart + i;
    const b = topStart + next;
    const c = bottomStart + next;
    const d = bottomStart + i;
    indices.push(a, b, c, a, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Get fill color for a cell based on its data.
 */
function getCellColor(cell: TCell): string {
  return LANDFORM_CONFIG[cell.landform].color;
}

export default function ThreeMapCanvas({ mesh }: TProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    cellGroup: THREE.Group;
  } | null>(null);

  const elevationScale = 8;

  // Build geometries once
  const cellData = useMemo(() => {
    const landCells = mesh.cells.filter((c) => !c.isWater);
    const waterCells = mesh.cells.filter((c) => c.isWater);
    return { landCells, waterCells };
  }, [mesh.cells]);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── Setup Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#09131f');

    // ── Camera ──
    const container = containerRef.current;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 1, 20000);
    camera.position.set(0, -800, 1200);
    camera.lookAt(0, 0, 0);

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ── Controls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 200;
    controls.maxDistance = 4000;
    controls.target.set(0, 0, 0);
    controls.update();

    // ── Lights ──
    const ambientLight = new THREE.AmbientLight(0x404060, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(300, 600, 800);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.6);
    fillLight.position.set(-400, 300, -200);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362907, 0.8);
    scene.add(hemiLight);

    // ── Cell Group ──
    const cellGroup = new THREE.Group();
    scene.add(cellGroup);

    sceneRef.current = { scene, camera, renderer, controls, cellGroup };

    // ── Build Cells ──
    const geometryCache = new Map<number, THREE.BufferGeometry>();

    for (const cell of [...cellData.waterCells, ...cellData.landCells]) {
      const color = getCellColor(cell);
      const geom = buildCellMesh(cell, elevationScale);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.05,
        flatShading: true,
      });
      const mesh3D = new THREE.Mesh(geom, mat);
      mesh3D.castShadow = true;
      mesh3D.receiveShadow = true;
      // Store cell.id on the mesh userData
      mesh3D.userData.cellId = cell.id;
      cellGroup.add(mesh3D);
      geometryCache.set(cell.id, geom);
    }

    // ── Grid helper ──
    const gridHelper = new THREE.GridHelper(2000, 40, 0x111827, 0x111827);
    gridHelper.position.z = -5;
    scene.add(gridHelper);

    // ── Animation Loop ──
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      for (const geom of geometryCache.values()) {
        geom.dispose();
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [cellData, elevationScale]);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full" style={{ zIndex: 10 }} />
  );
}
