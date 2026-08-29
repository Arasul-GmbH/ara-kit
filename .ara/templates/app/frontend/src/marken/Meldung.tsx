import type { ReactNode } from 'react';

/** Was fuer eine Meldung es ist. Die Farbe folgt daraus, nicht umgekehrt. */
export type MeldungsArt = 'hinweis' | 'erfolg' | 'warnung' | 'fehler';

/**
 * Eine Meldung des Geraets an den Menschen.
 *
 * `role` haengt an der Art: ein Fehler ist eine `alert` (der Screenreader
 * unterbricht), alles andere ein `status` (er liest es, wenn er dran ist).
 * Und die Art steht immer auch im TEXT -- eine Meldung, die nur an ihrer
 * Farbe zu erkennen ist, ist fuer manche Menschen keine.
 */
export interface MeldungProps {
  art?: MeldungsArt;
  titel?: string;
  kennzeichen?: string;
  children?: ReactNode;
}

export function Meldung({ art = 'hinweis', titel, kennzeichen, children }: MeldungProps) {
  return (
    <div
      className="ara-meldung"
      data-art={art}
      data-testid={kennzeichen}
      role={art === 'fehler' ? 'alert' : 'status'}
    >
      {titel && <p className="ara-meldung__titel">{titel}</p>}
      {children}
    </div>
  );
}
