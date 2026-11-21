/**
 * Die Seitenleiste: die Wege dieser App und die Ansichten der Liste.
 *
 * Sie ist das Muster `Seitenleiste` der Bibliothek und sonst nichts. Bis zum
 * 29.08.2026 baute die Vorlage sie sich aus `Liste`, `ListenEintrag` und
 * `Menue` selbst zusammen, weil der Spiegel nur die sechs Bausteine kannte.
 * Das waren rund hundert Zeilen für etwas, das die Bibliothek fertig
 * mitbringt -- samt dem, was man an einer Navigation sonst vergisst: unter
 * 900 Pixeln wird sie ein Blatt über der Seite, sie klappt auf Symbolbreite
 * zu, `aria-current="page"` steht am aktiven Eintrag, und Escape schließt.
 *
 * **Hier stehen nur die Einträge.** Welcher aktiv ist, sagt diese App, denn
 * sie kennt ihren Router; das Muster kennt keinen.
 *
 * Die Ansichten stehen in der Suchanfrage und nicht im Zustand dieser
 * Komponente: ein Verweis auf "die offenen" bleibt damit einer, und die Wege
 * der App bleiben eine Ebene tief (siehe `basis.ts`).
 *
 * **Symbole kommen aus der Bibliothek**, aus `@marken/symbole`, und werden mit
 * `Icon` gezeichnet: drei Größen, eine Strichstärke, wie überall im Gerät.
 * Ein eigener Import am Paket von Lucide vorbei zeichnete sie in seiner eigenen
 * Stärke, und das Gerät verbietet ihn sich selbst (seit Marken 5.9.0).
 */

import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Icon, Seitenleiste as Leiste, useSidebar, type SeitenleistenGruppe } from "@marken";
import { CircleCheck, ClipboardCheck, Clock, FilePlus, Inbox, type LucideIcon } from "@marken/symbole";

/** Die Ansichten der Vorgangsliste. `alle` steht ohne Suchanfrage da. */
export const ANSICHTEN = [
  { id: "alle", wort: "Alle" },
  { id: "offen", wort: "Offen" },
  { id: "entschieden", wort: "Entschieden" },
] as const;

/** Je Ansicht ein eigenes Zeichen: zugeklappt bleibt von der Leiste nur das Symbol, und dreimal dasselbe sagt nichts. */
const SYMBOLE: Record<(typeof ANSICHTEN)[number]["id"], LucideIcon> = {
  alle: Inbox,
  offen: Clock,
  entschieden: CircleCheck,
};

export type Ansicht = (typeof ANSICHTEN)[number]["id"];

/** Welche Ansicht die Adresse nennt. Was sie sonst nennt, gilt als `alle`. */
export function ansichtAus(suche: URLSearchParams): Ansicht {
  const wert = suche.get("ansicht");
  return ANSICHTEN.some((eintrag) => eintrag.id === wert) ? (wert as Ansicht) : "alle";
}

export function AppSeitenleiste({ name }: { name: string }) {
  const [suche] = useSearchParams();
  const ort = useLocation();
  const weiter = useNavigate();
  const { schmal, setzeBlattOffen } = useSidebar();
  const ansicht = ansichtAus(suche);
  const aufListe = ort.pathname === "/";

  // Auf einem schmalen Bildschirm liegt die Leiste über der Seite. Eine, die
  // nach der Auswahl offen bleibt, verdeckt genau das, wofür man sie
  // geöffnet hat.
  const gehe = (ziel: string) => {
    weiter(ziel);
    if (schmal) setzeBlattOffen(false);
  };

  const gruppen: SeitenleistenGruppe[] = [
    {
      titel: "Vorgänge",
      eintraege: ANSICHTEN.map((eintrag) => {
        return {
          kennung: `ansicht-${eintrag.id}`,
          name: eintrag.wort,
          symbol: <Icon symbol={SYMBOLE[eintrag.id]} />,
          aktiv: aufListe && eintrag.id === ansicht,
          aufKlick: () => gehe(eintrag.id === "alle" ? "/" : `/?ansicht=${eintrag.id}`),
        };
      }),
    },
    {
      titel: "Entscheiden",
      eintraege: [
        {
          kennung: "weg-freigaben",
          name: "Freigaben",
          symbol: <Icon symbol={ClipboardCheck} />,
          aktiv: ort.pathname === "/freigaben",
          aufKlick: () => gehe("/freigaben"),
        },
      ],
    },
    {
      titel: "Einreichen",
      eintraege: [
        {
          kennung: "weg-neu",
          name: "Neuer Vorgang",
          symbol: <Icon symbol={FilePlus} />,
          aktiv: ort.pathname === "/neu",
          aufKlick: () => gehe("/neu"),
        },
      ],
    },
  ];

  return (
    <Leiste titel={name} gruppen={gruppen} />
  );
}
