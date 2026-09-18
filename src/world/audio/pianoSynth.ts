import { useWorld } from '../store';
import { audioContext } from './context';

/**
 * Teclas del piano del Acto 4 sin samples: cada nota es una suma de parciales senoidales con una
 * leve inarmonicidad (como una cuerda rígida) y decaimiento exponencial, más corto en los agudos y
 * en los parciales altos. Samples reales quedan para después (ARCHITECTURE.md §9).
 */
const PARTIALS = [1, 0.55, 0.28, 0.16, 0.09, 0.05];
/** Inarmonicidad de la cuerda: f_n = n·f·√(1 + B·n²). */
const B = 0.0004;
const MAX_VOICES = 24;

let bus: GainNode | null = null;
const voices: { stop: (at: number) => void; end: number }[] = [];

function output(ctx: AudioContext): GainNode {
  if (bus) return bus;
  bus = ctx.createGain();
  bus.gain.value = 0.22;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  bus.connect(comp).connect(ctx.destination);
  return bus;
}

/** Toca la nota MIDI `midi` si el sonido está activado; si no, no hace nada. */
export function playNote(midi: number, velocity = 0.8) {
  const { audio } = useWorld.getState();
  if (!audio.unlocked || audio.muted) return;
  const ctx = audioContext();
  const now = ctx.currentTime;
  const f = 440 * 2 ** ((midi - 69) / 12);
  // Graves largos, agudos cortos (s).
  const sustain = Math.min(6, Math.max(0.6, 3.2 * Math.sqrt(261.6 / f)));

  const voice = ctx.createGain();
  voice.gain.value = velocity;
  voice.connect(output(ctx));
  const oscillators: OscillatorNode[] = [];
  PARTIALS.forEach((amp, i) => {
    const n = i + 1;
    const freq = n * f * Math.sqrt(1 + B * n * n);
    if (freq > ctx.sampleRate / 2.2) return;
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(amp, now + 0.004);
    env.gain.setTargetAtTime(0, now + 0.004, sustain / (n ** 0.7) / 3);
    osc.connect(env).connect(voice);
    osc.start(now);
    osc.stop(now + sustain * 1.5);
    oscillators.push(osc);
  });
  oscillators[0]?.addEventListener('ended', () => voice.disconnect());

  // Polifonía acotada: un glissando largo no acumula osciladores sin fin.
  voices.push({
    end: now + sustain * 1.5,
    stop: (at) => {
      voice.gain.setTargetAtTime(0, at, 0.03);
      oscillators.forEach((o) => o.stop(at + 0.2));
    },
  });
  while (voices.length && voices[0].end < now) voices.shift();
  if (voices.length > MAX_VOICES) voices.shift()!.stop(now);
}
