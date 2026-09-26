/**
 * Die Liste: die Vorgaenge, die es gibt, und der eine, den man gerade ansieht.
 *
 * Sie ist das Muster `Datenliste` der Bibliothek. Das ist mehr als eine
 * Tabelle: sortieren, suchen, ein Leerzustand, und unter 900 Pixeln wird aus
 * der Tabelle eine Kartenliste. Vier Dinge, und jede Seite, die sie einzeln
 * loest, loest sie anders.
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
 *
 * **Liste und Einzelheiten stehen ab 900 px nebeneinander**, die Einzelheiten
 * mitlaufend, und darunter als Blatt von unten. Bis zum 26.09.2026 standen sie
 * unter der Liste: bei 200 Zeilen sah niemand, dass sich nach dem Klick etwas
 * getan hatte. Die Schwelle ist die eine des Produkts, `useSchmalesFenster`.
 *
 * **Jede Zeile ist per Tastatur waehlbar.** Die `Datenliste` kennt nur den
 * Klick auf die Zeile; der Titel ist deshalb ein Knopf, Tab fuehrt hin, Eingabe
 * waehlt, die Pfeile gehen eine Zeile weiter. Gewaehlt ist, wo `aria-current`
 * steht, und `stil.css` zeichnet die Zeile danach. Unter 900 px ist die ganze
 * Karte der Knopf, dort traegt der Titel nur die Markierung.
 */

import { useMemo, type KeyboardEvent } from "react";
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
import { ANSICHTEN, ansichtAus, type Ansicht } from "../rahmen/seitenleiste";
import { STAND, seit, useLage, useVorgaenge, werEntscheidet, zeitpunkt, type Vorgang } from "../vorgaenge";

/** Wie die Ansicht heisst, in denselben Worten wie in der Seitenleiste. */
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
 * wartet, seit wann und bei wem. Das Wort steht in der Textfarbe und haelt
 * so 4,5:1 in beiden Themen; die Farbe traegt nur das Zeichen, denn Blau
 * und Rot der Bibliothek erreichen als Text im hellen Thema keine 4,5:1.
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

/** Mit den Pfeilen zum Titel der Zeile darueber oder darunter. */
function wandern(ereignis: KeyboardEvent<HTMLButtonElement>) {
  if (ereignis.key !== "ArrowDown" && ereignis.key !== "ArrowUp") return;
  const zeile = ereignis.currentTarget.closest("tr");
  const nachbar = ereignis.key === "ArrowDown" ? zeile?.nextElementSibling : zeile?.previousElementSibling;
  const ziel = nachbar?.querySelector<HTMLButtonElement>(".vorgang-wahl");
  if (!ziel) return;
  ereignis.preventDefault();
  ziel.focus();
}

function useSpalten(gewaehlt: number | null, waehlen: (id: number) => void, schmal: boolean) {
  return useMemo<ReadonlyArray<Spalte<Vorgang>>>(
    () => [
      {
        schluessel: "titel",
        titel: "Vorgang",
        zelle: (vorgang) => {
          const aktuell = gewaehlt === vorgang.id ? "true" : undefined;
          // Zwei Zeilen und dann Schluss: ein Titel mit 120 Zeichen draengte
          // sonst die Spalte Stand aus der Tabelle. Ganz steht er daneben.
          // `anywhere` bricht auch ein langes Wort, sonst bestimmte es die
          // schmalste Breite der Spalte, und zwischen 900 und 1100 px rollte
          // die Tabelle.
          const titel = (
            <span className="line-clamp-2 whitespace-normal [overflow-wrap:anywhere]">{vorgang.titel}</span>
          );
          if (schmal) {
            return (
              <span className="vorgang-wahl" aria-current={aktuell}>
                {titel}
              </span>
            );
          }
          return (
            <button
              type="button"
              className="vorgang-wahl w-full rounded-sm text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-current={aktuell}
              onClick={(ereignis) => {
                ereignis.stopPropagation();
                waehlen(vorgang.id);
              }}
              onKeyDown={wandern}
            >
              {titel}
            </button>
          );
        },
        wert: (vorgang) => vorgang.titel,
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
    ],
    [gewaehlt, waehlen, schmal]
  );
}

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

/** Die Einzelheiten neben der Liste. Der Titel steht ganz da, die Karte kuerzte ihn auf eine Zeile. */
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
  const spalten = useSpalten(gewaehlt, waehlen, schmal);

  return (
    <>
      {/* Der Weg zum Formular steht in der Seitenleiste und nicht auch noch
          hier: zwei Knoepfe fuer dieselbe Handlung sind einer zu viel. */}
      <Kopf titel="Vorgänge" beschreibung="Eingereicht hier, entschieden in Arasul." />

      {/* Warum kein Flow anhaelt, sagt die App selbst: "ohne Arasul" und "das
          Geraet hat den Wert nicht gesetzt" sehen gleich aus und sind es nicht. */}
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
        laedt={<Datenliste daten={[]} spalten={spalten} kennung={() => ""} beschriftung="Vorgänge" laedt />}
        fehlerTitel="Die Vorgänge ließen sich nicht holen"
      >
        {(alle) => {
          const sichtbar = alle.filter((vorgang) => passt(vorgang, ansicht));
          const offen = alle.find((vorgang) => vorgang.id === gewaehlt);
          const liste = (
            <Datenliste
              daten={sichtbar}
              spalten={spalten}
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
              {liste}
              <aside aria-label="Einzelheiten" className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                {offen ? (
                  <Einzelheiten vorgang={offen} />
                ) : (
                  <Leerzustand
                    titel="Kein Vorgang gewählt"
                    beschreibung="Eine Zeile anklicken, oder mit Tab zum Titel gehen und Eingabe drücken."
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
