import { Color, Vector2 } from 'three';
import { COLORS } from '../../theme';
import { CITY_SLOTS } from './layout';

/**
 * Estado del Acto 5 en el frame actual. Lo escribe `index.tsx` una vez por frame; los materiales lo
 * leen como uniforms compartidos (se muta, no provoca renders).
 */
export interface CityFrame {
  /** Segundos de animación (más lentos con reduced motion). */
  time: number;
  /** Progreso local del acto (0..1). */
  local: number;
  /** Buzón: 0 lejos … 1 frente a él. */
  mailbox: number;
  /** Uniforms comunes a todos los materiales del acto (mismas referencias en todos). */
  uniforms: {
    uTime: { value: number };
    /** Alcance del encendido (0..1 de `uBootRadius`). */
    uBoot: { value: number };
    uBootOrigin: { value: Vector2 };
    uBootRadius: { value: number };
    /** Altura extra de cada proyecto (hover / foco). */
    uLift: { value: Float32Array };
    /** Brillo de cada proyecto y de sus calles (0 normal … 1 foco). */
    uGlow: { value: Float32Array };
    /** Niebla propia (profundidad de vista cercana, lejana): funde los bordes de la placa al vacío. */
    uFog: { value: Vector2 };
    uFogColor: { value: Color };
    /** Intensidad de los LEDs (late despacio). */
    uLed: { value: number };
  };
}

export function createCityFrame(): CityFrame {
  return {
    time: 0,
    local: 0,
    mailbox: 0,
    uniforms: {
      uTime: { value: 0 },
      uBoot: { value: 0 },
      uBootOrigin: { value: new Vector2() },
      uBootRadius: { value: 1 },
      uLift: { value: new Float32Array(CITY_SLOTS) },
      uGlow: { value: new Float32Array(CITY_SLOTS) },
      uFog: { value: new Vector2(1e4, 2e4) },
      uFogColor: { value: new Color(COLORS.void) },
      uLed: { value: 1.5 },
    },
  };
}
