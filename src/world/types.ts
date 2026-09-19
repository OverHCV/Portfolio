import type { Lang } from '../i18n/langs';

export type L10n = { en: string; es: string; ja?: string };

export interface Site {
  name: string;
  role: L10n;
  tagline: L10n;
  email: string;
  socials: Partial<Record<'github' | 'linkedin' | 'dribbble' | 'twitter', string>>;
}

export interface BioFragment {
  id: string;
  title: L10n;
  body: L10n;
  /** Posición (x, z) de su pozo en el paisaje del Acto 2. */
  gridPos: [number, number];
  order: number;
}

export type MilestoneKind = 'job' | 'internship' | 'education' | 'certification' | 'award';

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  org: string;
  title: L10n;
  start: string;
  end?: string;
  summary: L10n;
  details?: L10n;
  stack?: string[];
  credentialUrl?: string;
}

/** Una tecnología en una hoja del álbum; el nombre se traduce solo si hace falta. */
export interface StackItem {
  label: string | L10n;
  /** Dominio, dibujado como dinámica musical: 1 = p, 2 = mf, 3 = f. */
  level: 1 | 2 | 3;
  note?: L10n;
}

/** Acto 4 — una hoja del álbum: una familia del stack. */
export interface StackSheet {
  id: string;
  order: number;
  /** Indicación de tempo (Allegro, Andante…), como el encabezado de un movimiento. */
  tempo: string;
  title: L10n;
  epigraph: L10n;
  items: StackItem[];
}

export type ChipKind = 'qfp' | 'bga' | 'dip' | 'can' | 'module';

/** Acto 5 — un chip de la placa. */
export interface Project {
  id: string;
  order?: number;
  title: L10n;
  role?: L10n;
  summary: L10n;
  description: L10n;
  images?: string[];
  stack: string[];
  links: { repo?: string; demo?: string; extra?: { label: string | L10n; url: string }[] };
  building: { chip: ChipKind; height?: number; connectsTo: string[] };
  year: number;
}

export interface Post {
  slug: string;
  title: L10n;
  date: string;
  lang: Lang;
}

/** Todo el contenido que Astro serializa como props de la isla. */
export interface WorldContent {
  site: Site;
  bio: BioFragment[];
  milestones: Milestone[];
  stack: StackSheet[];
  projects: Project[];
  posts: Post[];
}
