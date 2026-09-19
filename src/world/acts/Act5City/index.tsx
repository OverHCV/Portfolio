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
import { cityAnchor } from './anchor';

const ACT = ACTS[4];
/** Distancia (en la placa) a la que un chip pasa a la tarjeta sin hover. */
const NEAR_RANGE = 8;
/** Segundos que la tarjeta sigue en el último chip apuntado: da tiempo a llevar el puntero a la burbuja. */
const HOVER_GRACE = 0.6;
/** Cuánto sube un chip en hover o en foco. */
const LIFT = 0.6;

const forward = new Vector3();
const corner = new Vector3();

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
  const lastPointed = useMemo(() => ({ project: -1, at: -Infinity }), []);
  const populated = useMemo(() => board.chips.filter((c) => c.project >= 0), [board]);

  useFrame(({ camera, size, clock }, rawDelta) => {
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
    const now = clock.elapsedTime;
    if (hover.project >= 0 || cityAnchor.held) Object.assign(lastPointed, { project: hover.project >= 0 ? hover.project : cityAnchor.project, at: now });
    const pointed = now - lastPointed.at < HOVER_GRACE ? lastPointed.project : -1;
    const card = inAct ? (pointed >= 0 ? pointed : near) : -1;
    cityAnchor.project = card;
    setNearProject(card >= 0 ? projects[card].id : null);

    for (let i = 0; i < CITY_SLOTS; i++) {
      const lift = i === pointed || i === focused ? LIFT : 0;
      const glow = i === focused ? 1 : i === pointed ? 0.8 : i === near ? 0.4 : 0;
      u.uLift.value[i] = MathUtils.damp(u.uLift.value[i], reducedMotion ? 0 : lift, 8, delta);
      u.uGlow.value[i] = MathUtils.damp(u.uGlow.value[i], glow, 6, delta);
    }

    // Rectángulo en pantalla del chip de la tarjeta: de ahí sale la burbuja del overlay.
    const site = card >= 0 ? populated.find((c) => c.project === card) : undefined;
    cityAnchor.visible = Boolean(site);
    if (site) {
      const top = site.top + u.uLift.value[card];
      let left = Infinity;
      let right = -Infinity;
      let up = Infinity;
      let down = -Infinity;
      for (let k = 0; k < 8; k++) {
        corner
          .set(site.x + (k & 1 ? site.hw : -site.hw), k & 2 ? top : 0, site.z + (k & 4 ? site.hd : -site.hd))
          .add(anchor)
          .project(camera);
        const x = (corner.x * 0.5 + 0.5) * size.width;
        const y = (0.5 - corner.y * 0.5) * size.height;
        left = Math.min(left, x);
        right = Math.max(right, x);
        up = Math.min(up, y);
        down = Math.max(down, y);
      }
      Object.assign(cityAnchor, { left, right, top: up, bottom: down });
    }
  });

  useEffect(
    () => () => {
      useWorld.getState().setNearProject(null);
      Object.assign(cityAnchor, { visible: false, held: false, project: -1 });
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
