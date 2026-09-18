import { useMemo } from 'react';
import { Vector3 } from 'three';
import { ACT_ANCHORS } from '../../camera/path';
import type { ActProps } from '../types';
import { createField } from './field';
import { FieldGrid } from './FieldGrid';
import { Streamlines } from './Streamlines';
import { BioNodes } from './BioNodes';

/**
 * Espacio de soluciones: un campo fijo cuyos mínimos son los fragmentos de bio.
 * Los conos marcan la dirección de mejora en cada punto; las líneas muestran a dónde lleva.
 */
export default function Act2Field({ content }: ActProps) {
  const { field, nodes } = useMemo(() => {
    const positions = content.bio.map((b) => b.gridPos);
    return { field: createField(positions), nodes: positions.map((p) => new Vector3(...p)) };
  }, [content.bio]);

  return (
    <group position={ACT_ANCHORS[2]}>
      <FieldGrid field={field} avoid={nodes} />
      <Streamlines field={field} nodes={nodes} />
      <BioNodes bio={content.bio} />
    </group>
  );
}
