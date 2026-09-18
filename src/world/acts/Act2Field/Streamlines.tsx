import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { COLORS } from '../../theme';
import { streamline, type Field } from './field';

// Semillas repartidas en una esfera (Fibonacci) alrededor de cada nodo.
const SEEDS_PER_NODE = 9;
const SEED_RADIUS = 2.4;

function fibonacciSphere(n: number): Vector3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    return new Vector3(Math.cos(golden * i) * r, y * 0.6, Math.sin(golden * i) * r);
  });
}

/** Líneas de corriente fijas que desembocan en los nodos: "nodos conectados por líneas". */
export function Streamlines({ field, nodes }: { field: Field; nodes: Vector3[] }) {
  const lines = useMemo(() => {
    const dirs = fibonacciSphere(SEEDS_PER_NODE);
    return nodes.flatMap((node) =>
      dirs
        .map((d) => streamline(field, node.clone().addScaledVector(d, SEED_RADIUS)))
        .filter((pts) => pts.length > 8),
    );
  }, [field, nodes]);

  return (
    <group>
      {lines.map((points, i) => (
        <Line key={i} points={points} color={COLORS.glow} lineWidth={1} transparent opacity={0.35} />
      ))}
    </group>
  );
}
