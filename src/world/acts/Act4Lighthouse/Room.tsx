import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Object3D,
  type Points,
  type PointsMaterial,
  Quaternion,
  type SpotLight,
  Vector3,
} from 'three';
import { COLORS } from '../../theme';
import { createBeamMaterial } from '../../lib/beamMaterial';
import { getHaloTexture } from '../../lib/haloTexture';
import { BENCH, ROOM, SPOT } from './layout';
import type { LighthouseFrame } from './frame';

const WARM = new Color(COLORS.glow);
const MOON = new Color('#6f86b8');
/** Luz de luna en las ventanas: tenue, apenas sobre el umbral del bloom. */
const MOON_WINDOW = MOON.clone().multiplyScalar(0.45);
const DUST = 160;

const spotPosition = new Vector3(...SPOT.position);
const spotTarget = new Vector3(...SPOT.target);
const beamAxis = spotTarget.clone().sub(spotPosition);
const BEAM_LENGTH = beamAxis.length() + 0.9;
/** El cono va del foco al piano: su vértice (+y de ConeGeometry, uv.y = 1) queda en el foco. */
const BEAM_DIR = beamAxis.clone().normalize();
const BEAM_POSE = {
  position: spotPosition.clone().addScaledVector(BEAM_DIR, BEAM_LENGTH / 2),
  quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), BEAM_DIR.clone().negate()),
};

/** Ventanas estrechas en la pared, frente a la cámara al entrar: el único rastro de la noche. */
const WINDOWS = [-0.55, 0.55].map((a) => Math.PI + a);

/**
 * Interior del faro: cuarto circular casi vacío, un solo foco cálido sobre el piano (con su cono de
 * luz y polvo flotando), dos ventanas de luna y el banco del pianista.
 */
export function Room({ frame }: { frame: LighthouseFrame }) {
  const spot = useRef<SpotLight>(null);
  const target = useRef<Object3D>(null);
  const dust = useRef<Points>(null);
  const dustMaterial = useRef<PointsMaterial>(null);

  const beam = useMemo(() => createBeamMaterial(WARM, 1.6), []);
  useEffect(() => () => beam.dispose(), [beam]);


  const dustGeometry = useMemo(() => {
    const g = new BufferGeometry();
    const p = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      // Dentro del cono, más denso cerca del piano.
      const along = Math.sqrt(Math.random());
      const r = along * 1.4 * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      p[i * 3] = spotPosition.x + beamAxis.x * along + Math.cos(a) * r;
      p[i * 3 + 1] = spotPosition.y + beamAxis.y * along;
      p[i * 3 + 2] = spotPosition.z + beamAxis.z * along + Math.sin(a) * r;
    }
    g.setAttribute('position', new BufferAttribute(p, 3));
    return g;
  }, []);
  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);

  useEffect(() => {
    if (spot.current && target.current) spot.current.target = target.current;
  }, []);

  useFrame(() => {
    beam.uniforms.uIntensity.value = 0.05;
    if (dust.current) {
      dust.current.position.y = Math.sin(frame.time * 0.11) * 0.08;
      dust.current.rotation.y = frame.time * 0.01;
    }
    if (dustMaterial.current) dustMaterial.current.opacity = 0.35 + 0.15 * Math.sin(frame.time * 0.7);
  });

  return (
    <group>
      {/* Pared, suelo y techo. */}
      <mesh position={[0, ROOM.height / 2, 0]}>
        <cylinderGeometry args={[ROOM.radius, ROOM.radius, ROOM.height, 64, 1, true]} />
        <meshStandardMaterial color="#26221d" roughness={1} side={BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ROOM.radius, 64]} />
        <meshStandardMaterial color="#1b1612" roughness={0.75} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.height, 0]}>
        <circleGeometry args={[ROOM.radius, 48]} />
        <meshBasicMaterial color="#050506" />
      </mesh>

      {/* Sombra de contacto del piano (barata: un degradado oscuro en el suelo). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -0.05]} scale={[1.9, 2.5, 1]}>
        <planeGeometry args={[1.4, 1.4]} />
        <meshBasicMaterial map={getHaloTexture()} color="#000000" transparent opacity={0.85} depthWrite={false} />
      </mesh>

      {/* Ventanas de luna. */}
      {WINDOWS.map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0, 3.4, ROOM.radius - 0.02]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.28, 1.3]} />
            <meshBasicMaterial color={MOON_WINDOW} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Foco único y su cono visible. */}
      <spotLight
        ref={spot}
        position={SPOT.position}
        angle={0.36}
        penumbra={0.75}
        intensity={70}
        distance={14}
        decay={2}
        color={WARM}
      />
      <object3D ref={target} position={SPOT.target} />
      <mesh position={BEAM_POSE.position} quaternion={BEAM_POSE.quaternion} material={beam}>
        <coneGeometry args={[1.55, BEAM_LENGTH, 40, 1, true]} />
      </mesh>
      <points ref={dust} geometry={dustGeometry}>
        <pointsMaterial ref={dustMaterial} map={getHaloTexture()} color={WARM} size={0.018} transparent opacity={0.45} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </points>
      <hemisphereLight args={[MOON, '#0b0908', 0.35]} />

      {/* Banco del pianista. */}
      <group position={[0, 0, BENCH.z]}>
        <mesh position={[0, BENCH.height - 0.035, 0]}>
          <boxGeometry args={[BENCH.width, 0.07, BENCH.depth]} />
          <meshStandardMaterial color="#0d0d0f" roughness={0.35} />
        </mesh>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * (BENCH.width / 2 - 0.05), (BENCH.height - 0.07) / 2, sz * (BENCH.depth / 2 - 0.05)]}>
              <boxGeometry args={[0.045, BENCH.height - 0.07, 0.045]} />
              <meshStandardMaterial color="#0d0d0f" roughness={0.4} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}
