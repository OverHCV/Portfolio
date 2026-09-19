import { MathUtils, Vector2 } from 'three';
import type { ActId } from '../acts.config';

/** Actos con cielo abierto donde las estrellas siguen al mouse (galaxia y muelle). */
const PARALLAX_ACTS: readonly ActId[] = [1, 3];

/**
 * Puntero amortiguado (−1..1) que mueve el cielo: 0 fuera de PARALLAX_ACTS y con reduced motion,
 * así entra y sale suave al cambiar de acto. Lo actualiza Starfield y lo lee también el cielo en
 * shader del modo HD (Acto 1), para que ambos cielos se muevan igual.
 */
export const starParallax = new Vector2();

export function updateStarParallax(pointer: Vector2, activeAct: ActId, reducedMotion: boolean, delta: number) {
  const on = !reducedMotion && PARALLAX_ACTS.includes(activeAct) ? 1 : 0;
  starParallax.x = MathUtils.damp(starParallax.x, pointer.x * on, 2.5, delta);
  starParallax.y = MathUtils.damp(starParallax.y, pointer.y * on, 2.5, delta);
}
