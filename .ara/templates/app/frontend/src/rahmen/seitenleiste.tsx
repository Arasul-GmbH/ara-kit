/**
 * Die Seitenleiste: die Wege dieser App und die Ansichten der Liste.
 *
 * Sie ist das Muster `Seitenleiste` der Bibliothek und sonst nichts. Bis zum
 * 29.08.2026 baute die Vorlage sie sich aus `Liste`, `ListenEintrag` und
 * `Menue` selbst zusammen, weil der Spiegel nur die sechs Bausteine kannte.
 * Das waren rund hundert Zeilen fuer etwas, das die Bibliothek fertig
 * mitbringt -- samt dem, was man an einer Navigation sonst vergisst: unter
 * 900 Pixeln wird sie ein Blatt ueber der Seite, sie klappt auf Symbolbreite
 * zu, `aria-current="page"` steht am aktiven Eintrag, und Escape schliesst.
 *
 * **Hier stehen nur die Eintraege.** Welcher aktiv ist, sagt diese App, denn
 * sie kennt ihren Router; das Muster kennt keinen.
 *
 * Die Ansichten stehen in der Suchanfrage und nicht im Zustand dieser
 * Komponente: ein Verweis auf "die offenen" bleibt damit einer, und die Wege
 * der App bleiben eine Ebene tief (siehe `basis.ts`).
 */

import { FilePlusIcon, InboxIcon } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Seitenleiste as Leiste, useSidebar, type SeitenleistenGruppe } from "@marken";

/** Die Ansichten der Vorgangsliste. `alle` steht ohne Suchanfrage da. */
export const ANSICHTEN = [
  { id: "alle", wort: "Alle" },
  { id: "offen", wort: "Offen" },
  { id: "entschieden", wort: "Entschieden" },
] as const;

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

  // Auf einem schmalen Bildschirm liegt die Leiste ueber der Seite. Eine, die
  // nach der Auswahl offen bleibt, verdeckt genau das, wofuer man sie
  // geoeffnet hat.
  const gehe = (ziel: string) => {
    weiter(ziel);
    if (schmal) setzeBlattOffen(false);
  };

  const gruppen: SeitenleistenGruppe[] = [
    {
      titel: "Vorgänge",
      eintraege: ANSICHTEN.map((eintrag) => ({
        kennung: `ansicht-${eintrag.id}`,
        name: eintrag.wort,
        symbol: <InboxIcon />,
        aktiv: aufListe && eintrag.id === ansicht,
        aufKlick: () => gehe(eintrag.id === "alle" ? "/" : `/?ansicht=${eintrag.id}`),
      })),
    },
    {
      titel: "Einreichen",
      eintraege: [
        {
          kennung: "weg-neu",
          name: "Neuer Vorgang",
          symbol: <FilePlusIcon />,
          aktiv: ort.pathname === "/neu",
          aufKlick: () => gehe("/neu"),
        },
      ],
    },
  ];

  return (
    <Leiste
      marke={<span className="px-2 text-ui-sm font-semibold text-foreground">{name}</span>}
      gruppen={gruppen}
    />
  );
}
