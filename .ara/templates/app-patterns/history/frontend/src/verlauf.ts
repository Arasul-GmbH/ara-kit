/**
 * Muster Verlauf: wer was wann an einem Vorgang getan hat. Liegt in einer App aus der Vorlage
 * unter `frontend/src/verlauf.ts`. Gelesen wird nur; geschrieben wird im Backend, wenn etwas
 * geschieht.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { hole } from "./rahmen/schnittstelle";

export interface VerlaufEintrag {
  id: number;
  vorgang: number;
  was: string;
  wer: string | null;
  angaben: Record<string, unknown> | null;
  zeit: string;
}

export function useVerlauf(vorgang: number): UseQueryResult<{ verlauf: VerlaufEintrag[] }> {
  return useQuery({
    queryKey: ["verlauf", vorgang],
    queryFn: () => hole<{ verlauf: VerlaufEintrag[] }>(`api/vorgaenge/${vorgang}/verlauf`),
  });
}

/** Was zu einem Eintrag gehört, in einem Satz: die Begründung, oder welche Felder ein Mensch geändert hat. */
export function angabenSatz(eintrag: VerlaufEintrag): string {
  const angaben = eintrag.angaben ?? {};
  const teile: string[] = [];
  if (typeof angaben.begruendung === "string" && angaben.begruendung) teile.push(angaben.begruendung);
  if (typeof angaben.grund === "string" && angaben.grund) teile.push(angaben.grund);
  // Die Änderungen am Vorschlag, wie das Gerät sie im Abschluss übergibt (`korrekturen`, je Feld der
  // Vorschlag und der neue Wert; welche Form genau, sagt `--contract`). Was anders aussieht, steht roh da.
  if (eintrag.was === "abgeschlossen") {
    const korrekturen = Array.isArray(angaben.korrekturen) ? (angaben.korrekturen as Array<Record<string, unknown>>) : [];
    const geaendert = korrekturen
      .map((k) => (k && typeof k === "object" && "feld" in k ? `${String(k.feld)} ${String(k.vorschlag ?? "")} → ${String(k.wert ?? "")}` : JSON.stringify(k)))
      .join(", ");
    teile.push(geaendert ? `geändert: ${geaendert}` : "ohne Änderung");
  }
  return teile.join(" · ");
}
