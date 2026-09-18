import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CylinderGeometry, MathUtils, type Group } from 'three';
import { useWorld } from '../../store';
import { MAILBOX } from './layout';
import { ROLE } from './palette';
import { createIsoMaterial } from './isoMaterial';
import { cityInteractive, type CityHover } from './Buildings';
import type { CityFrame } from './frame';

/** Medidas del buzón (unidades de la placa). */
const BODY = { w: 1.5, h: 1.3, d: 1.1, y: 1.35 };

/**
 * El buzón: una columna de correo en la esquina de la placa, con el mismo sombreado isométrico.
 * La bandera sube al acercarse o con hover; con el foco de contacto la tapa se abre y asoma la hoja.
 */
export function Mailbox({ frame, hover }: { frame: CityFrame; hover: CityHover }) {
  const flap = useRef<Group>(null);
  const flag = useRef<Group>(null);
  const letter = useRef<Group>(null);

  const parts = useMemo(() => {
    const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d).translate(0, h / 2, 0);
    // Techo en medio cilindro a lo largo de x.
    const roof = new CylinderGeometry(BODY.d / 2, BODY.d / 2, BODY.w, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
    return {
      post: box(0.34, BODY.y, 0.34),
      foot: box(0.9, 0.08, 0.9),
      body: box(BODY.w, BODY.h, BODY.d),
      roof,
      flap: box(BODY.w * 0.8, BODY.h * 0.62, 0.06),
      slot: box(BODY.w * 0.5, 0.06, 0.04),
      pole: box(0.06, 0.9, 0.06),
      flag: box(0.06, 0.32, 0.46),
      letter: box(BODY.w * 0.62, 0.9, 0.02),
    };
  }, []);

  const materials = useMemo(
    () => ({
      post: createIsoMaterial(frame, { edges: true, role: ROLE.postDark }),
      body: createIsoMaterial(frame, { edges: true, role: ROLE.post }),
      roof: createIsoMaterial(frame, { role: ROLE.post }),
      dark: createIsoMaterial(frame, { edges: true, role: ROLE.plastic }),
      metal: createIsoMaterial(frame, { edges: true, role: ROLE.metal }),
      flag: createIsoMaterial(frame, { edges: true, role: ROLE.led }),
      paper: createIsoMaterial(frame, { edges: true, role: ROLE.silk }),
    }),
    [frame],
  );

  useEffect(
    () => () => {
      Object.values(parts).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [parts, materials],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const open = useWorld.getState().focus?.kind === 'contact' ? 1 : 0;
    const raised = Math.max(frame.mailbox, hover.mailbox ? 1 : 0, open);
    if (flap.current) flap.current.rotation.x = MathUtils.damp(flap.current.rotation.x, open * 1.35, 5, delta);
    if (flag.current) flag.current.rotation.x = MathUtils.damp(flag.current.rotation.x, -raised * (Math.PI / 2), 4, delta);
    if (letter.current) {
      letter.current.position.y = MathUtils.damp(letter.current.position.y, BODY.y + 0.2 + open * 0.75, 4, delta);
      letter.current.visible = letter.current.position.y > BODY.y + 0.3;
    }
  });

  const top = BODY.y + BODY.h;
  return (
    <group position={[MAILBOX[0], 0, MAILBOX[1]]}>
      <mesh geometry={parts.foot} material={materials.metal} />
      <mesh geometry={parts.post} material={materials.post} />
      <mesh geometry={parts.body} material={materials.body} position={[0, BODY.y, 0]} />
      <mesh geometry={parts.roof} material={materials.roof} position={[0, top, 0]} />
      {/* Ranura y tapa en la cara +z (abajo a la izquierda en pantalla). */}
      <mesh geometry={parts.slot} material={materials.dark} position={[0, top - 0.3, BODY.d / 2 + 0.01]} />
      <group ref={flap} position={[0, BODY.y + 0.12, BODY.d / 2 + 0.03]}>
        <mesh geometry={parts.flap} material={materials.post} />
      </group>
      <group ref={letter} position={[0, BODY.y + 0.2, 0.05]} visible={false}>
        <mesh geometry={parts.letter} material={materials.paper} />
      </group>
      {/* Bandera en la cara +x: gira hacia arriba sobre su pivote. */}
      <group ref={flag} position={[BODY.w / 2 + 0.05, BODY.y + 0.55, -BODY.d / 2 + 0.1]}>
        <mesh geometry={parts.pole} material={materials.metal} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={parts.flag} material={materials.flag} position={[0, 0.02, 0.62]} />
      </group>

      <mesh
        position={[0, 1.6, 0]}
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!cityInteractive()) return;
          hover.mailbox = true;
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hover.mailbox = false;
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!cityInteractive()) return;
          useWorld.getState().setFocus({ kind: 'contact' });
        }}
      >
        <boxGeometry args={[2.4, 3.4, 2.4]} />
      </mesh>
    </group>
  );
}
