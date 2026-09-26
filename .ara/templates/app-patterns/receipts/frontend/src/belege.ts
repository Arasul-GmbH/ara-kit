/**
 * Muster Belege: die Belege eines Vorgangs. Liegt in einer App aus der Vorlage
 * unter `frontend/src/belege.ts`, neben `dokumente.ts` aus dem Muster
 * Dokumente, dessen Typ es erweitert.
 *
 * Ein Beleg ist ein Dokument mit Vorgang und Mandant. Hochgeladen wird er wie
 * jedes Dokument, mit der Nummer des Vorgangs in der Adresse; den Mandanten
 * setzt das Backend vom Vorgang, nie diese Seite.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { Dokument } from "./dokumente";
import { hole } from "./rahmen/schnittstelle";

export interface Beleg extends Dokument {
  mandant: number | null;
  vorgang: number | null;
}

export function useBelege(vorgang: number): UseQueryResult<{ belege: Beleg[] }> {
  return useQuery({
    queryKey: ["belege", vorgang],
    queryFn: () => hole<{ belege: Beleg[] }>(`api/vorgaenge/${vorgang}/belege`),
  });
}

export function useBelegAnhaengen(vorgang: number) {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: (datei: File) =>
      hole<{ dokument: Beleg }>(`api/dokumente?vorgang=${vorgang}`, {
        method: "POST",
        body: datei,
        headers: {
          "content-type": datei.type || "application/octet-stream",
          // URL-kodiert, damit ein Umlaut im Dateinamen die Kopfzeile übersteht.
          "x-dateiname": encodeURIComponent(datei.name),
        },
      }),
    onSuccess: () => {
      speicher.invalidateQueries({ queryKey: ["belege", vorgang] });
      speicher.invalidateQueries({ queryKey: ["dokumente"] });
    },
  });
}
