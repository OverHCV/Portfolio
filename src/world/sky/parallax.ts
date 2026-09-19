import { MathUtils, Vector2 } from 'three';
import type { ActId } from '../acts.config';

/** Intensidad del paralaje por acto: galaxia completa, muelle a un tercio; el resto sin paralaje. */
const PARALLAX_ACTS: Partial<Record<ActId, number>> = { 1: 1, 3: 1 / 3 };

/**
 * Con reduced motion el cielo se sigue moviendo (solo responde al puntero del propio usuario,
 * nunca se anima solo), pero a la mitad y más lento.
 */
const REDUCED = { scale: 0.5, lambda: 1.5 };

/**
 * Puntero amortiguado (−1..1) que mueve el cielo: 0 fuera de PARALLAX_ACTS, así entra y sale
 * suave al cambiar de acto. Lo actualiza Starfield y lo lee también el cielo en
 * shader del modo HD (Acto 1), para que ambos cielos se muevan igual.
 */
export const starParallax = new Vector2();

export function updateStarParallax(pointer: Vector2, activeAct: ActId, reducedMotion: boolean, delta: number) {
  const on = (PARALLAX_ACTS[activeAct] ?? 0) * (reducedMotion ? REDUCED.scale : 1);
  const lambda = reducedMotion ? REDUCED.lambda : 5.0;
  starParallax.x = MathUtils.damp(starParallax.x, pointer.x * on, lambda, delta);
  starParallax.y = MathUtils.damp(starParallax.y, pointer.y * on, lambda, delta);
}
