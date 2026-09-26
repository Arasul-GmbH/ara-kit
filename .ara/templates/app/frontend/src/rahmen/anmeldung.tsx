/**
 * Wer gerade da ist, und was er darf.
 *
 * **Die App fragt das Gerät und nicht den Menschen.** Ein Feld in einem
 * Formular, in das jemand seinen Namen tippt, ist keine Anmeldung: dann
 * reichte jeder für jeden ein. Angemeldet wird an Arasul, das Sitzungscookie
 * fährt bei jedem Aufruf dieser Seite mit, und `api/me` sagt, wer es ist.
 *
 * Der Weg gehört der Plattform und nicht dieser App: er liegt unter `api/`
 * und wird trotzdem vom Gerät beantwortet, damit auch eine App ohne eigenes
 * Backend ihren Benutzer anzeigen kann. Festgestellt am Produkt am
 * 29.08.2026, `apps/dashboard-backend/src/routes/appAusliefern.js`.
 *
 * **Die Rolle steht hier und wird hier nicht ausgewertet.** Was ein Mensch
 * darf, entscheidet das Gerät: es liefert eine App nur dem aus, dem sie
 * freigegeben ist. Eine Prüfung in dieser App wäre keine zweite Sicherung,
 * sondern eine bessere Meldung. Wer sie dafür benutzt, sagt es im Text.
 */

import { createContext, use, type ReactNode } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { hole } from "./schnittstelle";
import { AsyncBoundary } from "./async-boundary";

export interface Anmeldung {
  /** Die Kennung der App, wie das Gerät sie führt. */
  app: string | null;
  /** `live` oder `test`. Der Teststand sieht nur, wer als Tester eingetragen ist. */
  stand: string | null;
  nutzer: string | null;
  rolle: string | null;
}

/** Ein Feld der Antwort, unter dem Namen, den das Gerät dafür benutzt. */
function feld(antwort: Record<string, unknown>, namen: string[]): string | null {
  for (const name of namen) {
    const wert = antwort[name];
    if (typeof wert === "string" && wert.trim()) return wert;
  }
  return null;
}

async function anmeldungLesen(): Promise<Anmeldung> {
  const antwort = await hole<Record<string, unknown>>("api/me");
  return {
    app: feld(antwort, ["app_id", "app"]),
    stand: feld(antwort, ["stand"]),
    nutzer: feld(antwort, ["benutzer", "user"]),
    rolle: feld(antwort, ["rolle", "role"]),
  };
}

export function useAnmeldungAbfrage(): UseQueryResult<Anmeldung> {
  return useQuery({ queryKey: ["anmeldung"], queryFn: anmeldungLesen, staleTime: 5 * 60_000 });
}

const Kontext = createContext<Anmeldung | null>(null);

/**
 * Der Rahmen um alles, was wissen muss, wer da ist.
 *
 * Solange die Antwort aussteht, steht die App nicht da: eine Seite, die erst
 * "unbekannt" zeigt und eine Sekunde später den Namen, hat einmal etwas
 * behauptet, was nicht stimmte.
 */
export function AnmeldungRahmen({ children }: { children: ReactNode }) {
  const abfrage = useAnmeldungAbfrage();
  return (
    <AsyncBoundary abfrage={abfrage} laedt="Anmeldung wird gelesen" fehlerTitel="Die Anmeldung ließ sich nicht lesen">
      {(anmeldung) => <Kontext value={anmeldung}>{children}</Kontext>}
    </AsyncBoundary>
  );
}

export function useAnmeldung(): Anmeldung {
  const anmeldung = use(Kontext);
  if (!anmeldung) {
    throw new Error("useAnmeldung steht außerhalb von AnmeldungRahmen: dort weiß niemand, wer da ist.");
  }
  return anmeldung;
}
