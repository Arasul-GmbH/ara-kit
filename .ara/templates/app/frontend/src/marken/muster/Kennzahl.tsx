import type { ReactNode } from 'react';

import { cn } from '../cn';

/**
 * Eine Zahl mit ihrer Beschriftung -- und `Kennzahlen`, das Raster darum.
 *
 * SEIT H5 IN DER BIBLIOTHEK. Sie standen als `components/ui/StatTile.tsx` in
 * der Shell und wussten dort schon nichts von Arasul: eine Beschriftung, ein
 * Wert, eine Einheit, eine Zeile darunter. Jede Fachanwendung, die einen
 * Zustand anzeigt, braucht dieselbe Form -- und haette sich ihre eigene
 * gebaut, mit einem anderen Abstand und einer anderen Schriftgroesse.
 *
 * ZWEI ENTSCHEIDUNGEN AUS DEM RUNDGANG VOM 19.08.2026 GELTEN WEITER:
 *
 *   KEIN SYMBOL. Ein Herz neben „Arbeitsspeicher" traegt nichts bei, was die
 *   Beschriftung nicht schon sagt, kostet aber ein Drittel der Breite.
 *
 *   DAS RASTER LIEGT HIER und nicht beim Aufrufer. Mit
 *   `repeat(auto-fit, minmax(11rem, 1fr))` ergaben vier Kacheln je nach
 *   Fensterbreite drei plus eine allein in der zweiten Zeile. `Kennzahlen`
 *   legt die Spaltenzahl fest: eine, zwei, vier. Nie drei.
 *
 * UND EINE KAM IN H5 DAZU: KEINE ZWEITE FLAECHE. Die Kachel stand auf
 * `bg-card`, also auf einem eigenen Weiss ueber dem Grau der Seite. Seit H5
 * gibt es eine Flaeche und Linien darauf -- die Kachel ist ein Kasten mit
 * Rand, kein Stueck Papier. Was uebrig bleibt, ist der Unterschied, auf den
 * es ankommt: die Zahl ist gross, ihre Beschriftung klein.
 */
export interface KennzahlProps {
  /** Was gemessen wird, etwa „Arbeitsspeicher". */
  beschriftung: string;
  /** Die Zahl selbst. */
  wert: ReactNode;
  /** Einheit hinter der Zahl, etwa „%" oder „°C". Kleiner und gedaempft. */
  einheit?: string;
  /** Zeile darunter, etwa „25,5 / 61 GB" oder ein Zustandshinweis. */
  fussnote?: ReactNode;
}

export function Kennzahl({ beschriftung, wert, einheit, fussnote }: KennzahlProps) {
  return (
    <div className="min-w-0 rounded-lg border border-border p-ui-3">
      <div className="truncate text-ui-xs font-medium uppercase tracking-wider text-muted-foreground">
        {beschriftung}
      </div>
      <div className="mt-ui-1 flex items-baseline gap-ui-1 text-xl font-semibold leading-tight text-foreground">
        {wert}
        {einheit && <span className="text-ui-sm font-normal text-muted-foreground">{einheit}</span>}
      </div>
      {fussnote && <div className="mt-ui-1 text-ui-sm text-muted-foreground">{fussnote}</div>}
    </div>
  );
}

export interface KennzahlenProps {
  children: ReactNode;
  className?: string;
}

/** Feste Spaltenzahl statt `auto-fit`, siehe Kopfkommentar. */
export function Kennzahlen({ children, className }: KennzahlenProps) {
  return (
    <div
      className={cn('grid min-w-0 grid-cols-1 gap-ui-2 sm:grid-cols-2 lg:grid-cols-4', className)}
    >
      {children}
    </div>
  );
}
