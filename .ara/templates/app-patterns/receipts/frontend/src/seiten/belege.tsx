/**
 * Muster Belege: die Belege am Vorgang. Kein eigener Weg, sondern ein Teil der
 * Einzelheiten eines Vorgangs in `seiten/liste.tsx`, unter den Angaben; `--add-pattern receipts`
 * setzt ihn dort ein:
 *
 *   import { BelegeAmVorgang } from "./belege";
 *
 *   // in `Angaben`, als letzte Angabe:
 *   <Angabe name="Belege">
 *     <BelegeAmVorgang vorgang={vorgang.id} offen={vorgang.status === "in arbeit"} />
 *   </Angabe>
 *
 * Angehängt wird nur, solange der Vorgang in Arbeit ist: danach steht die
 * Ablage nicht mehr da, und das Backend antwortete ohnehin 409.
 *
 * Wer einen Vorgang sieht, sieht seine Belege und legt einen dazu; wer ihn
 * nicht sieht, bekommt vom Backend 404 und sieht auch keinen Beleg. Angesehen
 * wird ein Beleg auf der Seite des Musters Dokumente, unter derselben Nummer
 * (`?nr=` in der Adresse); mit Muster 6 liest ihn dort auch die App aus.
 *
 * **Als Beleg gehen PDF, PNG und JPEG**, die Arten, die das Gerät als Original liest; ein
 * anderes Format weist das Backend mit einem Satz ab.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Dateiablage, Datenliste, Meldung, type Spalte } from "@marken";
import { AsyncBoundary } from "../rahmen/async-boundary";
import { useBelegAnhaengen, useBelege, type Beleg } from "../belege";
import { zeitpunkt } from "../vorgaenge";

export function BelegeAmVorgang({ vorgang, offen = true }: { vorgang: number; offen?: boolean }) {
  const belege = useBelege(vorgang);
  const anhaengen = useBelegAnhaengen(vorgang);
  const [dateien, setDateien] = useState<File[]>([]);
  const weiter = useNavigate();

  const spalten: ReadonlyArray<Spalte<Beleg>> = [
    {
      schluessel: "name",
      titel: "Beleg",
      zelle: (b) => (
        // Ein Knopf in der Textfarbe und kein blauer Verweis: Blau erreicht als
        // Text im hellen Thema keine 4,5:1. Tab führt hin, Eingabe öffnet.
        <Button
          variant="ghost"
          size="sm"
          className="h-auto justify-start px-1 text-left whitespace-normal [overflow-wrap:anywhere]"
          onClick={() => weiter(`/dokumente?nr=${b.id}`)}
        >
          {b.name}
        </Button>
      ),
      wert: (b) => b.name,
    },
    { schluessel: "abgelegt", titel: "Abgelegt", zelle: (b) => zeitpunkt(b.abgelegt), wert: (b) => b.abgelegt },
  ];

  const absenden = () => {
    const datei = dateien[0];
    if (!datei || anhaengen.isPending) return;
    anhaengen.mutate(datei, { onSuccess: () => setDateien([]) });
  };

  return (
    <div className="flex flex-col gap-2" data-kennzeichen="belege">
      <AsyncBoundary
        abfrage={belege}
        laedt={<Datenliste daten={[]} spalten={spalten} kennung={() => ""} beschriftung="Belege" laedt />}
        fehlerTitel="Die Belege ließen sich nicht holen"
      >
        {({ belege: liste }) => (
          <Datenliste
            daten={liste}
            spalten={spalten}
            kennung={(b) => String(b.id)}
            beschriftung={`Belege: ${liste.length}`}
            leer={{ titel: "Noch kein Beleg an diesem Vorgang." }}
          />
        )}
      </AsyncBoundary>
      {anhaengen.isError && (
        <Meldung art="fehler" titel="Der Beleg ist nicht angekommen">
          {anhaengen.error instanceof Error ? anhaengen.error.message : "Die App hat keine Verbindung zum Gerät."}
        </Meldung>
      )}
      {offen && (
        <>
          <Dateiablage
            dateien={dateien}
            aufDateien={setDateien}
            mehrere={false}
            akzeptiert=".pdf,.png,.jpg,.jpeg"
            vorschau={false}
            disabled={anhaengen.isPending}
          />
          <Button variant="outline" onClick={absenden} data-kennzeichen="beleg-anhaengen" className="self-end">
            {anhaengen.isPending ? "Wird angehängt …" : "Beleg anhängen"}
          </Button>
        </>
      )}
    </div>
  );
}
