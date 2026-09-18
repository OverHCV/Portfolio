import { CanvasTexture } from 'three';

let haloTexture: CanvasTexture | null = null;

/** Degradado radial blanco para halos en sprite (se crea una vez y se comparte). */
export function getHaloTexture(): CanvasTexture {
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
