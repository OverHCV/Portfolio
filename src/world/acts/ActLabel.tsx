import { Text } from '@react-three/drei';
import type { Vector3 } from 'three';
import { useT } from '../../i18n/useT';
import type { ActDef } from '../acts.config';

/** Rótulo provisional de M0: nombre del acto (traducido) flotando sobre su ancla. */
export function ActLabel({ actKey, anchor }: { actKey: ActDef['key']; anchor: Vector3 }) {
  const { t } = useT();
  return (
    <group position={[anchor.x, anchor.y + 3.2, anchor.z]}>
      <Text fontSize={0.9} color="#e8e6e3" anchorX="center" anchorY="bottom">
        {t(`acts.${actKey}`)}
      </Text>
      <Text position={[0, -0.25, 0]} fontSize={0.32} color="#8a8f98" anchorX="center" anchorY="top">
        {t('placeholder.building')}
      </Text>
    </group>
  );
}
