import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { COLORS } from '../../theme';
import { BOUNDS, type Field } from './field';

const COUNTS = { x: 15, y: 5, z: 11 };
const UP = new Vector3(0, 1, 0);
const LOW = new Color(COLORS.mist).multiplyScalar(0.55);
const HIGH = new Color(COLORS.cyan).multiplyScalar(0.9);
// Por encima de 1 para que el bloom lo recoja.
const HOVER = new Color(COLORS.glow).multiplyScalar(2.4);

interface Cone {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
  color: Color;
}

function buildCones(field: Field, avoid: Vector3[]): Cone[] {
  const cones: Cone[] = [];
  const dir = new Vector3();
  const raw: { position: Vector3; dir: Vector3; magnitude: number }[] = [];
  let maxMagnitude = 0;

  for (let ix = 0; ix < COUNTS.x; ix++)
    for (let iy = 0; iy < COUNTS.y; iy++)
      for (let iz = 0; iz < COUNTS.z; iz++) {
        const position = new Vector3(
          -BOUNDS.x + (2 * BOUNDS.x * ix) / (COUNTS.x - 1),
          -BOUNDS.y + (2 * BOUNDS.y * iy) / (COUNTS.y - 1),
          -BOUNDS.z + (2 * BOUNDS.z * iz) / (COUNTS.z - 1),
        );
        // Deja libre el entorno de cada nodo de bio.
        if (avoid.some((a) => a.distanceToSquared(position) < 0.36)) continue;
        field.descent(position, dir);
        const magnitude = dir.length();
        maxMagnitude = Math.max(maxMagnitude, magnitude);
        raw.push({ position, dir: dir.clone().normalize(), magnitude });
      }

  for (const r of raw) {
    const t = Math.sqrt(r.magnitude / maxMagnitude);
    cones.push({
      position: r.position,
      quaternion: new Quaternion().setFromUnitVectors(UP, r.dir),
      scale: 0.45 + 0.75 * t,
      color: LOW.clone().lerp(HIGH, t),
    });
  }
  return cones;
}

/** Red estática de conos; cada uno apunta en la dirección de descenso del campo. */
export function FieldGrid({ field, avoid }: { field: Field; avoid: Vector3[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const hovered = useRef<number | null>(null);
  const cones = useMemo(() => buildCones(field, avoid), [field, avoid]);
  const matrix = useMemo(() => new Matrix4(), []);
  const scaleVec = useMemo(() => new Vector3(), []);

  function write(i: number, highlighted: boolean) {
    const m = mesh.current;
    if (!m) return;
    const c = cones[i];
    const s = highlighted ? c.scale * 1.9 : c.scale;
    matrix.compose(c.position, c.quaternion, scaleVec.set(s, s, s));
    m.setMatrixAt(i, matrix);
    m.setColorAt(i, highlighted ? HOVER : c.color);
  }

  function flush() {
    const m = mesh.current;
    if (!m) return;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  useLayoutEffect(() => {
    cones.forEach((_, i) => write(i, false));
    flush();
    mesh.current?.computeBoundingSphere();
    // write/flush solo dependen de `cones` y de refs estables.
  }, [cones]);

  function highlight(i: number | null) {
    if (hovered.current === i) return;
    if (hovered.current !== null) write(hovered.current, false);
    if (i !== null) write(i, true);
    hovered.current = i;
    flush();
  }

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, cones.length]}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        highlight(e.instanceId ?? null);
      }}
      onPointerOut={() => highlight(null)}
    >
      <coneGeometry args={[0.055, 0.28, 6, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
