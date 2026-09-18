import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AdditiveBlending, Color, type Group, type MeshBasicMaterial, type Sprite, type SpriteMaterial } from 'three';
import { useT } from '../../../i18n/useT';
import { scrollToProgress } from '../../lib/scrollTo';
import { COLORS } from '../../theme';
import { getHaloTexture } from '../../lib/haloTexture';
import type { BioFragment } from '../../types';
import { chapterProgress, type ChapterState } from './chapters';
import type { Landscape } from './landscape';

const DIM = new Color(COLORS.ink).multiplyScalar(0.9);
// Por encima de 1 para que el bloom recoja el nodo del capítulo activo.
const LIT = new Color(COLORS.ink).multiplyScalar(3.2);
/** El nodo flota un poco sobre el fondo de su pozo. */
const LIFT = 0.18;

interface NodeProps {
  fragment: BioFragment;
  index: number;
  count: number;
  landscape: Landscape;
  chapter: ChapterState;
}

/** Un fragmento de bio: se monta en el fondo de su pozo y sube y baja con el paisaje. */
function BioNode({ fragment, index, count, landscape, chapter }: NodeProps) {
  const { pick } = useT();
  const [hovered, setHovered] = useState(false);
  const root = useRef<Group>(null);
  const core = useRef<Group>(null);
  const coreMaterial = useRef<MeshBasicMaterial>(null);
  const halo = useRef<Sprite>(null);
  const haloMaterial = useRef<SpriteMaterial>(null);
  const texture = useMemo(getHaloTexture, []);
  const [x, z] = fragment.gridPos;

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    root.current.position.set(x, landscape.height(x, z) + LIFT, z);
    // Aparecen con el paisaje y se hunden en el mar al calmarse.
    const { uOpacity, uReveal, uCalm } = landscape.uniforms;
    const visible = uOpacity.value * uReveal.value * (1 - uCalm.value);
    root.current.visible = visible > 0.01;

    const focus = chapter.focus[index] ?? 0;
    const target = (hovered ? 1.6 : 1) * (1 + 0.35 * focus) * Math.max(visible, 0.01);
    if (core.current) core.current.scale.setScalar(core.current.scale.x + (target - core.current.scale.x) * Math.min(1, delta * 10));
    if (coreMaterial.current) {
      coreMaterial.current.color.lerpColors(DIM, LIT, focus);
      coreMaterial.current.opacity = visible;
    }
    const pulse = 1 + 0.18 * Math.sin(clock.elapsedTime * 1.6 + index * 1.3);
    halo.current?.scale.setScalar((1 + focus) * pulse * target);
    if (haloMaterial.current) haloMaterial.current.opacity = (0.25 + 0.45 * focus) * visible;
  });

  return (
    <group ref={root}>
      <group ref={core}>
        <mesh>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshBasicMaterial ref={coreMaterial} color={DIM} transparent toneMapped={false} />
        </mesh>
      </group>
      <sprite ref={halo}>
        <spriteMaterial ref={haloMaterial} map={texture} color={COLORS.ink} transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* Zona de clic más grande que el nodo visible; lleva a su capítulo. */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          scrollToProgress(chapterProgress(index, count), 1);
        }}
      >
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered && (
        <Html center position={[0, 0.6, 0]} zIndexRange={[15, 10]} style={{ pointerEvents: 'none' }}>
          <span className="block whitespace-nowrap rounded-full border border-ink/25 bg-void/80 px-3 py-1 text-xs tracking-wide text-ink backdrop-blur-sm">
            {pick(fragment.title)}
          </span>
        </Html>
      )}
    </group>
  );
}

export function BioNodes({ bio, landscape, chapter }: { bio: BioFragment[]; landscape: Landscape; chapter: ChapterState }) {
  return (
    <group>
      {bio.map((b, i) => (
        <BioNode key={b.id} fragment={b} index={i} count={bio.length} landscape={landscape} chapter={chapter} />
      ))}
    </group>
  );
}
