import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Texto localizado: `ja` queda opcional hasta que se active el japonés.
const l10n = z.object({
  en: z.string(),
  es: z.string(),
  ja: z.string().optional(),
});

const bio = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/bio' }),
  schema: z.object({
    title: l10n,
    body: l10n,
    // Posición (x, z) del pozo sobre el paisaje del Acto 2.
    gridPos: z.tuple([z.number(), z.number()]),
    order: z.number(),
  }),
});

const milestones = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/milestones' }),
  schema: z.object({
    kind: z.enum(['job', 'internship', 'education', 'certification', 'award']),
    org: z.string(),
    title: l10n,
    start: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
    end: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM').optional(),
    summary: l10n,
    details: l10n.optional(),
    stack: z.array(z.string()).optional(),
    credentialUrl: z.string().url().optional(),
  }),
});

// Una hoja del álbum del Acto 4 por archivo (una familia del stack).
const skills = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/skills' }),
  schema: z.object({
    order: z.number(),
    /** Indicación de tempo de la hoja, como el encabezado de un movimiento (no se traduce). */
    tempo: z.string(),
    title: l10n,
    epigraph: l10n,
    items: z.array(
      z.object({
        label: z.union([z.string(), l10n]),
        /** Dominio, dibujado como dinámica: 1 = p, 2 = mf, 3 = f. */
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        note: l10n.optional(),
      }),
    ),
  }),
});

// Un edificio (chip) de la ciudad-circuito del Acto 5 por archivo; máximo 16 (ver index.astro).
const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: z.object({
    /** Orden en la placa (menor = primero en el recorrido); sin él, por año descendente. */
    order: z.number().optional(),
    title: l10n,
    role: l10n.optional(),
    summary: l10n,
    description: l10n,
    /** Capturas en public/ (p. ej. `/projects/<id>/01.webp`); rotan en la tarjeta y el panel. */
    images: z.array(z.string().startsWith('/')).optional(),
    stack: z.array(z.string()),
    links: z.object({
      repo: z.string().url().optional(),
      demo: z.string().url().optional(),
      extra: z.array(z.object({ label: z.union([z.string(), l10n]), url: z.string().url() })).optional(),
    }),
    building: z.object({
      /** Encapsulado del chip que lo dibuja. La posición en la placa es automática. */
      chip: z.enum(['qfp', 'bga', 'dip', 'can', 'module']),
      /** Altura relativa (≈ 0.5–1.5); por defecto 1. */
      height: z.number().optional(),
      /** Ids de proyectos con los que comparte calle (traza). */
      connectsTo: z.array(z.string()),
    }),
    year: z.number(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/posts' }),
  schema: z.object({
    title: l10n,
    date: z.string(),
    lang: z.enum(['en', 'es', 'ja']),
  }),
});

export const collections = { bio, milestones, skills, projects, posts };
