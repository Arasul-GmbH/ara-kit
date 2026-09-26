/**
 * Muster Belege: die Muster Dokumente, Dokument auslesen und Mandanten in
 * einer App. Die Wege.
 *
 * Setzt alle drei voraus: ihre Ordner liegen in der App, und dieses Muster
 * ersetzt die beiden Ablagen `ablage/dokumente.mjs` und
 * `ablage/auslesungen.mjs` durch seine, die den Mandanten kennen. Kern und
 * Wege der Muster bleiben, wie sie sind; neu ist nur, dass sie je Anfrage mit
 * dem Namen aus der Anmeldung gebaut werden. Eingehängt in `server.mjs`, statt
 * der Zeilen aus den Köpfen von `wege/dokumente.mjs` und `wege/auslesen.mjs`:
 *
 *   import { dokumentAblage } from "./ablage/dokumente.mjs";
 *   import { auslesungsAblage } from "./ablage/auslesungen.mjs";
 *   import { dokumente as dokumentKern } from "./kern/dokumente.mjs";
 *   import { auslesen as auslesenKern } from "./kern/auslesen.mjs";
 *   import { dokumentWege } from "./wege/dokumente.mjs";
 *   import { auslesenWege } from "./wege/auslesen.mjs";
 *   import { belegWege } from "./wege/belege.mjs";
 *   import { mitBeleg } from "./kern/belege.mjs";
 *
 *   const belege = belegWege({
 *     angemeldet: (anfrage) => geraet.angemeldet(anfrage.headers),
 *     vorgaenge: (benutzer) => vorgangsAblage(db, benutzer),
 *     dokumente: (benutzer) => dokumentAblage(db, benutzer),
 *     dokumentWege: (benutzer) =>
 *       dokumentWege({
 *         kern: dokumentKern({ ablage: dokumentAblage(db, benutzer), vorgaenge: vorgangsAblage(db, benutzer) }),
 *         von: () => benutzer,
 *       }),
 *     auslesenWege: (benutzer) =>
 *       auslesenWege({
 *         kern: auslesenKern({ dokumente: dokumentAblage(db, benutzer), auslesungen: auslesungsAblage(db, benutzer), geraet }),
 *         von: () => benutzer,
 *       }),
 *   });
 *
 *   // im Server, VOR den Wegen der Mandanten und vor dem 404:
 *   if (await belege(anfrage, antwort, pfad)) return;
 *
 * Und in den Zeilen des Musters Mandanten wird aus `bereit: () => true`:
 *
 *   bereit: mitBeleg(dokumentAblage(db, benutzer)),
 *
 * Ein Vorgang ohne Beleg bleibt dann in Arbeit. Was eine Fach-App sonst noch
 * verlangt, die Liste der erwarteten Unterlagen etwa, prüft sie an derselben
 * Stelle und gibt den Satz, was fehlt.
 *
 * Vor den Mandanten, weil beide unter `vorgaenge/` antworten und das Muster
 * Mandanten einen Weg, den es nicht kennt, mit 404 beantwortet.
 *
 * Die Wege, hinter `/apps/<id>/api/`, dazu die der beiden Muster:
 *
 *   GET  /vorgaenge/<id>/belege        die Belege eines Vorgangs. Ein fremder: 404
 *   POST /dokumente?vorgang=<id>       ein Beleg an einen Vorgang. Ohne Vorgang
 *                                      400, ein fremder 404, ein eingereichter 409
 *
 * **Nach dem Einreichen ändert sich nichts mehr.** Anhängen, Entfernen und
 * ein neues Auslesen an einem Beleg eines eingereichten Vorgangs bekommen 409:
 * der Entscheider gibt frei, was er gesehen hat. Anhängen und Auslesen prüft
 * dieser Weg, bevor eine Datei gelesen oder das Gerät gefragt ist, das
 * Entfernen der Kern des Musters Dokumente.
 *
 * **Wer ausliest, geht mit.** Der Name aus der Anmeldung steht an der
 * Auslesung, und `geraet.auslesen` reicht ihn an das Gerät weiter: im
 * Protokoll der Modellaufrufe steht dann, für wen gelesen wurde.
 */

import { darfAendern } from "../kern/vorgaenge.mjs";

function json(antwort, status, daten) {
  antwort.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  antwort.end(JSON.stringify(daten));
}

export function belegWege({ angemeldet, vorgaenge, dokumente, dokumentWege, auslesenWege }) {
  return async function bedienen(anfrage, antwort, pfad) {
    const teile = pfad.split("/").filter(Boolean);
    if (!["vorgaenge", "dokumente", "auslesen"].includes(teile[0])) return false;
    const { benutzer } = angemeldet(anfrage);

    if (teile[0] === "vorgaenge") {
      if (teile.length !== 3 || teile[2] !== "belege" || anfrage.method !== "GET") return false;
      const id = Number(teile[1]);
      const vorgang = Number.isInteger(id) && id > 0 ? await vorgaenge(benutzer).eines(id) : null;
      if (!vorgang) json(antwort, 404, { fehler: `Vorgang ${teile[1]} gibt es nicht.` });
      else json(antwort, 200, { belege: await dokumente(benutzer).amVorgang(id) });
      return true;
    }

    // Ein Beleg ohne Vorgang hätte keinen Mandanten, und ohne Mandant sähe ihn
    // niemand. Das wird gesagt, bevor die Datei gelesen ist.
    if (teile[0] === "dokumente" && teile.length === 1 && anfrage.method === "POST") {
      const nummer = Number(new URL(anfrage.url, "http://app").searchParams.get("vorgang"));
      if (!Number.isInteger(nummer) || nummer <= 0) {
        json(antwort, 400, { fehler: "Ein Beleg gehört an einen Vorgang: ?vorgang=<Nummer>." });
        return true;
      }
      const vorgang = await vorgaenge(benutzer).eines(nummer);
      if (!vorgang) {
        json(antwort, 404, { fehler: `Vorgang ${nummer} gibt es nicht.` });
        return true;
      }
      if (!darfAendern(vorgang)) {
        json(antwort, 409, { fehler: `Vorgang ${nummer} ist eingereicht und nimmt keinen Beleg mehr an.` });
        return true;
      }
    }

    // Ein neues Auslesen änderte die Felder, über die schon entschieden wird.
    if (teile[0] === "dokumente" && teile[2] === "auslesen" && anfrage.method === "POST" && Number.isInteger(Number(teile[1]))) {
      const dokument = await dokumente(benutzer).eines(Number(teile[1]));
      const vorgang = dokument?.vorgang ? await vorgaenge(benutzer).eines(dokument.vorgang) : null;
      if (vorgang && !darfAendern(vorgang)) {
        json(antwort, 409, { fehler: `Vorgang ${vorgang.id} ist eingereicht; seine Belege werden nicht neu ausgelesen.` });
        return true;
      }
    }

    if (await auslesenWege(benutzer)(anfrage, antwort, pfad)) return true;
    return await dokumentWege(benutzer)(anfrage, antwort, pfad);
  };
}
