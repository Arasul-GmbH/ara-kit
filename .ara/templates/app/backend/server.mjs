/**
 * Das Backend von {{name}}.
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
 */

import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 8080);
const NAME = process.env.ARASUL_APP_NAME || "{{name}}";
const API_URL = process.env.ARASUL_API_URL || "";
const API_SCHLUESSEL = process.env.ARASUL_API_SCHLUESSEL || "";

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

/**
 * Was diese App weiß, solange niemand sie neu startet.
 *
 * Eine Vorlage hält ihre Daten im Speicher: was eine App wirklich braucht,
 * entscheidet ihr Plan, und eine Datenbank, die sie vielleicht nie braucht,
 * stünde hier im Weg. Sag es dem Kunden, bevor er es merkt.
 */
const eintraege = [];
let naechsteNummer = 1;

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

  if (pfad === "/eintraege" && anfrage.method === "GET") {
    return json(antwort, 200, { eintraege });
  }

  if (pfad === "/eintraege" && anfrage.method === "POST") {
    const rumpf = await rumpfLesen(anfrage);
    if (!rumpf || typeof rumpf.text !== "string" || !rumpf.text.trim()) {
      return json(antwort, 400, { fehler: "Ohne Text gibt es keinen Eintrag." });
    }
    const eintrag = {
      id: naechsteNummer++,
      text: rumpf.text.trim().slice(0, 2000),
      von: nutzer,
      zeit: new Date().toISOString(),
    };
    eintraege.unshift(eintrag);
    return json(antwort, 201, { eintrag });
  }

  // Ein Flow der App starten und nachsehen, wie weit er ist. Zwei Aufrufe und
  // nicht einer: ein Flow kann Minuten laufen, und jedes Zeitlimit dazwischen
  // ist kürzer.
  if (pfad === "/flow" && anfrage.method === "POST") {
    const rumpf = (await rumpfLesen(anfrage)) || {};
    const { code, daten } = await arasul("POST", "/flows/freigabe/run", {
      args: rumpf.args || {},
      wait_for_result: false,
    });
    return json(antwort, code === 202 ? 202 : 502, {
      gestartet: code === 202,
      antwort: code,
      lauf: daten?.run_id ?? null,
    });
  }

  if (pfad === "/flow" && anfrage.method === "GET") {
    const lauf = url.searchParams.get("lauf");
    if (!lauf) return json(antwort, 400, { fehler: "GET /flow braucht ?lauf=<nummer>" });
    const { code, daten } = await arasul("GET", `/flows/runs/${encodeURIComponent(lauf)}`);
    return json(antwort, code === 200 ? 200 : 502, {
      antwort: code,
      status: daten?.status ?? null,
      ergebnis: daten?.result ?? null,
    });
  }

  // Woran hängt ein Lauf? Die App **liest** ihre Freigaben. Entschieden wird
  // in der Oberfläche von Arasul, von einem Menschen, dem die App freigegeben
  // ist. Eine App, die ihre eigene Freigabe erteilen könnte, wäre keine.
  if (pfad === "/freigaben" && anfrage.method === "GET") {
    const lauf = url.searchParams.get("lauf");
    const { code, daten } = await arasul(
      "GET",
      `/freigaben${lauf ? `?lauf=${encodeURIComponent(lauf)}` : ""}`
    );
    return json(antwort, code === 200 ? 200 : 502, {
      antwort: code,
      freigaben: daten?.freigaben ?? null,
    });
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
