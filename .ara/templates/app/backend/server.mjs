/**
 * Das Backend von {{name}}.
 *
 * Es tut drei Dinge, und das dritte ist der Grund, warum eine App auf einem
 * Arasul-Gerät mehr ist als eine Seite mit einem Formular:
 *
 *   1. Es nimmt einen Vorgang entgegen. Wer ihn einreicht, sagt die Plattform
 *      über die Kopfzeilen vor dem Container, nicht das Formular.
 *   2. Es startet den Flow `freigabe` mit dem Schlüssel, den das Gerät dieser
 *      App und diesem Stand gegeben hat. Der Flow hält sofort an: sein erster
 *      Schritt fordert eine Freigabe an.
 *   3. Es **liest**, wie die Freigabe steht, und schreibt den Vorgang danach
 *      fort. Es entscheidet nicht selbst. Eine App, die ihre eigene Freigabe
 *      erteilen könnte, wäre keine: entschieden wird in der Oberfläche von
 *      Arasul, von einem Menschen, dem die App freigegeben ist.
 *
 * Ohne Abhängigkeiten, mit dem eingebauten `http`-Modul: eine App, die zum
 * Start einen zweiten Paketbaum mitbringt, ist eine, die in einem Jahr niemand
 * mehr bauen kann.
 *
 * Es sieht seine Pfade **ohne** das Präfix der Plattform: was vor dem Container
 * hängt, schneidet es ab. Deshalb weiß diese Datei nicht, unter welchem Namen
 * die App läuft, und muss es auch nicht.
 *
 * Zwei Werte setzt das Gerät selbst in den Container, und nur mit ihnen ist
 * Arasul erreichbar: die Adresse der Schnittstelle und der Schlüssel dieser App
 * und dieses Standes. **Der Schlüssel verlässt diesen Prozess nicht.** Er geht
 * in eine Kopfzeile und in keine Antwort, in kein Protokoll und in keine Datei.
 *
 * Die Vorgänge liegen im Speicher. Ein Neustart des Containers vergisst sie,
 * und das steht auch so in der README: eine App bekommt am Gerät heute keinen
 * eigenen Datenordner, und eine Datenbank, die sich die App selbst mitbringt,
 * wäre eine zweite Ablage neben der, die das Produkt später vorsieht. Was diese
 * App wirklich braucht, entscheidet ihr Plan.
 */

import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 8080);
const NAME = process.env.ARASUL_APP_NAME || "{{name}}";
const API_URL = process.env.ARASUL_API_URL || "";
const API_SCHLUESSEL = process.env.ARASUL_API_SCHLUESSEL || "";
const FLOW = "freigabe";

/**
 * Ein Kopfzeilenwert, wie die Plattform ihn meint.
 *
 * Node liest Kopfzeilen als Latin-1, die Plattform legt Namen als UTF-8 ab.
 * Ohne diesen Umweg stünde "JÃ¼rgen" auf dem Bildschirm. Bei reinem ASCII ist
 * er folgenlos, deshalb steht er ohne Bedingung da.
 */
function ausUtf8(wert) {
  return wert ? Buffer.from(wert, "latin1").toString("utf8") : null;
}

/** Ein Aufruf an die Schnittstelle des Geräts. Zurück geht nur, was sie antwortet. */
async function arasul(verb, pfad, rumpf) {
  if (!API_URL || !API_SCHLUESSEL) return { code: null, daten: null };
  try {
    const antwort = await fetch(`${API_URL}${pfad}`, {
      method: verb,
      headers: {
        "x-api-key": API_SCHLUESSEL,
        ...(rumpf ? { "content-type": "application/json" } : {}),
      },
      body: rumpf ? JSON.stringify(rumpf) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await antwort.text();
    let daten = null;
    try {
      daten = text ? JSON.parse(text) : null;
    } catch {
      daten = null;
    }
    return { code: antwort.status, daten };
  } catch {
    return { code: 0, daten: null };
  }
}

const vorgaenge = [];
let naechsteNummer = 1;

/** Wie die Freigabe steht, so steht der Vorgang. Die Namen links kommen vom Gerät. */
const STATUS = {
  offen: "wartet",
  bestaetigt: "genehmigt",
  abgelehnt: "abgelehnt",
  abgelaufen: "abgelaufen",
  verfallen: "abgelaufen",
};

/**
 * Den Stand eines Vorgangs nachziehen.
 *
 * Gefragt wird das Gerät, und zwar nach der Freigabe zu genau diesem Lauf. Die
 * App fragt nicht nach fremden Läufen und könnte es nicht: der Namensraum
 * steckt im Schlüssel, nicht in der Anfrage.
 */
async function nachziehen(vorgang) {
  if (!vorgang.lauf || vorgang.status !== "wartet") return;
  const { code, daten } = await arasul("GET", `/freigaben?lauf=${vorgang.lauf}`);
  if (code !== 200) return;
  const freigabe = (daten?.freigaben || [])[0];
  if (!freigabe) return;
  vorgang.status = STATUS[freigabe.status] || vorgang.status;
  vorgang.entschieden_von = freigabe.entschieden_von || null;
  vorgang.begruendung = freigabe.begruendung || null;
  vorgang.frist = freigabe.frist || null;

  // Nach der Bestätigung läuft der Flow ab dem angehaltenen Schritt weiter und
  // schreibt einen Satz. Der gehört an den Vorgang, sobald er da ist.
  if (vorgang.status === "genehmigt" && !vorgang.bemerkung) {
    const lauf = await arasul("GET", `/flows/runs/${vorgang.lauf}`);
    if (lauf.code === 200 && lauf.daten?.status === "fertig") {
      vorgang.bemerkung = lauf.daten.result || null;
    }
  }
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
  const url = new URL(anfrage.url, "http://app");
  const pfad = url.pathname;
  const nutzer = ausUtf8(anfrage.headers["x-arasul-user"]);
  const rolle = ausUtf8(anfrage.headers["x-arasul-role"]);

  // Der Gesundheitscheck. Er steht als `backend.gesundheit` im Manifest, und
  // Docker fragt ihn; er darf nichts voraussetzen.
  if (pfad === "/gesund") return json(antwort, 200, { status: "ok" });

  if (pfad === "/lage") {
    return json(antwort, 200, {
      app: NAME,
      nutzer,
      rolle,
      // Ob die Plattform da ist, behauptet diese App nicht: sie sagt, ob das
      // Gerät ihr eine Schnittstelle und einen Schlüssel gegeben hat.
      arasul: Boolean(API_URL && API_SCHLUESSEL),
    });
  }

  if (pfad === "/vorgaenge" && anfrage.method === "GET") {
    // Vor jeder Auskunft der Stand vom Gerät. Ein Vorgang, der hier auf
    // "wartet" steht, während der Mensch längst entschieden hat, wäre eine
    // Auskunft, die nicht stimmt.
    await Promise.all(vorgaenge.map(nachziehen));
    return json(antwort, 200, { vorgaenge });
  }

  if (pfad === "/vorgaenge" && anfrage.method === "POST") {
    const rumpf = await rumpfLesen(anfrage);
    if (!rumpf) return json(antwort, 400, { fehler: "Der Vorgang war nicht lesbar." });
    const titel = String(rumpf.titel || "").trim().slice(0, 200);
    if (!titel) return json(antwort, 400, { fehler: "Ohne Titel gibt es keinen Vorgang." });

    const vorgang = {
      id: naechsteNummer++,
      titel,
      text: String(rumpf.text || "").trim().slice(0, 2000) || "ohne Angabe",
      // Wer den Vorgang einreicht, sagt die Plattform. Stünde es im Formular,
      // könnte jeder für jeden einreichen.
      von: nutzer || "unbekannt",
      gestellt: new Date().toISOString(),
      status: "wartet",
      lauf: null,
      entschieden_von: null,
      begruendung: null,
      bemerkung: null,
      hinweis: null,
    };

    const { code, daten } = await arasul("POST", `/flows/${FLOW}/run`, {
      args: { sache: vorgang.titel, von: vorgang.von, text: vorgang.text },
      wait_for_result: false,
    });
    if (code === 202 && daten?.run_id) {
      vorgang.lauf = daten.run_id;
    } else {
      // Ohne Arasul gibt es keinen Lauf und damit keine Freigabe. Der Vorgang
      // bleibt liegen, und es steht dran, warum: erfinden wäre schlimmer.
      vorgang.status = "ohne entscheidung";
      vorgang.hinweis =
        code === null
          ? "Dieses Gerät hat der App keine Schnittstelle gegeben. Ohne Arasul hält kein Flow an und niemand entscheidet."
          : `Der Flow ${FLOW} ließ sich nicht starten (Antwort ${code}).`;
    }

    vorgaenge.unshift(vorgang);
    return json(antwort, 201, { vorgang });
  }

  json(antwort, 404, { fehler: `${NAME} kennt ${pfad} nicht.` });
});

server.listen(PORT, "0.0.0.0", () => {
  // Die Nummer aus dem Server und nicht die aus der Umgebung: mit PORT=0 sucht
  // das Betriebssystem eine freie, und dann ist die Zeile hier die einzige
  // Stelle, an der sie überhaupt steht.
  process.stdout.write(`${NAME} hört auf ${server.address().port}\n`);
});

// Docker schickt SIGTERM. Ohne diese Zeilen wartet es zehn Sekunden und
// schießt dann, bei jedem Einspielen aufs Neue.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
