import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector2, Vector3 } from 'three';
import { useWorld } from '../store';
import { useReducedMotion } from '../lib/motion';
import { sampleCamera } from './path';
import { veilAt } from '../transitions.config';

/** Cuánto gira la cámara con el mouse en los bordes de la pantalla (radianes). */
const LOOK_YAW = 0.12;
const LOOK_PITCH = 0.08;

export function CameraRig() {
  const reducedMotion = useReducedMotion();
  const goalPosition = useRef(new Vector3());
  const goalTarget = useRef(new Vector3());
  const position = useRef(new Vector3());
  const target = useRef(new Vector3());
  const look = useRef(new Vector2());
  const initialized = useRef(false);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const { progress } = useWorld.getState();
    sampleCamera(progress, goalPosition.current, goalTarget.current);

    // Bajo el velo opaco la cámara salta a su pose: el suavizado no debe dejar ver el viaje entre actos.
    // Con reduced motion se mantiene el suavizado (evita saltos al navegar); solo se quita el mirar con el mouse.
    if (!initialized.current || veilAt(progress).opacity >= 1) {
      position.current.copy(goalPosition.current);
      target.current.copy(goalTarget.current);
      initialized.current = true;
    } else {
      // Suaviza los saltos de la rueda del mouse sin retrasar demasiado el scroll.
      const k = 1 - Math.exp(-6 * delta);
      position.current.lerp(goalPosition.current, k);
      target.current.lerp(goalTarget.current, k);
    }

    const { camera, pointer } = state;
    camera.position.copy(position.current);
    camera.lookAt(target.current);

    if (!reducedMotion) {
      look.current.x = MathUtils.damp(look.current.x, pointer.x, 3, delta);
      look.current.y = MathUtils.damp(look.current.y, pointer.y, 3, delta);
      camera.rotateY(-look.current.x * LOOK_YAW);
      camera.rotateX(look.current.y * LOOK_PITCH);
    }
  });

  return null;
}
