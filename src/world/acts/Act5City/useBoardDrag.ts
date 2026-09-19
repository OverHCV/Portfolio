import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useWorld } from '../../store';
import { cityInteractive } from './Buildings';
import { cityLocal, exploringAt, panWeightAt } from './timeline';
import { panBy } from './pan';

/** Por debajo de este peso el arrastre casi no mueve la cámara: se limita para no dar saltos. */
const MIN_WEIGHT = 0.25;

/** Estado del puntero sobre la placa. Lo escribe el arrastre; index.tsx lo lee cada frame. */
export interface BoardPointer {
  dragging: boolean;
  /** Hay un mouse sobre el canvas (en táctil, false: la tarjeta sigue al centro de la pantalla). */
  inside: boolean;
  /** Posición del mouse en px CSS, relativa al canvas. */
  x: number;
  y: number;
}

const raycaster = new Raycaster();
const ndc = new Vector2();
const from = new Vector3();
const to = new Vector3();

/**
 * Arrastrar la placa como un mapa: el punto de la placa bajo el puntero se queda bajo el puntero.
 * El scroll sigue siendo de la página (acercar/alejar, timeline.ts); en táctil solo el arrastre
 * horizontal mueve la placa (`touch-action: pan-y`), el vertical desplaza la página.
 */
export function useBoardDrag(groundY: number): BoardPointer {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const pointer = useMemo<BoardPointer>(() => ({ dragging: false, inside: false, x: 0, y: 0 }), []);

  useEffect(() => {
    const canvas = gl.domElement;
    const plane = new Plane(new Vector3(0, 1, 0), -groundY);
    let lastX = 0;
    let lastY = 0;

    const ground = (clientX: number, clientY: number, out: Vector3) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(plane, out);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !cityInteractive() || !exploringAt(cityLocal(useWorld.getState().progress))) return;
      pointer.dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        const rect = canvas.getBoundingClientRect();
        // Sobre el navbar u otro overlay no cuenta: la tarjeta no debe reaccionar a lo que hay debajo.
        pointer.inside = e.target === canvas;
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
      }
      if (!pointer.dragging) return;
      if (ground(lastX, lastY, from) && ground(e.clientX, e.clientY, to)) {
        // La cámara suma el desplazamiento × su peso: se divide para que la placa siga al puntero.
        const w = Math.max(panWeightAt(cityLocal(useWorld.getState().progress)), MIN_WEIGHT);
        panBy((from.x - to.x) / w, (from.z - to.z) / w);
      }
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      pointer.dragging = false;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') pointer.inside = false;
    };

    // Solo mientras se ve la placa: en los demás actos el canvas conserva su comportamiento táctil.
    const touchAction = canvas.style.touchAction;
    const unsubscribe = useWorld.subscribe((s) => {
      canvas.style.touchAction = s.activeAct === 5 ? 'pan-y' : touchAction;
    });
    canvas.style.touchAction = useWorld.getState().activeAct === 5 ? 'pan-y' : touchAction;

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      unsubscribe();
      canvas.style.touchAction = touchAction;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl, camera, groundY, pointer]);

  return pointer;
}
