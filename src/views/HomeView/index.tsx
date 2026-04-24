'use client';

import { Delaunay } from 'd3-delaunay';
import { useEffect, useMemo, useState } from 'react';

const WIDTH = 600;
const HEIGHT = 400;
const NUM_POINTS = 200;

function generatePoints(n: number): [number, number][] {
  return Array.from({ length: n }, () => [Math.random() * WIDTH, Math.random() * HEIGHT]);
}

export default function HomeView() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setPoints(generatePoints(NUM_POINTS));
  }, []);

  const delaunay = useMemo(() => {
    if (points.length === 0) return null;
    return Delaunay.from(points);
  }, [points]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!delaunay) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const i = delaunay.find(x, y);
    setHoverIndex(i);
  };

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      style={{ border: '1px solid #cccccc' }}
      onMouseMove={handleMouseMove}
    >
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={hoverIndex === i ? 6 : 3}
          fill={hoverIndex === i ? 'red' : 'white'}
        />
      ))}
    </svg>
  );
}
