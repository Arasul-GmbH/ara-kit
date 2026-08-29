/**
 * Die Liste: die Vorgaenge, die es gibt, und der eine, den man gerade ansieht.
 *
 * Sie ist das Muster `Datenliste` der Bibliothek. Das ist mehr als eine
 * Tabelle: sortieren, suchen, ein Leerzustand, und unter 900 Pixeln wird aus
 * der Tabelle eine Kartenliste. Vier Dinge, und jede Seite, die sie einzeln
 * loest, loest sie anders. Bis zum 29.08.2026 hatte die Vorlage sie als Reihe
 * aus `Liste` und `ListenEintrag`, weil der Spiegel nur die sechs Bausteine
 * kannte.
 *
 * **Die Spalten sind Daten und kein Markup.** `zelle` sagt, was dasteht,
 * `wert` sagt, wonach sortiert und worin gesucht wird. Beides getrennt, weil
 * das, was man sieht, selten das ist, wonach man sortiert: „vor 3 Tagen"
 * sortiert nach einem Zeitstempel.
 *
 * **Welcher ausgewaehlt ist, steht in der Adresse** (`?nr=17`) und nicht im
 * Zustand dieser Seite. Zwei Gruende: ein Verweis auf einen Vorgang bleibt
 * einer, und die Wege der App bleiben eine Ebene tief, wie es `basis.ts`
 * verlangt.
 */

import { useSearchParams } from "react-router-dom";
import { Datenliste, Karte, Kopf, Meldung, type Spalte } from "@marken";
import { AsyncBoundary } from "../rahmen/async-boundary";
import { ANSICHTEN, ansichtAus, type Ansicht } from "../rahmen/seitenleiste";
import { STAND, useLage, useVorgaenge, zeitpunkt, type Vorgang } from "../vorgaenge";

/** Wie die Ansicht heisst, in denselben Worten wie in der Seitenleiste. */
function wortFuer(ansicht: Ansicht): string {
  return ANSICHTEN.find((eintrag) => eintrag.id === ansicht)?.wort ?? "Alle";
}

function passt(vorgang: Vorgang, ansicht: Ansicht): boolean {
  if (ansicht === "offen") return vorgang.status === "wartet";
  if (ansicht === "entschieden") return vorgang.status !== "wartet";
  return true;
}

/** Wie ein Vorgang steht, als Wort mit der Farbe daneben. */
function Stand({ vorgang }: { vorgang: Vorgang }) {
  const stand = STAND[vorgang.status] ?? { wort: vorgang.status, art: "hinweis" as const };
  // Die Farbe steht NEBEN dem Wort und nicht anstelle davon: ein Stand, der
  // nur an seiner Farbe zu erkennen ist, ist fuer manche keiner.
  return (
    <span className="stand" data-art={stand.art}>
      {stand.wort}
    </span>
  );
}

const SPALTEN: ReadonlyArray<Spalte<Vorgang>> = [
  {
    schluessel: "titel",
    titel: "Worum es geht",
    zelle: (vorgang) => vorgang.titel,
    wert: (vorgang) => vorgang.titel,
  },
  {
    schluessel: "von",
    titel: "Eingereicht von",
    zelle: (vorgang) => vorgang.von,
    wert: (vorgang) => vorgang.von,
  },
  {
    schluessel: "gestellt",
    titel: "Wann",
    zelle: (vorgang) => zeitpunkt(vorgang.gestellt),
    // Sortiert wird nach dem Zeitstempel und nicht nach dem, was dasteht:
    // „29.08.2026, 09:12" als Zeichenkette sortiert nach dem Tag im Monat.
    wert: (vorgang) => vorgang.gestellt,
  },
  {
    schluessel: "status",
    titel: "Stand",
    zelle: (vorgang) => <Stand vorgang={vorgang} />,
    wert: (vorgang) => STAND[vorgang.status]?.wort ?? vorgang.status,
  },
];

function Einzelheiten({ vorgang }: { vorgang: Vorgang }) {
  return (
    <Karte titel={vorgang.titel} hinweis={<Stand vorgang={vorgang} />} kennzeichen="vorgang">
      <p>
        {vorgang.von}, {zeitpunkt(vorgang.gestellt)}
      </p>
      {vorgang.text && vorgang.text !== "ohne Angabe" && <p>{vorgang.text}</p>}
      {vorgang.entschieden_von && (
        <p>
          entschieden von {vorgang.entschieden_von}
          {vorgang.begruendung ? `: ${vorgang.begruendung}` : ""}
        </p>
      )}
      {vorgang.bemerkung && <p>{vorgang.bemerkung}</p>}
      {vorgang.hinweis && <p>{vorgang.hinweis}</p>}
    </Karte>
  );
}

export function Vorgaenge() {
  const [suche, setSuche] = useSearchParams();
  const ansicht = ansichtAus(suche);
  const gewaehlt = Number(suche.get("nr")) || null;
  const lage = useLage();
  const vorgaenge = useVorgaenge();

  const waehlen = (id: number) => {
    const naechste = new URLSearchParams(suche);
    if (gewaehlt === id) naechste.delete("nr");
    else naechste.set("nr", String(id));
    setSuche(naechste);
  };

  return (
    <>
      {/* Der Weg zum Formular steht in der Seitenleiste und nicht auch noch
          hier: zwei Knoepfe fuer dieselbe Handlung sind einer zu viel. */}
      <Kopf titel="Vorgänge" beschreibung="Eingereicht hier, entschieden in Arasul." />

      {/* Warum kein Flow anhaelt, sagt die App selbst: "ohne Arasul" und "das
          Geraet hat den Wert nicht gesetzt" sehen gleich aus und sind es nicht. */}
      <AsyncBoundary abfrage={lage} laedt="Rahmen wird gelesen">
        {(stand) =>
          stand.arasul ? null : (
            <Meldung art="warnung" titel="Über diese Vorgänge entscheidet niemand">
              {stand.hinweis ?? "Diese App erreicht kein Arasul."} Ein Vorgang wird angenommen und
              bleibt liegen.
            </Meldung>
          )
        }
      </AsyncBoundary>

      <AsyncBoundary abfrage={vorgaenge} laedt="Vorgänge werden geholt">
        {(alle) => {
          const sichtbar = alle.filter((vorgang) => passt(vorgang, ansicht));
          const offen = sichtbar.find((vorgang) => vorgang.id === gewaehlt);
          return (
            <>
              <Datenliste
                daten={sichtbar}
                spalten={SPALTEN}
                kennung={(vorgang) => String(vorgang.id)}
                beschriftung={`${wortFuer(ansicht)}: ${sichtbar.length} von ${alle.length}`}
                filter
                filterPlatzhalter="In den Vorgängen suchen …"
                leer={{
                  titel: alle.length ? "In dieser Ansicht liegt nichts." : "Noch kein Vorgang eingereicht.",
                }}
                aufZeile={(vorgang) => waehlen(vorgang.id)}
              />
              {offen && <Einzelheiten vorgang={offen} />}
            </>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
