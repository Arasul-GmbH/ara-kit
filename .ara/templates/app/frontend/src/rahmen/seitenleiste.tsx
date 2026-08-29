/**
 * Die Seitenleiste: die Wege dieser App und die Ansichten der Liste.
 *
 * Sie ist aus `Liste` und `ListenEintrag` gebaut und aus sonst nichts. Das ist
 * kein Sparen an der Stelle, sondern die Regel: was in einer App wie ein
 * Baustein aussieht, IST einer, sonst laeuft es beim naechsten Stand des
 * Geraets von der Oberflaeche weg, in der es haengt.
 *
 * **Zwei Gestalten, ein Inhalt.** Ueber 900 Pixeln steht sie als Spalte neben
 * dem Inhalt, darunter liegt derselbe Inhalt im `Menue` ueber der Seite. Der
 * Baustein bringt dafuer mit, was man an einer Flaeche, die etwas verdeckt,
 * sonst vergisst: Escape schliesst, der Fokus springt hinein und danach
 * zurueck, und mit Tab kommt niemand hinter das offene Menue. Wer das
 * nachbaut, baut die Haelfte davon nach.
 *
 * **Jeder Klick schliesst.** Ein Menue, das nach der Auswahl offen bleibt,
 * verdeckt genau das, wofuer man es geoeffnet hat.
 *
 * Die Ansichten stehen in der Suchanfrage und nicht im Zustand dieser
 * Komponente: ein Verweis auf "die offenen" bleibt damit einer, und die Wege
 * der App bleiben eine Ebene tief (siehe `basis.ts`).
 */

import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Knopf, Liste, ListenEintrag, Menue } from "@marken";
import { useSchmalesFenster } from "./fenster";

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

interface WegeProps {
  onGewaehlt: () => void;
}

function Wege({ onGewaehlt }: WegeProps) {
  const [suche] = useSearchParams();
  const ort = useLocation();
  const weiter = useNavigate();
  const ansicht = ansichtAus(suche);
  const aufListe = ort.pathname === "/";

  const gehe = (ziel: string) => {
    weiter(ziel);
    onGewaehlt();
  };

  return (
    <>
      <Liste beschriftung="Vorgänge">
        {ANSICHTEN.map((eintrag) => (
          <ListenEintrag
            key={eintrag.id}
            titel={eintrag.wort}
            aktiv={aufListe && eintrag.id === ansicht}
            kennzeichen={`ansicht-${eintrag.id}`}
            onKlick={() => gehe(eintrag.id === "alle" ? "/" : `/?ansicht=${eintrag.id}`)}
          />
        ))}
      </Liste>

      <Liste beschriftung="Einreichen">
        <ListenEintrag
          titel="Neuer Vorgang"
          aktiv={ort.pathname === "/neu"}
          kennzeichen="weg-neu"
          onKlick={() => gehe("/neu")}
        />
      </Liste>
    </>
  );
}

export function Seitenleiste() {
  const schmal = useSchmalesFenster();
  const [offen, setOffen] = useState(false);

  if (!schmal) {
    return (
      <aside className="seitenleiste" aria-label="Bereiche">
        <Wege onGewaehlt={() => undefined} />
      </aside>
    );
  }

  return (
    <div className="seitenleiste-schmal">
      <Knopf onKlick={() => setOffen(true)} kennzeichen="menue-auf">
        Bereiche
      </Knopf>
      <Menue offen={offen} onSchliessen={() => setOffen(false)} titel="Bereiche" kennzeichen="menue">
        <Wege onGewaehlt={() => setOffen(false)} />
      </Menue>
    </div>
  );
}
