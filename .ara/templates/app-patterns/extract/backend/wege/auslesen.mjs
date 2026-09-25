/**
 * Muster Dokument auslesen: die Wege. HTTP und sonst nichts.
 *
 * Setzt das Muster Dokumente voraus: dessen Tabelle, Ablage und Wege liegen
 * schon in der App. Liegt unter `backend/wege/auslesen.mjs` und wird mit
 * diesen Zeilen in `server.mjs` eingehängt, unter denen des Musters Dokumente:
 *
 *   import { auslesungsAblage } from "./ablage/auslesungen.mjs";
 *   import { auslesen as auslesenKern } from "./kern/auslesen.mjs";
 *   import { auslesenWege } from "./wege/auslesen.mjs";
 *
 *   const auslesen = auslesenWege({
 *     kern: auslesenKern({ dokumente: dokumentAblage(db), auslesungen: auslesungsAblage(db), geraet }),
 *     von: (anfrage) => geraet.angemeldet(anfrage.headers).benutzer,
 *   });
 *
 *   // im Server, VOR den Wegen der Dokumente und vor dem 404:
 *   if (await auslesen(anfrage, antwort, pfad)) return;
 *
 * Vor den Dokumenten, weil beide unter `dokumente/` antworten und das Muster
 * Dokumente einen Weg, den es nicht kennt, mit 405 beantwortet.
 *
 * Die Wege, hinter `/apps/<id>/api/`:
 *
 *   GET  /auslesen                     kann das Gerät auslesen, und wenn nicht, warum
 *   GET  /dokumente/<id>/auslesungen   das Protokoll eines Dokuments
 *   POST /dokumente/<id>/auslesen      auslesen lassen. Wartet, bis das Modell
 *                                      geantwortet hat: eine halbe Minute ist
 *                                      normal, mehrere Minuten sind es, wenn
 *                                      das Modell erst geladen wird
 */

function json(antwort, status, daten) {
  antwort.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  antwort.end(JSON.stringify(daten));
}

export function auslesenWege({ kern, von }) {
  return async function bedienen(anfrage, antwort, pfad) {
    const teile = pfad.split("/").filter(Boolean);

    if (teile.length === 1 && teile[0] === "auslesen" && anfrage.method === "GET") {
      json(antwort, 200, kern.lage());
      return true;
    }

    if (teile[0] !== "dokumente" || teile.length !== 3 || !["auslesen", "auslesungen"].includes(teile[2])) return false;
    const id = Number(teile[1]);
    if (!Number.isInteger(id) || id <= 0) {
      json(antwort, 404, { fehler: `${pfad} ist kein Dokument.` });
      return true;
    }

    if (teile[2] === "auslesungen" && anfrage.method === "GET") {
      json(antwort, 200, { auslesungen: await kern.protokoll(id) });
      return true;
    }

    if (teile[2] === "auslesen" && anfrage.method === "POST") {
      const lage = kern.lage();
      if (!lage.kann) {
        json(antwort, 503, { fehler: lage.grund });
        return true;
      }
      const auslesung = await kern.anstossen(id, von(anfrage));
      if (!auslesung) json(antwort, 404, { fehler: `Dokument ${id} gibt es nicht.` });
      else json(antwort, 201, { auslesung });
      return true;
    }

    json(antwort, 405, { fehler: `${anfrage.method} ${pfad} gibt es am Auslesen nicht.` });
    return true;
  };
}
