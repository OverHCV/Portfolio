import {
  siAngular,
  siArduino,
  siAstro,
  siC,
  siCplusplus,
  siDocker,
  siFastapi,
  siGit,
  siGnubash,
  siGo,
  siGooglecloud,
  siGraphql,
  siKotlin,
  siLanggraph,
  siLatex,
  siLinux,
  siMariadb,
  siMongodb,
  siMysql,
  siN8n,
  siNextdotjs,
  siNodedotjs,
  siNumpy,
  siOpencv,
  siPandas,
  siPlotly,
  siPostgresql,
  siPython,
  siPytorch,
  siQdrant,
  siR,
  siReact,
  siRedis,
  siRust,
  siScikitlearn,
  siSpringboot,
  siSqlite,
  siStreamlit,
  siTailwindcss,
  siTensorflow,
  siTokio,
  siTypescript,
  siVuedotjs,
} from 'simple-icons';
import {
  ArrowLeftRight,
  BrainCircuit,
  Boxes,
  Cpu,
  Database,
  FlaskConical,
  FolderTree,
  Infinity as InfinityLoop,
  Languages,
  Layers,
  ListChecks,
  SquareMousePointer,
  Network,
  RefreshCw,
  Trees,
  Table,
  Blend
} from 'lucide-static';
// Marcas que Simple Icons ya no publica: Devicon (MIT), copiadas sin cambios.
import java from './icons/java.svg?raw';
import csharp from './icons/csharp.svg?raw';
import azure from './icons/azure.svg?raw';
import sqlserver from './icons/sqlserver.svg?raw';
import oracle from './icons/oracle.svg?raw';

/**
 * Íconos de la partitura (recto de cada movimiento): la clave es el `icon` de cada ítem en
 * content/skills. Logos de Simple Icons (CC0) y Devicon (MIT); los conceptos sin marca, de Lucide (ISC).
 * Todo se dibuja con una sola tinta, así que el color original de cada SVG se ignora.
 */
const SOURCES: Record<string, { svg: string; viewBox?: [number, number, number, number] }> = {
  // Marcas
  angular: { svg: siAngular.svg },
  arduino: { svg: siArduino.svg },
  astro: { svg: siAstro.svg },
  azure: { svg: azure },
  bash: { svg: siGnubash.svg },
  c: { svg: siC.svg },
  chromadb: { svg: Blend },
  cplusplus: { svg: siCplusplus.svg },
  csharp: { svg: csharp },
  docker: { svg: siDocker.svg },
  fastapi: { svg: siFastapi.svg },
  git: { svg: siGit.svg },
  go: { svg: siGo.svg },
  googlecloud: { svg: siGooglecloud.svg },
  graphql: { svg: siGraphql.svg },
  java: { svg: java },
  kotlin: { svg: siKotlin.svg },
  langgraph: { svg: siLanggraph.svg },
  latex: { svg: siLatex.svg },
  linux: { svg: siLinux.svg },
  mariadb: { svg: siMariadb.svg },
  mongodb: { svg: siMongodb.svg },
  mysql: { svg: siMysql.svg },
  n8n: { svg: siN8n.svg },
  nextjs: { svg: siNextdotjs.svg },
  nodejs: { svg: siNodedotjs.svg },
  numpy: { svg: siNumpy.svg },
  opencv: { svg: siOpencv.svg },
  // El logo de Oracle es solo el nombre: se recorta a la franja que ocupa.
  oracle: { svg: oracle, viewBox: [0, 54, 128, 20] },
  pandas: { svg: siPandas.svg },
  plotly: { svg: siPlotly.svg },
  postgresql: { svg: siPostgresql.svg },
  python: { svg: siPython.svg },
  pytorch: { svg: siPytorch.svg },
  qdrant: { svg: siQdrant.svg },
  r: { svg: siR.svg },
  react: { svg: siReact.svg },
  redis: { svg: siRedis.svg },
  rust: { svg: siRust.svg },
  scikitlearn: { svg: siScikitlearn.svg },
  springboot: { svg: siSpringboot.svg },
  sqlite: { svg: siSqlite.svg },
  sqlserver: { svg: sqlserver },
  streamlit: { svg: siStreamlit.svg },
  tailwind: { svg: siTailwindcss.svg },
  tensorflow: { svg: siTensorflow.svg },
  tokio: { svg: siTokio.svg },
  typescript: { svg: siTypescript.svg },
  vue: { svg: siVuedotjs.svg },
  // Conceptos
  agents: { svg: Table },
  table: { svg: Table },
  assembly: { svg: Cpu },
  boosting: { svg: Trees },
  cicd: { svg: InfinityLoop },
  database: { svg: Database },
  ddd: { svg: Boxes },
  folders: { svg: FolderTree },
  languages: { svg: Languages },
  layers: { svg: Layers },
  llm: { svg: BrainCircuit },
  network: { svg: Network },
  rest: { svg: ArrowLeftRight },
  scrum: { svg: RefreshCw },
  tdd: { svg: ListChecks },
  sdd: { svg: SquareMousePointer },
  testing: { svg: FlaskConical },
};

export interface StackIcon {
  path: Path2D;
  /** Rect (x, y, ancho, alto) del viewBox: el ícono se encaja en su celda según esto. */
  viewBox: [number, number, number, number];
  /** Íconos de trazo (Lucide) con su grosor; los de marca van rellenos. */
  stroke?: { width: number; cap: CanvasLineCap; join: CanvasLineJoin };
}

const num = (el: Element, name: string) => parseFloat(el.getAttribute(name) ?? '0') || 0;

/** Añade al trazado cada figura del SVG (path, circle, ellipse, rect, line, polyline, polygon). */
function addShape(path: Path2D, el: Element) {
  switch (el.tagName.toLowerCase()) {
    case 'path': {
      const d = el.getAttribute('d');
      if (d) path.addPath(new Path2D(d));
      break;
    }
    case 'circle': {
      const [cx, cy, r] = [num(el, 'cx'), num(el, 'cy'), num(el, 'r')];
      path.moveTo(cx + r, cy);
      path.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = [num(el, 'cx'), num(el, 'cy'), num(el, 'rx'), num(el, 'ry')];
      path.moveTo(cx + rx, cy);
      path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      break;
    }
    case 'rect': {
      const sub = new Path2D();
      sub.roundRect(num(el, 'x'), num(el, 'y'), num(el, 'width'), num(el, 'height'), num(el, 'rx'));
      path.addPath(sub);
      break;
    }
    case 'line':
      path.moveTo(num(el, 'x1'), num(el, 'y1'));
      path.lineTo(num(el, 'x2'), num(el, 'y2'));
      break;
    case 'polyline':
    case 'polygon': {
      const pts = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < pts.length; i += 2) (i ? path.lineTo : path.moveTo).call(path, pts[i], pts[i + 1]);
      if (el.tagName.toLowerCase() === 'polygon') path.closePath();
      break;
    }
  }
}

function parse(source: (typeof SOURCES)[string]): StackIcon | null {
  const svg = new DOMParser().parseFromString(source.svg, 'image/svg+xml').documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') return null;
  const path = new Path2D();
  for (const el of Array.from(svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon'))) addShape(path, el);
  const vb = (svg.getAttribute('viewBox') ?? '0 0 24 24').split(/[\s,]+/).map(Number) as StackIcon['viewBox'];
  const stroked = svg.getAttribute('fill') === 'none' && svg.hasAttribute('stroke');
  return {
    path,
    viewBox: source.viewBox ?? vb,
    stroke: stroked
      ? {
        width: parseFloat(svg.getAttribute('stroke-width') ?? '2'),
        cap: (svg.getAttribute('stroke-linecap') as CanvasLineCap) ?? 'round',
        join: (svg.getAttribute('stroke-linejoin') as CanvasLineJoin) ?? 'round',
      }
      : undefined,
  };
}

const cache = new Map<string, StackIcon | null>();

/** Ícono listo para dibujar, o null si la clave no existe (la fila vuelve a la nota musical). */
export function stackIcon(key: string | undefined): StackIcon | null {
  if (!key) return null;
  if (!cache.has(key)) {
    const source = SOURCES[key];
    if (!source && import.meta.env.DEV) console.warn(`[album] ícono desconocido: "${key}"`);
    cache.set(key, source ? parse(source) : null);
  }
  return cache.get(key) ?? null;
}
