/**
 * Das Backend von {{name}}: der Einstieg.
 *
 * Hier steht HTTP und sonst nichts. Was passiert, steht im Kern; wo es liegt,
 * in der Ablage; wie das Geraet erreicht wird, in `arasul.mjs`. Diese Datei
 * setzt die drei zusammen und uebersetzt zwischen Anfrage und Aufruf.
 *
 *   `server.mjs`            Wege, Kopfzeilen, Statuscodes
 *   `kern/vorgaenge.mjs`    was mit einem Vorgang passiert
 *   `ablage/vorgaenge.mjs`  wo er liegt. Die eine Naht zur Datenbank
 *   `ablage/db.mjs`         die Datenbank und ihre Migrationen
 *   `arasul.mjs`            die Naht zum Geraet
 *
 * Mit dem eingebauten `http`-Modul und einer einzigen Abhaengigkeit, `pg`, fuer
 * die Datenbank, die das Geraet der App gibt. Ohne Geraet laeuft sie auf dem
 * eingebauten SQLite und braucht gar kein Paket.
 *
 * **Wo die Daten liegen, sagt die Vereinbarung.** Nennt sie unter
 * `umgebung.datenbank` einen Namen, liegt in diesem Umgebungswert die Adresse
 * der Datenbank dieser App und dieses Standes, und nur sie ueberlebt das
 * naechste Einspielen. Nennt sie einen und der Wert ist leer, startet die App
 * nicht: sie schriebe sonst still in eine Datei, die das naechste Einspielen
 * loescht. Nennt sie keinen, ist kein Geraet da, und `/lage` sagt, dass nichts
 * davon bleibt.
 *
 * Es sieht seine Pfade **ohne** das Praefix der Plattform: was vor dem
 * Container haengt, schneidet sie ab. Deshalb weiss diese Datei nicht, unter
 * welchem Namen die App laeuft, und muss es auch nicht.
 *
 * **`GET /agent` sagt, was diese App Agenten anbietet.** Die Antwort ist ihr Manifest, das Feld
 * `agent` samt Kennung, Name und Version, und sonst nichts. Das CLI in der Wurzel eines Hauses
 * ruft nur auf, was dort steht. Die Route liest, sie ist kein Weg, etwas zu aendern.
 *
 * **`api/me` beantwortet diese App nicht.** Wer angemeldet ist, sagt die
 * Plattform selbst, unter genau diesem Weg vor dem Container, damit auch eine
 * App ohne Backend ihren Benutzer anzeigen kann. Was hier ankommt, sind die
 * Kopfzeilen, die sie davor gesetzt hat, und aus ihnen wird `von`. Ihre Namen
 * stehen in der Vereinbarung, gelesen werden sie in `arasul.mjs`.
 */

import { readFileSync } from "node:fs";
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
// Ohne Geraet: wo die SQLite-Datei liegt. Ohne Angabe neben dem Quelltext, und
// das ist im Container die schreibbare Schicht: sie ueberlebt einen Neustart
// und nicht das naechste Einspielen.
const DATEN = process.env.APP_DATEN || join(HIER, "daten");
// Vier Augen: wer einen Vorgang einreicht, entscheidet ihn nicht. Das Geraet
// setzt das durch, sobald es die Regel annimmt; die Vorlage laesst es aus, weil
// ein Geraet mit einem einzigen Konto sonst keinen Vorgang starten koennte.
// Eine Fach-App setzt es, und `regel` unten nennt dann auch die Entscheider.
const VIER_AUGEN = false;

const vereinbarung = vereinbarungLesen();
const geraet = anschluss(vereinbarung, process.env, { name: NAME, flow: FLOW });

const datenbankName = vereinbarung.umgebung?.datenbank || null;
const adresse = datenbankName ? process.env[datenbankName] || "" : null;
if (datenbankName && !adresse) {
  process.stderr.write(
    `${NAME} startet nicht: die Vereinbarung nennt ${datenbankName}, und das Geraet hat den Wert nicht in den Container gelegt. ` +
      "Ohne ihn schriebe die App in eine Datei, die das naechste Einspielen loescht.\n"
  );
  process.exit(1);
}
const { db, angewandt, stand } = await oeffnen({ adresse, datei: join(DATEN, "{{id}}.db") });
const vorgangsKern = kern({
  ablage: vorgangsAblage(db),
  geraet,
  name: NAME,
  regel: () => (VIER_AUGEN ? { ohne_einreicher: true } : null),
});

/**
 * Was die App ueber sich sagt: das Feld `agent` ihres Manifests, mit Kennung, Name und Version.
 *
 * Es gibt keine zweite Liste. Im Container liegt `app.json` neben diesem Einstieg, der Bau legt
 * sie dorthin; beim Entwickeln liegt sie einen Ordner darueber. Findet sich keine, sagt die App
 * das, statt eine leere Liste zu behaupten: ein Agent, der "nichts anzubieten" liest, sucht
 * nicht weiter.
 */
function beschreibungLesen() {
  for (const datei of [join(HIER, "app.json"), join(HIER, "..", "app.json")]) {
    try {
      const manifest = JSON.parse(readFileSync(datei, "utf8"));
      return { id: manifest.id, name: manifest.name, version: manifest.version, agent: manifest.agent ?? [] };
    } catch {
      // die naechste Stelle
    }
  }
  return null;
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

  if (pfad === "/agent" && anfrage.method === "GET") {
    const beschreibung = beschreibungLesen();
    return beschreibung
      ? json(antwort, 200, beschreibung)
      : json(antwort, 503, { fehler: "Neben dem Backend liegt keine app.json: die App kann nicht sagen, was sie anbietet." });
  }

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
      // Und ob bleibt, was sie ablegt. Nur die Datenbank des Geraets bleibt.
      ablage: { art: db.art, dauerhaft: db.dauerhaft },
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
      von: geraet.angemeldet(anfrage.headers).benutzer,
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
    (angewandt.length
      ? `Ablage auf Stand ${stand}, angewandt: ${angewandt.join(", ")}.`
      : `Ablage auf Stand ${stand}, nichts anzuwenden.`) +
      (db.dauerhaft
        ? ` Sie liegt in der Datenbank des Geraets aus ${datenbankName}.\n`
        : " Sie liegt in einer Datei im Container und ueberlebt das naechste Einspielen nicht.\n")
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
    server.close(async () => {
      await db.schliessen();
      process.exit(0);
    })
  );
}
