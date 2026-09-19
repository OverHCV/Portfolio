import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { useWorld } from '../store';
import { useReducedMotion } from '../lib/motion';
import { BASE_FOV, albumFitAt, cityFitAt, fovAt, nearAt, sampleCamera } from './path';
import { albumAt, lighthouseLocal } from '../acts/Act4Lighthouse/timeline';
import { veilAt } from '../transitions.config';
import { ACTS } from '../acts.config';
import { cityLocal, panWeightAt } from '../acts/Act5City/timeline';
import { cityPan } from '../acts/Act5City/pan';

/** Cuánto gira la cámara con el mouse en los bordes de la pantalla (radianes). */
const LOOK_YAW = 0.12;
const LOOK_PITCH = 0.08;

const CITY = ACTS[4];
const pan = new Vector3();
const lookAt = new Vector3();

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
    // En pantallas angostas la toma del atril y la de la ciudad se alejan para que quepan.
    const aspect = state.size.width / state.size.height;
    const fit = albumFitAt(progress, aspect) * cityFitAt(progress, aspect);
    if (fit !== 1) goalPosition.current.sub(goalTarget.current).multiplyScalar(fit).add(goalTarget.current);

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
    // Acto 5: lo que el usuario arrastró, fuera del suavizado para que la placa siga al puntero.
    // Se desvanece al avanzar hacia el buzón (panWeightAt).
    const inCity = progress >= CITY.start;
    const panWeight = inCity ? panWeightAt(cityLocal(progress)) : 0;
    pan.set(cityPan.x * panWeight, 0, cityPan.z * panWeight);
    camera.position.add(pan);
    camera.lookAt(lookAt.copy(target.current).add(pan));

    // Ojo de pez de la construcción del muelle (Acto 3); con reduced motion el FOV no cambia.
    // En el Acto 5 la cámara pasa a telefoto (casi ortográfica), sin importar reduced motion.
    if (camera instanceof PerspectiveCamera) {
      const zoomed = fovAt(progress);
      const fov = reducedMotion && zoomed > BASE_FOV ? BASE_FOV : zoomed;
      const near = nearAt(progress);
      if (Math.abs(camera.fov - fov) > 1e-3 || camera.near !== near) {
        camera.fov = fov;
        camera.near = near;
        camera.updateProjectionMatrix();
      }
    }

    if (!reducedMotion) {
      // Frente al álbum el puntero pasa hojas y en la placa arrastra: la cámara deja de seguirlo.
      const free = inCity ? 0 : 1 - albumAt(lighthouseLocal(progress));
      look.current.x = MathUtils.damp(look.current.x, pointer.x * free, 3, delta);
      look.current.y = MathUtils.damp(look.current.y, pointer.y * free, 3, delta);
      // Con la telefoto del Acto 5 el mismo giro movería media ciudad: se escala con el FOV.
      const scale = camera instanceof PerspectiveCamera ? Math.min(1, camera.fov / BASE_FOV) : 1;
      camera.rotateY(-look.current.x * LOOK_YAW * scale);
      camera.rotateX(look.current.y * LOOK_PITCH * scale);
    }
  });

  return null;
}
