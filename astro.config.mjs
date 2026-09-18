import { createRequire } from 'node:module';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// mathjax-full/js/components/version.js hace eval('require') si PACKAGE_VERSION no está
// definida (sus bundles oficiales la inyectan en build). Se define en dev y en build.
const require = createRequire(import.meta.url);
const MATHJAX_VERSION = JSON.stringify(require('mathjax-full/package.json').version);

// https://astro.build/config
export default defineConfig({
  site: 'https://overhcv.com',
  output: 'static',
  // La barra de dev de Astro ocupa el mismo sitio que la navbar flotante inferior.
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    define: { PACKAGE_VERSION: MATHJAX_VERSION },
    optimizeDeps: {
      // mathjax-full/js es CommonJS: si Vite dev lo descubre tarde (chunk perezoso del Acto 2)
      // lo sirve crudo y explota con "require is not defined". Se pre-empaquetan al arrancar.
      include: [
        'mathjax-full/js/mathjax.js',
        'mathjax-full/js/input/tex.js',
        'mathjax-full/js/output/svg.js',
        'mathjax-full/js/adaptors/browserAdaptor.js',
        'mathjax-full/js/handlers/html.js',
        'mathjax-full/js/input/tex/AllPackages.js',
        // Mismo problema con los módulos de three/examples que solo importan los chunks perezosos:
        // descubrirlos tarde re-optimiza y el import() del acto falla con 504 "Outdated Optimize Dep".
        'three/examples/jsm/lines/Line2.js',
        'three/examples/jsm/lines/LineGeometry.js',
        'three/examples/jsm/lines/LineMaterial.js',
        'three/examples/jsm/objects/Water.js',
        'three/examples/jsm/environments/RoomEnvironment.js',
      ],
      esbuildOptions: { define: { PACKAGE_VERSION: MATHJAX_VERSION } },
    },
  },
  integrations: [react(), sitemap()],
});
