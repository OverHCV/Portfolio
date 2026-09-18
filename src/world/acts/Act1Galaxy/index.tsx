import { Billboard } from '@react-three/drei';
import { AdditiveBlending } from 'three';
import { ACT_ANCHORS } from '../../camera/path';
import type { ActProps } from '../types';
import { AccretionDisk } from './AccretionDisk';
import { Starfield } from './Starfield';
import { LensedHalo } from './LensedHalo';
import { HORIZON_RADIUS } from './constants';

export default function Act1Galaxy(_: ActProps) {
  return (
    <group>
      {/* Las estrellas rodean todo el inicio del recorrido: también se ven desde el Acto 2. */}
      <Starfield />
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
    </group>
  );
}
