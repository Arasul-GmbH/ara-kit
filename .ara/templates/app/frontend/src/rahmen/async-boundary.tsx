/**
 * Die eine Stelle, an der steht, was der Mensch sieht, solange etwas nicht da
 * ist.
 *
 * Jede Abfrage hat drei Ausgaenge und nicht einen: sie laeuft noch, sie ist
 * schiefgegangen, oder es ist etwas da. Wer das an jeder Seite neu
 * ausschreibt, schreibt es dreimal aus und beim vierten Mal nicht mehr; dann
 * steht dort ein leerer Kasten, und niemand sieht ihm an, ob geladen wird oder
 * ob es nichts gibt.
 *
 * Deshalb geht jede Abfrage dieser App durch `AsyncBoundary`, und die Seiten
 * darunter bekommen ihre Daten schon fertig. Ein `daten!` im Quelltext einer
 * Seite ist das Zeichen dafuer, dass jemand daran vorbeigegangen ist.
 *
 * `Fehlerwand` ist der Fall darunter: ein Fehler beim Zeichnen, kein Fehler
 * beim Holen. Ohne sie bliebe der Rahmen im Geraet weiss, und der Mensch
 * saehe eine App, die es nicht gibt.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Meldung } from "@marken";

export interface AsyncBoundaryProps<T> {
  abfrage: UseQueryResult<T>;
  /** Was dasteht, solange geholt wird. Ein Satz, keine Drehscheibe. */
  laedt?: string;
  children: (daten: T) => ReactNode;
}

export function AsyncBoundary<T>({ abfrage, laedt = "Wird geladen", children }: AsyncBoundaryProps<T>) {
  if (abfrage.isPending) {
    return <Meldung>{laedt} …</Meldung>;
  }
  if (abfrage.isError) {
    return (
      <Meldung art="fehler" titel="Das hat nicht geklappt">
        {abfrage.error instanceof Error ? abfrage.error.message : "Die Schnittstelle hat nicht geantwortet."}
      </Meldung>
    );
  }
  return <>{children(abfrage.data)}</>;
}

interface WandProps {
  children: ReactNode;
}

interface WandZustand {
  fehler: Error | null;
}

export class Fehlerwand extends Component<WandProps, WandZustand> {
  override state: WandZustand = { fehler: null };

  static getDerivedStateFromError(fehler: Error): WandZustand {
    return { fehler };
  }

  override componentDidCatch(fehler: Error, wo: ErrorInfo) {
    // Ins Protokoll des Browsers, nicht auf den Bildschirm: ein Stapelauszug
    // vor dem Kunden erklaert nichts und sieht nach Absturz aus.
    console.error("Die Oberflaeche ist gestolpert", fehler, wo.componentStack);
  }

  override render() {
    if (!this.state.fehler) return this.props.children;
    return (
      <div className="ara-strom">
        <Meldung art="fehler" titel="Die Seite ist stehengeblieben">
          {this.state.fehler.message} Neu laden hilft meistens. Wenn nicht, gehoert das in die
          Werkstatt und nicht in einen zweiten Versuch.
        </Meldung>
      </div>
    );
  }
}
