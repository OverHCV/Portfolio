import { Color, Vector3 } from 'three';
import { CITY_PALETTES, type CityPalette, type CityPaletteName } from '../../theme';

type ColorKey = Exclude<keyof CityPalette, 'shade'>;

/**
 * Papel de cada pieza 3D: índice en `uRoleColor` (atributo `aRole` de las instancias).
 * El orden es el de este arreglo; añadir un papel = añadir su token a la paleta.
 */
export const ROLE_KEYS = [
  'chip',
  'lid',
  'metal',
  'ceramic',
  'resistor',
  'can',
  'canTop',
  'plastic',
  'substrate',
  'led',
  'post',
  'postDark',
  'edge',
  'pad',
  'silk',
] as const satisfies readonly ColorKey[];

export const ROLE = Object.fromEntries(ROLE_KEYS.map((key, i) => [key, i])) as { [K in (typeof ROLE_KEYS)[number]]: number };

/**
 * Paleta viva de la placa: un `Color` por token, compartido por referencia con todos los
 * materiales del acto. Mutarlo cambia la escena en el siguiente frame, sin recrear materiales.
 */
export const cityPalette = {
  colors: Object.fromEntries(
    (Object.keys(CITY_PALETTES.gold) as (keyof CityPalette)[])
      .filter((key): key is ColorKey => key !== 'shade')
      .map((key) => [key, new Color()]),
  ) as Record<ColorKey, Color>,
  /** Tono de las caras: arriba, lado +x, lado +z. */
  shade: new Vector3(),
};

/** Colores por papel, en el orden de ROLE_KEYS (mismas instancias de `Color`). */
export const roleColors: Color[] = ROLE_KEYS.map((key) => cityPalette.colors[key]);

/** Cambia la paleta: una con nombre o solo los tokens indicados (el resto se queda). */
export function applyCityPalette(palette: CityPaletteName | Partial<CityPalette>) {
  const next: Partial<CityPalette> = typeof palette === 'string' ? CITY_PALETTES[palette] : palette;
  for (const [key, value] of Object.entries(next)) {
    if (key === 'shade') cityPalette.shade.fromArray(value as CityPalette['shade']);
    else cityPalette.colors[key as ColorKey]?.set(value as string);
  }
}

applyCityPalette('gold');
