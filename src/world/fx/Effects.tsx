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

const center = new Vector2();
const projected = new Vector3();
const edge = new Vector3();
const right = new Vector3();

/** Lente del agujero negro: sigue su posición en pantalla y crece al acercarse (transición `lens`). */
function useLensUniforms(lens: GravitationalLensEffect) {
  useFrame(({ camera, size }) => {
    const { activeAct, localProgress } = useWorld.getState();
    const anchor = ACT_ANCHORS[1];
    const distance = camera.position.distanceTo(anchor);

    projected.copy(anchor).project(camera);
    const inFront = projected.z < 1;
    if (activeAct > 2 || !inFront || distance < HORIZON_RADIUS * 1.15) {
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

export function Effects() {
  const quality = useWorld((s) => s.quality);
  const settings = QUALITY[quality];
  const camera = useThree((s) => s.camera);
  const lens = useMemo(() => new GravitationalLensEffect(), []);
  // Pass propio: un efecto que deforma el UV no puede fusionarse con el bloom.
  const lensPass = useMemo(() => new EffectPass(camera, lens), [camera, lens]);
  useLensUniforms(lens);

  return (
    <EffectComposer multisampling={settings.fullFx ? 4 : 0}>
      <>{settings.fullFx && <primitive object={lensPass} dispose={null} />}</>
      <>{settings.bloom && <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />}</>
      <>{settings.fullFx && <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.35} />}</>
      <>{settings.fullFx && <Vignette offset={0.25} darkness={0.75} />}</>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
