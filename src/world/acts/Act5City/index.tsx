import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { ACTS } from '../../acts.config';
import { ACT_ANCHORS } from '../../camera/path';
import { useWorld } from '../../store';
import { useReducedMotion } from '../../lib/motion';
import { QUALITY } from '../../lib/quality';
import type { ActProps } from '../types';
import { BOOT_ORIGIN, BOOT_RADIUS, CITY_SLOTS } from './layout';
import { bootAt, cityLocal, mailboxAt, touringAt } from './timeline';
import { buildBoard } from './board';
import { createCityFrame } from './frame';
import { Substrate } from './Substrate';
import { Traces } from './Traces';
import { Pads } from './Pads';
import { Silkscreen } from './Silkscreen';
import { Parts } from './Parts';
import { Buildings, type CityHover } from './Buildings';
import { Mailbox } from './Mailbox';

const ACT = ACTS[4];
/** Distancia (en la placa) a la que un chip pasa a la tarjeta sin hover. */
const NEAR_RANGE = 8;
/** Cuánto sube un chip en hover o en foco. */
const LIFT = 0.45;

const forward = new Vector3();

/**
 * Dentro del piano: una PCB en isométrico. Cada proyecto es un chip en su zócalo y cada conexión
 * entre proyectos, una calle de pistas con pulsos; el resto de la placa es relleno generado
 * (board.ts). Coreografía en timeline.ts; cámara en camera/path.ts; paleta en palette.ts.
 */
export default function Act5City({ content }: ActProps) {
  const reducedMotion = useReducedMotion();
  const anchor = ACT_ANCHORS[5];
  const { projects } = content;
  const quality = useWorld((s) => s.quality);
  const board = useMemo(() => buildBoard(projects.slice(0, CITY_SLOTS), QUALITY[quality].density), [projects, quality]);
  const frame = useMemo(createCityFrame, []);
  const hover = useMemo<CityHover>(() => ({ project: -1, mailbox: false }), []);
  const populated = useMemo(() => board.chips.filter((c) => c.project >= 0), [board]);

  useFrame(({ camera }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const u = frame.uniforms;
    frame.time += delta * (reducedMotion ? 0.3 : 1);
    u.uTime.value = frame.time;

    const { progress, focus, setNearProject } = useWorld.getState();
    const local = cityLocal(progress);
    frame.local = local;
    frame.mailbox = mailboxAt(local);
    // Con reduced motion la placa ya está encendida: sin frente de encendido.
    u.uBoot.value = reducedMotion ? 1 : bootAt(local);
    u.uBootOrigin.value.set(anchor.x + BOOT_ORIGIN[0], anchor.z + BOOT_ORIGIN[1]);
    u.uBootRadius.value = BOOT_RADIUS;
    u.uLed.value = 1.35 + (reducedMotion ? 0 : 0.35 * Math.sin(frame.time * 2.1));

    // Punto de la placa en el centro de la pantalla: ajusta la niebla y elige el chip cercano.
    camera.getWorldDirection(forward);
    const t = forward.y < -1e-3 ? (anchor.y - camera.position.y) / forward.y : 0;
    const cx = camera.position.x + forward.x * t - anchor.x;
    const cz = camera.position.z + forward.z * t - anchor.z;
    u.uFog.value.set(t * 1.04, t * 1.45);

    const inAct = progress >= ACT.start && progress <= ACT.end;
    let near = -1;
    if (inAct && touringAt(local)) {
      let best = NEAR_RANGE;
      for (const chip of populated) {
        const d = Math.hypot(chip.x - cx, chip.z - cz);
        if (d < best) {
          best = d;
          near = chip.project;
        }
      }
    }
    const focused = focus?.kind === 'project' ? projects.findIndex((p) => p.id === focus.id) : -1;
    const card = inAct ? (hover.project >= 0 ? hover.project : near) : -1;
    setNearProject(card >= 0 ? projects[card].id : null);

    for (let i = 0; i < CITY_SLOTS; i++) {
      const lift = i === hover.project || i === focused ? LIFT : 0;
      const glow = i === focused ? 1 : i === hover.project ? 0.8 : i === near ? 0.4 : 0;
      u.uLift.value[i] = MathUtils.damp(u.uLift.value[i], reducedMotion ? 0 : lift, 8, delta);
      u.uGlow.value[i] = MathUtils.damp(u.uGlow.value[i], glow, 6, delta);
    }
  });

  useEffect(
    () => () => {
      useWorld.getState().setNearProject(null);
      document.body.style.cursor = '';
    },
    [],
  );

  return (
    <group position={anchor}>
      <Substrate frame={frame} />
      <Traces traces={board.traces} frame={frame} />
      <Pads pads={board.pads} frame={frame} />
      <Silkscreen silk={board.silk} labels={board.labels} projects={projects} frame={frame} />
      <Parts boxes={board.boxes} cyls={board.cyls} frame={frame} />
      <Buildings chips={board.chips} projects={projects} hover={hover} />
      <Mailbox frame={frame} hover={hover} />
    </group>
  );
}
