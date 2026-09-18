import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, type BufferGeometry, Color, CylinderGeometry, type InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { PIER } from './layout';
import { setBuildOrder, withBuild } from './build';
import type { PierFrame } from './frame';

const PLANKS = Math.floor(PIER.length / PIER.pitch);
const BAYS = Math.ceil(PIER.length / PIER.bay);
/** Parte baja de los pilotes, bajo el agua. */
const PILE_BOTTOM = -3.2;
const BEAM_Y = PIER.deck - 0.2;

interface Part {
  geometry: BufferGeometry;
  /** [x, y, z] de cada instancia, en coordenadas del acto. */
  positions: [number, number, number][];
  color: string;
  /** Variación de tono y giro por instancia (madera irregular). */
  jitter?: boolean;
}

function parts(): Part[] {
  const planks: Part = {
    geometry: new BoxGeometry(PIER.width, 0.06, PIER.pitch - 0.07),
    positions: Array.from({ length: PLANKS }, (_, i) => [0, PIER.deck, PIER.near - PIER.pitch / 2 - i * PIER.pitch]),
    color: '#3b2e22',
    jitter: true,
  };
  const stringers: Part = {
    geometry: new BoxGeometry(0.12, 0.16, PIER.bay),
    positions: Array.from({ length: BAYS * 2 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      return [side * (PIER.width / 2 - 0.35), PIER.deck - 0.11, PIER.near - PIER.bay * (Math.floor(i / 2) + 0.5)];
    }),
    color: '#2a211a',
  };
  const caps: Part = {
    geometry: new BoxGeometry(PIER.width + 0.3, 0.14, 0.16),
    positions: Array.from({ length: BAYS + 1 }, (_, j) => [0, BEAM_Y, PIER.near - j * PIER.bay]),
    color: '#2a211a',
  };
  const pileHeight = PIER.deck - 0.15 - PILE_BOTTOM;
  const piles: Part = {
    geometry: new CylinderGeometry(0.11, 0.13, pileHeight, 10),
    positions: Array.from({ length: (BAYS + 1) * 2 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      return [side * (PIER.width / 2 + 0.05), PILE_BOTTOM + pileHeight / 2, PIER.near - Math.floor(i / 2) * PIER.bay];
    }),
    color: '#1f1914',
  };
  return [planks, stringers, caps, piles];
}

function PierPart({ part, build }: { part: Part; build: PierFrame['build'] }) {
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(() => withBuild(new MeshStandardMaterial({ color: part.color, roughness: 0.92, metalness: 0 }), build), [part, build]);
  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new Object3D();
    const tone = new Color();
    part.positions.forEach(([x, y, z], i) => {
      dummy.position.set(x, y + (part.jitter ? (Math.random() - 0.5) * 0.016 : 0), z);
      dummy.rotation.set(0, part.jitter ? (Math.random() - 0.5) * 0.02 : 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (part.jitter) m.setColorAt(i, tone.setScalar(0.8 + Math.random() * 0.35));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [part]);

  return <instancedMesh ref={mesh} args={[part.geometry, material, part.positions.length]} frustumCulled={false} />;
}

/** Tablas, largueros, travesaños y pilotes: cuatro `InstancedMesh` que se arman del faro a la cámara. */
export function Pier({ frame }: { frame: PierFrame }) {
  const list = useMemo(() => {
    const all = parts();
    for (const p of all) setBuildOrder(p.geometry, p.positions.map((pos) => pos[2]));
    return all;
  }, []);
  useEffect(() => () => list.forEach((p) => p.geometry.dispose()), [list]);

  return (
    <group>
      {list.map((part, i) => (
        <PierPart key={i} part={part} build={frame.build} />
      ))}
    </group>
  );
}
