/**
 * Muster Mandanten: die Wege. HTTP und sonst nichts.
 *
 * Liegt in einer App aus der Vorlage unter `backend/wege/mandanten.mjs`.
 * Eingehängt wird sie in `server.mjs` so:
 *
 *   import { mandantAblage } from "./ablage/mandanten.mjs";
 *   import { mandanten as mandantenKern, verwaltungsRolle } from "./kern/mandanten.mjs";
 *   import { mandantenWege } from "./wege/mandanten.mjs";
 *
 *   const mandantenFall = mandantenKern({ ablage: mandantAblage(db), verwaltung: verwaltungsRolle(vereinbarung) });
 *   const mandanten = mandantenWege({
 *     mandanten: mandantenFall,
 *     vorgaenge: (benutzer) =>
 *       kern({
 *         ablage: vorgangsAblage(db, benutzer),
 *         geraet,
 *         name: NAME,
 *         regel: mandantenFall.regel,
 *         zustaendig: mandantenFall.zustaendig,
 *       }),
 *     angemeldet: (anfrage) => geraet.angemeldet(anfrage.headers),
 *   });
 *
 *   // im Server, vor den Wegen der Vorgänge:
 *   if (await mandanten(anfrage, antwort, pfad)) return;
 *
 * Die beiden Wege `/vorgaenge` der Vorlage in `server.mjs` fallen damit weg:
 * dieser hier antwortet vorher. Wer sie stehen lässt, lässt Wege stehen, die
 * nie jemand erreicht; die Ablage ohne Namen sähe dort ohnehin nichts.
 *
 * Die Wege, hinter `/apps/<id>/api/`:
 *
 *   GET    /mandanten         die Mandanten, die dieser Mensch sieht, und ob er verwaltet
 *   POST   /mandanten         einen anlegen. Nur die Verwaltung
 *   GET    /zuordnungen       alle Mandanten, gesehenen Konten, Zuordnungen. Nur die Verwaltung
 *   POST   /zuordnungen       `{ benutzer, mandant }` zuordnen. Nur die Verwaltung
 *   DELETE /zuordnungen       `?benutzer=…&mandant=…` lösen. Nur die Verwaltung
 *   GET    /vorgaenge         die Vorgänge der eigenen Mandanten
 *   POST   /vorgaenge         `{ titel, text, mandant }`. Ein fremder Mandant: 404
 *   GET    /vorgaenge/<id>    ein Vorgang. Ein fremder: 404
 *
 * **Jeder Name, der hier vorbeikommt, wird vermerkt**, auch auf einem Weg, den
 * diese Datei nicht bedient. Daraus wählt die Verwaltung beim Zuordnen.
 *
 * **Fremd heißt 404, nicht 403.** Ein 403 sagte, dass es den Vorgang oder den
 * Mandanten gibt. 403 bekommt nur, wer die Verwaltung aufruft, ohne sie zu
 * haben: dass es sie gibt, ist kein Geheimnis.
 */

function json(antwort, status, daten) {
  antwort.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  antwort.end(JSON.stringify(daten));
}

async function rumpfLesen(anfrage) {
  const teile = [];
  for await (const stueck of anfrage) teile.push(stueck);
  if (!teile.length) return {};
  try {
    return JSON.parse(Buffer.concat(teile).toString("utf8"));
  } catch {
    return null;
  }
}

/** Eine Antwort des Kerns mit `status`, ohne den Status im Rumpf. */
function antworten(antwort, { status, ...rest }) {
  json(antwort, status, rest);
}

export function mandantenWege({ mandanten, vorgaenge, angemeldet }) {
  return async function bedienen(anfrage, antwort, pfad) {
    const wer = angemeldet(anfrage);
    await mandanten.gesehen(wer);

    const teile = pfad.split("/").filter(Boolean);
    const verb = anfrage.method;

    if (teile[0] === "mandanten" && teile.length === 1) {
      if (verb === "GET") {
        json(antwort, 200, await mandanten.uebersicht(wer));
        return true;
      }
      if (verb === "POST") {
        const rumpf = await rumpfLesen(anfrage);
        if (!rumpf) json(antwort, 400, { fehler: "Der Mandant war nicht lesbar." });
        else antworten(antwort, await mandanten.anlegen(wer, rumpf));
        return true;
      }
    }

    if (teile[0] === "zuordnungen" && teile.length === 1) {
      if (verb === "GET") {
        antworten(antwort, await mandanten.verwalten(wer));
        return true;
      }
      if (verb === "POST") {
        const rumpf = await rumpfLesen(anfrage);
        if (!rumpf) json(antwort, 400, { fehler: "Die Zuordnung war nicht lesbar." });
        else antworten(antwort, await mandanten.zuordnen(wer, rumpf));
        return true;
      }
      if (verb === "DELETE") {
        const suche = new URL(anfrage.url, "http://app").searchParams;
        antworten(antwort, await mandanten.loesen(wer, { benutzer: suche.get("benutzer"), mandant: suche.get("mandant") }));
        return true;
      }
    }

    if (teile[0] !== "vorgaenge") return false;
    const kern = vorgaenge(wer.benutzer);

    if (teile.length === 1 && verb === "GET") {
      json(antwort, 200, { vorgaenge: await kern.auflisten() });
      return true;
    }

    if (teile.length === 1 && verb === "POST") {
      const rumpf = await rumpfLesen(anfrage);
      if (!rumpf) {
        json(antwort, 400, { fehler: "Der Vorgang war nicht lesbar." });
        return true;
      }
      const titel = String(rumpf.titel || "").trim().slice(0, 200);
      if (!titel) {
        json(antwort, 400, { fehler: "Ohne Titel gibt es keinen Vorgang." });
        return true;
      }
      const vorgang = await kern.einreichen({
        titel,
        text: String(rumpf.text || "").trim().slice(0, 2000),
        von: wer.benutzer,
        mandant: Number(rumpf.mandant),
      });
      if (!vorgang) json(antwort, 404, { fehler: "Diesen Mandanten gibt es nicht." });
      else json(antwort, 201, { vorgang });
      return true;
    }

    const id = Number(teile[1]);
    if (teile.length === 2 && verb === "GET" && Number.isInteger(id) && id > 0) {
      const vorgang = await kern.holen(id);
      if (!vorgang) json(antwort, 404, { fehler: `Vorgang ${id} gibt es nicht.` });
      else json(antwort, 200, { vorgang });
      return true;
    }

    json(antwort, 404, { fehler: `${verb} ${pfad} gibt es an den Vorgängen nicht.` });
    return true;
  };
}
