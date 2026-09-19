/**
 * Rectángulo en pantalla (px CSS, relativo al canvas) del chip de la tarjeta del Acto 5. Lo escribe
 * `index.tsx` cada frame y lo lee la burbuja del overlay en su propio rAF: se muta, no provoca renders.
 */
export const cityAnchor = {
  /** Índice del proyecto de la tarjeta (−1 sin tarjeta). */
  project: -1,
  /** El puntero está sobre la burbuja: la tarjeta se queda en su chip aunque deje el hover. */
  held: false,
  visible: false,
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
};
