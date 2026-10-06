/**
 * Muster Belege: ein Beleg hängt an einem Vorgang, gehört zu seinem Mandanten, und das Gerät
 * liest ihn. Die Wege.
 *
 * Setzt die Muster Dokumente (2) und Mandanten (7) voraus. **Das Muster Dokument auslesen (6)
 * braucht es nicht**: ab Kontrakt 14 liest das Gerät den Beleg im Flow selbst, als `original`
 * des Schritts `lesen`, und die Freigabe zeigt ihn neben den Feldern. Mit Muster 6 kommt das
 * Auslesen in der App dazu (`auslesenWege`), siehe das Blatt, „Zwei Wege".
 *
 * Eingehängt wird es mit `node .ara/tools/app.mjs --app <app> --add-pattern receipts`; was dabei
 * in `server.mjs` entsteht, steht in `wiring.json` neben dem Blatt. Die Ablagen der Dokumente
 * (und der Auslesungen) ersetzt es durch seine, die je Anfrage für eine Sicht gebaut werden.
 *
 * **`sicht` kommt aus dem Muster Mandanten**: der Name, und ob er alle Mandanten sieht (die
 * Verwaltung mit `alleSehen`). Jede Ablage wird mit ihr gebaut, der Name allein geht an `von`.
 * Vor den Mandanten eingehängt, weil beide unter `vorgaenge/` antworten und das Muster
 * Mandanten einen Weg, den es nicht kennt, mit 404 beantwortet.
 *
 * Die Wege, hinter `/apps/<id>/api/`, dazu die der Muster:
 *
 *   GET  /belege/betraege              je sichtbarem Vorgang der Betrag aus seinem Abschluss
 *                                      (das Feld `betragFeld`, sonst null), für die Belegliste
 *   GET  /vorgaenge/<id>/belege        die Belege eines Vorgangs. Ein fremder: 404
 *   GET  /vorgaenge/<id>/beleg.<endung> das Original für den Flow: die Bytes des zuerst
 *                                      angehängten Belegs, mit seiner Art. Ein fremder: 404
 *   POST /dokumente?vorgang=<id>       ein Beleg an einen Vorgang. Ohne Vorgang 400, ein
 *                                      fremder 404, ein eingereichter 409, eine Art, die das
 *                                      Gerät nicht liest (nur PDF, PNG, JPEG), 415
 *
 * **Das Gerät holt das Original im Namen dessen, der eingereicht hat**, mit denselben Kopfzeilen
 * wie aus dem Browser. Darum gilt für `beleg.<endung>` dieselbe Sicht wie für jeden anderen Weg,
 * und ein fremder Beleg ist auch für den Flow 404. Die Endung kommt als Flow-Argument `endung`
 * mit (`belegArgumente` in `kern/belege.mjs`); die Bytes sind immer die des Belegs.
 *
 * **Nach dem Einreichen ändert sich nichts mehr.** Anhängen, Entfernen und
 * ein neues Auslesen an einem Beleg eines eingereichten Vorgangs bekommen 409:
 * der Entscheider gibt frei, was er gesehen hat. Anhängen und Auslesen prüft
 * dieser Weg, bevor eine Datei gelesen oder das Gerät gefragt ist, das
 * Entfernen der Kern des Musters Dokumente.
 */

import { darfAendern } from "../kern/vorgaenge.mjs";
import { LESBAR, ersterBeleg } from "../kern/belege.mjs";

function json(antwort, status, daten) {
  antwort.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  antwort.end(JSON.stringify(daten));
}

export function belegWege({
  angemeldet,
  sicht = (wer) => wer.benutzer,
  vorgaenge,
  dokumente,
  dokumentWege,
  auslesenWege = null,
  abschluss = null,
  betragFeld = "betrag",
}) {
  return async function bedienen(anfrage, antwort, pfad) {
    const teile = pfad.split("/").filter(Boolean);
    if (!["vorgaenge", "dokumente", "auslesen", "belege"].includes(teile[0])) return false;
    const wer = angemeldet(anfrage);
    const benutzer = sicht(wer);

    // Der Betrag steht erst nach der Prüfung fest: im Abschluss, den das Gerät übergibt, mit der
    // Korrektur eines Menschen. Vorher ist er null, und die Liste zeigt einen Strich.
    if (teile[0] === "belege") {
      if (teile.length !== 2 || teile[1] !== "betraege" || anfrage.method !== "GET") return false;
      const betraege = {};
      for (const vorgang of await vorgaenge(benutzer).alle()) {
        const felder = abschluss && vorgang.lauf ? (await abschluss(vorgang.lauf))?.felder : null;
        betraege[vorgang.id] = felder && typeof felder === "object" ? (felder[betragFeld] ?? null) : null;
      }
      json(antwort, 200, { betraege, feld: betragFeld });
      return true;
    }

    if (teile[0] === "vorgaenge") {
      const original = /^beleg\.(pdf|png|jpe?g)$/.test(teile[2] || "");
      if (teile.length !== 3 || (teile[2] !== "belege" && !original) || anfrage.method !== "GET") return false;
      const id = Number(teile[1]);
      const vorgang = Number.isInteger(id) && id > 0 ? await vorgaenge(benutzer).eines(id) : null;
      if (!vorgang) {
        json(antwort, 404, { fehler: `Vorgang ${teile[1]} gibt es nicht.` });
        return true;
      }
      const belege = await dokumente(benutzer).amVorgang(id);
      if (!original) {
        json(antwort, 200, { belege });
        return true;
      }
      const beleg = ersterBeleg(belege);
      const datei = beleg ? await dokumente(benutzer).eines(beleg.id) : null;
      if (!datei) {
        json(antwort, 404, { fehler: `Vorgang ${id} hat keinen Beleg.` });
        return true;
      }
      antwort.writeHead(200, { "content-type": datei.art, "content-length": datei.inhalt.length, "cache-control": "no-store" });
      antwort.end(datei.inhalt);
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
      // Das Gerät liest als Original nur PDF, PNG und JPEG. Ein anderes Format (ein Handyfoto als
      // HEIC etwa) hielte den Lauf erst beim Lesen an; hier erfährt es der Mensch beim Hochladen.
      const art = String(anfrage.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (!LESBAR[art]) {
        json(antwort, 415, { fehler: "Als Beleg gehen PDF, PNG und JPEG. Ein Foto in einem anderen Format bitte als JPEG speichern." });
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

    if (auslesenWege && (await auslesenWege(benutzer, wer.benutzer)(anfrage, antwort, pfad))) return true;
    return await dokumentWege(benutzer, wer.benutzer)(anfrage, antwort, pfad);
  };
}
