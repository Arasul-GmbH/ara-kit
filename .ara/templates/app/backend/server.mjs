/**
 * Das Backend von {{name}}: der Einstieg.
 *
 * Hier steht HTTP und sonst nichts. Was passiert, steht im Kern; wo es liegt,
 * in der Ablage; wie das Geraet erreicht wird, in `arasul.mjs`. Diese Datei
 * setzt die drei zusammen und uebersetzt zwischen Anfrage und Aufruf.
 *
 *   `server.mjs`            Wege, Kopfzeilen, Statuscodes
 *   `kern/vorgaenge.mjs`    was mit einem Vorgang passiert
 *   `ablage/vorgaenge.mjs`  wo er liegt. Die eine Naht zu SQLite
 *   `ablage/db.mjs`         die Datei und ihre Migrationen
 *   `arasul.mjs`            die Naht zum Geraet
 *
 * Ohne Abhaengigkeiten, mit dem eingebauten `http`-Modul und dem eingebauten
 * SQLite: eine App, die zum Start einen zweiten Paketbaum mitbringt, ist eine,
 * die in einem Jahr niemand mehr bauen kann.
 *
 * Es sieht seine Pfade **ohne** das Praefix der Plattform: was vor dem
 * Container haengt, schneidet sie ab. Deshalb weiss diese Datei nicht, unter
 * welchem Namen die App laeuft, und muss es auch nicht.
 *
 * **`api/me` beantwortet diese App nicht.** Wer angemeldet ist, sagt die
 * Plattform selbst, unter genau diesem Weg vor dem Container, damit auch eine
 * App ohne Backend ihren Benutzer anzeigen kann. Was hier ankommt, sind die
 * Kopfzeilen, die sie davor gesetzt hat, und aus ihnen wird `von`.
 */

import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { oeffnen } from "./ablage/db.mjs";
import { vorgangsAblage } from "./ablage/vorgaenge.mjs";
import { vorgaenge as kern } from "./kern/vorgaenge.mjs";
import { geraet as anschluss, vereinbarungLesen } from "./arasul.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const NAME = process.env.ARASUL_APP_NAME || "{{name}}";
const FLOW = "freigabe";
// Wo die Datenbank liegt. Ohne Angabe neben dem Quelltext, und das ist im
// Container die schreibbare Schicht: sie ueberlebt einen Neustart und nicht das
// naechste Einspielen. Steht so in der README der App.
const DATEN = process.env.APP_DATEN || join(HIER, "daten");

const vereinbarung = vereinbarungLesen();
const geraet = anschluss(vereinbarung, process.env, { name: NAME, flow: FLOW });
const { db, angewandt, stand } = oeffnen(join(DATEN, "{{id}}.db"));
const vorgangsKern = kern({ ablage: vorgangsAblage(db), geraet, name: NAME });

/**
 * Ein Kopfzeilenwert, wie die Plattform ihn meint.
 *
 * Node liest Kopfzeilen als Latin-1, die Plattform legt Namen als UTF-8 ab.
 * Ohne diesen Umweg stuende "JÃ¼rgen" auf dem Bildschirm. Bei reinem ASCII ist
 * er folgenlos, deshalb steht er ohne Bedingung da.
 */
function ausUtf8(wert) {
  return wert ? Buffer.from(wert, "latin1").toString("utf8") : null;
}

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

const server = createServer(async (anfrage, antwort) => {
  const pfad = new URL(anfrage.url, "http://app").pathname;

  // Der Gesundheitscheck. Er steht als `backend.gesundheit` im Manifest, und
  // Docker fragt ihn; er darf nichts voraussetzen.
  if (pfad === "/gesund") return json(antwort, 200, { status: "ok" });

  if (pfad === "/lage") {
    const fehlt = geraet.warumKeinRahmen();
    return json(antwort, 200, {
      app: NAME,
      // Ob die Plattform da ist, behauptet diese App nicht: sie sagt, ob das
      // Geraet ihr eine Schnittstelle und einen Schluessel gegeben hat, und
      // wenn nicht, woran es liegt.
      arasul: !fehlt,
      hinweis: fehlt,
      geraet: geraet.geraetename(),
    });
  }

  if (pfad === "/vorgaenge" && anfrage.method === "GET") {
    return json(antwort, 200, { vorgaenge: await vorgangsKern.auflisten() });
  }

  if (pfad === "/vorgaenge" && anfrage.method === "POST") {
    const rumpf = await rumpfLesen(anfrage);
    if (!rumpf) return json(antwort, 400, { fehler: "Der Vorgang war nicht lesbar." });
    const titel = String(rumpf.titel || "").trim().slice(0, 200);
    if (!titel) return json(antwort, 400, { fehler: "Ohne Titel gibt es keinen Vorgang." });
    const vorgang = await vorgangsKern.einreichen({
      titel,
      text: String(rumpf.text || "").trim().slice(0, 2000),
      von: ausUtf8(anfrage.headers["x-arasul-user"]),
    });
    return json(antwort, 201, { vorgang });
  }

  json(antwort, 404, { fehler: `${NAME} kennt ${pfad} nicht.` });
});

server.listen(PORT, "0.0.0.0", () => {
  // Die Nummer aus dem Server und nicht die aus der Umgebung: mit PORT=0 sucht
  // das Betriebssystem eine freie, und dann ist die Zeile hier die einzige
  // Stelle, an der sie ueberhaupt steht.
  process.stdout.write(`${NAME} hört auf ${server.address().port}\n`);
  process.stdout.write(
    angewandt.length
      ? `Ablage auf Stand ${stand}, angewandt: ${angewandt.join(", ")}.\n`
      : `Ablage auf Stand ${stand}, nichts anzuwenden.\n`
  );
  // Beim Start einmal sagen, woran diese App haengt. Wer im Protokoll des
  // Containers nachsieht, soll die Antwort dort finden und nicht raten.
  const fehlt = geraet.warumKeinRahmen();
  process.stdout.write(fehlt ? `${NAME} startet keinen Flow: ${fehlt}\n` : `${geraet.herkunft()}\n`);
});

// Docker schickt SIGTERM. Ohne diese Zeilen wartet es zehn Sekunden und
// schiesst dann, bei jedem Einspielen aufs Neue.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    })
  );
}
