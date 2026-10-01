/**
 * Muster Buchungsstapel: die Wege. HTTP und sonst nichts.
 *
 * Liegt unter `backend/wege/datev.mjs` und wird mit diesen Zeilen in
 * `server.mjs` eingehängt, vor dem 404:
 *
 *   import { datevWege } from "./wege/datev.mjs";
 *
 *   const datev = datevWege({
 *     // Wer darf diesen Mandanten sehen, und welche Buchungen sind freigegeben?
 *     // Null, wenn der Mandant nicht zu denen gehört, die dieser Mensch sieht:
 *     // das ist ein 404, kein 403, damit niemand erfährt, dass es ihn gibt.
 *     stapel: async (anfrage, mandantId) => {
 *       const benutzer = geraet.angemeldet(anfrage.headers);
 *       const mandant = await mandantenAblage(db, benutzer).lesen(mandantId);
 *       if (!mandant) return null;
 *       return {
 *         mandant: { beraternummer: mandant.beraternummer, nummer: mandant.nummer, wjBeginn: mandant.wj_beginn },
 *         buchungen: await buchungsAblage(db, benutzer).freigegeben(mandantId),
 *         exportiertVon: benutzer.benutzer,
 *       };
 *     },
 *   });
 *
 *   if (await datev(anfrage, antwort, pfad)) return;
 *
 * Die Wege, hinter `/apps/<id>/api/`, mit `?mandant=<nummer>`:
 *
 *   GET /datev/vorschau   welche Buchungen in die Datei kämen, welche nicht und
 *                         warum, und das Ergebnis des Prüfskripts. Ändert nichts.
 *   GET /datev/stapel     die Datei. **Nie eine, die das Prüfskript nicht
 *                         besteht**: dann kommt 500 mit den Befunden, und der
 *                         Mensch lädt nichts herunter, was DATEV ablehnt.
 *
 * Der Weg schreibt nichts in die Ablage. Ob eine Buchung nach dem Export als
 * "übergeben" gilt, entscheidet die App: dafür gehört ein eigener Schritt mit
 * Freigabe davor, und das ist ihr Fachwissen.
 */

import { buchungsstapel } from "../kern/datev.mjs";
import { extfPruefen } from "../pruefen/extf-pruefen.mjs";

function json(antwort, status, daten) {
  antwort.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  antwort.end(JSON.stringify(daten));
}

export function datevWege({ stapel }) {
  return async function bedienen(anfrage, antwort, pfad) {
    const teile = pfad.split("/").filter(Boolean);
    if (teile[0] !== "datev" || teile.length !== 2 || !["vorschau", "stapel"].includes(teile[1])) return false;
    if (anfrage.method !== "GET") {
      json(antwort, 405, { fehler: `${anfrage.method} ${pfad} gibt es am Buchungsstapel nicht.` });
      return true;
    }
    const mandantId = new URL(anfrage.url, "http://app").searchParams.get("mandant");
    if (!mandantId) {
      json(antwort, 400, { fehler: "Es fehlt der Mandant: ?mandant=<Nummer>." });
      return true;
    }
    const gegeben = await stapel(anfrage, mandantId);
    if (!gegeben) {
      json(antwort, 404, { fehler: `Mandant ${mandantId} gibt es nicht.` });
      return true;
    }

    let ergebnis;
    try {
      ergebnis = buchungsstapel(gegeben, { exportiertVon: gegeben.exportiertVon });
    } catch (fehler) {
      json(antwort, 422, { fehler: fehler.message });
      return true;
    }
    const pruefung = extfPruefen(ergebnis.bytes);

    if (teile[1] === "vorschau") {
      json(antwort, 200, { datei: ergebnis.datei, ids: ergebnis.ids, abgelehnt: ergebnis.abgelehnt, pruefung });
      return true;
    }
    if (!pruefung.ok) {
      json(antwort, 500, { fehler: "Die Datei besteht das Prüfskript nicht und wird nicht ausgeliefert.", pruefung });
      return true;
    }
    antwort.writeHead(200, {
      "content-type": "text/csv; charset=windows-1252",
      "content-disposition": `attachment; filename="${ergebnis.datei}"`,
      "x-abgelehnt": String(ergebnis.abgelehnt.length),
    });
    antwort.end(ergebnis.bytes);
    return true;
  };
}
