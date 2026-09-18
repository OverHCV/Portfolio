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

export type SkillFamily = 'language' | 'framework' | 'infra' | 'data' | 'tool';

export interface Skill {
  id: string;
  label: string;
  family: SkillFamily;
  level?: 1 | 2 | 3;
  order: number;
}

export interface Project {
  id: string;
  title: L10n;
  summary: L10n;
  description: L10n;
  image?: string;
  stack: string[];
  links: { repo?: string; demo?: string };
  building: { plot: [number, number]; height: number; connectsTo: string[] };
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
  skills: Skill[];
  projects: Project[];
  posts: Post[];
}
