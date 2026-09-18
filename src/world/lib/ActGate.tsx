import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { ACTS, type ActId } from '../acts.config';
import { TRANSITIONS } from '../transitions.config';
import { useWorld } from '../store';

/** Margen de visibilidad a cada lado de un acto: lo que dura el velo de la transición vecina. */
function marginAt(boundary: number): number {
  const tr = TRANSITIONS.find((t) => Math.abs(t.at - boundary) < 1e-6);
  return tr ? tr.hold + tr.fade : 0;
}

/**
 * Los actos vecinos se montan para precargar, pero no deben verse (p. ej. el Acto 2 a través
 * del agujero negro). Solo se dibuja un acto dentro de su rango más el de sus transiciones.
 */
export function ActGate({ id, children }: { id: ActId; children: ReactNode }) {
  const group = useRef<Group>(null);
  const act = ACTS.find((a) => a.id === id)!;
  const from = act.start - marginAt(act.start);
  const to = act.end + marginAt(act.end);

  useFrame(() => {
    if (!group.current) return;
    const p = useWorld.getState().progress;
    group.current.visible = p >= from && p <= to;
  });

  return <group ref={group}>{children}</group>;
}
