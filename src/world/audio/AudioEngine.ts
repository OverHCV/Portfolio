import { useEffect } from 'react';
import { useWorld, type WorldState } from '../store';
import { musicAt, pierLocal } from '../acts/Act3Pier/timeline';
import { audioContext } from './context';

const NOCTURNE_SRC = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}audio/nocturne-op9-1.mp3`;
/** Constante de tiempo del fundido de volumen (s). */
const FADE = 0.4;
/** Pausa tras bajar a 0, para no seguir descargando ni decodificando en silencio. */
const PAUSE_AFTER_MS = 2000;

/**
 * Una pista en streaming (`<audio>`, no entra en el bundle) con el volumen en un GainNode:
 * `audio.volume` no funciona en iOS. El AudioContext nace en el primer gesto (botón de sonido).
 */
class Track {
  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private target = 0;
  private pauseTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly src: string) {}

  /** Llamar dentro del gesto del usuario: crea el grafo y "desbloquea" el elemento en Safari. */
  unlock() {
    // Ya creado: solo reanuda el contexto si el navegador lo suspendió.
    if (this.ctx) {
      audioContext();
      return;
    }
    this.ctx = audioContext();
    this.el = new Audio(this.src);
    this.el.loop = true;
    this.el.preload = 'none';
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;
    this.ctx.createMediaElementSource(this.el).connect(this.gain).connect(this.ctx.destination);
    const el = this.el;
    void el.play().then(
      () => {
        if (this.target === 0) el.pause();
      },
      () => {},
    );
  }

  setVolume(volume: number) {
    if (!this.ctx || !this.gain || !this.el) return;
    if (Math.abs(volume - this.target) < 0.002) return;
    this.target = volume;
    this.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, FADE);
    clearTimeout(this.pauseTimer);
    if (volume > 0) {
      if (this.el.paused) void this.el.play().catch(() => {});
    } else {
      this.pauseTimer = setTimeout(() => this.el?.pause(), PAUSE_AFTER_MS);
    }
  }
}

const nocturne = new Track(NOCTURNE_SRC);

/**
 * Chopin, Nocturno Op. 9 No. 1 en el Acto 3 (ARCHITECTURE.md §9): el volumen depende solo del
 * progreso (timeline.ts, `musicAt`), así que volver con el scroll también lo apaga.
 */
export function useNocturne() {
  useEffect(() => {
    const update = ({ audio, progress }: WorldState) => {
      if (!audio.unlocked) return;
      if (!audio.muted) nocturne.unlock();
      nocturne.setVolume(audio.muted ? 0 : musicAt(pierLocal(progress)));
    };
    update(useWorld.getState());
    return useWorld.subscribe(update);
  }, []);
}
