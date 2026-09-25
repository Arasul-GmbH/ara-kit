/**
 * Muster Dokumente: die Wege. HTTP und sonst nichts.
 *
 * Die Vorlage hält ihre Wege in `server.mjs`. Eine zweite Entität bringt ihre
 * Wege als eigene Datei mit, damit `server.mjs` der Einstieg bleibt und nicht
 * zur Liste wird. Liegt in einer App aus der Vorlage unter
 * `backend/wege/dokumente.mjs`. Eingehängt wird sie mit drei Zeilen dort:
 *
 *   import { dokumentAblage } from "./ablage/dokumente.mjs";
 *   import { dokumente as dokumentKern } from "./kern/dokumente.mjs";
 *   import { dokumentWege } from "./wege/dokumente.mjs";
 *
 *   const dokumente = dokumentWege({
 *     kern: dokumentKern({ ablage: dokumentAblage(db) }),
 *     von: (anfrage) => geraet.angemeldet(anfrage.headers).benutzer,
 *   });
 *
 * Wer hochlädt, liest `geraet.angemeldet` aus den Kopfzeilen, und deren Namen
 * stehen in der Vereinbarung mit dem Gerät. Ein Name wie `x-arasul-user` im
 * Quelltext wäre ein Wert des Geräts, geraten.
 *
 *   // im Server, vor dem 404:
 *   if (await dokumente(anfrage, antwort, pfad)) return;
 *
 * Die Wege, hinter `/apps/<id>/api/`:
 *
 *   GET    /dokumente              die Liste, ohne Bytes, und die Grenze
 *   POST   /dokumente              eine Datei, roh im Rumpf. Typ aus
 *                                  `content-type`, Name aus `x-dateiname`
 *                                  (URL-kodiert, damit Umlaute ankommen)
 *   GET    /dokumente/<id>/datei   die Bytes, mit ihrem Typ. Das ist die
 *                                  Quelle der Dokumentanzeige
 *   DELETE /dokumente/<id>         weg damit
 *
 * **Roh und nicht als Formular.** Ein `multipart/form-data` braucht einen
 * Parser, und den hat Node nicht eingebaut. Eine Datei je Aufruf, die Bytes
 * sind der Rumpf, zwei Kopfzeilen sagen, was sie sind. Das kann `fetch` im
 * Browser ohne eine Zeile Hilfe.
 *
 * **Gehalten wird bis zur Grenze und kein Byte weiter.** Wer mehr schickt,
 * bekommt 413 mit einem Satz; was über der Grenze liegt, wird gelesen und
 * weggeworfen, damit die Antwort ankommt, statt dass die Verbindung zugeht.
 */

function json(antwort, status, daten) {
  antwort.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  antwort.end(JSON.stringify(daten));
}

/**
 * Den Rumpf als Bytes lesen, höchstens `grenze` davon. Darüber: null.
 *
 * Was über der Grenze liegt, wird gelesen und weggeworfen, nicht abgebrochen:
 * eine Verbindung, die mitten im Senden zugeht, kommt im Browser als
 * Netzfehler an und nicht als 413 mit einem Satz. Gehalten wird im Speicher
 * nur, was unter der Grenze liegt.
 */
function bytesLesen(anfrage, grenze) {
  return new Promise((fertig, gescheitert) => {
    let teile = [];
    let laenge = 0;
    let zuViel = false;
    anfrage.on("data", (stueck) => {
      if (zuViel) return;
      laenge += stueck.length;
      if (laenge > grenze) {
        zuViel = true;
        teile = [];
        return;
      }
      teile.push(stueck);
    });
    anfrage.on("end", () => fertig(zuViel ? null : Buffer.concat(teile)));
    anfrage.on("error", gescheitert);
  });
}

/** Ein Dateiname aus der Kopfzeile, URL-kodiert geschickt, damit Umlaute ankommen. */
function dateiname(anfrage) {
  const roh = anfrage.headers["x-dateiname"];
  if (!roh) return "";
  try {
    return decodeURIComponent(String(roh));
  } catch {
    return String(roh);
  }
}

/** Der MIME-Typ ohne Zusätze: aus `image/png; charset=binary` wird `image/png`. */
function typ(anfrage) {
  return String(anfrage.headers["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

export function dokumentWege({ kern, von }) {
  /**
   * Zurück kommt, ob dieser Weg hier bedient wurde. `false` heißt: gehört
   * nicht zu den Dokumenten, der Server macht weiter.
   */
  return async function bedienen(anfrage, antwort, pfad) {
    const teile = pfad.split("/").filter(Boolean);
    if (teile[0] !== "dokumente") return false;

    if (teile.length === 1 && anfrage.method === "GET") {
      json(antwort, 200, { dokumente: await kern.auflisten(), grenze_bytes: kern.grenzeBytes });
      return true;
    }

    if (teile.length === 1 && anfrage.method === "POST") {
      const inhalt = await bytesLesen(anfrage, kern.grenzeBytes);
      if (inhalt === null) {
        json(antwort, 413, { fehler: `Mehr als ${kern.grenzeBytes} Bytes nimmt diese App nicht an.` });
        return true;
      }
      const { dokument, fehler } = await kern.ablegen({
        name: dateiname(anfrage),
        art: typ(anfrage),
        inhalt,
        von: von(anfrage),
      });
      if (fehler) json(antwort, 400, { fehler });
      else json(antwort, 201, { dokument });
      return true;
    }

    const id = Number(teile[1]);
    if (!Number.isInteger(id) || id <= 0) {
      json(antwort, 404, { fehler: `${pfad} ist kein Dokument.` });
      return true;
    }

    if (teile.length === 3 && teile[2] === "datei" && anfrage.method === "GET") {
      const dokument = await kern.holen(id);
      if (!dokument) {
        json(antwort, 404, { fehler: `Dokument ${id} gibt es nicht.` });
        return true;
      }
      antwort.writeHead(200, {
        "content-type": dokument.art,
        "content-length": dokument.inhalt.length,
        // `inline`: der Browser zeigt, was er zeigen kann, und der Name steht
        // dabei, falls jemand doch speichert. Kodiert, damit Umlaute ankommen.
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(dokument.name)}`,
        // Ein Dokument ist privat: kein Zwischenspeicher zwischen Gerät und
        // Browser darf es einem Zweiten geben.
        "cache-control": "private, no-store",
      });
      antwort.end(dokument.inhalt);
      return true;
    }

    if (teile.length === 2 && anfrage.method === "DELETE") {
      if (await kern.entfernen(id)) json(antwort, 200, { entfernt: id });
      else json(antwort, 404, { fehler: `Dokument ${id} gibt es nicht.` });
      return true;
    }

    json(antwort, 405, { fehler: `${anfrage.method} ${pfad} gibt es an den Dokumenten nicht.` });
    return true;
  };
}
