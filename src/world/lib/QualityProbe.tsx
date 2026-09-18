import { PerformanceMonitor, useDetectGPU } from '@react-three/drei';
import { useEffect } from 'react';
import { useWorld } from '../store';
import { lowerQuality, tierToQuality } from './quality';

/** Tier inicial según la GPU; baja en caliente si el FPS cae de forma sostenida. Nunca sube solo. */
export function QualityProbe() {
  const gpu = useDetectGPU();

  useEffect(() => {
    // Sin benchmark (red caída, GPU desconocida) no hay dato fiable: calidad media y que decida el FPS.
    const quality = gpu.type === 'BENCHMARK' ? tierToQuality(gpu.tier, !!gpu.isMobile) : 'mid';
    useWorld.getState().setQuality(quality);
  }, [gpu.type, gpu.tier, gpu.isMobile]);

  return (
    <PerformanceMonitor
      flipflops={2}
      onDecline={() => {
        const { quality, setQuality } = useWorld.getState();
        setQuality(lowerQuality(quality));
      }}
    />
  );
}
