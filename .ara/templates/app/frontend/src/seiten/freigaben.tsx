/**
 * Die Freigaben: was auf eine Entscheidung wartet, und die eine, die man gerade prüft.
 *
 * Sie ist das Muster `Freigabe` der Bibliothek. Die App zeichnet keine eigene
 * Fassung davon: Original links (zoombar), erkannte Felder rechts, was zu
 * prüfen ist oben mit „prüfen" und ohne Prozentzahl, ein Satz, was bisher
 * geschah, frühere Stufen zum Aufklappen, und nach der Entscheidung wieder die
 * Liste. Welche Felder ein Mensch ändern darf, erklärt der Flow
 * (`ergebnis.aenderbar` in `flows/freigabe.md`), nicht diese Seite; das Gerät
 * weist eine Änderung an einem anderen Feld ab.
 *
 * **Welche geöffnet ist, steht in der Adresse** (`?freigabe=17`), aus demselben
 * Grund wie bei den Vorgängen: ein Verweis bleibt einer, und die Wege der App
 * bleiben eine Ebene tief, wie es `basis.ts` verlangt. Das Gerät nutzt genau
 * diesen Verweis (`zeigt_freigaben` in `app.json`): ein Klick in „Für Sie"
 * öffnet die App mit `?freigabe=<nummer>`, `app.tsx` führt hierher. Die
 * Nummer bleibt beim Neuladen stehen; eine, die es nicht (mehr) gibt, zeigt die
 * Liste mit einem kurzen Hinweis.
 *
 * **Was bei einem anderen liegt, steht darunter.** Hat der Administrator eine
 * Standardperson gesetzt, entscheidet nur sie; wer im Kreis ist, sieht die
 * Freigabe dann unter „Bei anderen" und kann sie mit „Übernehmen" an sich
 * ziehen, etwa wenn die Standardperson im Urlaub ist.
 *
 * **Das Muster wirft nicht, diese Seite sagt, was schiefging.** Es lässt das
 * Feld offen und den Text stehen, wenn ein Aufruf scheitert; den Satz dazu
 * zeigt diese Seite.
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Freigabe, Knopf, Kopf, Liste, ListenEintrag, Meldung, Leerzustand, type FreigabeEintrag } from "@marken";
import { AsyncBoundary } from "../rahmen/async-boundary";
import { useAblehnen, useBeiAnderen, useBestaetigen, useFreigaben, useUebernehmen } from "../freigaben";

export function Freigaben() {
  const [suche, setSuche] = useSearchParams();
  const freigaben = useFreigaben();
  const bestaetigen = useBestaetigen();
  const ablehnen = useAblehnen();
  const beiAnderen = useBeiAnderen();
  const uebernehmen = useUebernehmen();
  const [meldung, setzeMeldung] = useState<{ art: "erfolg" | "fehler"; text: string } | null>(null);
  const gewaehlt = suche.get("freigabe");

  const waehlen = (id: FreigabeEintrag["id"] | null) => {
    const naechste = new URLSearchParams(suche);
    if (id === null) naechste.delete("freigabe");
    else naechste.set("freigabe", String(id));
    setSuche(naechste);
  };

  const fehler = (text: unknown) =>
    setzeMeldung({ art: "fehler", text: text instanceof Error ? text.message : "Das hat nicht geklappt. Bitte erneut versuchen." });

  return (
    <>
      <Kopf titel="Freigaben" beschreibung="Was auf Ihre Entscheidung wartet." />
      {meldung && (
        <Meldung art={meldung.art} kennzeichen="freigabe-meldung">
          {meldung.text}
        </Meldung>
      )}
      {gewaehlt && !meldung && freigaben.data && !freigaben.data.some((eintrag) => String(eintrag.id) === gewaehlt) && (
        <Meldung art="hinweis" kennzeichen="freigabe-unbekannt">
          Diese Freigabe gibt es nicht mehr, oder sie wartet nicht auf Sie. Hier steht, was auf Ihre Entscheidung wartet.
        </Meldung>
      )}
      <AsyncBoundary
        abfrage={freigaben}
        laedt="Die Freigaben werden geholt"
        fehlerTitel="Die Freigaben ließen sich nicht holen"
      >
        {(eintraege) => (
          <Freigabe
            eintraege={eintraege}
            // Eine Adresse, die auf eine längst entschiedene Freigabe zeigt, führt zur Liste.
            gewaehlt={eintraege.some((eintrag) => String(eintrag.id) === gewaehlt) ? gewaehlt : null}
            beiWahl={waehlen}
            beiBestaetigen={async (eintrag, geaendert) => {
              setzeMeldung(null);
              try {
                await bestaetigen.mutateAsync({ id: eintrag.id, felder: geaendert });
                const anzahl = geaendert ? Object.keys(geaendert).length : 0;
                setzeMeldung({
                  art: "erfolg",
                  text: anzahl ? `Freigegeben, ${anzahl === 1 ? "1 Feld" : `${anzahl} Felder`} geändert.` : "Freigegeben.",
                });
              } catch (grund) {
                fehler(grund);
                throw grund;
              }
            }}
            beiAblehnen={async (eintrag, grund) => {
              setzeMeldung(null);
              try {
                await ablehnen.mutateAsync({ id: eintrag.id, grund });
                setzeMeldung({ art: "erfolg", text: "Abgelehnt." });
              } catch (fehlerGrund) {
                fehler(fehlerGrund);
                throw fehlerGrund;
              }
            }}
            leer={
              <Leerzustand
                titel="Nichts wartet auf Ihre Entscheidung"
                beschreibung="Sobald ein Vorgang auf Sie wartet, steht er hier."
              />
            }
          />
        )}
      </AsyncBoundary>
      {!gewaehlt && beiAnderen.data && beiAnderen.data.length > 0 && (
        <Liste beschriftung="Bei anderen">
          {beiAnderen.data.map((eintrag) => (
            <ListenEintrag
              key={eintrag.id}
              titel={eintrag.titel}
              unterzeile={eintrag.liegtBei ? `Liegt bei ${eintrag.liegtBei}` : "Liegt bei allen"}
              kennzeichen="freigabe-bei-anderen"
              hinweis={
                <Knopf
                  gesperrt={uebernehmen.isPending}
                  onKlick={async () => {
                    setzeMeldung(null);
                    try {
                      await uebernehmen.mutateAsync(eintrag.id);
                      setzeMeldung({ art: "erfolg", text: "Übernommen. Die Freigabe liegt jetzt bei Ihnen." });
                    } catch (grund) {
                      fehler(grund);
                    }
                  }}
                >
                  Übernehmen
                </Knopf>
              }
            />
          ))}
        </Liste>
      )}
    </>
  );
}
