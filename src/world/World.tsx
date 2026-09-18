import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACTS, SCROLL_LENGTH_VH } from './acts.config';
import { ACT_COMPONENTS } from './acts';
import { CameraRig } from './camera/CameraRig';
import { ScrollDriver } from './scroll/ScrollDriver';
import { Effects } from './fx/Effects';
import { QualityProbe } from './lib/QualityProbe';
import { QUALITY } from './lib/quality';
import { WorldErrorBoundary } from './lib/WorldErrorBoundary';
import { HeroOverlay } from './overlay/HeroOverlay';
import { Navbar } from './overlay/Navbar';
import { Panel } from './overlay/Panel';
import { TransitionVeil } from './overlay/TransitionVeil';
import { useWorld } from './store';
import { COLORS } from './theme';
import type { WorldContent } from './types';

/** Raíz de la isla: pista de scroll + canvas fijo + overlay DOM. */
export default function World({ content }: { content: WorldContent }) {
  return (
    <WorldErrorBoundary>
      <WorldScene content={content} />
    </WorldErrorBoundary>
  );
}

function WorldScene({ content }: { content: WorldContent }) {
  const track = useRef<HTMLDivElement>(null);
  const activeAct = useWorld((s) => s.activeAct);
  const quality = useWorld((s) => s.quality);

  // Sin WebGL (lo detecta el script inline de Base.astro) queda solo el HTML semántico.
  if (!document.documentElement.classList.contains('webgl')) return null;

  const mounted = ACTS.filter((a) => Math.abs(a.id - activeAct) <= 1);

  return (
    <>
      <div ref={track} aria-hidden style={{ height: `${SCROLL_LENGTH_VH}vh` }} />
      <ScrollDriver track={track} />

      <div className="fixed inset-0">
        {/* `flat`: el tone mapping lo hace el postprocesado (fx/Effects.tsx). */}
        <Canvas flat dpr={QUALITY[quality].dpr} camera={{ fov: 55, near: 0.1, far: 800 }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
          <color attach="background" args={[COLORS.void]} />
          <fog attach="fog" args={[COLORS.void, 30, 140]} />
          <CameraRig />
          {mounted.map((a) => {
            const Act = ACT_COMPONENTS[a.id];
            return (
              <Suspense key={a.id} fallback={null}>
                <Act content={content} />
              </Suspense>
            );
          })}
          <Effects />
          <Suspense fallback={null}>
            <QualityProbe />
          </Suspense>
        </Canvas>
      </div>

      <TransitionVeil />
      <HeroOverlay site={content.site} />
      <Navbar />
      <Panel content={content} />
    </>
  );
}
