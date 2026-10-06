/**
 * Die Freigaben dieser App, so wie das Gerät sie dem zeigt, der gerade da ist.
 *
 * Eine Freigabe liegt am Gerät und nicht in dieser App: ein Flow hat angehalten
 * und wartet auf einen Menschen. Diese Datei holt sie und entscheidet sie, mit
 * denselben Wegen, die auch die Verwaltung des Geräts benutzt:
 *
 *   `GET  /api/freigabe-anfragen`                   was bei mir liegt
 *   `GET  /api/freigabe-anfragen/bei-anderen`       was ich entscheiden dürfte, das bei einem anderen liegt
 *   `POST /api/freigabe-anfragen/<id>/bestaetigen`  freigeben, mit den geänderten Feldern
 *   `POST /api/freigabe-anfragen/<id>/ablehnen`     ablehnen, mit Grund
 *   `POST /api/freigabe-anfragen/<id>/uebernehmen`  liegt danach bei mir
 *
 * **Die Wege liegen auf der Herkunft des Geräts und nicht unter dem Pfad der
 * App**, deshalb gehen sie durch `holeGeraet` und nicht durch `hole` (das hängt
 * den Pfad der App davor). Beide gehen durch dieselbe Stelle in
 * `rahmen/schnittstelle.ts`, mit demselben Umschlag und denselben Fehlersätzen.
 *
 * **Wer sehen und entscheiden darf, sagt das Gerät.** Es liefert nur, was der
 * Angemeldete entscheiden darf: wer eingereicht hat, sieht seine eigene
 * Anfrage nicht. Diese App filtert nur auf sich selbst und prüft sonst nichts.
 *
 * **Bei wem eine Freigabe liegt, setzt der Administrator** je App und Stufe
 * (die Standardperson); entscheiden kann nur, bei dem sie liegt. Was bei einem
 * anderen liegt, steht unter „bei anderen" und lässt sich übernehmen. Ein Gerät,
 * das diesen Weg nicht kennt, legt alles bei allen ab; dann bleibt die Liste leer.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { FreigabeEintrag, FreigabeFeld, FreigabeKorrektur, FreigabeStation } from "@marken";
import { SchnittstellenFehler, holeGeraet } from "./rahmen/schnittstelle";

/** Die Kennung dieser App aus der Adresse: `/apps/<kennung>/` oder `/apps/<kennung>/test/`. */
export function appKennung(pfad: string = window.location.pathname): string {
  return /^\/apps\/([^/]+)\//.exec(pfad)?.[1] ?? "";
}

/** Was das Gerät einer Freigabe mitgibt. Nur, was diese Ansicht liest. */
interface Anfrage {
  id: string | number;
  app_id?: string;
  titel: string;
  zusammenhang?: string | null;
  stufe?: string | null;
  stufe_bezeichnung?: string | null;
  einreicher?: string | null;
  frist?: string | null;
  angefragt_am?: string | null;
  liegt_bei?: string | null;
  felder?: FreigabeFeld[] | null;
  original?: string | null;
  frueher?: Array<{
    titel: string;
    stufe?: string | null;
    status: FreigabeStation["status"];
    entschieden_von?: string | null;
    entschieden_am?: string | null;
    begruendung?: string | null;
    korrekturen?: FreigabeKorrektur[] | null;
  }> | null;
}

/** Die Anfrage des Geräts in der Form des Bausteins. */
export function alsEintrag(anfrage: Anfrage): FreigabeEintrag {
  return {
    id: anfrage.id,
    titel: anfrage.titel,
    zusammenhang: anfrage.zusammenhang,
    herkunft: anfrage.stufe_bezeichnung ? `Stufe ${anfrage.stufe_bezeichnung}` : null,
    einreicher: anfrage.einreicher,
    frist: anfrage.frist,
    angefragtAm: anfrage.angefragt_am,
    felder: anfrage.felder,
    original: anfrage.original,
    bisher: (anfrage.frueher ?? []).map((frueher) => ({
      titel: frueher.titel,
      stufe: frueher.stufe,
      status: frueher.status,
      entschiedenVon: frueher.entschieden_von,
      entschiedenAm: frueher.entschieden_am,
      begruendung: frueher.begruendung,
      korrekturen: frueher.korrekturen,
    })),
  };
}

export function useFreigaben(): UseQueryResult<FreigabeEintrag[]> {
  return useQuery({
    queryKey: ["freigaben"],
    queryFn: async () => {
      const kennung = appKennung();
      const anfragen = await holeGeraet<Anfrage[]>("/api/freigabe-anfragen");
      return (Array.isArray(anfragen) ? anfragen : []).filter((anfrage) => anfrage.app_id === kennung).map(alsEintrag);
    },
  });
}

/** Was bei einem anderen liegt: zum Übernehmen, nicht zum Entscheiden. */
export interface BeiAnderen {
  id: FreigabeEintrag["id"];
  titel: string;
  liegtBei: string | null;
  frist: string | null;
}

export function useBeiAnderen(): UseQueryResult<BeiAnderen[]> {
  return useQuery({
    queryKey: ["freigaben", "bei-anderen"],
    queryFn: async () => {
      const kennung = appKennung();
      let anfragen: Anfrage[];
      try {
        anfragen = await holeGeraet<Anfrage[]>("/api/freigabe-anfragen/bei-anderen");
      } catch (fehler) {
        // Ein Gerät ohne Standardperson kennt den Weg nicht: dort liegt nichts bei einem anderen.
        if (fehler instanceof SchnittstellenFehler && fehler.status === 404) return [];
        throw fehler;
      }
      return (Array.isArray(anfragen) ? anfragen : [])
        .filter((anfrage) => anfrage.app_id === kennung)
        .map((anfrage) => ({ id: anfrage.id, titel: anfrage.titel, liegtBei: anfrage.liegt_bei ?? null, frist: anfrage.frist ?? null }));
    },
  });
}

export function useUebernehmen() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: (id: FreigabeEintrag["id"]) => holeGeraet(`/api/freigabe-anfragen/${id}/uebernehmen`, {}),
    onSuccess: () => {
      void speicher.invalidateQueries({ queryKey: ["freigaben"] });
    },
  });
}

export function useBestaetigen() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: ({ id, felder }: { id: FreigabeEintrag["id"]; felder?: Record<string, string> }) =>
      holeGeraet<{ korrekturen?: unknown[] }>(`/api/freigabe-anfragen/${id}/bestaetigen`, felder ? { felder } : {}),
    onSuccess: () => {
      void speicher.invalidateQueries({ queryKey: ["freigaben"] });
      void speicher.invalidateQueries({ queryKey: ["vorgaenge"] });
    },
  });
}

export function useAblehnen() {
  const speicher = useQueryClient();
  return useMutation({
    mutationFn: ({ id, grund }: { id: FreigabeEintrag["id"]; grund: string }) =>
      holeGeraet(`/api/freigabe-anfragen/${id}/ablehnen`, { begruendung: grund }),
    onSuccess: () => {
      void speicher.invalidateQueries({ queryKey: ["freigaben"] });
      void speicher.invalidateQueries({ queryKey: ["vorgaenge"] });
    },
  });
}
