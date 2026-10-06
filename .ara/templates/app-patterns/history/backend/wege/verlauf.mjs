/**
 * Muster Verlauf: der Weg. HTTP und sonst nichts. Liegt unter `backend/wege/verlauf.mjs`.
 *
 * Eingehängt wird das Muster mit `node .ara/tools/app.mjs --app <app> --add-pattern history`;
 * was dabei in `server.mjs` entsteht, steht in `wiring.json` neben dem Blatt.
 *
 *   GET /vorgaenge/<id>/verlauf   wer was wann, das Älteste zuerst. Ein fremder Vorgang: 404
 *
 * **Wer den Vorgang nicht sieht, sieht seinen Verlauf nicht.** `vorgang(anfrage, id)` gibt den
 * Vorgang, wie dieser Mensch ihn sieht, oder `null`; mit dem Muster Mandanten ist das die Ablage
 * seiner Sicht. Steht vor den Wegen der Mandanten, die einen Weg unter `vorgaenge/`, den sie nicht
 * kennen, mit 404 beantworten.
 */

function json(antwort, status, daten) {
  antwort.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  antwort.end(JSON.stringify(daten));
}

export function verlaufWege({ verlauf, vorgang }) {
  return async function bedienen(anfrage, antwort, pfad) {
    const treffer = /^\/vorgaenge\/(\d+)\/verlauf$/.exec(pfad);
    if (!treffer) return false;
    if (anfrage.method !== "GET") {
      json(antwort, 405, { fehler: "Ein Verlauf wird nur gelesen. Was geschieht, schreibt die App selbst mit." });
      return true;
    }
    const id = Number(treffer[1]);
    if (!(await vorgang(anfrage, id))) {
      json(antwort, 404, { fehler: `Vorgang ${id} gibt es nicht.` });
      return true;
    }
    json(antwort, 200, { verlauf: await verlauf.amVorgang(id) });
    return true;
  };
}
