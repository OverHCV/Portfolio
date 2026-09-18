import { create } from 'zustand';
import { actAt, type ActId } from './acts.config';
import type { ActiveLang } from '../i18n/langs';
import { initialLang, persistLang } from '../i18n/detect';

export type Focus =
  | null
  | { kind: 'bio'; id: string }
  | { kind: 'milestone'; id: string }
  | { kind: 'score' }
  | { kind: 'project'; id: string }
  | { kind: 'contact' };

export type Quality = 'low' | 'mid' | 'high';

export interface WorldState {
  /** 0..1 a lo largo de todo el recorrido. Leer en useFrame con getState(), no suscribirse. */
  progress: number;
  activeAct: ActId;
  /** 0..1 dentro del acto activo. */
  localProgress: number;
  lang: ActiveLang;
  focus: Focus;
  audio: { unlocked: boolean; muted: boolean };
  quality: Quality;
  /** Agujero negro físico (ray marching). Apagado por defecto; se guarda entre visitas. */
  hd: boolean;
  setProgress(p: number): void;
  setFocus(f: Focus): void;
  setLang(l: ActiveLang): void;
  setQuality(q: Quality): void;
  toggleMute(): void;
  toggleHd(): void;
  unlockAudio(): void;
}

const HD_STORAGE_KEY = 'hd';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Almacenamiento bloqueado: la preferencia vale solo para esta visita.
  }
}

export const useWorld = create<WorldState>()((set, get) => ({
  progress: 0,
  activeAct: 1,
  localProgress: 0,
  // La isla es client:only, así que el store siempre se crea en el navegador.
  lang: initialLang(),
  focus: null,
  audio: { unlocked: false, muted: true },
  quality: 'high',
  hd: readFlag(HD_STORAGE_KEY),
  setProgress(p) {
    const { act, local } = actAt(p);
    // activeAct solo cambia al cruzar un límite, así los suscriptores reactivos no re-renderizan por frame.
    set({ progress: p, localProgress: local, activeAct: act.id });
  },
  setFocus(focus) {
    set({ focus });
  },
  /** Elección manual del usuario: se guarda y actualiza <html lang>. */
  setLang(lang) {
    persistLang(lang);
    set({ lang });
  },
  setQuality(quality) {
    set({ quality });
  },
  toggleMute() {
    const { audio } = get();
    set({ audio: { unlocked: true, muted: !audio.muted } });
  },
  toggleHd() {
    const hd = !get().hd;
    writeFlag(HD_STORAGE_KEY, hd);
    set({ hd });
  },
  unlockAudio() {
    set((s) => ({ audio: { ...s.audio, unlocked: true } }));
  },
}));
