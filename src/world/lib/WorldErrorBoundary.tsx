import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/**
 * Si el mundo 3D falla (shader, driver, contexto WebGL perdido), no deja la página en blanco:
 * quita la clase `webgl` y queda visible el HTML semántico con todo el contenido.
 */
export class WorldErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    document.documentElement.classList.remove('webgl');
    document.documentElement.style.overflow = '';
    console.error('[World] 3D desactivado, se muestra la versión HTML:', error, info.componentStack);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
