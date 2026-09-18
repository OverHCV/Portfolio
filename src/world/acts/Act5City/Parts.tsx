import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CylinderGeometry, InstancedBufferAttribute, Matrix4, Quaternion, Vector3, type BufferGeometry, type InstancedMesh } from 'three';
import { createIsoMaterial } from './isoMaterial';
import type { BoxPart, CylPart } from './board';
import type { CityFrame } from './frame';

const UP = new Vector3(0, 1, 0);

/** Geometría unitaria con la base en y = 0 (el encendido la escala desde la placa). */
function withRoles<T extends BoxPart | CylPart>(geometry: BufferGeometry, parts: T[]) {
  geometry.translate(0, 0.5, 0);
  geometry.setAttribute('aRole', new InstancedBufferAttribute(Float32Array.from(parts, (p) => p.role), 1));
  geometry.setAttribute('aOwner', new InstancedBufferAttribute(Float32Array.from(parts, (p) => p.owner), 1));
  return geometry;
}

/**
 * Todos los componentes de la placa (chips de los proyectos, pasivos, conectores) en dos draw
 * calls: cajas y cilindros instanciados con el material isométrico.
 */
export function Parts({ boxes, cyls, frame }: { boxes: BoxPart[]; cyls: CylPart[]; frame: CityFrame }) {
  const boxMesh = useRef<InstancedMesh>(null);
  const cylMesh = useRef<InstancedMesh>(null);
  const boxGeometry = useMemo(() => withRoles(new BoxGeometry(1, 1, 1), boxes), [boxes]);
  const cylGeometry = useMemo(() => withRoles(new CylinderGeometry(1, 1, 1, 28, 1), cyls), [cyls]);
  const boxMaterial = useMemo(() => createIsoMaterial(frame, { edges: true }), [frame]);
  const cylMaterial = useMemo(() => createIsoMaterial(frame), [frame]);

  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    const s = new Vector3();
    const p = new Vector3();
    boxes.forEach((b, i) => {
      m.compose(p.set(b.x, b.y, b.z), q.setFromAxisAngle(UP, b.rot), s.set(b.sx, b.sy, b.sz));
      boxMesh.current!.setMatrixAt(i, m);
    });
    boxMesh.current!.instanceMatrix.needsUpdate = true;
    cyls.forEach((c, i) => {
      m.compose(p.set(c.x, c.y, c.z), q.identity(), s.set(c.r, c.h, c.r));
      cylMesh.current!.setMatrixAt(i, m);
    });
    cylMesh.current!.instanceMatrix.needsUpdate = true;
  }, [boxes, cyls]);

  useEffect(() => () => [boxGeometry, cylGeometry, boxMaterial, cylMaterial].forEach((x) => x.dispose()), [boxGeometry, cylGeometry, boxMaterial, cylMaterial]);

  return (
    <group>
      <instancedMesh ref={boxMesh} args={[boxGeometry, boxMaterial, boxes.length]} frustumCulled={false} />
      <instancedMesh ref={cylMesh} args={[cylGeometry, cylMaterial, cyls.length]} frustumCulled={false} />
    </group>
  );
}
