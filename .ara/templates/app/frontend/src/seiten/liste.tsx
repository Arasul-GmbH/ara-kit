/**
 * Die Liste: die Vorgänge, die es gibt, und der eine, den man gerade ansieht.
 *
 * Sie ist das Muster `Datenliste` der Bibliothek. Das ist mehr als eine
 * Tabelle: sortieren, suchen, ein Leerzustand, und unter 900 Pixeln wird aus
 * der Tabelle eine Kartenliste. Vier Dinge, und jede Seite, die sie einzeln
 * löst, löst sie anders.
 *
 * **Die Spalten sind Daten und kein Markup.** `zelle` sagt, was dasteht,
 * `wert` sagt, wonach sortiert und worin gesucht wird. Beides getrennt, weil
 * das, was man sieht, selten das ist, wonach man sortiert: „vor 3 Tagen"
 * sortiert nach einem Zeitstempel.
 *
 * **Welcher ausgewählt ist, steht in der Adresse** (`?nr=17`) und nicht im
 * Zustand dieser Seite. Zwei Gründe: ein Verweis auf einen Vorgang bleibt
 * einer, und die Wege der App bleiben eine Ebene tief, wie es `basis.ts`
 * verlangt.
 *
 * **Liste und Einzelheiten stehen ab 900 px nebeneinander**, die Einzelheiten
 * mitlaufend, und darunter als Blatt von unten. Bis zum 26.09.2026 standen sie
 * unter der Liste: bei 200 Zeilen sah niemand, dass sich nach dem Klick etwas
 * getan hatte. Die Schwelle ist die eine des Produkts, `useSchmalesFenster`.
 *
 * **Auswahl und Kürzung sind die der Bibliothek.** `gewaehlt` markiert die
 * Zeile mit `aria-selected` und zeichnet sie, `kuerzen` hält einen langen
 * Titel auf einer Zeile mit „…", und ganz steht er im `title` und in den
 * Einzelheiten. Tab führt zu jeder Zeile, Eingabe und Leertaste wählen sie,
 * die Pfeile gehen eine Zeile weiter (`rahmen/pfeile.ts`). Bis Kit 0.40.0
 * baute diese Seite das selbst, mit einem Knopf im Titel und eigenen Regeln
 * in `stil.css`; seit Marken 5.0.0 kann die Bibliothek es.
 */

import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Datenliste,
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
import { ANSICHTEN, ansichtAus, type Ansicht } from "../rahmen/seitenleiste";
import { STAND, seit, useLage, useVorgaenge, werEntscheidet, zeitpunkt, type Vorgang } from "../vorgaenge";

/** Wie die Ansicht heißt, in denselben Worten wie in der Seitenleiste. */
function wortFuer(ansicht: Ansicht): string {
  return ANSICHTEN.find((eintrag) => eintrag.id === ansicht)?.wort ?? "Alle";
}

function passt(vorgang: Vorgang, ansicht: Ansicht): boolean {
  if (ansicht === "offen") return vorgang.status === "wartet";
  if (ansicht === "entschieden") return vorgang.status !== "wartet";
  return true;
}

/**
 * Wie ein Vorgang steht: das Wort, ein Zeichen daneben, und solange er
 * wartet, seit wann und bei wem. Das Wort steht in der Textfarbe und hält
 * so 4,5:1 in beiden Themen; die Farbe trägt nur das Zeichen, denn Blau
 * heißt genehmigt und ist keine Farbe für einen Text.
 */
function Stand({ vorgang, knapp = false }: { vorgang: Vorgang; knapp?: boolean }) {
  const stand = STAND[vorgang.status] ?? { wort: vorgang.status, art: "hinweis" as const };
  const wartet = vorgang.status === "wartet";
  const wer = wartet ? werEntscheidet(vorgang) : null;
  return (
    <span className="stand" data-art={stand.art}>
      <span className="stand__wort">
        {stand.wort}
        {wartet && ` ${seit(vorgang.gestellt)}`}
      </span>
      {knapp && wer && (
        <span className="stand__wer" title={`Entscheidet: ${wer}`}>
          auf {wer}
        </span>
      )}
    </span>
  );
}

const SPALTEN: ReadonlyArray<Spalte<Vorgang>> = [
  {
    schluessel: "titel",
    titel: "Vorgang",
    zelle: (vorgang) => vorgang.titel,
    wert: (vorgang) => vorgang.titel,
    // Eine Zeile und „…": ein Titel mit 120 Zeichen drängte sonst die
    // Spalte Stand aus der Tabelle. Ganz steht er im `title` und daneben.
    kuerzen: true,
  },
  {
    schluessel: "gestellt",
    titel: "Eingereicht",
    zelle: (vorgang) => (
      <span className="flex flex-col">
        <span className="whitespace-normal [overflow-wrap:anywhere]">{vorgang.von}</span>
        <span className="whitespace-normal text-muted-foreground">{zeitpunkt(vorgang.gestellt)}</span>
      </span>
    ),
    // Der Zeitstempel vorn sortiert nach der Zeit, der Name dahinter
    // bleibt durchsuchbar: die Suche liest denselben Wert.
    wert: (vorgang) => `${vorgang.gestellt} ${vorgang.von}`,
  },
  {
    schluessel: "status",
    titel: "Stand",
    zelle: (vorgang) => <Stand vorgang={vorgang} knapp />,
    wert: (vorgang) => STAND[vorgang.status]?.wort ?? vorgang.status,
  },
];

/** Eine Zeile der Einzelheiten: was es ist, und was dazu dasteht. */
function Angabe({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-ui-xs text-muted-foreground">{name}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function Angaben({ vorgang }: { vorgang: Vorgang }) {
  const wer = vorgang.status === "wartet" ? werEntscheidet(vorgang) : null;
  return (
    <dl className="flex flex-col gap-3 text-ui-sm">
      <Angabe name="Stand">
        <Stand vorgang={vorgang} />
      </Angabe>
      {wer && <Angabe name="Entscheidet">{wer}</Angabe>}
      <Angabe name="Eingereicht">
        {vorgang.von}, {zeitpunkt(vorgang.gestellt)}
      </Angabe>
      {vorgang.text && vorgang.text !== "ohne Angabe" && <Angabe name="Was dazu zu sagen ist">{vorgang.text}</Angabe>}
      {vorgang.entschieden_von && (
        <Angabe name="Entschieden von">
          {vorgang.entschieden_von}
          {vorgang.begruendung ? `: ${vorgang.begruendung}` : ""}
        </Angabe>
      )}
      {vorgang.bemerkung && <Angabe name="Bemerkung">{vorgang.bemerkung}</Angabe>}
      {vorgang.hinweis && <Angabe name="Hinweis">{vorgang.hinweis}</Angabe>}
    </dl>
  );
}

/** Die Einzelheiten neben der Liste. Der Titel steht ganz da, die Karte kürzte ihn auf eine Zeile. */
function Einzelheiten({ vorgang }: { vorgang: Vorgang }) {
  return (
    <Karte kennzeichen="vorgang">
      <h2 className="mb-3 text-ui-lg font-semibold break-words text-foreground">{vorgang.titel}</h2>
      <Angaben vorgang={vorgang} />
    </Karte>
  );
}

export function Vorgaenge() {
  const [suche, setSuche] = useSearchParams();
  const ansicht = ansichtAus(suche);
  const gewaehlt = Number(suche.get("nr")) || null;
  const schmal = useSchmalesFenster();
  const weiter = useNavigate();
  const lage = useLage();
  const vorgaenge = useVorgaenge();

  const waehlen = (id: number | null) => {
    const naechste = new URLSearchParams(suche);
    if (id === null) naechste.delete("nr");
    else naechste.set("nr", String(id));
    setSuche(naechste);
  };

  return (
    <>
      {/* Der Weg zum Formular steht in der Seitenleiste und nicht auch noch
          hier: zwei Knöpfe für dieselbe Handlung sind einer zu viel. */}
      <Kopf titel="Vorgänge" beschreibung="Eingereicht hier, entschieden in Arasul." />

      {/* Warum kein Flow anhält, sagt die App selbst: "ohne Arasul" und "das
          Gerät hat den Wert nicht gesetzt" sehen gleich aus und sind es nicht. */}
      <AsyncBoundary abfrage={lage} laedt={null} fehlerTitel="Der Rahmen ließ sich nicht lesen">
        {(stand) =>
          stand.arasul ? null : (
            <Meldung art="warnung" titel="Über diese Vorgänge entscheidet niemand">
              {stand.hinweis ?? "Diese App erreicht kein Arasul."} Ein Vorgang wird angenommen und
              bleibt liegen.
            </Meldung>
          )
        }
      </AsyncBoundary>

      <AsyncBoundary
        abfrage={vorgaenge}
        laedt={<Datenliste daten={[]} spalten={SPALTEN} kennung={() => ""} beschriftung="Vorgänge" laedt />}
        fehlerTitel="Die Vorgänge ließen sich nicht holen"
      >
        {(alle) => {
          const sichtbar = alle.filter((vorgang) => passt(vorgang, ansicht));
          const offen = alle.find((vorgang) => vorgang.id === gewaehlt);
          const liste = (
            <Datenliste
              daten={sichtbar}
              spalten={SPALTEN}
              kennung={(vorgang) => String(vorgang.id)}
              beschriftung={`${wortFuer(ansicht)}: ${sichtbar.length} von ${alle.length}`}
              filter
              filterPlatzhalter="In den Vorgängen suchen …"
              leer={
                alle.length
                  ? {
                      titel: "In dieser Ansicht liegt nichts.",
                      aktion: (
                        <Button variant="outline" onClick={() => weiter("/")}>
                          Alle Vorgänge zeigen
                        </Button>
                      ),
                    }
                  : {
                      titel: "Noch kein Vorgang eingereicht.",
                      beschreibung: "Was jemand entschieden haben will, wird hier eingereicht.",
                      aktion: (
                        <Button variant="solid" onClick={() => weiter("/neu")} data-kennzeichen="erster">
                          Ersten Vorgang einreichen
                        </Button>
                      ),
                    }
              }
              aufZeile={(vorgang) => waehlen(vorgang.id)}
              gewaehlt={gewaehlt === null ? null : String(gewaehlt)}
            />
          );

          if (schmal) {
            return (
              <>
                {liste}
                <Sheet open={Boolean(offen)} onOpenChange={(auf) => !auf && waehlen(null)}>
                  <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                    {offen && (
                      <>
                        <SheetHeader>
                          <SheetTitle className="pr-8 leading-snug break-words">{offen.titel}</SheetTitle>
                          <SheetDescription>Vorgang {offen.id}</SheetDescription>
                        </SheetHeader>
                        <Angaben vorgang={offen} />
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
                {liste}
              </div>
              <aside aria-label="Einzelheiten" className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                {offen ? (
                  <Einzelheiten vorgang={offen} />
                ) : (
                  <Leerzustand
                    titel="Kein Vorgang gewählt"
                    beschreibung="Eine Zeile anklicken, oder mit Tab zu ihr gehen und Eingabe drücken."
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
