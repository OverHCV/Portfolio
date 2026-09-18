import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { type Group, MathUtils, Plane, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { useT } from '../../../../i18n/useT';
import { useWorld } from '../../../store';
import type { StackSheet } from '../../../types';
import { PAGE, STAND } from '../layout';
import type { LighthouseFrame } from '../frame';
import { createPageGeometry, createPageMaterial } from './pageMaterial';
import { buildPages, createPageTexture, loadPageFonts, type PageStrings } from './pageTexture';

const W = PAGE.width;
const H = PAGE.height;
/** Separación entre hojas apiladas (m): evita z-fighting y da grosor al libro. */
const SHEET_GAP = 0.0011;
/** Fracción exterior de la página donde un clic la pasa. */
const CORNER_ZONE = 0.45;
/** Movimiento (px) por debajo del cual soltar cuenta como clic y no como arrastre. */
const CLICK_SLOP = 6;
/** Velocidad angular (rad/s) que completa la vuelta aunque no pase de la mitad. */
const FLICK = 5;
/** Esquina levantada al pasar el puntero, como invitación. */
const DOG_EAR = 0.16;
const TEXTURE_SCALE = { high: 1, mid: 0.85, low: 0.7 } as const;

interface Drag {
  sheet: number;
  /** 1 = hacia adelante (desde la derecha), −1 = hacia atrás. */
  dir: 1 | -1;
  /** x local donde se tomó la hoja. */
  x0: number;
  grab: number;
  clientX: number;
  clientY: number;
  angle: number;
  moved: boolean;
  velocity: number;
  lastAngle: number;
  lastTime: number;
}

const plane = new Plane();
const normal = new Vector3();
const origin = new Vector3();
const quaternion = new Quaternion();
const hit = new Vector3();
const ndc = new Vector2();
const raycaster = new Raycaster();

/**
 * El álbum del atril: una hoja por familia del stack. Se pasa con clic en la mitad exterior de una
 * página o arrastrándola (la hoja se dobla y sigue al puntero); flechas y botones en el overlay.
 * La hoja abierta vive en el store (`albumPage`); aquí solo se anima hacia ella.
 */
export function Album({ frame, stack, name }: { frame: LighthouseFrame; stack: StackSheet[]; name: string }) {
  const { t, lang } = useT();
  const quality = useWorld((s) => s.quality);
  const { camera, gl } = useThree();
  const book = useRef<Group>(null);
  const n = stack.length;
  const movable = Math.max(n - 1, 0);

  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadPageFonts().then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const geometry = useMemo(createPageGeometry, []);
  const sheets = useMemo(() => Array.from({ length: movable }, createPageMaterial), [movable]);
  // Páginas fijas: la portada interior (izquierda, ya "pasada") y el último recto (derecha).
  const bases = useMemo(() => {
    const left = createPageMaterial();
    left.uniforms.uTurn.value = Math.PI;
    return { left, right: createPageMaterial() };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      sheets.forEach((m) => m.dispose());
      bases.left.dispose();
      bases.right.dispose();
    },
    [geometry, sheets, bases],
  );

  // Texturas: se rehacen al cambiar idioma o al llegar las fuentes.
  const textures = useMemo(() => {
    if (n === 0) return null;
    const strings: PageStrings = {
      coverTitle: t('stack.cover.title'),
      coverSubtitle: t('stack.cover.subtitle'),
      hint: t('stack.hint'),
      movement: t('stack.movement'),
      count: (count) => t('stack.count', { n: String(count) }),
      legend: t('stack.legend'),
    };
    const { versos, rectos } = buildPages(stack, name, lang, strings);
    const scale = TEXTURE_SCALE[quality];
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return {
      versos: versos.map((p, i) => createPageTexture(p, scale, i * 2 + 7, anisotropy)),
      rectos: rectos.map((p, i) => createPageTexture(p, scale, i * 2 + 8, anisotropy)),
    };
    // fontsReady: redibujar con Fraunces/Space Grotesk ya cargadas.
  }, [stack, name, lang, t, quality, gl, n, fontsReady]);
  useEffect(() => {
    if (!textures) return;
    sheets.forEach((m, k) => {
      m.uniforms.uFront.value = textures.rectos[k];
      m.uniforms.uBack.value = textures.versos[k + 1];
    });
    bases.left.uniforms.uBack.value = textures.versos[0];
    bases.left.uniforms.uFront.value = textures.versos[0];
    bases.right.uniforms.uFront.value = textures.rectos[n - 1];
    bases.right.uniforms.uBack.value = textures.rectos[n - 1];
    return () => {
      textures.versos.forEach((tx) => tx.dispose());
      textures.rectos.forEach((tx) => tx.dispose());
    };
  }, [textures, sheets, bases, n]);

  const angles = useMemo(() => new Float32Array(movable), [movable]);
  const drag = useRef<Drag | null>(null);
  const hover = useRef<0 | 1 | -1>(0);
  // Al montar, las hojas ya pasadas quedan a la izquierda sin animación.
  useEffect(() => {
    const page = useWorld.getState().albumPage;
    for (let k = 0; k < movable; k++) angles[k] = k < page ? Math.PI : 0;
  }, [angles, movable]);

  /** Punto del puntero sobre el plano del libro, en coordenadas locales del libro. */
  function toBook(clientX: number, clientY: number, out: Vector3): boolean {
    const g = book.current;
    if (!g) return false;
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    g.getWorldQuaternion(quaternion);
    g.getWorldPosition(origin);
    plane.setFromNormalAndCoplanarPoint(normal.set(0, 0, 1).applyQuaternion(quaternion), origin);
    if (!raycaster.ray.intersectPlane(plane, out)) return false;
    g.worldToLocal(out);
    return true;
  }

  // Arrastre: se sigue en window para no perder el puntero fuera del libro.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (Math.hypot(e.clientX - d.clientX, e.clientY - d.clientY) > CLICK_SLOP) d.moved = true;
      if (!d.moved || !toBook(e.clientX, e.clientY, hit)) return;
      // El punto tomado hace de borde libre: su proyección x = W·cos(θ).
      const edge = hit.x + (d.dir > 0 ? W - d.x0 : -W - d.x0);
      const angle = Math.acos(MathUtils.clamp(edge / W, -1, 1));
      const now = performance.now();
      const dt = Math.max((now - d.lastTime) / 1000, 1e-3);
      d.velocity = MathUtils.lerp(d.velocity, (angle - d.lastAngle) / dt, 0.4);
      d.lastAngle = angle;
      d.lastTime = now;
      d.angle = angle;
      d.grab = MathUtils.clamp(hit.y / H, 0, 1);
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      document.body.style.cursor = hover.current ? 'pointer' : '';
      const { albumPage, setAlbumPage } = useWorld.getState();
      if (!d.moved) {
        // Clic: solo en la mitad exterior (la esquina), no junto al lomo.
        if (d.dir > 0 && d.x0 > W * (1 - CORNER_ZONE)) setAlbumPage(albumPage + 1);
        if (d.dir < 0 && d.x0 < -W * (1 - CORNER_ZONE)) setAlbumPage(albumPage - 1);
        return;
      }
      const done = d.dir > 0 ? d.angle > Math.PI / 2 || d.velocity > FLICK : d.angle < Math.PI / 2 || d.velocity < -FLICK;
      if (done) setAlbumPage(albumPage + d.dir);
    };
    // Mientras se arrastra una hoja con el dedo, el gesto no debe hacer scroll.
    const touch = (e: TouchEvent) => {
      if (drag.current) e.preventDefault();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('touchmove', touch, { passive: false });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchmove', touch);
      document.body.style.cursor = '';
    };
  }, [camera, gl]);

  // Si el álbum deja de estar activo a mitad de un arrastre, se suelta.
  function interactive() {
    return frame.album > 0.5 && n > 1;
  }

  function sideAt(x: number): 0 | 1 | -1 {
    const page = useWorld.getState().albumPage;
    if (x > 0 && page < n - 1) return 1;
    if (x < 0 && page > 0) return -1;
    return 0;
  }

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    if (!interactive() || e.button !== 0) return;
    const local = book.current!.worldToLocal(hit.copy(e.point));
    const dir = sideAt(local.x);
    if (dir === 0) return;
    e.stopPropagation();
    const page = useWorld.getState().albumPage;
    const sheet = dir > 0 ? page : page - 1;
    const angle = dir > 0 ? 0 : Math.PI;
    drag.current = {
      sheet,
      dir,
      x0: local.x,
      grab: MathUtils.clamp(local.y / H, 0, 1),
      clientX: e.nativeEvent.clientX,
      clientY: e.nativeEvent.clientY,
      angle: angles[sheet] ?? angle,
      moved: false,
      velocity: 0,
      lastAngle: angle,
      lastTime: performance.now(),
    };
    document.body.style.cursor = 'grabbing';
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    if (drag.current) return;
    if (!interactive()) {
      onPointerOut();
      return;
    }
    const local = book.current!.worldToLocal(hit.copy(e.point));
    const side = sideAt(local.x);
    const corner = side !== 0 && Math.abs(local.x) > W * (1 - CORNER_ZONE) ? side : 0;
    hover.current = corner;
    document.body.style.cursor = side !== 0 ? (corner ? 'pointer' : 'grab') : '';
  }

  function onPointerOut() {
    hover.current = 0;
    if (!drag.current) document.body.style.cursor = '';
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    if (drag.current && frame.album < 0.5) drag.current = null;
    const page = MathUtils.clamp(useWorld.getState().albumPage, 0, n - 1);
    const d = drag.current;
    for (let k = 0; k < movable; k++) {
      const m = sheets[k];
      let target = k < page ? Math.PI : 0;
      let peel = 0.3;
      let grab = 0.12;
      if (d && d.sheet === k && d.moved) {
        target = d.angle;
        peel = 0.55;
        grab = d.grab;
      } else if (!d && hover.current === 1 && k === page) {
        target = DOG_EAR;
        peel = 1.1;
      } else if (!d && hover.current === -1 && k === page - 1) {
        target = Math.PI - DOG_EAR;
        peel = 1.1;
      }
      angles[k] = MathUtils.damp(angles[k], target, d?.sheet === k ? 20 : 7, delta);
      const a = angles[k];
      const u = m.uniforms;
      u.uTurn.value = a;
      u.uPeel.value = MathUtils.damp(u.uPeel.value, peel, 8, delta);
      u.uGrab.value = MathUtils.damp(u.uGrab.value, grab, 8, delta);
      // A la derecha la primera hoja va arriba; a la izquierda, la última pasada.
      const right = (movable - k) * SHEET_GAP;
      const left = (k + 1) * SHEET_GAP;
      u.uLift.value = MathUtils.lerp(right, left, a / Math.PI) + 0.01 * Math.sin(a);
    }
  });

  if (n === 0) return null;

  return (
    <group ref={book} position={STAND.spine} rotation={[-STAND.tilt, 0, 0]}>
      {/* Tapas del libro. */}
      <mesh position={[0, H / 2, -0.004]}>
        <boxGeometry args={[W * 2 + 0.02, H + 0.016, 0.006]} />
        <meshStandardMaterial color="#1f1611" roughness={0.7} />
      </mesh>
      <mesh geometry={geometry} material={bases.left} />
      <mesh geometry={geometry} material={bases.right} />
      {sheets.map((material, k) => (
        <mesh key={k} geometry={geometry} material={material} frustumCulled={false} />
      ))}
      {/* Zona de clic/arrastre: plano invisible sobre el libro abierto. */}
      <mesh position={[0, H / 2, 0.02]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
        <planeGeometry args={[W * 2, H]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
