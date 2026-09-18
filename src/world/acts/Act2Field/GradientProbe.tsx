import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AdditiveBlending, Color, type Group, type InterleavedBufferAttribute, type Mesh, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { COLORS } from '../../theme';
import type { ChapterState } from './chapters';
import type { Landscape } from './landscape';

/** Muestras por corte y semilargo de cada corte (unidades del paisaje). */
const SAMPLES = 64;
const HALF_SPAN = 3;
/** Los cortes flotan apenas sobre la malla para no parpadear con ella. */
const LIFT = 0.02;
const UP = new Vector3(0, 1, 0);
/** En desktop, la columna de texto ocupa la izquierda (overlay/FieldOverlay.tsx): ahí no hay sonda. */
const TEXT_COLUMN_EDGE = -0.2;
const GLOW = new Color(COLORS.glow);

/** Línea gruesa (px de pantalla) de `points` vértices, que se reescribe en sitio cada frame. */
function makeLine(points: number, width: number, colorAt: (s: number) => Color): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array(points * 3));
  const colors = new Float32Array(points * 3);
  for (let i = 0; i < points; i++) colorAt(i / (points - 1)).toArray(colors, i * 3);
  geometry.setColors(colors);
  const material = new LineMaterial({ linewidth: width, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  return line;
}

/** Escribe el vértice i de una Line2 (cada segmento guarda inicio y fin: 6 floats). */
function setPoint(line: Line2, count: number, i: number, x: number, y: number, z: number) {
  const data = (line.geometry.attributes.instanceStart as InterleavedBufferAttribute).data;
  const a = data.array as Float32Array;
  if (i < count - 1) a.set([x, y, z], i * 6);
  if (i > 0) a.set([x, y, z], (i - 1) * 6 + 3);
}

function flush(line: Line2) {
  (line.geometry.attributes.instanceStart as InterleavedBufferAttribute).data.needsUpdate = true;
}

// Los cortes se desvanecen hacia sus extremos (aditivo: hacia negro).
const sliceColor = (s: number) => GLOW.clone().multiplyScalar(Math.pow(1 - Math.abs(s * 2 - 1), 0.5) * 1.6);
const arrowColor = () => GLOW.clone().multiplyScalar(2.2);

function canHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Sonda del cursor: bajo el puntero, los dos cortes ortogonales de la malla (x fija y z fija)
 * y, en su cruce, la dirección de máximo descenso −∇f sobre la superficie, con el valor de f.
 */
export function GradientProbe({ landscape, chapter, anchor }: { landscape: Landscape; chapter: ChapterState; anchor: Vector3 }) {
  const root = useRef<Group>(null);
  const arrowHead = useRef<Mesh>(null);
  const label = useRef<HTMLDivElement>(null);
  const hover = useMemo(canHover, []);
  // Sin puntero sobre la página (aún no se movió, o salió de la ventana) no hay sonda.
  const pointerIn = useRef(false);

  useEffect(() => {
    const enter = () => (pointerIn.current = true);
    const leave = () => (pointerIn.current = false);
    window.addEventListener('pointermove', enter);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', enter);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  const [sliceX, sliceZ, arrow] = useMemo(
    () => [makeLine(SAMPLES, 1.6, sliceColor), makeLine(SAMPLES, 1.6, sliceColor), makeLine(2, 2.2, arrowColor)],
    [],
  );

  useEffect(
    () => () => {
      for (const l of [sliceX, sliceZ, arrow]) {
        l.geometry.dispose();
        l.material.dispose();
      }
    },
    [sliceX, sliceZ, arrow],
  );

  const tmp = useMemo(
    () => ({
      raycaster: new Raycaster(),
      hit: new Vector3(),
      grad: new Vector2(),
      dir: new Vector3(),
      quat: new Quaternion(),
    }),
    [],
  );

  useFrame(({ camera, pointer, size }) => {
    const group = root.current;
    if (!group) return;
    for (const l of [sliceX, sliceZ, arrow]) l.material.resolution.set(size.width, size.height);
    const { raycaster, hit, grad, dir } = tmp;
    // Solo con ratón, con el puntero en la página y durante los capítulos.
    const overText = size.width >= 768 && pointer.x < TEXT_COLUMN_EDGE;
    let show = hover && pointerIn.current && !overText && chapter.text > 0.5;
    if (show) {
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.origin.sub(anchor);
      show = landscape.raycast(raycaster.ray, hit);
    }
    group.visible = show;
    if (label.current) label.current.style.opacity = show ? '1' : '0';
    if (!show) return;

    const x0 = hit.x;
    const z0 = hit.z;
    const f0 = landscape.height(x0, z0);
    group.position.set(x0, f0, z0);

    // Cortes, en coordenadas relativas al punto.
    for (let i = 0; i < SAMPLES; i++) {
      const s = ((i / (SAMPLES - 1)) * 2 - 1) * HALF_SPAN;
      setPoint(sliceX, SAMPLES, i, s, landscape.height(x0 + s, z0) - f0 + LIFT, 0);
      setPoint(sliceZ, SAMPLES, i, 0, landscape.height(x0, z0 + s) - f0 + LIFT, s);
    }
    flush(sliceX);
    flush(sliceZ);

    // Máximo descenso sobre la superficie: moverse (−fx, −fz) baja f en |∇f|².
    landscape.gradient(x0, z0, grad);
    const g2 = grad.lengthSq();
    const length = Math.min(Math.max(Math.sqrt(g2) * 1.3, 0.35), 1.5);
    dir.set(-grad.x, -g2, -grad.y);
    if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
    dir.normalize();
    setPoint(arrow, 2, 0, 0, LIFT, 0);
    setPoint(arrow, 2, 1, dir.x * length, dir.y * length + LIFT, dir.z * length);
    flush(arrow);
    if (arrowHead.current) {
      arrowHead.current.position.set(dir.x * length, dir.y * length + LIFT, dir.z * length);
      arrowHead.current.quaternion.copy(tmp.quat.setFromUnitVectors(UP, dir));
    }

    if (label.current) {
      label.current.textContent = `f = ${f0.toFixed(2)}   −∇f = (${(-grad.x).toFixed(2)}, ${(-grad.y).toFixed(2)})`.replace(/-/g, '−');
    }
  });

  return (
    <group ref={root} visible={false}>
      <primitive object={sliceX} />
      <primitive object={sliceZ} />
      <primitive object={arrow} />
      <mesh ref={arrowHead}>
        <coneGeometry args={[0.05, 0.16, 10]} />
        <meshBasicMaterial color={GLOW.clone().multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={GLOW.clone().multiplyScalar(2.5)} toneMapped={false} />
      </mesh>
      <Html position={[0, 0.35, 0]} zIndexRange={[12, 8]} style={{ pointerEvents: 'none' }}>
        <div
          ref={label}
          className="ml-3 whitespace-pre font-mono text-[11px] tracking-wide text-glow opacity-0 transition-opacity duration-200 [text-shadow:0_1px_8px_rgba(5,6,10,0.9)]"
        />
      </Html>
    </group>
  );
}
