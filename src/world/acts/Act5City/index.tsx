import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3, type Camera } from 'three';
import { ACTS } from '../../acts.config';
import { ACT_ANCHORS } from '../../camera/path';
import { useWorld } from '../../store';
import { useReducedMotion } from '../../lib/motion';
import { QUALITY } from '../../lib/quality';
import type { ActProps } from '../types';
import { BOOT_ORIGIN, BOOT_RADIUS, CITY_SLOTS } from './layout';
import { bootAt, cityLocal, exploringAt, mailboxAt } from './timeline';
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
import { resetPan } from './pan';
import { useBoardDrag } from './useBoardDrag';

const ACT = ACTS[4];
/** Sin mouse (táctil): distancia (en la placa) desde el centro de la pantalla a la que un chip da tarjeta. */
const NEAR_RANGE = 8;
/** Con mouse: distancia en pantalla (px) del cursor al centro de un chip a la que aparece su tarjeta. */
const PROXIMITY_PX = 110;
/** Cuánto sube un chip en hover o en foco. */
const LIFT = 0.6;

const forward = new Vector3();
const corner = new Vector3();
const center = new Vector3();

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
  const pointer = useBoardDrag(anchor.y);
  // Con mouse la tarjeta es la del chip cercano al cursor; en táctil, la del chip cercano al centro.
  const canHover = useMemo(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);
  const cursor = useMemo(() => ({ current: '' }), []);

  /** Chip cuyo centro en pantalla está más cerca del cursor, dentro de PROXIMITY_PX; −1 si ninguno. */
  function closestToCursor(camera: Camera, width: number, height: number) {
    let best = PROXIMITY_PX;
    let found = -1;
    for (const chip of populated) {
      center.set(chip.x, chip.top, chip.z).add(anchor).project(camera);
      const d = Math.hypot((center.x * 0.5 + 0.5) * width - pointer.x, (0.5 - center.y * 0.5) * height - pointer.y);
      if (d < best) {
        best = d;
        found = chip.project;
      }
    }
    return found;
  }

  /** Chip más cercano al punto de la placa en el centro de la pantalla, dentro de NEAR_RANGE. */
  function closestToCenter(cx: number, cz: number) {
    let best = NEAR_RANGE;
    let found = -1;
    for (const chip of populated) {
      const d = Math.hypot(chip.x - cx, chip.z - cz);
      if (d < best) {
        best = d;
        found = chip.project;
      }
    }
    return found;
  }

  useFrame(({ camera, size }, rawDelta) => {
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
    const exploring = inAct && exploringAt(local);
    let card = inAct ? hover.project : -1;
    if (card < 0 && exploring) card = canHover ? (pointer.inside ? closestToCursor(camera, size.width, size.height) : -1) : closestToCenter(cx, cz);
    const focused = focus?.kind === 'project' ? projects.findIndex((p) => p.id === focus.id) : -1;
    cityAnchor.project = card;
    cityAnchor.onChip = card >= 0 && hover.project === card;
    setNearProject(card >= 0 ? projects[card].id : null);

    // Cursor: mano abierta para arrastrar, cerrada al arrastrar, dedo sobre algo que se abre.
    const wanted = pointer.dragging ? 'grabbing' : hover.project >= 0 || hover.mailbox ? 'pointer' : exploring ? 'grab' : '';
    if (wanted !== cursor.current) {
      document.body.style.cursor = wanted;
      cursor.current = wanted;
    }

    for (let i = 0; i < CITY_SLOTS; i++) {
      const lift = i === card || i === focused ? LIFT : 0;
      const glow = i === focused || (i === card && i === hover.project) ? 1 : i === card ? 0.8 : 0;
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
      Object.assign(cityAnchor, { visible: false, onChip: false, project: -1 });
      resetPan();
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
