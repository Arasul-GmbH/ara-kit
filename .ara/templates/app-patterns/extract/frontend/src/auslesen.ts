/**
 * Muster Dokument auslesen: Typen und Abfragen. Liegt in einer App aus der
 * Vorlage unter `frontend/src/auslesen.ts`, neben `dokumente.ts` aus dem
 * Muster Dokumente.
 *
 * Das Auslesen wartet, bis das Modell am Gerät geantwortet hat. Die Seite sagt
 * das, solange es läuft; ein zweiter Klick startet keine zweite Auslesung.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { hole } from "./rahmen/schnittstelle";

export interface Auslesung {
  id: number;
  dokument_id: number;
  von: string;
  zeit: string;
  /** Welches Modell die Felder gefüllt hat, wie das Gerät es nennt. */
  modell: string | null;
  dauer_ms: number | null;
  /** Ob das Gerät den Text über seine Texterkennung holen musste: Foto oder Scan. */
  texterkennung: boolean | null;
  zeichen: number | null;
  /** Der Auftrag am Gerät: unter dieser Nummer steht der Aufruf in dessen Protokoll. */
  auftrag: string | null;
  felder: Record<string, unknown> | null;
  /** Was die App an den Feldern auszusetzen hat. Leer heißt: nichts. */
  maengel: string[];
  fehler: string | null;
}

export interface AuslesenLage {
  kann: boolean;
  grund: string | null;
}

export function useAuslesenLage(): UseQueryResult<AuslesenLage> {
  return useQuery({ queryKey: ["auslesen"], queryFn: () => hole<AuslesenLage>("api/auslesen") });
}

export function useAuslesungen(dokumentId: number | null): UseQueryResult<{ auslesungen: Auslesung[] }> {
  return useQuery({
    queryKey: ["auslesungen", dokumentId],
    queryFn: () => hole<{ auslesungen: Auslesung[] }>(`api/dokumente/${dokumentId}/auslesungen`),
    enabled: dokumentId !== null,
  });
}

export function useAuslesen() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: (dokumentId: number) =>
      hole<{ auslesung: Auslesung }>(`api/dokumente/${dokumentId}/auslesen`, { method: "POST" }),
    onSuccess: (_, dokumentId) => speicher.invalidateQueries({ queryKey: ["auslesungen", dokumentId] }),
  });
}

/** Ein Wert der Felder, wie ein Mensch ihn liest. */
export function wertInWorten(wert: unknown): string {
  if (wert === null || wert === undefined || wert === "") return "fehlt";
  if (typeof wert === "number") return wert.toLocaleString("de-DE");
  return typeof wert === "string" ? wert : JSON.stringify(wert);
}
