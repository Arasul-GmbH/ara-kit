/**
 * Muster Mandanten: Typen und Abfragen. Liegt in einer App aus der Vorlage
 * unter `frontend/src/mandanten.ts`, neben `vorgaenge.ts`.
 *
 * **Ob jemand verwaltet, sagt das Backend**, nicht ein Vergleich mit einem
 * Rollennamen hier. `GET api/mandanten` antwortet mit `verwaltung: true` oder
 * `false`, und die Seitenleiste zeigt den Eintrag der Verwaltung nur dann. Der
 * Schutz ist das nicht: das Backend weist jeden Weg der Verwaltung mit 403 ab,
 * wer auch immer ihn ruft. Die Seite spart dem Menschen nur den Weg dorthin.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { hole } from "./rahmen/schnittstelle";
import type { Vorgang } from "./vorgaenge";

export interface Mandant {
  id: number;
  name: string;
  angelegt_von: string;
  angelegt: string;
}

export interface Konto {
  benutzer: string;
  /** Wann die App den Namen zum ersten und zum letzten Mal gesehen hat. */
  zuerst: string;
  zuletzt: string;
}

export interface Zuordnung {
  benutzer: string;
  mandant: number;
  zugeordnet_von: string;
  seit: string;
}

export interface Uebersicht {
  mandanten: Mandant[];
  verwaltung: boolean;
}

export interface Verwaltung {
  mandanten: Mandant[];
  konten: Konto[];
  zuordnungen: Zuordnung[];
}

/** Die Mandanten, die dieser Mensch sieht, und ob er verwaltet. */
export function useMandanten(): UseQueryResult<Uebersicht> {
  return useQuery({ queryKey: ["mandanten"], queryFn: () => hole<Uebersicht>("api/mandanten") });
}

/** Alles für die Verwaltungsseite. Nur abfragen, wenn `verwaltung` stimmt: sonst antwortet das Backend 403. */
export function useVerwaltung(an: boolean): UseQueryResult<Verwaltung> {
  return useQuery({ queryKey: ["zuordnungen"], queryFn: () => hole<Verwaltung>("api/zuordnungen"), enabled: an });
}

function useNachher() {
  const speicher = useQueryClient();
  return () => {
    for (const schluessel of ["mandanten", "zuordnungen", "vorgaenge"]) {
      void speicher.invalidateQueries({ queryKey: [schluessel] });
    }
  };
}

export function useMandantAnlegen() {
  const nachher = useNachher();
  return useMutation({
    mutationFn: (name: string) => hole<{ mandant: Mandant }>("api/mandanten", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: nachher,
  });
}

export function useZuordnen() {
  const nachher = useNachher();
  return useMutation({
    mutationFn: (zuordnung: { benutzer: string; mandant: number }) =>
      hole("api/zuordnungen", { method: "POST", body: JSON.stringify(zuordnung) }),
    onSuccess: nachher,
  });
}

export function useLoesen() {
  const nachher = useNachher();
  return useMutation({
    mutationFn: ({ benutzer, mandant }: { benutzer: string; mandant: number }) =>
      hole(`api/zuordnungen?benutzer=${encodeURIComponent(benutzer)}&mandant=${mandant}`, { method: "DELETE" }),
    onSuccess: nachher,
  });
}

/**
 * Einreichen mit Mandant. Ersetzt in `seiten/neu.tsx` das `useEinreichen` aus
 * `vorgaenge.ts`: ohne Mandant nimmt das Backend keinen Vorgang mehr an.
 */
export function useEinreichenBeiMandant() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: (vorgang: { titel: string; text: string; mandant: number }) =>
      hole<{ vorgang: Vorgang }>("api/vorgaenge", { method: "POST", body: JSON.stringify(vorgang) }),
    onSuccess: () => speicher.invalidateQueries({ queryKey: ["vorgaenge"] }),
  });
}
