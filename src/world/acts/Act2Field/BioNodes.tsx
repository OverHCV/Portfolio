import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, Color, type Group, type Sprite } from 'three';
import { useWorld } from '../../store';
import { useT } from '../../../i18n/useT';
import { COLORS } from '../../theme';
import type { BioFragment } from '../../types';

const CORE = new Color(COLORS.glow).multiplyScalar(3);

let haloTexture: CanvasTexture | null = null;
/** Degradado radial para el halo (se crea una vez). */
function getHaloTexture(): CanvasTexture {
  if (haloTexture) return haloTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  haloTexture = new CanvasTexture(canvas);
  return haloTexture;
}

function BioNode({ fragment, index }: { fragment: BioFragment; index: number }) {
  const { pick } = useT();
  const [hovered, setHovered] = useState(false);
  const halo = useRef<Sprite>(null);
  const core = useRef<Group>(null);
  const texture = useMemo(getHaloTexture, []);

  useFrame(({ clock }, delta) => {
    const pulse = 1 + 0.18 * Math.sin(clock.elapsedTime * 1.6 + index * 1.3);
    const target = hovered ? 1.6 : 1;
    if (halo.current) halo.current.scale.setScalar(1.3 * pulse * target);
    if (core.current) {
      const s = core.current.scale.x + (target - core.current.scale.x) * Math.min(1, delta * 10);
      core.current.scale.setScalar(s);
    }
  });

  return (
    <group position={fragment.gridPos}>
      <group ref={core}>
        <mesh>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshBasicMaterial color={CORE} toneMapped={false} />
        </mesh>
      </group>
      <sprite ref={halo}>
        <spriteMaterial map={texture} color={COLORS.glow} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* Zona de clic más grande que el nodo visible. */}
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
          document.body.style.cursor = '';
          useWorld.getState().setFocus({ kind: 'bio', id: fragment.id });
        }}
      >
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered && (
        <Html center position={[0, 0.55, 0]} zIndexRange={[15, 10]} style={{ pointerEvents: 'none' }}>
          <span className="block whitespace-nowrap rounded-full border border-glow/30 bg-void/80 px-3 py-1 text-xs tracking-wide text-ink backdrop-blur-sm">
            {pick(fragment.title)}
          </span>
        </Html>
      )}
    </group>
  );
}

export function BioNodes({ bio }: { bio: BioFragment[] }) {
  return (
    <group>
      {bio.map((b, i) => (
        <BioNode key={b.id} fragment={b} index={i} />
      ))}
    </group>
  );
}
