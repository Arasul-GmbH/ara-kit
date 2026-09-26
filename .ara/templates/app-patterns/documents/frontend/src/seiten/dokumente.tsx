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
 * **Liste und Dokument stehen ab 900 px nebeneinander**, das Dokument
 * mitlaufend, und darunter als Blatt von unten. So hält es die Liste der
 * Vorlage auch (`seiten/liste.tsx`): stünde das Dokument unter der Liste, sähe
 * bei 200 Dateien niemand, dass sich nach dem Klick etwas getan hat. Die
 * Schwelle ist die eine des Produkts, `useSchmalesFenster`. Das Hochladen
 * steht über beidem, es gehört zu keiner Zeile.
 *
 * **Jede Zeile ist per Tastatur wählbar.** Die `Datenliste` kennt nur den
 * Klick auf die Zeile; der Dateiname ist deshalb ein Knopf, Tab führt hin,
 * Eingabe wählt, die Pfeile gehen eine Zeile weiter. Gewählt ist, wo
 * `aria-current` steht, und `stil.css` zeichnet die Zeile danach
 * (`zeile-wahl`). Unter 900 px ist die ganze Karte der Knopf, dort trägt der
 * Name nur die Markierung.
 *
 * **Die Vorschau der Dateiablage ist hier aus.** Sie zeigte die gewählte Datei
 * schon vor dem Hochladen, und dann stünden zwei Anzeigen auf einer Seite.
 * Gezeigt wird, was abgelegt ist.
 */

import { useMemo, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Dateiablage,
  Datenliste,
  Dokumentanzeige,
  Karte,
  Kopf,
  Leerzustand,
  Meldung,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useSchmalesFenster,
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

/** Mit den Pfeilen zum Namen der Zeile darüber oder darunter. */
function wandern(ereignis: KeyboardEvent<HTMLButtonElement>) {
  if (ereignis.key !== "ArrowDown" && ereignis.key !== "ArrowUp") return;
  const zeile = ereignis.currentTarget.closest("tr");
  const nachbar = ereignis.key === "ArrowDown" ? zeile?.nextElementSibling : zeile?.previousElementSibling;
  const ziel = nachbar?.querySelector<HTMLButtonElement>(".zeile-wahl");
  if (!ziel) return;
  ereignis.preventDefault();
  ziel.focus();
}

function useSpalten(gewaehlt: number | null, waehlen: (id: number) => void, schmal: boolean) {
  return useMemo<ReadonlyArray<Spalte<Dokument>>>(
    () => [
      {
        schluessel: "name",
        titel: "Datei",
        zelle: (d) => {
          const aktuell = gewaehlt === d.id ? "true" : undefined;
          // Ein Dateiname ist oft ein langes Wort ohne Leerzeichen:
          // `anywhere` bricht es, sonst rollte die Tabelle neben dem Dokument.
          const name = <span className="line-clamp-2 whitespace-normal [overflow-wrap:anywhere]">{d.name}</span>;
          if (schmal) {
            return (
              <span className="zeile-wahl" aria-current={aktuell}>
                {name}
              </span>
            );
          }
          return (
            <button
              type="button"
              className="zeile-wahl w-full rounded-sm text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-current={aktuell}
              onClick={(ereignis) => {
                ereignis.stopPropagation();
                waehlen(d.id);
              }}
              onKeyDown={wandern}
            >
              {name}
            </button>
          );
        },
        wert: (d) => d.name,
      },
      { schluessel: "groesse", titel: "Größe", zelle: (d) => groesseInWorten(d.groesse), wert: (d) => d.groesse },
      {
        schluessel: "von",
        titel: "Abgelegt von",
        zelle: (d) => <span className="whitespace-normal [overflow-wrap:anywhere]">{d.von}</span>,
        wert: (d) => d.von,
      },
      { schluessel: "abgelegt", titel: "Wann", zelle: (d) => zeitpunkt(d.abgelegt), wert: (d) => d.abgelegt },
    ],
    [gewaehlt, waehlen, schmal]
  );
}

interface AnsichtProps {
  dokument: Dokument;
  aufEntfernen: () => void;
  entfernt: boolean;
}

/** Das Dokument selbst und der Weg, es loszuwerden: in der Karte wie im Blatt dasselbe. */
function Anzeige({ dokument, aufEntfernen, entfernt, hoehe }: AnsichtProps & { hoehe: string }) {
  return (
    <>
      <Dokumentanzeige
        quelle={dokumentAdresse(dokument.id)}
        art={anzeigeArt(dokument.art)}
        name={dokument.name}
        hoehe={hoehe}
        kennzeichen="dokument-anzeige"
      />
      <div className="flex justify-end pt-ui-2">
        <Button variant="ghost" onClick={aufEntfernen} disabled={entfernt} data-kennzeichen="entfernen">
          Entfernen
        </Button>
      </div>
    </>
  );
}

/**
 * Das Dokument neben der Liste. Der Name steht ganz da: der Titel der Karte
 * kürzte ihn in der schmalen Spalte auf eine Zeile, und ein Dateiname ist oft
 * lang.
 */
function Ansicht(props: AnsichtProps) {
  const { dokument } = props;
  return (
    <Karte kennzeichen="dokument">
      <h2 className="text-ui-lg font-semibold break-words text-foreground">{dokument.name}</h2>
      <p className="mb-3 text-ui-sm text-muted-foreground">
        {dokument.von}, {zeitpunkt(dokument.abgelegt)}
      </p>
      <Anzeige {...props} hoehe="32rem" />
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
  const schmal = useSchmalesFenster();

  const waehlen = (id: number | null) => {
    const naechste = new URLSearchParams(suche);
    if (id === null) naechste.delete("nr");
    else naechste.set("nr", String(id));
    setSuche(naechste);
  };
  const spalten = useSpalten(gewaehlt, waehlen, schmal);

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
          const ansicht = (dokument: Dokument): AnsichtProps => ({
            dokument,
            entfernt: entfernen.isPending,
            aufEntfernen: () => entfernen.mutate(dokument.id, { onSuccess: () => waehlen(null) }),
          });
          const tabelle = (
            <Datenliste
              daten={dokumente}
              spalten={spalten}
              kennung={(dokument) => String(dokument.id)}
              beschriftung={`Dokumente: ${dokumente.length}`}
              filter
              filterPlatzhalter="In den Dokumenten suchen …"
              leer={{ titel: "Noch kein Dokument abgelegt." }}
              aufZeile={(dokument) => waehlen(dokument.id)}
            />
          );
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

              {schmal ? (
                <>
                  {tabelle}
                  <Sheet open={Boolean(offen)} onOpenChange={(auf) => !auf && waehlen(null)}>
                    <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                      {offen && (
                        <>
                          <SheetHeader>
                            <SheetTitle className="pr-8 leading-snug break-words">{offen.name}</SheetTitle>
                            <SheetDescription>
                              {offen.von}, {zeitpunkt(offen.abgelegt)}
                            </SheetDescription>
                          </SheetHeader>
                          <div data-testid="dokument">
                            <Anzeige {...ansicht(offen)} hoehe="60dvh" />
                          </div>
                        </>
                      )}
                    </SheetContent>
                  </Sheet>
                </>
              ) : (
                <div data-teilung className="grid grid-cols-[minmax(0,3fr)_minmax(14rem,2fr)] items-start gap-4">
                  {tabelle}
                  <aside aria-label="Einzelheiten" className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                    {offen ? (
                      <Ansicht {...ansicht(offen)} />
                    ) : (
                      <Leerzustand
                        titel="Kein Dokument gewählt"
                        beschreibung="Eine Zeile anklicken, oder mit Tab zum Dateinamen gehen und Eingabe drücken."
                      />
                    )}
                  </aside>
                </div>
              )}
            </>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
