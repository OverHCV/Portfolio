import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { ActId } from '../acts.config';
import type { ActProps } from './types';

/** Cada acto es su propio chunk; World solo monta el activo ±1 (ARCHITECTURE.md §4.4). */
export const ACT_COMPONENTS: Record<ActId, LazyExoticComponent<ComponentType<ActProps>>> = {
  1: lazy(() => import('./Act1Galaxy')),
  2: lazy(() => import('./Act2Field')),
  3: lazy(() => import('./Act3Pier')),
  4: lazy(() => import('./Act4Lighthouse')),
  5: lazy(() => import('./Act5City')),
};
