let ctx: AudioContext | null = null;

/**
 * Único AudioContext del sitio, compartido por la música y las teclas del piano.
 * Llamar solo dentro de un gesto del usuario (o después): los navegadores no dejan sonar antes.
 */
export function audioContext(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state !== 'running') void ctx.resume();
  return ctx;
}
