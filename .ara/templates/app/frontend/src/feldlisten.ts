/**
 * Die Listen für Felder einer Freigabe, und was die Seite „Freigaben" damit prüft.
 *
 * Das Backend nennt sie unter `GET api/feldlisten` (`backend/kern/feldlisten.mjs`): je Feld eine
 * Liste aus `wert` und `name`, etwa die Konten eines Kontenrahmens. Die Vorlage kennt keine, ein
 * Muster bringt seine mit. Ohne Liste bleibt ein Feld, wie der Baustein es zeigt.
 *
 * Der Baustein `Freigabe` der Bibliothek zeigt ein änderbares Feld als Textfeld; diese Datei
 * ändert ihn nicht; `feldpruefung.ts` gibt ihm zwei Dinge:
 *
 *   - `mitNamen`: der Name des Vorschlags steht an der Bezeichnung („Konto, Vorschlag 4910 Porto").
 *   - `pruefen`: vor dem Freigeben. Ein Wert, der nicht in der Liste steht, geht nicht durch; ein
 *     anderer Wert der Liste als der Vorschlag wird einmal nachgefragt, mit beiden Namen.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { hole } from "./rahmen/schnittstelle";
import type { Feldlisten } from "./feldpruefung";

export { mitNamen, pruefen, type Feldlisten, type Listenwert, type Pruefung } from "./feldpruefung";

export function useFeldlisten(): UseQueryResult<Feldlisten> {
  return useQuery({
    queryKey: ["feldlisten"],
    queryFn: async () => (await hole<{ listen?: Feldlisten }>("api/feldlisten")).listen ?? {},
    // Eine App ohne Backend oder ohne den Weg hat keine Listen; die Freigabe geht trotzdem.
    retry: false,
    staleTime: 10 * 60_000,
  });
}
