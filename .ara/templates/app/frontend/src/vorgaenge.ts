/**
 * Die Vorgänge: was diese App verwaltet, und wie sie an sie herankommt.
 *
 * Typen und Abfragen an einer Stelle, damit die Seiten daneben nur noch
 * zeichnen. Wer eine zweite Entität dazunimmt, legt eine zweite solche Datei
 * an und nicht eine zweite Art, `fetch` zu rufen.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { hole } from "./rahmen/schnittstelle";

/** Wie ein Vorgang steht. Die Namen kommen aus dem Backend dieser App. */
export type Stand = "in arbeit" | "wartet" | "genehmigt" | "abgelehnt" | "abgelaufen" | "ohne entscheidung" | "ohne lauf";

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
  /** Nur solange er wartet: wer entscheidet, aus der Regel des Backends. `konten: null` heißt jeder mit Zugang. */
  entscheidet?: { konten: string[] | null; ohne: string | null };
}

/** Was das Backend über seinen Rahmen sagt: erreicht es ein Arasul, und wenn nicht, warum nicht. */
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
    // Leerlauf im Sekundentakt fragt, hält das Gerät ohne Grund wach.
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

/**
 * Wie ein Stand heißt und welches Zeichen dazu gehört. Das Zeichen folgt dem Wort.
 *
 * `wartet` hat eine eigene Art: es ist der Stand, auf den jemand etwas tun
 * muss. Bis zum 26.09.2026 war er als `warnung` das blasseste Grau der Liste.
 */
export const STAND: Record<Stand, { wort: string; art: "wartet" | "hinweis" | "erfolg" | "fehler" }> = {
  "in arbeit": { wort: "in Arbeit", art: "hinweis" },
  wartet: { wort: "wartet", art: "wartet" },
  genehmigt: { wort: "genehmigt", art: "erfolg" },
  abgelehnt: { wort: "abgelehnt", art: "fehler" },
  abgelaufen: { wort: "abgelaufen", art: "fehler" },
  "ohne entscheidung": { wort: "niemand entscheidet", art: "hinweis" },
  "ohne lauf": { wort: "kein Lauf gestartet", art: "fehler" },
};

/** Wer einen wartenden Vorgang entscheidet, als Satzteil. `null`, wenn das Backend es nicht sagt. */
export function werEntscheidet(vorgang: Vorgang): string | null {
  const wer = vorgang.entscheidet;
  if (!wer) return null;
  if (wer.konten === null) return wer.ohne ? `alle mit Zugang außer ${wer.ohne}` : "alle mit Zugang";
  const konten = wer.konten.filter((konto) => konto !== wer.ohne);
  return konten.length ? konten.join(", ") : "niemand nach der heutigen Regel";
}

/** Wie lange etwas her ist, als „seit 3 Std.". Nach zwei Wochen das Datum. */
export function seit(iso: string, jetzt = Date.now()): string {
  const zeit = new Date(iso).getTime();
  if (Number.isNaN(zeit)) return "";
  const minuten = Math.max(0, Math.floor((jetzt - zeit) / 60_000));
  if (minuten < 1) return "seit eben";
  if (minuten < 60) return `seit ${minuten} Min.`;
  const stunden = Math.floor(minuten / 60);
  if (stunden < 24) return `seit ${stunden} Std.`;
  const tage = Math.floor(stunden / 24);
  if (tage < 14) return tage === 1 ? "seit 1 Tag" : `seit ${tage} Tagen`;
  return `seit ${new Date(zeit).toLocaleDateString("de-DE", { dateStyle: "medium" })}`;
}

export function zeitpunkt(iso: string): string {
  const zeit = new Date(iso);
  return Number.isNaN(zeit.getTime())
    ? ""
    : zeit.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}
