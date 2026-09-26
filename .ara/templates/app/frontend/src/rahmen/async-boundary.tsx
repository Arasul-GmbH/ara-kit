/**
 * Die eine Stelle, an der steht, was der Mensch sieht, solange etwas nicht da
 * ist.
 *
 * Jede Abfrage hat drei Ausgänge und nicht einen: sie läuft noch, sie ist
 * schiefgegangen, oder es ist etwas da. Wer das an jeder Seite neu
 * ausschreibt, schreibt es dreimal aus und beim vierten Mal nicht mehr; dann
 * steht dort ein leerer Kasten, und niemand sieht ihm an, ob geladen wird oder
 * ob es nichts gibt.
 *
 * Deshalb geht jede Abfrage dieser App durch `AsyncBoundary`, und die Seiten
 * darunter bekommen ihre Daten schon fertig. Ein `daten!` im Quelltext einer
 * Seite ist das Zeichen dafür, dass jemand daran vorbeigegangen ist.
 *
 * `Fehlerwand` ist der Fall darunter: ein Fehler beim Zeichnen, kein Fehler
 * beim Holen. Ohne sie bliebe der Rahmen im Gerät weiß, und der Mensch
 * sähe eine App, die es nicht gibt.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button, Ladezustand, Meldung } from "@marken";

export interface AsyncBoundaryProps<T> {
  abfrage: UseQueryResult<T>;
  /**
   * Was dasteht, solange geholt wird. Ein Satz wird zum `Ladezustand`; wo die
   * Form des Ergebnisses feststeht, ist ein Platzhalter in dieser Form besser
   * (`<Datenliste laedt />`), denn die Seite springt dann nicht. `null` zeigt
   * nichts, für eine Abfrage, deren Ergebnis meist gar nichts zeichnet.
   */
  laedt?: ReactNode;
  /** Die Überschrift, wenn es nicht klappt: "Die Vorgänge ließen sich nicht holen". */
  fehlerTitel?: string;
  children: (daten: T) => ReactNode;
}

/**
 * Ein Fehler endet nie in einer Sackgasse: neben dem Grund steht der Knopf,
 * der es noch einmal versucht. Ein Satz ohne Handlung lässt den Menschen
 * neu laden, und das verliert, was er schon eingegeben hatte.
 */
export function AsyncBoundary<T>({ abfrage, laedt = "Wird geladen", fehlerTitel = "Das hat nicht geklappt", children }: AsyncBoundaryProps<T>) {
  if (abfrage.isPending) {
    return typeof laedt === "string" ? <Ladezustand groesse="klein" meldung={`${laedt} …`} /> : <>{laedt}</>;
  }
  if (abfrage.isError) {
    return (
      <Meldung art="fehler" titel={fehlerTitel}>
        <p>{abfrage.error instanceof Error ? abfrage.error.message : "Die Schnittstelle hat nicht geantwortet."}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 self-start"
          onClick={() => abfrage.refetch()}
          disabled={abfrage.isFetching}
          data-kennzeichen="erneut"
        >
          {abfrage.isFetching ? "Wird erneut versucht …" : "Erneut versuchen"}
        </Button>
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
    // vor dem Kunden erklärt nichts und sieht nach Absturz aus.
    console.error("Die Oberfläche ist gestolpert", fehler, wo.componentStack);
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
