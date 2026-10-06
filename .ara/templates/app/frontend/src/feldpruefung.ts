/**
 * Was die Seite „Freigaben" mit den Listen der Felder prüft, ohne React und ohne Netz, damit der
 * Selbsttest des Kits es mit Node allein laufen lässt. Geholt werden die Listen in `feldlisten.ts`.
 */

import type { FreigabeEintrag } from "@marken";

export interface Listenwert {
  wert: string;
  name: string;
}

export type Feldlisten = Record<string, ReadonlyArray<Listenwert>>;

/** Der Name zu einem Wert, oder `null`, wenn die Liste ihn nicht führt. */
function nameVon(liste: ReadonlyArray<Listenwert>, wert: string): string | null {
  return liste.find((eintrag) => eintrag.wert === wert.trim())?.name ?? null;
}

/** Die Felder mit dem Namen ihres Vorschlags an der Bezeichnung. */
export function mitNamen(eintrag: FreigabeEintrag, listen: Feldlisten): FreigabeEintrag {
  if (!eintrag.felder?.length) return eintrag;
  return {
    ...eintrag,
    felder: eintrag.felder.map((feld) => {
      const liste = listen[feld.name];
      if (!liste?.length) return feld;
      const titel = feld.bezeichnung || feld.name.charAt(0).toUpperCase() + feld.name.slice(1);
      const name = feld.vorschlag ? nameVon(liste, feld.vorschlag) : null;
      return {
        ...feld,
        bezeichnung: feld.vorschlag
          ? `${titel}, Vorschlag ${feld.vorschlag} ${name ?? "(steht nicht in der Liste)"}`
          : `${titel}, aus der Liste`,
      };
    }),
  };
}

export type Pruefung = { ok: true } | { ok: false; art: "fehlt" | "rueckfrage"; satz: string; schluessel: string };

/**
 * Darf so freigegeben werden? `schluessel` beschreibt die Änderung: wer dieselbe Rückfrage einmal
 * gesehen hat und noch einmal bestätigt, kommt durch.
 */
export function pruefen(
  eintrag: FreigabeEintrag,
  geaendert: Record<string, string> | undefined,
  listen: Feldlisten,
  gesehen: string | null
): Pruefung {
  const rueckfragen: string[] = [];
  for (const [feld, wert] of Object.entries(geaendert ?? {})) {
    const liste = listen[feld];
    if (!liste?.length) continue;
    const titel = eintrag.felder?.find((f) => f.name === feld)?.bezeichnung || feld.charAt(0).toUpperCase() + feld.slice(1);
    const name = nameVon(liste, wert);
    if (!name) {
      const beispiele = liste.slice(0, 4).map((e) => `${e.wert} ${e.name}`).join(", ");
      return {
        ok: false,
        art: "fehlt",
        satz: `${wert.trim() || "Ein leeres Feld"} steht nicht in der Liste dieser App (${titel.split(",")[0]}). Erlaubt sind etwa ${beispiele}. Nichts wurde freigegeben.`,
        schluessel: "",
      };
    }
    const vorschlag = eintrag.felder?.find((f) => f.name === feld)?.vorschlag ?? "";
    const alt = vorschlag ? `${vorschlag} ${nameVon(liste, vorschlag) ?? ""}`.trim() : "leer";
    rueckfragen.push(`${wert.trim()} ${name} statt ${alt}`);
  }
  if (!rueckfragen.length) return { ok: true };
  const schluessel = `${eintrag.id}:${JSON.stringify(geaendert)}`;
  if (gesehen === schluessel) return { ok: true };
  return {
    ok: false,
    art: "rueckfrage",
    satz: `${rueckfragen.join("; ")}. Stimmt das? Dann noch einmal bestätigen.`,
    schluessel,
  };
}
