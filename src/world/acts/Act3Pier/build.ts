import { InstancedBufferAttribute, type BufferGeometry, type Material } from 'three';
import { BUILD_STAGGER, orderAt } from './timeline';

/** Altura desde la que cae cada pieza a su sitio. */
const DROP = 2.2;

/**
 * Añade a un material de three la construcción del muelle en GPU: cada instancia lleva su orden
 * (`aOrder`, 0 = junto al faro) y cae desde arriba a su sitio cuando `build` la alcanza.
 * Espejo de `builtAt` (timeline.ts). Sin reescribir matrices por frame.
 */
export function withBuild<M extends Material>(material: M, build: { value: number }): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBuild = build;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aOrder;\nuniform float uBuild;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float built = smoothstep(0.0, 1.0, (uBuild * ${(1 + BUILD_STAGGER).toFixed(4)} - aOrder) / ${BUILD_STAGGER.toFixed(4)});
        transformed = transformed * built + vec3(0.0, (1.0 - built) * ${DROP.toFixed(2)}, 0.0);`,
      );
  };
  return material;
}

/** Orden de construcción por instancia a partir de su z (coordenadas del acto). */
export function setBuildOrder(geometry: BufferGeometry, zs: readonly number[]) {
  geometry.setAttribute('aOrder', new InstancedBufferAttribute(Float32Array.from(zs, orderAt), 1));
}
