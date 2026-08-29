import * as React from 'react';

import { cn } from '../cn';

/**
 * Der Platzhalter, solange die Antwort unterwegs ist.
 *
 * `aria-hidden`, und das ist der Punkt: ein Screenreader soll nicht sieben
 * graue Balken vorlesen. Wer den Ladezustand ANSAGEN will, setzt darum herum
 * ein `role="status"` mit einem Satz -- so machen es die Zusammensetzungen in
 * der Shell (`SkeletonList`).
 *
 * `width`/`height` als Props und nicht nur als Klasse: der haeufigste Fall ist
 * eine Zeile von 60 % Breite, und dafuer eine Tailwind-Klasse zu erfinden
 * waere mehr Aufwand als der Wert selbst.
 */
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ width, height, borderRadius, className = '', style = {} }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-accent', className)}
      style={{
        width: width || '100%',
        height: height || '1rem',
        borderRadius: borderRadius || undefined,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
