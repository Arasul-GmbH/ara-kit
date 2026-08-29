/**
 * Die Datenliste: die Vorgaenge, die es gibt, und der eine, den man gerade
 * ansieht.
 *
 * Zwei Bausteine tragen sie. `Liste` und `ListenEintrag` sind die Reihe: ein
 * Eintrag ist ein Knopf, sobald er etwas tut, und damit nimmt er Tastatur und
 * Screenreader mit. `Karte` ist der eine ausgewaehlte Vorgang darunter, mit
 * allem, was an ihm haengt.
 *
 * **Welcher ausgewaehlt ist, steht in der Adresse** (`?nr=17`) und nicht im
 * Zustand dieser Seite. Zwei Gruende: ein Verweis auf einen Vorgang bleibt
 * einer, und die Wege der App bleiben eine Ebene tief, wie es `basis.ts`
 * verlangt.
 *
 * Was hier steht, ist der Ablauf und keine Gestaltung. Kein `<div>` mit
 * eigener Klasse, wo ein Baustein dasselbe tut: die zweite Karte neben der
 * ersten ist der Anfang des zweiten Erscheinungsbilds.
 */

import { useSearchParams } from "react-router-dom";
import { Karte, Kopf, Liste as Reihe, ListenEintrag, Meldung } from "@marken";
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
          if (!sichtbar.length) {
            return (
              <Meldung>
                {alle.length ? "In dieser Ansicht liegt nichts." : "Noch kein Vorgang eingereicht."}
              </Meldung>
            );
          }
          const offen = sichtbar.find((vorgang) => vorgang.id === gewaehlt);
          return (
            <>
              <Reihe beschriftung={`${wortFuer(ansicht)}: ${sichtbar.length} von ${alle.length}`}>
                {sichtbar.map((vorgang) => (
                  <ListenEintrag
                    key={vorgang.id}
                    titel={vorgang.titel}
                    hinweis={<Stand vorgang={vorgang} />}
                    aktiv={vorgang.id === gewaehlt}
                    kennzeichen={`vorgang-${vorgang.id}`}
                    onKlick={() => waehlen(vorgang.id)}
                  />
                ))}
              </Reihe>
              {offen && <Einzelheiten vorgang={offen} />}
            </>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
