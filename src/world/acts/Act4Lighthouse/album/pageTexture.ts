import { CanvasTexture, SRGBColorSpace } from 'three';
import { pickL10n } from '../../../../i18n/translate';
import type { Lang } from '../../../../i18n/langs';
import type { StackSheet } from '../../../types';
import { roman } from '../../../lib/roman';
import { stackIcon } from './stackIcons';

/**
 * Páginas del álbum dibujadas en canvas: papel, pentagramas y tipografía del sitio (Fraunces +
 * Space Grotesk). Una página es una de tres clases:
 *   - portada interior (verso de la primera hoja): título, nombre e índice de movimientos
 *   - verso de un movimiento: número romano, tempo, título y epígrafe de la familia
 *   - recto de un movimiento: solo el listado, cada tecnología con su ícono (o una nota) y su dinámica
 */

/** Tamaño lógico de la página (px); proporción de PAGE en layout.ts. */
export const PAGE_PX = { width: 720, height: 1008 } as const;

const PAPER = '#efe6d3';
const INK = '#1f1b16';
const FADED = '#766c5f';
const RULE = 'rgba(31, 27, 22, 0.55)';
const ACCENT = '#8c3a1a';

const SERIF = 'Fraunces, Georgia, serif';
const SANS = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** Dinámica musical por nivel de dominio. */
const DYNAMICS = { 1: 'p', 2: 'mf', 3: 'f' } as const;

export type PageSpec =
  | { kind: 'cover'; title: string; name: string; subtitle: string; toc: { numeral: string; title: string; tempo: string }[]; hint: string }
  | { kind: 'verso'; numeral: string; tempo: string; title: string; epigraph: string; caption: string; folio: number }
  | {
      kind: 'recto';
      /**
       * Encabezado propio del recto: solo en el primer movimiento, cuya página izquierda es la
       * portada. En los demás el título y el epígrafe van en el verso de enfrente.
       */
      head?: { heading: string; title: string; epigraph: string };
      items: { label: string; note?: string; icon?: string; level: 1 | 2 | 3 }[];
      legend: string;
      folio: number;
    };

export interface PageStrings {
  coverTitle: string;
  coverSubtitle: string;
  hint: string;
  movement: string;
  /** "{n} instruments". */
  count: (n: number) => string;
  legend: string;
}

/**
 * Las páginas del libro en orden de lectura: [portada, recto 0, verso 1, recto 1, …, recto n-1].
 * La hoja móvil k lleva recto(k) al frente y verso(k+1) detrás (Album.tsx).
 */
export function buildPages(stack: StackSheet[], name: string, lang: Lang, s: PageStrings): { versos: PageSpec[]; rectos: PageSpec[] } {
  const title = (sheet: StackSheet) => pickL10n(sheet.title, lang);
  const cover: PageSpec = {
    kind: 'cover',
    title: s.coverTitle,
    name,
    subtitle: s.coverSubtitle,
    toc: stack.map((sheet, i) => ({ numeral: roman(i + 1), title: title(sheet), tempo: sheet.tempo })),
    hint: s.hint,
  };
  const rectos: PageSpec[] = stack.map((sheet, i) => ({
    kind: 'recto',
    head: i === 0 ? { heading: `${s.movement} ${roman(i + 1)} · ${sheet.tempo}`, title: title(sheet), epigraph: pickL10n(sheet.epigraph, lang) } : undefined,
    items: sheet.items.map((item) => ({
      label: typeof item.label === 'string' ? item.label : pickL10n(item.label, lang),
      note: item.note ? pickL10n(item.note, lang) : undefined,
      icon: item.icon,
      level: item.level,
    })),
    legend: s.legend,
    folio: i * 2 + 1,
  }));
  // versos[k] acompaña al recto k (k ≥ 1); versos[0] es la portada.
  const versos: PageSpec[] = stack.map((sheet, i) =>
    i === 0
      ? cover
      : {
          kind: 'verso',
          numeral: roman(i + 1),
          tempo: sheet.tempo,
          title: title(sheet),
          epigraph: pickL10n(sheet.epigraph, lang),
          caption: s.count(sheet.items.length),
          folio: i * 2,
        },
  );
  return { versos, rectos };
}

// ─── Dibujo ────────────────────────────────────────────────────────────────

/** Ruido determinista para el grano del papel (igual en cada redibujo). */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function paper(ctx: CanvasRenderingContext2D, seed: number) {
  const { width: w, height: h } = PAGE_PX;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  // Bordes un poco tostados.
  const edge = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
  edge.addColorStop(0, 'rgba(120, 90, 50, 0)');
  edge.addColorStop(1, 'rgba(120, 90, 50, 0.16)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  const rand = seeded(seed);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(90, 70, 40, ${0.03 + rand() * 0.05})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
}

function font(size: number, { family = SERIF, weight = 400, italic = false } = {}) {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
}

/** Ajusta el tamaño de letra hasta que `text` quepa en `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, min: number, opts?: Parameters<typeof font>[1]) {
  let s = size;
  ctx.font = font(s, opts);
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= 1;
    ctx.font = font(s, opts);
  }
  return s;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

/** Pentagrama de `width` px con la primera línea en `top`. */
function staff(ctx: CanvasRenderingContext2D, x: number, top: number, width: number, gap: number) {
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    ctx.moveTo(x, top + i * gap);
    ctx.lineTo(x + width, top + i * gap);
  }
  ctx.stroke();
}

/** Cabeza de nota con plica. `step` 0 = línea inferior, sube de a medio espacio. */
function note(ctx: CanvasRenderingContext2D, x: number, bottom: number, gap: number, step: number, hollow = false) {
  const y = bottom - (step * gap) / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.ellipse(0, 0, gap * 0.68, gap * 0.46, 0, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  if (hollow) ctx.stroke();
  else ctx.fill();
  ctx.restore();
  // Plica hacia arriba en la mitad baja, hacia abajo en la alta.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (step < 4) {
    ctx.moveTo(x + gap * 0.6, y - 1);
    ctx.lineTo(x + gap * 0.6, y - gap * 3.3);
  } else {
    ctx.moveTo(x - gap * 0.6, y + 1);
    ctx.lineTo(x - gap * 0.6, y + gap * 3.3);
  }
  ctx.stroke();
}

/** Ícono de una tecnología encajado (contain) en la celda de alto `size` centrada en (cx, cy). */
function icon(ctx: CanvasRenderingContext2D, key: string | undefined, cx: number, cy: number, size: number): boolean {
  const ic = stackIcon(key);
  if (!ic) return false;
  const [vx, vy, vw, vh] = ic.viewBox;
  // Celda más ancha que alta: los logotipos de solo texto (Oracle) no quedan diminutos.
  const s = Math.min((size * 2) / vw, size / vh);
  ctx.save();
  ctx.translate(cx - (vw * s) / 2, cy - (vh * s) / 2);
  ctx.scale(s, s);
  ctx.translate(-vx, -vy);
  if (ic.stroke) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = ic.stroke.width * 0.9;
    ctx.lineCap = ic.stroke.cap;
    ctx.lineJoin = ic.stroke.join;
    ctx.stroke(ic.path);
  } else {
    ctx.fillStyle = INK;
    ctx.fill(ic.path);
  }
  ctx.restore();
  return true;
}

function folio(ctx: CanvasRenderingContext2D, n: number) {
  ctx.fillStyle = FADED;
  ctx.font = font(20, { family: SANS });
  ctx.textAlign = 'center';
  ctx.fillText(String(n), PAGE_PX.width / 2, PAGE_PX.height - 44);
  ctx.textAlign = 'left';
}

function drawCover(ctx: CanvasRenderingContext2D, p: Extract<PageSpec, { kind: 'cover' }>) {
  const { width: w } = PAGE_PX;
  const x = 72;
  ctx.textAlign = 'center';
  ctx.fillStyle = FADED;
  ctx.font = font(18, { family: SANS, weight: 500 });
  ctx.fillText(p.subtitle.toUpperCase().split('').join(' '), w / 2, 130);
  ctx.fillStyle = INK;
  fitFont(ctx, p.title, w - 2 * x, 84, 48, { weight: 300 });
  ctx.fillText(p.title, w / 2, 230);
  ctx.font = font(30, { italic: true });
  ctx.fillText(p.name, w / 2, 290);
  // Doble barra final, como el cierre de una partitura.
  ctx.fillStyle = INK;
  ctx.fillRect(w / 2 - 60, 330, 120, 1.5);
  ctx.fillRect(w / 2 - 60, 336, 120, 4);

  ctx.textAlign = 'left';
  let y = 430;
  const step = Math.min(64, 440 / Math.max(p.toc.length, 1));
  for (const row of p.toc) {
    ctx.fillStyle = ACCENT;
    ctx.font = font(26, { weight: 400 });
    ctx.fillText(row.numeral, x, y);
    ctx.fillStyle = INK;
    fitFont(ctx, row.title, 330, 28, 18);
    ctx.fillText(row.title, x + 70, y);
    const titleEnd = x + 70 + ctx.measureText(row.title).width;
    ctx.font = font(24, { italic: true });
    ctx.fillStyle = FADED;
    const tempoWidth = ctx.measureText(row.tempo).width;
    ctx.fillText(row.tempo, w - x - tempoWidth, y);
    dots(ctx, titleEnd + 12, w - x - tempoWidth - 12, y - 7);
    y += step;
  }

  ctx.fillStyle = FADED;
  ctx.font = font(20, { family: SANS });
  ctx.textAlign = 'center';
  wrap(ctx, p.hint, w / 2, PAGE_PX.height - 110, w - 2 * x, 28);
  ctx.textAlign = 'left';
}

function dots(ctx: CanvasRenderingContext2D, from: number, to: number, y: number) {
  ctx.fillStyle = 'rgba(31, 27, 22, 0.35)';
  for (let x = from; x < to; x += 9) ctx.fillRect(x, y, 2, 2);
}

function drawVerso(ctx: CanvasRenderingContext2D, p: Extract<PageSpec, { kind: 'verso' }>) {
  const { width: w, height: h } = PAGE_PX;
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.font = font(150, { weight: 300 });
  ctx.fillText(p.numeral, w / 2, 260);
  ctx.fillStyle = INK;
  ctx.font = font(40, { italic: true });
  ctx.fillText(p.tempo, w / 2, 330);
  ctx.fillStyle = RULE;
  ctx.fillRect(w / 2 - 40, 372, 80, 1);

  // El título de la familia, que antes se repetía en grande en el recto.
  ctx.fillStyle = INK;
  ctx.font = font(58);
  let y = wrap(ctx, p.title, w / 2, 470, w - 160, 66);
  ctx.fillStyle = FADED;
  ctx.font = font(26, { italic: true });
  y = wrap(ctx, p.epigraph, w / 2, y + 14, w - 180, 36);

  ctx.font = font(22, { italic: true });
  ctx.fillText(p.caption, w / 2, Math.max(y + 60, h - 190));
  ctx.textAlign = 'left';
  folio(ctx, p.folio);
}

function drawRecto(ctx: CanvasRenderingContext2D, p: Extract<PageSpec, { kind: 'recto' }>) {
  const { width: w, height: h } = PAGE_PX;
  const x = 64;
  let after = 90;
  if (p.head) {
    ctx.fillStyle = ACCENT;
    ctx.font = font(18, { family: SANS, weight: 500 });
    ctx.fillText(p.head.heading.toUpperCase(), x, 110);
    ctx.fillStyle = INK;
    fitFont(ctx, p.head.title, w - 2 * x, 56, 34, { weight: 400 });
    ctx.fillText(p.head.title, x, 176);
    ctx.fillStyle = FADED;
    ctx.font = font(23, { italic: true });
    after = wrap(ctx, p.head.epigraph, x, 220, w - 2 * x, 30);
    ctx.fillStyle = RULE;
    ctx.fillRect(x, after - 6, w - 2 * x, 1);
  }

  const top = after + 30;
  const bottom = h - 150;
  const rowH = Math.min(62, (bottom - top) / Math.max(p.items.length, 1));
  const gap = Math.min(7, rowH / 7);
  const labelX = x + 104;
  p.items.forEach((item, i) => {
    const mid = top + rowH * (i + 0.5);
    // El ícono real de la tecnología; sin ícono, su compás con una nota.
    if (!icon(ctx, item.icon, x + 40, mid, Math.min(34, rowH * 0.62))) {
      staff(ctx, x, mid - gap * 2, 80, gap);
      note(ctx, x + 44, mid + gap * 2, gap, item.level * 2 + 1, item.level === 1);
    }

    const dyn = DYNAMICS[item.level];
    ctx.font = font(30, { italic: true, weight: 600 });
    const dynWidth = ctx.measureText(dyn).width;
    ctx.fillStyle = ACCENT;
    ctx.fillText(dyn, w - x - dynWidth, mid + 10);

    const room = w - x - dynWidth - 24 - labelX;
    ctx.fillStyle = INK;
    fitFont(ctx, item.label, room, 30, 18);
    ctx.fillText(item.label, labelX, mid + 10);
    let end = labelX + ctx.measureText(item.label).width;
    if (item.note) {
      ctx.fillStyle = FADED;
      ctx.font = font(22, { italic: true });
      const noteText = ` — ${item.note}`;
      if (end + ctx.measureText(noteText).width < w - x - dynWidth - 24) {
        ctx.fillText(noteText, end, mid + 10);
        end += ctx.measureText(noteText).width;
      }
    }
    dots(ctx, end + 14, w - x - dynWidth - 14, mid + 4);
  });

  ctx.fillStyle = FADED;
  ctx.font = font(19, { family: SANS });
  ctx.textAlign = 'center';
  ctx.fillText(p.legend, w / 2, h - 88);
  ctx.textAlign = 'left';
  folio(ctx, p.folio);
}

/** Dibuja `page` en `canvas` (tamaño PAGE_PX escalado por `scale`). */
export function drawPage(canvas: HTMLCanvasElement, page: PageSpec, scale: number, seed: number) {
  canvas.width = Math.round(PAGE_PX.width * scale);
  canvas.height = Math.round(PAGE_PX.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = 'alphabetic';
  paper(ctx, seed);
  if (page.kind === 'cover') drawCover(ctx, page);
  else if (page.kind === 'verso') drawVerso(ctx, page);
  else drawRecto(ctx, page);
}

export function createPageTexture(page: PageSpec, scale: number, seed: number, anisotropy: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  drawPage(canvas, page, scale, seed);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Fuentes que usan las páginas; el canvas no las espera solo. */
export function loadPageFonts(): Promise<unknown> {
  if (!('fonts' in document)) return Promise.resolve();
  return Promise.all(
    [font(40, { weight: 300 }), font(40), font(40, { italic: true }), font(40, { italic: true, weight: 600 }), font(20, { family: SANS }), font(20, { family: SANS, weight: 500 })].map(
      (f) => document.fonts.load(f),
    ),
  ).catch(() => undefined);
}
