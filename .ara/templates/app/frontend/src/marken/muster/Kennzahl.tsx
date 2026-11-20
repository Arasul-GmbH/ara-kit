import type { ReactNode } from 'react';

import { cn } from '../cn';

/**
 * Eine Zahl mit ihrer Beschriftung, und `Kennzahlen`, das Raster darum.
 *
 * IN DER BIBLIOTHEK. Sie standen frueher als `components/ui/StatTile.tsx` in
 * der Shell und wussten dort schon nichts von Arasul: eine Beschriftung, ein
 * Wert, eine Einheit, eine Zeile darunter. Jede Fachanwendung, die einen
 * Zustand anzeigt, braucht dieselbe Form und haette sich ihre eigene
 * gebaut, mit einem anderen Abstand und einer anderen Schriftgroesse.
 *
 * ZWEI ENTSCHEIDUNGEN GELTEN:
 *
 *   KEIN SYMBOL. Ein Herz neben „Arbeitsspeicher" traegt nichts bei, was die
 *   Beschriftung nicht schon sagt, kostet aber ein Drittel der Breite.
 *
 *   DAS RASTER LIEGT HIER und nicht beim Aufrufer. Mit
 *   `repeat(auto-fit, minmax(11rem, 1fr))` ergaben vier Kacheln je nach
 *   Fensterbreite drei plus eine allein in der zweiten Zeile. `Kennzahlen`
 *   legt die Spaltenzahl fest: eine, zwei, vier. Nie drei.
 *
 * SEIT 5.9.0 DECKEND, MIT VERLAUF. Die Kachel liegt wie Tabelle und Karte
 * auf `--card` (in einer App ist der Grund ein Verlauf, und Inhalt bleibt
 * deckend), Radius 12 px, die Beschriftung in normaler Schrift statt in
 * Grossbuchstaben, dazu auf Wunsch `verlauf`: eine Linie in Blau rechts
 * neben der Zahl. Damit ueberholt sich der Absatz darunter.
 *
 * UND EINE DRITTE: KEINE ZWEITE FLAECHE. Die Kachel stand auf
 * `bg-card`, also auf einem eigenen Weiss ueber dem Grau der Seite. Jetzt
 * gibt es eine Flaeche und Linien darauf: die Kachel ist ein Kasten mit
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
  /**
   * Der Verlauf der Zahl, aelteste zuerst (seit 5.9.0): eine feine Linie in
   * Blau unter der Zahl, ohne Achsen. Unter zwei Werten steht keine.
   */
  verlauf?: ReadonlyArray<number | null>;
}

/** Hoehe und Breite der Verlaufslinie in der Kachel, in Pixeln. */
const VERLAUF_HOEHE = 28;
const VERLAUF_BREITE = 120;

/**
 * Die Linie als SVG-Pfad, ohne `recharts`: die Kachel steht im
 * Sammelexport, und eine App ohne Diagramm soll dafuer kein Diagramm laden.
 */
export function verlaufPfad(
  werte: ReadonlyArray<number | null>,
  breite = VERLAUF_BREITE,
  hoehe = VERLAUF_HOEHE
): string | null {
  const punkte = werte
    .map((wert, index) => ({ index, wert }))
    .filter((p): p is { index: number; wert: number } => typeof p.wert === 'number');
  if (punkte.length < 2) return null;
  const min = Math.min(...punkte.map(p => p.wert));
  const max = Math.max(...punkte.map(p => p.wert));
  const spanne = max - min || 1;
  const letzter = Math.max(werte.length - 1, 1);
  // 1 px Rand oben und unten, damit die Linie mit ihrer Staerke nicht
  // abgeschnitten wird.
  return punkte
    .map((p, i) => {
      const x = (p.index / letzter) * breite;
      const y = 1 + (1 - (p.wert - min) / spanne) * (hoehe - 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function Kennzahl({ beschriftung, wert, einheit, fussnote, verlauf }: KennzahlProps) {
  const pfad = verlauf ? verlaufPfad(verlauf) : null;
  return (
    <div
      className="min-w-0 rounded-[12px] border border-border bg-card p-ui-3"
      data-slot="kennzahl"
    >
      <div className="truncate text-ui-sm text-muted-foreground">{beschriftung}</div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1 text-2xl leading-tight font-semibold text-foreground tabular-nums">
          {wert}
          {einheit && (
            <span className="text-ui-sm font-normal text-muted-foreground">{einheit}</span>
          )}
        </div>
        {pfad && (
          <svg
            className="h-7 w-[120px] max-w-[45%] shrink text-primary"
            viewBox={`0 0 ${VERLAUF_BREITE} ${VERLAUF_HOEHE}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            data-slot="kennzahl-verlauf"
          >
            <path
              d={pfad}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
      {fussnote && <div className="mt-1 text-ui-sm text-muted-foreground">{fussnote}</div>}
    </div>
  );
}

export interface KennzahlenProps {
  children: ReactNode;
  className?: string;
}

/** Feste Spaltenzahl statt `auto-fit`, siehe Kopfkommentar. Seit 5.9.1 auch
 * am Handy zwei Spalten: vier Kacheln untereinander fuellten dort den ganzen
 * ersten Bildschirm. */
export function Kennzahlen({ children, className }: KennzahlenProps) {
  return (
    <div className={cn('grid min-w-0 grid-cols-2 gap-ui-2 lg:grid-cols-4', className)}>
      {children}
    </div>
  );
}
