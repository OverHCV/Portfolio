import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, EffectPass, ToneMappingMode } from 'postprocessing';
import { Vector2, Vector3 } from 'three';
import { useWorld } from '../store';
import { QUALITY } from '../lib/quality';
import { ACT_ANCHORS } from '../camera/path';
import { HORIZON_RADIUS } from '../acts/Act1Galaxy/constants';
import { smoothstep } from '../lib/motion';
import { GravitationalLensEffect } from './GravitationalLens';
import { FisheyeEffect } from './Fisheye';
import { useReducedMotion } from '../lib/motion';
import { fisheyeAt, pierLocal } from '../acts/Act3Pier/timeline';

const center = new Vector2();
const projected = new Vector3();
const edge = new Vector3();
const right = new Vector3();

/** Lente del agujero negro: sigue su posición en pantalla y crece al acercarse (transición `lens`). */
function useLensUniforms(lens: GravitationalLensEffect) {
  useFrame(({ camera, size }) => {
    const { activeAct, localProgress, hd } = useWorld.getState();
    const anchor = ACT_ANCHORS[1];
    const distance = camera.position.distanceTo(anchor);

    projected.copy(anchor).project(camera);
    const inFront = projected.z < 1;
    // En HD el propio shader curva la luz: el lente de pantalla sobra.
    if (hd || activeAct > 2 || !inFront || distance < HORIZON_RADIUS * 1.15) {
      lens.set(center.set(0.5, 0.5), 0, 0, 1);
      return;
    }

    const aspect = size.width / size.height;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    edge.copy(anchor).addScaledVector(right, HORIZON_RADIUS).project(camera);
    const radius = Math.hypot((edge.x - projected.x) * 0.5 * aspect, (edge.y - projected.y) * 0.5);

    const approach = activeAct === 1 ? smoothstep(0.55, 1, localProgress) : 0;
    lens.set(center.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5), radius, 0.45 + 0.5 * approach, aspect);
  });
}

/** Ojo de pez de la construcción del muelle (Acto 3); sin él con reduced motion. */
const FISHEYE_STRENGTH = 0.55;

function useFisheyeUniforms(fisheye: FisheyeEffect) {
  const reducedMotion = useReducedMotion();
  useFrame(({ size }) => {
    const { progress } = useWorld.getState();
    const strength = reducedMotion ? 0 : FISHEYE_STRENGTH * fisheyeAt(pierLocal(progress));
    fisheye.set(strength, size.width / size.height);
  });
}

export function Effects() {
  const quality = useWorld((s) => s.quality);
  const settings = QUALITY[quality];
  const camera = useThree((s) => s.camera);
  const lens = useMemo(() => new GravitationalLensEffect(), []);
  // Pass propio: un efecto que deforma el UV no puede fusionarse con el bloom.
  const lensPass = useMemo(() => new EffectPass(camera, lens), [camera, lens]);
  const fisheye = useMemo(() => new FisheyeEffect(), []);
  const fisheyePass = useMemo(() => new EffectPass(camera, fisheye), [camera, fisheye]);
  useLensUniforms(lens);
  useFisheyeUniforms(fisheye);

  return (
    <EffectComposer multisampling={settings.fullFx ? 4 : 0}>
      <>{settings.fullFx && <primitive object={lensPass} dispose={null} />}</>
      <>{settings.fullFx && <primitive object={fisheyePass} dispose={null} />}</>
      <>{settings.bloom && <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.15} intensity={0.7} radius={0.55} />}</>
      <>{settings.fullFx && <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.35} />}</>
      <>{settings.fullFx && <Vignette offset={0.25} darkness={0.75} />}</>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
