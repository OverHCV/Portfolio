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
    gridPos: z.tuple([z.number(), z.number(), z.number()]),
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

const skills = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/skills' }),
  schema: z.object({
    label: z.string(),
    family: z.enum(['language', 'framework', 'infra', 'data', 'tool']),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    order: z.number(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: z.object({
    title: l10n,
    summary: l10n,
    description: l10n,
    image: z.string().optional(),
    stack: z.array(z.string()),
    links: z.object({
      repo: z.string().url().optional(),
      demo: z.string().url().optional(),
    }),
    building: z.object({
      plot: z.tuple([z.number(), z.number()]),
      height: z.number(),
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
