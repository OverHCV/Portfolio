import type { ThreeEvent } from '@react-three/fiber';
import { useWorld } from '../../store';
import type { ChipSite } from './board';
import type { Project } from '../../types';

/** Qué hay bajo el puntero: un proyecto (índice) o el buzón. Lo escriben los hit boxes. */
export interface CityHover {
  project: number;
  mailbox: boolean;
}

/** El acto está a la vista y ya encendido: solo entonces responde al puntero. */
export function cityInteractive(): boolean {
  return useWorld.getState().activeAct === 5;
}

/**
 * Zonas de hover/clic de los chips de proyecto: cajas invisibles algo más grandes que el chip
 * (el raycast de R3F no mira `visible`). Hover → el chip se levanta y sus calles brillan
 * (index.tsx); clic → panel del proyecto.
 */
export function Buildings({ chips, projects, hover }: { chips: ChipSite[]; projects: Project[]; hover: CityHover }) {
  return (
    <group>
      {chips
        .filter((chip) => chip.project >= 0)
        .map((chip) => {
          const height = Math.max(chip.top, 0.4) + 0.5;
          const onOver = (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            if (!cityInteractive()) return;
            hover.project = chip.project;
            document.body.style.cursor = 'pointer';
          };
          return (
            <mesh
              key={chip.ref}
              position={[chip.x, height / 2, chip.z]}
              visible={false}
              onPointerOver={onOver}
              onPointerMove={(e) => hover.project !== chip.project && onOver(e)}
              onPointerOut={() => {
                if (hover.project === chip.project) hover.project = -1;
                document.body.style.cursor = '';
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!cityInteractive()) return;
                useWorld.getState().setFocus({ kind: 'project', id: projects[chip.project].id });
              }}
            >
              <boxGeometry args={[chip.hw * 2 + 0.8, height, chip.hd * 2 + 0.8]} />
            </mesh>
          );
        })}
    </group>
  );
}
