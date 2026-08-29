import type { ReactNode } from 'react';

import { cn } from '../cn';

/**
 * Eine Feldgruppe innerhalb einer Seite -- und `Formularseite`, die Spalte
 * darum, die die Trennlinien setzt.
 *
 * SIE ERSETZT FUENF ARTEN, EINE FELDGRUPPE ZU TRENNEN: `pb-6 border-b`,
 * `pt-6 border-t`, `space-y-3` ganz ohne Linie, `space-y-5` mit `mb-1` am
 * Titel, und ein alleinstehendes `<div className="border-t" />` als eigenes
 * Trennstueck zwischen zwei Abschnitten (Plan 023 C1). Seit H4 steht sie in
 * der Bibliothek statt in der Shell: eine Fachanwendung mit einem Formular
 * braucht dieselbe Form, und die sechste Art waere ihre.
 *
 * DIE TRENNLINIE GEHOERT ZWISCHEN DIE ABSCHNITTE, NICHT AN SIE. Der erste
 * Entwurf hatte eine Eigenschaft `divider`, die der letzte Abschnitt einer
 * Seite abschalten musste. Das ist eine Falle: wer einen Abschnitt anhaengt,
 * muss daran denken, sie am alten letzten wieder einzuschalten. Genau so ist
 * seinerzeit die doppelte Linie zwischen zwei Abschnitten entstanden. Jetzt
 * traegt jeder Abschnitt seine Linie, und `Formularseite` nimmt sie dem
 * letzten wieder ab -- eine Stelle, die es entscheidet, und sie sieht die
 * Reihenfolge.
 *
 * UEBERSCHRIFTENEBENE IST `h2`: unterhalb des einen `h1` aus `Kopf` ist das
 * die naechste. Die Schriftgroesse bleibt klein und fett; Ebene und Groesse
 * sind zwei Achsen, und wer sie verwechselt, baut ein Inhaltsverzeichnis mit
 * Loechern.
 */
export interface FeldgruppeProps {
  titel: string;
  /** Symbol links neben der Ueberschrift, in der Groesse der Zeile. */
  symbol?: ReactNode;
  beschreibung?: ReactNode;
  /** Aktion rechts neben der Ueberschrift, etwa ein Schalter. */
  aktion?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Feldgruppe({
  titel,
  symbol,
  beschreibung,
  aktion,
  children,
  className,
}: FeldgruppeProps) {
  return (
    <section className={cn('border-b border-border pb-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-ui-sm font-semibold text-foreground">
            {symbol && (
              <span className="text-muted-foreground [&>svg]:size-4" aria-hidden="true">
                {symbol}
              </span>
            )}
            {titel}
          </h2>
          {beschreibung && <p className="mt-1 text-ui-xs text-muted-foreground">{beschreibung}</p>}
        </div>
        {aktion && <div className="shrink-0">{aktion}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export interface FormularseiteProps {
  children: ReactNode;
  className?: string;
}

/**
 * Die Abstandsspalte einer Seite aus Feldgruppen.
 *
 * `last-child` und ausdruecklich nicht `last-of-type`: die Linie faellt nur
 * weg, wenn nach der Gruppe gar nichts mehr kommt. Steht dahinter noch
 * etwas, das keine Gruppe ist, behaelt sie ihre Linie -- mit `last-of-type`
 * verschwaende sie, weil der Waehler nur die `section` untereinander sieht
 * und nicht das, was danach steht.
 *
 * Eine Gruppe, die bedingt gar nicht gezeichnet wird, zaehlt nicht mit:
 * React schreibt fuer einen falschen Zweig nichts ins Dokument, und der
 * Waehler greift auf das Dokument.
 */
export function Formularseite({ children, className }: FormularseiteProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-8',
        '[&>section:last-child]:border-b-0 [&>section:last-child]:pb-0',
        className
      )}
    >
      {children}
    </div>
  );
}
