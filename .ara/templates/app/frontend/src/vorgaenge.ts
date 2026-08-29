/**
 * Die Vorgaenge: was diese App verwaltet, und wie sie an sie herankommt.
 *
 * Typen und Abfragen an einer Stelle, damit die Seiten daneben nur noch
 * zeichnen. Wer eine zweite Entitaet dazunimmt, legt eine zweite solche Datei
 * an und nicht eine zweite Art, `fetch` zu rufen.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { hole } from "./rahmen/schnittstelle";

/** Wie ein Vorgang steht. Die Namen kommen aus dem Backend dieser App. */
export type Stand = "wartet" | "genehmigt" | "abgelehnt" | "abgelaufen" | "ohne entscheidung" | "ohne lauf";

export interface Vorgang {
  id: number;
  titel: string;
  text: string;
  von: string;
  gestellt: string;
  status: Stand;
  entschieden_von: string | null;
  begruendung: string | null;
  bemerkung: string | null;
  hinweis: string | null;
}

/** Was das Backend ueber seinen Rahmen sagt: erreicht es ein Arasul, und wenn nicht, warum nicht. */
export interface Lage {
  app: string;
  arasul: boolean;
  hinweis: string | null;
  geraet: string | null;
}

export function useLage(): UseQueryResult<Lage> {
  return useQuery({ queryKey: ["lage"], queryFn: () => hole<Lage>("api/lage"), staleTime: 5 * 60_000 });
}

export function useVorgaenge(): UseQueryResult<Vorgang[]> {
  return useQuery({
    queryKey: ["vorgaenge"],
    queryFn: async () => (await hole<{ vorgaenge: Vorgang[] }>("api/vorgaenge")).vorgaenge,
    // Nachfragen nur, solange wirklich etwas offen ist. Eine Seite, die im
    // Leerlauf im Sekundentakt fragt, haelt das Geraet ohne Grund wach.
    refetchInterval: (abfrage) =>
      (abfrage.state.data ?? []).some((vorgang) => vorgang.status === "wartet") ? 5000 : false,
  });
}

export function useEinreichen() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: (vorgang: { titel: string; text: string }) =>
      hole<{ vorgang: Vorgang }>("api/vorgaenge", { method: "POST", body: JSON.stringify(vorgang) }),
    onSuccess: () => speicher.invalidateQueries({ queryKey: ["vorgaenge"] }),
  });
}

/** Wie ein Stand heisst und welche Farbe dazu gehoert. Die Farbe folgt dem Wort. */
export const STAND: Record<Stand, { wort: string; art: "hinweis" | "erfolg" | "warnung" | "fehler" }> = {
  wartet: { wort: "wartet auf Entscheidung", art: "warnung" },
  genehmigt: { wort: "genehmigt", art: "erfolg" },
  abgelehnt: { wort: "abgelehnt", art: "fehler" },
  abgelaufen: { wort: "ohne Entscheidung abgelaufen", art: "fehler" },
  "ohne entscheidung": { wort: "niemand entscheidet", art: "hinweis" },
  "ohne lauf": { wort: "kein Lauf gestartet", art: "fehler" },
};

export function zeitpunkt(iso: string): string {
  const zeit = new Date(iso);
  return Number.isNaN(zeit.getTime())
    ? ""
    : zeit.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}
