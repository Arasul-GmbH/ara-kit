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

/** Ein Feld des Schemas, wie die Seite es zeigt: Beschriftung aus `title`, Art aus `ARTEN`. */
export interface FeldBeschriftung {
  name: string;
  titel: string;
  art: "datum" | "betrag" | "waehrung" | "prozent" | "zahl" | "text";
}

export interface AuslesenLage {
  kann: boolean;
  grund: string | null;
  felder: FeldBeschriftung[];
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

/** Ein Betrag mit zwei Nachkommastellen und seiner Währung, ohne gültigen Code in Euro. */
function betrag(wert: number, waehrung: unknown): string {
  const code = typeof waehrung === "string" && /^[A-Z]{3}$/.test(waehrung.trim().toUpperCase()) ? waehrung.trim().toUpperCase() : "EUR";
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: code }).format(wert);
  } catch {
    return `${wert.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
  }
}

/**
 * Ein Wert der Felder, wie ein Mensch ihn liest: ein Datum als 14.01.2025,
 * ein Betrag als 3.550,00 €, ein Satz als 19 %. Was sich nicht so lesen
 * lässt, steht, wie es kam; ein Mangel dazu steht in der Meldung darüber.
 * `waehrung` ist der Wert des Feldes der Art `waehrung` derselben Auslesung.
 */
export function wertInWorten(wert: unknown, art: FeldBeschriftung["art"] = "text", waehrung: unknown = null): string {
  if (wert === null || wert === undefined || wert === "") return "fehlt";
  if (art === "datum" && typeof wert === "string") {
    const teile = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert.trim());
    return teile ? `${teile[3]}.${teile[2]}.${teile[1]}` : wert;
  }
  if (typeof wert === "number") {
    if (art === "betrag") return betrag(wert, waehrung);
    if (art === "prozent") return `${wert.toLocaleString("de-DE")} %`;
    return wert.toLocaleString("de-DE");
  }
  return typeof wert === "string" ? wert : JSON.stringify(wert);
}
