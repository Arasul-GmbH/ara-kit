/**
 * Muster Belege: die Liste aller Belege, die dieser Mensch sieht, mit Mandant und Betrag. Eine
 * eigene Seite unter `/belege` mit einem Eintrag in der Seitenleiste; `--add-pattern receipts`
 * setzt beides ein.
 *
 * Im Fremdtest vom 06.10.2026 war die Spalte Mandant auf „Probe Mü…“ gekürzt, und ein Betrag stand
 * nirgends. Hier bricht der Mandant um, statt zu kürzen, und der Betrag steht rechtsbündig. Er kommt
 * aus dem Abschluss des Laufs (`GET api/belege/betraege`), steht also erst nach der Prüfung fest;
 * vorher steht ein Strich. Welches Feld des Flows der Betrag ist, sagt `betragFeld` in
 * `server.mjs`. Ein Klick öffnet den Vorgang mit seinen Belegen und seinem Verlauf.
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Datenliste, Kopf, type Spalte } from "@marken";
import { AsyncBoundary } from "../rahmen/async-boundary";
import { hole } from "../rahmen/schnittstelle";
import { useMandanten } from "../mandanten";
import { STAND, useVorgaenge, type Vorgang } from "../vorgaenge";

interface Zeile extends Vorgang {
  mandantName: string;
  betrag: string | null;
}

function useBetraege() {
  return useQuery({
    queryKey: ["belege", "betraege"],
    queryFn: () => hole<{ betraege: Record<string, unknown> }>("api/belege/betraege"),
  });
}

const SPALTEN: ReadonlyArray<Spalte<Zeile>> = [
  { schluessel: "titel", titel: "Beleg", zelle: (z) => z.titel, wert: (z) => z.titel },
  // Der Mandant bricht um, statt mit „…“ zu enden: zwei Mandanten mit demselben Anfang sind sonst nicht zu unterscheiden.
  { schluessel: "mandant", titel: "Mandant", zelle: (z) => <span className="[overflow-wrap:anywhere]">{z.mandantName}</span>, wert: (z) => z.mandantName },
  { schluessel: "betrag", titel: "Betrag", zelle: (z) => z.betrag ?? "–", wert: (z) => z.betrag ?? "", ausrichtung: "rechts" },
  { schluessel: "stand", titel: "Stand", zelle: (z) => STAND[z.status]?.wort ?? z.status, wert: (z) => z.status },
];

export function Belegliste() {
  const vorgaenge = useVorgaenge();
  const betraege = useBetraege();
  const mandanten = useMandanten();
  const weiter = useNavigate();
  const namen = new Map((mandanten.data?.mandanten ?? []).map((m) => [m.id, m.name]));
  return (
    <>
      <Kopf titel="Belege" beschreibung="Hochgeladen, vom Gerät gelesen, geprüft. Der Betrag steht nach der Prüfung da." />
      <AsyncBoundary abfrage={vorgaenge} laedt={<Datenliste daten={[]} spalten={SPALTEN} kennung={() => ""} beschriftung="Belege" laedt />} fehlerTitel="Die Belege ließen sich nicht holen">
        {(liste) => {
          const zeilen: Zeile[] = liste.map((v) => {
            const mandant = (v as Vorgang & { mandant?: number | null }).mandant ?? null;
            const betrag = betraege.data?.betraege?.[String(v.id)];
            return {
              ...v,
              mandantName: mandant === null ? "–" : namen.get(mandant) ?? `Mandant ${mandant}`,
              betrag: betrag === null || betrag === undefined || betrag === "" ? null : String(betrag),
            };
          });
          return (
            <Datenliste
              daten={zeilen}
              spalten={SPALTEN}
              kennung={(z) => String(z.id)}
              beschriftung={`Belege: ${zeilen.length}`}
              filter
              filterPlatzhalter="In den Belegen suchen …"
              leer={{ titel: "Noch kein Beleg." }}
              aufZeile={(z) => weiter(`/?nr=${z.id}`)}
            />
          );
        }}
      </AsyncBoundary>
    </>
  );
}
