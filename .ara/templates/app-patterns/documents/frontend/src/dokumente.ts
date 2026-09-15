/**
 * Muster Dokumente: was diese App an Dokumenten verwaltet, und wie sie an sie
 * herankommt.
 *
 * Liegt in einer App aus der Vorlage unter `frontend/src/dokumente.ts`, neben
 * `vorgaenge.ts`, nach derselben Regel: Typen und Abfragen einer Entität an
 * einer Stelle, damit die Seite daneben nur noch zeichnet.
 *
 * **Die Bytes gehen über `hole` und nicht über ein zweites `fetch`.** Ein
 * Hochladen ist ein `POST` mit der Datei als Rumpf und zwei Kopfzeilen; die
 * Antwort ist JSON wie bei jedem anderen Weg. Zurück zeigt die Anzeige nicht
 * auf einen Blob, sondern auf die Adresse der Datei: gleiche Herkunft, das
 * Sitzungscookie fährt mit, und die Dokumentanzeige holt selbst, was sie
 * braucht.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { DokumentArt } from "@marken";
import { weg } from "./rahmen/basis";
import { hole } from "./rahmen/schnittstelle";

export interface Dokument {
  id: number;
  name: string;
  /** Der MIME-Typ, wie der Browser ihn beim Hochladen genannt hat. */
  art: string;
  groesse: number;
  von: string;
  abgelegt: string;
}

export interface Dokumentenliste {
  dokumente: Dokument[];
  /** Die Grenze kommt vom Backend. Sie steht nicht ein zweites Mal hier. */
  grenze_bytes: number;
}

export function useDokumente(): UseQueryResult<Dokumentenliste> {
  return useQuery({ queryKey: ["dokumente"], queryFn: () => hole<Dokumentenliste>("api/dokumente") });
}

export function useHochladen() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: (datei: File) =>
      hole<{ dokument: Dokument }>("api/dokumente", {
        method: "POST",
        body: datei,
        headers: {
          "content-type": datei.type || "application/octet-stream",
          // URL-kodiert, damit ein Umlaut im Dateinamen die Kopfzeile übersteht.
          "x-dateiname": encodeURIComponent(datei.name),
        },
      }),
    onSuccess: () => speicher.invalidateQueries({ queryKey: ["dokumente"] }),
  });
}

export function useEntfernen() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => hole<{ entfernt: number }>(`api/dokumente/${id}`, { method: "DELETE" }),
    onSuccess: () => speicher.invalidateQueries({ queryKey: ["dokumente"] }),
  });
}

/** Die Adresse der Bytes, absolut, wie `weg()` sie baut. Das ist die `quelle` der Dokumentanzeige. */
export function dokumentAdresse(id: number): string {
  return weg(`api/dokumente/${id}/datei`);
}

/**
 * Als was die Dokumentanzeige das Dokument zeigt. Die Adresse trägt keine
 * Endung, also sagt es die App, aus dem Typ, den das Backend gespeichert hat.
 */
export function anzeigeArt(art: string): DokumentArt | undefined {
  if (art === "application/pdf") return "pdf";
  if (art.startsWith("image/")) return "bild";
  return undefined;
}

/** Eine Größe in Bytes, wie ein Mensch sie liest. */
export function groesseInWorten(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
