/**
 * Muster Dokument auslesen: die Seite. Ein Dokument wählen, auslesen lassen,
 * die Felder neben dem Dokument prüfen, und das Protokoll darunter.
 *
 * Setzt das Muster Dokumente voraus (`dokumente.ts`, die Wege und die Tabelle).
 * Liegt unter `frontend/src/seiten/auslesen.tsx` und wird eingehängt wie jede
 * Seite: ein Weg in `app.tsx`, ein Eintrag in `rahmen/seitenleiste.tsx`.
 *
 *   <Route path="/auslesen" element={<Auslesen />} />
 *
 * **Die Felder stehen beim Dokument**, nicht allein: wer einen Vorschlag
 * übernimmt, soll ihn am Beleg prüfen können, ohne ein zweites Fenster. Was die
 * App daran auszusetzen hat, steht als Meldung darüber und nicht versteckt in
 * einer Spalte. Welches Modell es war und ob die Texterkennung lief, steht im
 * Protokoll: das gehört zur Nachvollziehbarkeit, nicht zur Entscheidung.
 *
 * **Liste und Ergebnis stehen ab 900 px nebeneinander**, das Ergebnis
 * mitlaufend, und darunter als Blatt von unten. So hält es die Liste der
 * Vorlage auch (`seiten/liste.tsx`). In der schmalen Spalte daneben stehen
 * Dokument und Felder untereinander: zwei Spalten in ihr ließen dem Beleg
 * keine lesbare Breite. Die Schwelle ist die eine des Produkts,
 * `useSchmalesFenster`.
 *
 * **Auswahl und Kürzung sind die der Bibliothek**, wie in der Liste der
 * Vorlage: `gewaehlt` markiert die Zeile mit `aria-selected`, `kuerzen` hält
 * einen langen Dateinamen auf einer Zeile mit „…", ganz steht er im `title`.
 * Tab führt zu jeder Zeile, Eingabe wählt, die Pfeile gehen eine Zeile weiter
 * (`rahmen/pfeile.ts`). In der Adresse steht die Wahl als `?nr=17`.
 */

import { useSearchParams } from "react-router-dom";
import {
  Button,
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
import { zeilenPfeile } from "../rahmen/pfeile";
import { anzeigeArt, dokumentAdresse, useDokumente, type Dokument } from "../dokumente";
import { useAuslesen, useAuslesenLage, useAuslesungen, wertInWorten, type Auslesung } from "../auslesen";
import { zeitpunkt } from "../vorgaenge";

const DOKUMENT_SPALTEN: ReadonlyArray<Spalte<Dokument>> = [
  {
    schluessel: "name",
    titel: "Datei",
    zelle: (d) => d.name,
    wert: (d) => d.name,
    // Ein Dateiname ist oft ein langes Wort ohne Leerzeichen. Gekürzt
    // rollt die Tabelle neben dem Dokument nicht, ganz steht er im `title`.
    kuerzen: true,
  },
  { schluessel: "abgelegt", titel: "Abgelegt", zelle: (d) => zeitpunkt(d.abgelegt), wert: (d) => d.abgelegt },
];

interface Feld {
  name: string;
  wert: string;
}

const FELDER: ReadonlyArray<Spalte<Feld>> = [
  { schluessel: "name", titel: "Feld", zelle: (f) => f.name, wert: (f) => f.name },
  { schluessel: "wert", titel: "Gelesen", zelle: (f) => f.wert, wert: (f) => f.wert },
];

const PROTOKOLL: ReadonlyArray<Spalte<Auslesung>> = [
  { schluessel: "zeit", titel: "Wann", zelle: (a) => zeitpunkt(a.zeit), wert: (a) => a.zeit },
  { schluessel: "von", titel: "Angestoßen von", zelle: (a) => a.von, wert: (a) => a.von },
  { schluessel: "modell", titel: "Modell", zelle: (a) => a.modell ?? "unbekannt", wert: (a) => a.modell ?? "" },
  {
    schluessel: "dauer",
    titel: "Dauer",
    zelle: (a) => (a.dauer_ms === null ? "" : `${Math.round(a.dauer_ms / 1000)} s`),
    wert: (a) => a.dauer_ms ?? 0,
  },
  {
    schluessel: "texterkennung",
    titel: "Texterkennung",
    zelle: (a) => (a.texterkennung === null ? "" : a.texterkennung ? "ja" : "nein"),
    wert: (a) => String(a.texterkennung),
  },
  {
    schluessel: "ergebnis",
    titel: "Ergebnis",
    zelle: (a) => a.fehler ?? (a.maengel.length ? `${a.maengel.length} Mängel` : "Felder gelesen"),
    wert: (a) => a.fehler ?? "",
  },
];

/**
 * Das Ergebnis zum gewählten Dokument. Der Name steht ganz da: der Titel der
 * Karte kürzte ihn in der schmalen Spalte auf eine Zeile. Im Blatt steht er
 * schon im Kopf des Blatts, die Karte trägt ihn dort nicht noch einmal.
 */
function Ergebnis({ dokument, imBlatt = false }: { dokument: Dokument; imBlatt?: boolean }) {
  const protokoll = useAuslesungen(dokument.id);
  const auslesen = useAuslesen();
  return (
    <AsyncBoundary abfrage={protokoll} laedt="Protokoll wird geholt">
      {({ auslesungen }) => {
        const letzte = auslesungen.find((a) => a.felder) ?? null;
        const felder: Feld[] = letzte?.felder
          ? Object.entries(letzte.felder).map(([name, wert]) => ({ name, wert: wertInWorten(wert) }))
          : [];
        return (
          <div className="flex flex-col gap-4">
            <Karte kennzeichen="auslesung">
              {!imBlatt && <h2 className="text-ui-lg font-semibold break-words text-foreground">{dokument.name}</h2>}
              <p className="mb-3 text-ui-sm text-muted-foreground">
                {letzte ? `gelesen ${zeitpunkt(letzte.zeit)}` : "noch nicht gelesen"}
              </p>
              <div className="flex flex-col gap-ui-3">
                <Dokumentanzeige
                  quelle={dokumentAdresse(dokument.id)}
                  art={anzeigeArt(dokument.art)}
                  name={dokument.name}
                  hoehe="32rem"
                  kennzeichen="auslesen-anzeige"
                />
                <div className="flex flex-col gap-ui-2">
                  {auslesen.isError && (
                    <Meldung art="fehler" titel="Das Auslesen ging nicht">
                      {auslesen.error instanceof Error ? auslesen.error.message : "Die Schnittstelle hat nicht geantwortet."}
                    </Meldung>
                  )}
                  {letzte && letzte.maengel.length > 0 && (
                    <Meldung art="warnung" titel="Prüf diese Felder am Beleg">
                      {letzte.maengel.join(" ")}
                    </Meldung>
                  )}
                  <Datenliste
                    daten={felder}
                    spalten={FELDER}
                    kennung={(f) => f.name}
                    beschriftung="Die gelesenen Felder"
                    leer={{ titel: "Noch keine Felder gelesen." }}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="solid"
                      onClick={() => auslesen.mutate(dokument.id)}
                      disabled={auslesen.isPending}
                      data-kennzeichen="auslesen"
                    >
                      {auslesen.isPending ? "Das Modell liest …" : letzte ? "Noch einmal auslesen" : "Auslesen"}
                    </Button>
                  </div>
                </div>
              </div>
            </Karte>
            <Datenliste
              daten={auslesungen}
              spalten={PROTOKOLL}
              kennung={(a) => String(a.id)}
              beschriftung={`Protokoll: ${auslesungen.length} Auslesungen`}
              leer={{ titel: "Noch nichts ausgelesen." }}
            />
          </div>
        );
      }}
    </AsyncBoundary>
  );
}

export function Auslesen() {
  const [suche, setSuche] = useSearchParams();
  const gewaehlt = Number(suche.get("nr")) || null;
  const schmal = useSchmalesFenster();
  const liste = useDokumente();
  const lage = useAuslesenLage();

  const waehlen = (id: number | null) => {
    const naechste = new URLSearchParams(suche);
    if (id === null) naechste.delete("nr");
    else naechste.set("nr", String(id));
    setSuche(naechste);
  };

  return (
    <>
      <Kopf titel="Auslesen" beschreibung="Das Gerät liest ein Dokument in Felder, die App prüft sie, ein Mensch sieht sie am Dokument." />
      {lage.data && !lage.data.kann && (
        <Meldung art="hinweis" titel="Auslesen geht hier nicht">
          {lage.data.grund}
        </Meldung>
      )}
      <AsyncBoundary abfrage={liste} laedt="Dokumente werden geholt">
        {({ dokumente }) => {
          const offen = dokumente.find((d) => d.id === gewaehlt);
          const tabelle = (
            <Datenliste
              daten={dokumente}
              spalten={DOKUMENT_SPALTEN}
              kennung={(d) => String(d.id)}
              beschriftung={`Dokumente: ${dokumente.length}`}
              filter
              leer={{ titel: "Noch kein Dokument abgelegt. Hochgeladen wird unter Dokumente." }}
              aufZeile={(d) => waehlen(d.id)}
              gewaehlt={gewaehlt === null ? null : String(gewaehlt)}
            />
          );

          if (schmal) {
            return (
              <>
                {tabelle}
                <Sheet open={Boolean(offen)} onOpenChange={(auf) => !auf && waehlen(null)}>
                  <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                    {offen && (
                      <>
                        <SheetHeader>
                          <SheetTitle className="pr-8 leading-snug break-words">{offen.name}</SheetTitle>
                          <SheetDescription>Abgelegt {zeitpunkt(offen.abgelegt)}</SheetDescription>
                        </SheetHeader>
                        <Ergebnis dokument={offen} imBlatt />
                      </>
                    )}
                  </SheetContent>
                </Sheet>
              </>
            );
          }

          return (
            <div data-teilung className="grid grid-cols-[minmax(0,3fr)_minmax(14rem,2fr)] items-start gap-4">
              <div className="min-w-0" onKeyDown={zeilenPfeile}>
                {tabelle}
              </div>
              <aside aria-label="Einzelheiten" className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                {offen ? (
                  <Ergebnis dokument={offen} />
                ) : (
                  <Leerzustand
                    titel="Kein Dokument gewählt"
                    beschreibung="Eine Zeile anklicken, oder mit Tab zum Dateinamen gehen und Eingabe drücken."
                  />
                )}
              </aside>
            </div>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
