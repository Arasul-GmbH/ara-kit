/**
 * Das Backend des Urlaubsantrags.
 *
 * Es tut drei Dinge, und das dritte ist der Grund, warum es diese App gibt:
 *
 *   1. Es nimmt einen Antrag entgegen. Wer ihn stellt, sagt die Plattform über
 *      die Kopfzeilen vor dem Container, nicht das Formular.
 *   2. Es startet den Flow `antrag` mit dem Schlüssel, den das Gerät dieser App
 *      und diesem Stand gegeben hat. Der Flow hält sofort an: sein erster
 *      Schritt fordert eine Freigabe an.
 *   3. Es **liest**, wie die Freigabe steht, und schreibt den Antrag danach
 *      fort. Es entscheidet nicht selbst. Eine App, die ihre eigene Freigabe
 *      erteilen könnte, wäre keine: entschieden wird in der Oberfläche von
 *      Arasul, von einem Menschen, dem die App freigegeben ist.
 *
 * Ohne Abhängigkeiten, mit dem eingebauten `http`-Modul. **Der Schlüssel
 * verlässt diesen Prozess nicht**: er geht in eine Kopfzeile, in keine Antwort
 * und in kein Protokoll.
 *
 * Die Anträge liegen im Speicher. Ein Neustart des Containers vergisst sie, und
 * das steht auch so in der README: eine App bekommt am Gerät heute keinen
 * eigenen Datenordner, und eine Datenbank, die sich diese App selbst mitbringt,
 * wäre eine zweite Ablage neben der, die das Produkt später vorsieht.
 */

import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 8080);
const NAME = process.env.ARASUL_APP_NAME || "Urlaubsantrag";
const API_URL = process.env.ARASUL_API_URL || "";
const API_SCHLUESSEL = process.env.ARASUL_API_SCHLUESSEL || "";
const FLOW = "antrag";

/**
 * Ein Kopfzeilenwert, wie die Plattform ihn meint.
 *
 * Node liest Kopfzeilen als Latin-1, die Plattform legt Namen als UTF-8 ab.
 * Ohne diesen Umweg stünde "JÃ¼rgen" auf dem Bildschirm.
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

const antraege = [];
let naechsteNummer = 1;

/** Wie die Freigabe steht, so steht der Antrag. Die Namen kommen vom Gerät. */
const STATUS = {
  offen: "wartet",
  bestaetigt: "genehmigt",
  abgelehnt: "abgelehnt",
  abgelaufen: "abgelaufen",
  verfallen: "abgelaufen",
};

/**
 * Den Stand eines Antrags nachziehen.
 *
 * Gefragt wird das Gerät, und zwar nach der Freigabe zu genau diesem Lauf. Die
 * App fragt nicht nach fremden Läufen und könnte es nicht: der Namensraum
 * steckt im Schlüssel, nicht in der Anfrage.
 */
async function nachziehen(antrag) {
  if (!antrag.lauf || antrag.status !== "wartet") return;
  const { code, daten } = await arasul("GET", `/freigaben?lauf=${antrag.lauf}`);
  if (code !== 200) return;
  const freigabe = (daten?.freigaben || [])[0];
  if (!freigabe) return;
  antrag.status = STATUS[freigabe.status] || antrag.status;
  antrag.entschieden_von = freigabe.entschieden_von || null;
  antrag.begruendung = freigabe.begruendung || null;
  antrag.frist = freigabe.frist || null;

  // Nach der Bestätigung läuft der Flow ab dem angehaltenen Schritt weiter und
  // schreibt einen Satz. Der gehört an den Antrag, sobald er da ist.
  if (antrag.status === "genehmigt" && !antrag.bemerkung) {
    const lauf = await arasul("GET", `/flows/runs/${antrag.lauf}`);
    if (lauf.code === 200 && lauf.daten?.status === "fertig") {
      antrag.bemerkung = lauf.daten.result || null;
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

/** Arbeitstage zwischen zwei Datumsangaben, Samstag und Sonntag zählen nicht mit. */
function arbeitstage(von, bis) {
  const anfang = new Date(`${von}T00:00:00Z`);
  const ende = new Date(`${bis}T00:00:00Z`);
  if (Number.isNaN(anfang.getTime()) || Number.isNaN(ende.getTime()) || ende < anfang) return null;
  let tage = 0;
  for (const tag = new Date(anfang); tag <= ende; tag.setUTCDate(tag.getUTCDate() + 1)) {
    if (tag.getUTCDay() !== 0 && tag.getUTCDay() !== 6) tage++;
  }
  return tage;
}

const server = createServer(async (anfrage, antwort) => {
  const url = new URL(anfrage.url, "http://app");
  const pfad = url.pathname;
  const nutzer = ausUtf8(anfrage.headers["x-arasul-user"]);
  const rolle = ausUtf8(anfrage.headers["x-arasul-role"]);

  if (pfad === "/gesund") return json(antwort, 200, { status: "ok" });

  if (pfad === "/lage") {
    return json(antwort, 200, {
      app: NAME,
      nutzer,
      rolle,
      arasul: Boolean(API_URL && API_SCHLUESSEL),
    });
  }

  if (pfad === "/antraege" && anfrage.method === "GET") {
    // Vor jeder Auskunft der Stand vom Gerät. Ein Antrag, der hier auf
    // "wartet" steht, während der Mensch längst entschieden hat, wäre eine
    // Auskunft, die nicht stimmt.
    await Promise.all(antraege.map(nachziehen));
    return json(antwort, 200, { antraege });
  }

  if (pfad === "/antraege" && anfrage.method === "POST") {
    const rumpf = await rumpfLesen(anfrage);
    if (!rumpf) return json(antwort, 400, { fehler: "Der Antrag war nicht lesbar." });
    const von = String(rumpf.von || "").slice(0, 10);
    const bis = String(rumpf.bis || "").slice(0, 10);
    const tage = arbeitstage(von, bis);
    if (tage === null) {
      return json(antwort, 400, {
        fehler: "Erster und letzter Tag müssen Datumsangaben sein, und der letzte darf nicht vor dem ersten liegen.",
      });
    }
    if (tage === 0) {
      return json(antwort, 400, { fehler: "In diesem Zeitraum liegt kein Arbeitstag." });
    }

    const antrag = {
      id: naechsteNummer++,
      // Wer den Antrag stellt, sagt die Plattform. Stünde es im Formular,
      // könnte jeder für jeden beantragen.
      antragsteller: nutzer || "unbekannt",
      von,
      bis,
      tage,
      grund: String(rumpf.grund || "").trim().slice(0, 500) || "ohne Angabe",
      gestellt: new Date().toISOString(),
      status: "wartet",
      lauf: null,
      entschieden_von: null,
      begruendung: null,
      bemerkung: null,
      hinweis: null,
    };

    const { code, daten } = await arasul("POST", `/flows/${FLOW}/run`, {
      args: {
        antragsteller: antrag.antragsteller,
        von: antrag.von,
        bis: antrag.bis,
        tage: String(antrag.tage),
        grund: antrag.grund,
      },
      wait_for_result: false,
    });
    if (code === 202 && daten?.run_id) {
      antrag.lauf = daten.run_id;
    } else {
      // Ohne Arasul gibt es keinen Lauf und damit keine Freigabe. Der Antrag
      // bleibt liegen, und es steht dran, warum: erfinden wäre schlimmer.
      antrag.status = "ohne entscheidung";
      antrag.hinweis =
        code === null
          ? "Dieses Gerät hat der App keine Schnittstelle gegeben. Ohne Arasul hält kein Flow an und niemand entscheidet."
          : `Der Flow ${FLOW} ließ sich nicht starten (Antwort ${code}).`;
    }

    antraege.unshift(antrag);
    return json(antwort, 201, { antrag });
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
