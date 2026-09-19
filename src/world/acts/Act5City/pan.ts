import { SLOTS } from './layout';

/** Hasta dónde puede llevar el usuario la mirada: el borde de los distritos (±24), no el vacío. */
const REACH = 24;

/**
 * Desplazamiento en XZ (unidades de la placa) que el usuario arrastra en el Acto 5, sobre la toma
 * del primer proyecto. Lo escribe el arrastre (index.tsx) y lo lee CameraRig ponderado por
 * `panWeightAt`: se muta, no provoca renders.
 */
export const cityPan = { x: 0, z: 0 };

/** Suma un desplazamiento sin dejar que la mirada salga de los distritos. */
export function panBy(dx: number, dz: number) {
  const [x0, z0] = SLOTS[0];
  cityPan.x = Math.min(Math.max(cityPan.x + dx, -REACH - x0), REACH - x0);
  cityPan.z = Math.min(Math.max(cityPan.z + dz, -REACH - z0), REACH - z0);
}

export function resetPan() {
  cityPan.x = 0;
  cityPan.z = 0;
}
