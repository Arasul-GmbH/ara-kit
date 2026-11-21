/**
 * Die Symbole der Oberflaeche: Lucide, ueber die Bibliothek.
 *
 * Ausserhalb von `packages/marken/` importiert niemand `lucide-react`
 * selbst (`scripts/test/bausteine.py`, Regel 10): es gibt EINE Quelle fuer
 * Symbole, und ihre Groesse und Strichstaerke legt die Bibliothek fest
 * (`Icon`, drei Groessen, 1,75 px; `theme.css` zieht jedes Lucide-Symbol
 * auf dieselbe Strichstaerke). Wer ein Symbol braucht, schreibt
 *
 *   import { Trash2 } from '@marken/symbole';
 *   <Icon symbol={Trash2} groesse="klein" />
 *
 * Dieser Ausgang steht nicht im Sammelexport `@marken` und nicht im Buendel
 * zur Laufzeit: Lucide hat ueber tausend Symbole, und ein Bau nimmt nur die,
 * die er benutzt.
 */
export * from 'lucide-react';
export type { LucideIcon, LucideProps } from 'lucide-react';

/** Alle Symbole nach Namen, fuer das Symbol einer App aus `app.json`. Ein
 * eigener Brocken, der erst beim ersten Gebrauch laedt. */
export type Symbolsatz = Record<string, unknown>;
export function symbolsatzLaden(): Promise<Symbolsatz> {
  // @ts-expect-error: die Sammlung hat keine Typdatei
  return import('lucide-react/dist/esm/icons/index.js').then(m => m as Symbolsatz);
}
