/**
 * Muster Dokumente: die Seite. Hochladen, die Liste, und das eine Dokument,
 * das man gerade ansieht.
 *
 * Liegt in einer App aus der Vorlage unter `frontend/src/seiten/dokumente.tsx`.
 * Eingehängt wird sie mit einem Weg in `app.tsx` und einem Eintrag in
 * `rahmen/seitenleiste.tsx`:
 *
 *   <Route path="/dokumente" element={<Dokumente />} />
 *
 *   {
 *     titel: "Dokumente",
 *     eintraege: [{ kennung: "weg-dokumente", name: "Dokumente", symbol: <FileTextIcon />,
 *                   aktiv: ort.pathname === "/dokumente", aufKlick: () => gehe("/dokumente") }],
 *   }
 *
 * Drei Muster der Bibliothek tragen sie: `Dateiablage` nimmt die Datei an
 * (ziehen oder auswählen, mit der Tastatur bedienbar), `Datenliste` zeigt,
 * was da ist, `Dokumentanzeige` zeigt das eine, das gewählt ist: PDF mit
 * Seiten, Zoom und Vollbild, Bilder ebenso. Die Anzeige bekommt die Adresse
 * der Bytes und die Art dazu, denn die Adresse trägt keine Endung, an der sie
 * es selbst erkennen könnte.
 *
 * **Welches gezeigt wird, steht in der Adresse** (`?nr=17`) und nicht im
 * Zustand dieser Seite: die Wege der App bleiben eine Ebene tief, und ein
 * Verweis auf ein Dokument bleibt einer.
 *
 * **Die Vorschau der Dateiablage ist hier aus.** Sie zeigte die gewählte Datei
 * schon vor dem Hochladen, und dann stünden zwei Anzeigen auf einer Seite.
 * Gezeigt wird, was abgelegt ist.
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Dateiablage,
  Datenliste,
  Dokumentanzeige,
  Karte,
  Kopf,
  Meldung,
  type Spalte,
} from "@marken";
import { AsyncBoundary } from "../rahmen/async-boundary";
import {
  anzeigeArt,
  dokumentAdresse,
  groesseInWorten,
  useDokumente,
  useEntfernen,
  useHochladen,
  type Dokument,
} from "../dokumente";
import { zeitpunkt } from "../vorgaenge";

const SPALTEN: ReadonlyArray<Spalte<Dokument>> = [
  { schluessel: "name", titel: "Datei", zelle: (d) => d.name, wert: (d) => d.name },
  { schluessel: "groesse", titel: "Größe", zelle: (d) => groesseInWorten(d.groesse), wert: (d) => d.groesse },
  { schluessel: "von", titel: "Abgelegt von", zelle: (d) => d.von, wert: (d) => d.von },
  { schluessel: "abgelegt", titel: "Wann", zelle: (d) => zeitpunkt(d.abgelegt), wert: (d) => d.abgelegt },
];

function Ansicht({ dokument, aufEntfernen, entfernt }: { dokument: Dokument; aufEntfernen: () => void; entfernt: boolean }) {
  return (
    <Karte
      titel={dokument.name}
      hinweis={`${dokument.von}, ${zeitpunkt(dokument.abgelegt)}`}
      kennzeichen="dokument"
    >
      <Dokumentanzeige
        quelle={dokumentAdresse(dokument.id)}
        art={anzeigeArt(dokument.art)}
        name={dokument.name}
        hoehe="32rem"
        kennzeichen="dokument-anzeige"
      />
      <div className="flex justify-end pt-ui-2">
        <Button variant="ghost" onClick={aufEntfernen} disabled={entfernt} data-kennzeichen="entfernen">
          Entfernen
        </Button>
      </div>
    </Karte>
  );
}

export function Dokumente() {
  const [suche, setSuche] = useSearchParams();
  const gewaehlt = Number(suche.get("nr")) || null;
  const [dateien, setDateien] = useState<File[]>([]);
  const liste = useDokumente();
  const hochladen = useHochladen();
  const entfernen = useEntfernen();

  const waehlen = (id: number | null) => {
    const naechste = new URLSearchParams(suche);
    if (id === null || gewaehlt === id) naechste.delete("nr");
    else naechste.set("nr", String(id));
    setSuche(naechste);
  };

  const absenden = () => {
    const datei = dateien[0];
    if (!datei || hochladen.isPending) return;
    hochladen.mutate(datei, {
      onSuccess: ({ dokument }) => {
        setDateien([]);
        waehlen(dokument.id);
      },
    });
  };

  return (
    <>
      <Kopf titel="Dokumente" beschreibung="PDF und Bilder, abgelegt in dieser App und hier angesehen." />

      {hochladen.isError && (
        <Meldung art="fehler" titel="Das Dokument ist nicht angekommen">
          {hochladen.error instanceof Error ? hochladen.error.message : "Die Schnittstelle hat nicht geantwortet."}
        </Meldung>
      )}

      <AsyncBoundary abfrage={liste} laedt="Dokumente werden geholt">
        {({ dokumente, grenze_bytes }) => {
          const offen = dokumente.find((dokument) => dokument.id === gewaehlt);
          return (
            <>
              <Karte titel="Hochladen" kennzeichen="hochladen">
                <Dateiablage
                  dateien={dateien}
                  aufDateien={setDateien}
                  mehrere={false}
                  akzeptiert=".pdf,image/*"
                  maxGroesse={grenze_bytes}
                  vorschau={false}
                  disabled={hochladen.isPending}
                />
                <div className="flex justify-end pt-ui-2">
                  <Button
                    variant="solid"
                    onClick={absenden}
                    disabled={!dateien.length || hochladen.isPending}
                    data-kennzeichen="hochladen"
                  >
                    {hochladen.isPending ? "Wird hochgeladen …" : "Hochladen"}
                  </Button>
                </div>
              </Karte>

              <Datenliste
                daten={dokumente}
                spalten={SPALTEN}
                kennung={(dokument) => String(dokument.id)}
                beschriftung={`Dokumente: ${dokumente.length}`}
                filter
                filterPlatzhalter="In den Dokumenten suchen …"
                leer={{ titel: "Noch kein Dokument abgelegt." }}
                aufZeile={(dokument) => waehlen(dokument.id)}
              />

              {offen && (
                <Ansicht
                  dokument={offen}
                  entfernt={entfernen.isPending}
                  aufEntfernen={() => entfernen.mutate(offen.id, { onSuccess: () => waehlen(null) })}
                />
              )}
            </>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
