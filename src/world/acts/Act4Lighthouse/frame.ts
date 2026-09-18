/**
 * Estado del Acto 4 en el frame actual. Lo escribe `index.tsx` una vez por frame y lo leen los
 * hijos en su propio `useFrame` (se muta, no provoca renders). Mismo patrón que Act3Pier/frame.ts.
 */
export interface LighthouseFrame {
  /** Segundos de animación (más lentos con reduced motion). */
  time: number;
  /** Progreso local del acto (0..1), acotado. */
  local: number;
  /** Álbum activo (0..1): la cámara está quieta frente al atril. */
  album: number;
  /** Teclas tocables (0..1). */
  keys: number;
}

export function createLighthouseFrame(): LighthouseFrame {
  return { time: 0, local: 0, album: 0, keys: 0 };
}
