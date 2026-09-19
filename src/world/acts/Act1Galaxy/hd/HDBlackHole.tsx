import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { ClampToEdgeWrapping, LinearFilter, NearestFilter, ShaderMaterial, Vector2, Vector3 } from 'three';
import { ACT_ANCHORS } from '../../../camera/path';
import { starParallax } from '../../../sky/parallax';
import { fragmentShader, vertexShader } from './shader';
import { Radius } from 'lucide-static';

const TEXTURES = {
  disk: '/textures/blackhole/accretion_disk_natural.png',
  stars: '/textures/blackhole/star_noise.png',
  milkyway: '/textures/blackhole/milkyway.jpg',
};

/**
 * Metros nuestros por unidad del shader. Su disco va de 2.45 a 6.45 y el nuestro llega a ~5.8:
 * con 0.9 ambos ocupan lo mismo en pantalla y el título no queda encima.
 */
const WORLD_PER_UNIT = 0.80;

/** Giro de las estrellas (radianes) con el mouse en el borde; la Vía Láctea queda fija. */
const STAR_PARALLAX = 1.03;

const up = new Vector3();
const dir = new Vector3();

/**
 * Agujero negro "HD": ray marching de geodésicas a pantalla completa, sincronizado con la cámara
 * del recorrido. Nuestras unidades se escalan a las del shader (horizonte = 1) con WORLD_PER_UNIT.
 */
export function HDBlackHole() {
  const textures = useTexture(TEXTURES);

  const material = useMemo(() => {
    textures.milkyway.magFilter = textures.milkyway.minFilter = NearestFilter;
    for (const t of [textures.disk, textures.stars]) t.magFilter = t.minFilter = LinearFilter;
    for (const t of Object.values(textures)) t.wrapS = t.wrapT = ClampToEdgeWrapping;

    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        bg_intensity: { value: 0.25 },
        resolution: { value: new Vector2(0.01, 0.01) },
        cam_pos: { value: new Vector3() },
        cam_dir: { value: new Vector3(0, 0, -1) },
        cam_up: { value: new Vector3(0, 1, 0) },
        star_parallax: { value: new Vector2() },
        cam_vel: { value: new Vector3() },
        fov: { value: 55 },
        time: { value: 0 },
        bg_texture: { value: textures.milkyway },
        star_texture: { value: textures.stars },
        disk_texture: { value: textures.disk },
        accretion_disk: { value: true },
        use_disk_texture: { value: true },
        lorentz_transform: { value: true },
        doppler_shift: { value: true },
        beaming: { value: true },
        show_stars: { value: true },
        show_milkyway: { value: true },
        disk_intensity: { value: 1 },
        glow_intensity: { value: 1 },
        bloom_intensity: { value: 1 },
        bloom_threshold: { value: 1 },
        bloom_radius: { value: 1 },
        jet_enabled: { value: false },
        orbit_enabled: { value: true },
        black_hole_rotation: { value: 0 },  /* spin */
        DISK_IN: { value: 1.45 },
        DISK_WIDTH: { value: 5 },
        doppler_intensity: { value: 1.5 },
        // beaming_intensity: { value: 0 },
        thermal_colormap_mode: { value: false },
      },
    });
  }, [textures]);

  useFrame(({ camera, gl, clock }) => {
    const u = material.uniforms;
    gl.getDrawingBufferSize(u.resolution.value);
    u.time.value = clock.elapsedTime * 0.2;
    u.cam_pos.value.copy(camera.position).sub(ACT_ANCHORS[1]).divideScalar(WORLD_PER_UNIT);
    u.cam_dir.value.copy(camera.getWorldDirection(dir));
    // `up` real de la cámara (incluye el giro por mouse), no el eje Y del mundo.
    u.cam_up.value.copy(up.setFromMatrixColumn(camera.matrixWorld, 1));
    if ('fov' in camera) u.fov.value = camera.fov;
    // Mismo puntero amortiguado que el cielo normal (sky/parallax.ts), en radianes.
    u.star_parallax.value.copy(starParallax).multiplyScalar(STAR_PARALLAX);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1000} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
