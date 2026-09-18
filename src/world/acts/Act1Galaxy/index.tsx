import { Suspense } from 'react';
import { Billboard } from '@react-three/drei';
import { AdditiveBlending } from 'three';
import { ACT_ANCHORS } from '../../camera/path';
import { useWorld } from '../../store';
import type { ActProps } from '../types';
import { AccretionDisk } from './AccretionDisk';
import { LensedHalo } from './LensedHalo';
import { HORIZON_RADIUS } from './constants';
import { HDBlackHole } from './hd/HDBlackHole';

/** Versión ligera (por defecto): disco + halo lenteado + lente en postprocesado. */
function LightBlackHole() {
  return (
    <group position={ACT_ANCHORS[1]}>
      <LensedHalo />
      <AccretionDisk />
      {/* Horizonte de eventos: negro puro que tapa lo que queda detrás. */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[HORIZON_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Anillo de fotones: siempre de frente a la cámara, justo fuera del horizonte. */}
      <Billboard>
        <mesh>
          <ringGeometry args={[HORIZON_RADIUS * 1.0, HORIZON_RADIUS * 1.035, 128]} />
          <meshBasicMaterial color={[1.6, 1.25, 0.85]} transparent opacity={0.6} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

export default function Act1Galaxy(_: ActProps) {
  // El cambio a/desde HD al salir del acto ocurre bajo el velo opaco de la transición `lens`.
  const hdActive = useWorld((s) => s.hd && s.activeAct === 1);

  return (
    <group>
      {hdActive ? (
        <Suspense fallback={<LightBlackHole />}>
          <HDBlackHole />
        </Suspense>
      ) : (
        <LightBlackHole />
      )}
    </group>
  );
}
