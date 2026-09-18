import 'react';

/**
 * MathML nativo en JSX: @types/react no trae los intrínsecos de MathML que usa
 * el letrero de la sonda (GradientProbe). Solo los elementos que necesitamos.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      math: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      mi: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      mo: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      mn: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      mspace: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { width?: string | number },
        HTMLElement
      >;
    }
  }
}
