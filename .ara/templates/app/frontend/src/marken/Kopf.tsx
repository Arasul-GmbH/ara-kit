import type { ReactNode } from 'react';

/**
 * Der Kopf einer Seite: ein Titel, ein Satz darunter, Aktionen rechts.
 *
 * Er ist der Nachfolger von `components/ui/PageHeader.tsx` und hat ihn
 * ersetzt, statt neben ihm zu stehen (Phase D7). Zwei Seitenkoepfe -- einer
 * fuer die Shell, einer fuer die Apps -- waeren genau die Doppelung, die
 * dieses Designsystem abschaffen soll; und der Unterschied zwischen ihnen
 * waere in vier Wochen keine Entscheidung mehr, sondern ein Zufall.
 *
 * Der Titel ist das einzige `h1` einer Seite. Das ist keine Formsache: ein
 * Screenreader liest die Ueberschriften als Inhaltsverzeichnis, und zwei
 * gleichrangige Titel auf einer Seite sind zwei Antworten auf die Frage
 * „wo bin ich".
 */
export interface KopfProps {
  /** Der Seitentitel. Erscheint als einziges `h1` der Seite. */
  titel: string;
  /** Symbol links neben dem Titel, in der Groesse der Zeile. */
  symbol?: ReactNode;
  /** Ein Satz darunter: was diese Seite tut. */
  beschreibung?: ReactNode;
  /** Aktionen rechts. Unter 900 px rutschen sie unter den Titel. */
  aktionen?: ReactNode;
  /**
   * Mittig und ohne Trennlinie -- die Form einer Seite, die aus nichts als
   * sich selbst besteht: die Anmeldung, das erste Konto, ein Absturz.
   *
   * Sie kam mit H5 dazu, weil `scripts/test/bausteine.py` seither auch
   * `components/ui/` liest und dort zwei handgeschriebene `h1` fand. Beide
   * waren dieselbe Sache wie dieser Baustein, nur zentriert; der Unterschied
   * ist eine Eigenschaft und kein zweiter Seitenkopf.
   */
  mittig?: boolean;
}

export function Kopf({ titel, symbol, beschreibung, aktionen, mittig = false }: KopfProps) {
  return (
    <div className="ara-kopf" data-mittig={mittig ? 'true' : undefined}>
      <div className="ara-kopf__text">
        <h1 className="ara-kopf__titel">
          {symbol && (
            <span className="ara-kopf__symbol" aria-hidden="true">
              {symbol}
            </span>
          )}
          {titel}
        </h1>
        {beschreibung && <p className="ara-kopf__satz">{beschreibung}</p>}
      </div>
      {aktionen && <div className="ara-kopf__aktionen">{aktionen}</div>}
    </div>
  );
}
