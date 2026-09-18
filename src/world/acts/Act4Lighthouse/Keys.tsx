import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Color, type InstancedMesh, Object3D } from 'three';
import { COLORS } from '../../theme';
import { playNote } from '../../audio/pianoSynth';
import { KEYBED } from './layout';
import type { LighthouseFrame } from './frame';

/** 88 teclas: de A0 (MIDI 21) a C8 (MIDI 108). */
const FIRST_MIDI = 21;
const KEY_COUNT = 88;
const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

const WHITE_COUNT = 52;
const WHITE_W = (KEYBED.right - KEYBED.left) / WHITE_COUNT;
const WHITE = { width: WHITE_W * 0.92, height: 0.024, depth: KEYBED.front - KEYBED.back };
const BLACK = { width: WHITE_W * 0.56, height: 0.022, depth: WHITE.depth * 0.6 };
/** Cuánto baja una tecla pulsada. */
const TRAVEL = 0.008;

interface KeySlot {
  midi: number;
  black: boolean;
  /** Índice dentro de su InstancedMesh. */
  index: number;
  x: number;
}

const KEYS: KeySlot[] = (() => {
  const keys: KeySlot[] = [];
  let white = 0;
  let black = 0;
  for (let i = 0; i < KEY_COUNT; i++) {
    const midi = FIRST_MIDI + i;
    if (isBlack(midi)) {
      // Entre la blanca anterior y la siguiente.
      keys.push({ midi, black: true, index: black++, x: KEYBED.left + white * WHITE_W });
    } else {
      keys.push({ midi, black: false, index: white++, x: KEYBED.left + (white - 0.5) * WHITE_W });
    }
  }
  return keys;
})();
const WHITES = KEYS.filter((k) => !k.black);
const BLACKS = KEYS.filter((k) => k.black);

const WHITE_COLOR = new Color('#ece6d8');
const BLACK_COLOR = new Color('#111113');
const HOVER_COLOR = new Color(COLORS.glow);
const dummy = new Object3D();
const tint = new Color();

/**
 * Teclado tocable sobre el relieve del modelo: hover resalta, clic suena (pianoSynth.ts) y arrastrar
 * con el botón pulsado hace glissando. Sin etiquetas: el piano es dedicación, no un listado.
 */
export function Keys({ frame }: { frame: LighthouseFrame }) {
  const whites = useRef<InstancedMesh>(null);
  const blacks = useRef<InstancedMesh>(null);
  const press = useMemo(() => new Float32Array(KEY_COUNT), []);
  const hovered = useRef<number | null>(null);
  const shownHover = useRef<number | null>(-1);
  const dirty = useRef(true);
  const pointerDown = useRef(false);

  useEffect(() => {
    const up = () => {
      pointerDown.current = false;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.cursor = '';
    };
  }, []);

  const keyOf = (black: boolean, instanceId: number | undefined) =>
    instanceId === undefined ? null : KEYS.indexOf((black ? BLACKS : WHITES)[instanceId]);

  function strike(key: number) {
    press[key] = 1;
    dirty.current = true;
    playNote(KEYS[key].midi);
  }

  const handlers = (black: boolean) => ({
    onPointerMove(e: ThreeEvent<PointerEvent>) {
      if (frame.keys < 0.5) return;
      e.stopPropagation();
      const key = keyOf(black, e.instanceId);
      if (key === null || key === hovered.current) return;
      hovered.current = key;
      document.body.style.cursor = 'pointer';
      if (pointerDown.current) strike(key);
    },
    onPointerDown(e: ThreeEvent<PointerEvent>) {
      if (frame.keys < 0.5) return;
      e.stopPropagation();
      const key = keyOf(black, e.instanceId);
      if (key === null) return;
      pointerDown.current = true;
      hovered.current = key;
      strike(key);
    },
    onPointerOut() {
      hovered.current = null;
      document.body.style.cursor = '';
    },
  });

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    if (frame.keys < 0.5 && hovered.current !== null) {
      hovered.current = null;
      document.body.style.cursor = '';
    }
    // Soltar: la tecla vuelve en ~0.25 s.
    for (let i = 0; i < KEY_COUNT; i++) {
      if (press[i] > 0) {
        press[i] = Math.max(0, press[i] - delta * 4);
        dirty.current = true;
      }
    }
    if (!dirty.current && shownHover.current === hovered.current) return;
    dirty.current = false;
    shownHover.current = hovered.current;

    KEYS.forEach((key, i) => {
      const mesh = key.black ? blacks.current : whites.current;
      if (!mesh) return;
      const size = key.black ? BLACK : WHITE;
      const top = KEYBED.top + (key.black ? 0.014 : 0);
      // Todas las teclas arrancan en el fondo del teclado; las negras son más cortas.
      dummy.position.set(key.x, top - size.height / 2 - TRAVEL * press[i], KEYBED.back + size.depth / 2);
      dummy.rotation.set(0.035 * press[i], 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(key.index, dummy.matrix);
      const hover = hovered.current === i ? 0.35 : 0;
      tint.copy(key.black ? BLACK_COLOR : WHITE_COLOR).lerp(HOVER_COLOR, hover + 0.4 * press[i]);
      mesh.setColorAt(key.index, tint);
    });
    for (const mesh of [whites.current, blacks.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={whites} args={[undefined, undefined, WHITES.length]} {...handlers(false)}>
        <boxGeometry args={[WHITE.width, WHITE.height, WHITE.depth]} />
        <meshStandardMaterial roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={blacks} args={[undefined, undefined, BLACKS.length]} {...handlers(true)}>
        <boxGeometry args={[BLACK.width, BLACK.height, BLACK.depth]} />
        <meshStandardMaterial roughness={0.3} />
      </instancedMesh>
    </group>
  );
}
