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
 * **Diese Datei kennt keinen einzigen Wert, den das Gerät vergibt.** Nicht die
 * Namen der Umgebungswerte, in denen Adresse und Schlüssel ankommen, nicht die
 * Kopfzeile des Schlüssels, nicht die Wege der Schnittstelle. Alles das ist
 * zwischen Kit und Produkt vereinbart, steht im Kontrakt des Geräts, und das
 * Kit legt es beim Einspielen als `arasul.json` daneben. Eine Vorlage, die
 * diese Werte errät, findet auf einem Gerät, das sie anders nennt, nichts, hält
 * das für „hier läuft kein Arasul" und legt jeden Vorgang ohne Lauf ab. Der
 * Freigabe-Schritt wird dann nicht abgelehnt, er wird übersprungen.
 *
 * **Der Schlüssel verlässt diesen Prozess nicht.** Er geht in eine Kopfzeile
 * und in keine Antwort, in kein Protokoll und in keine Datei.
 *
 * **Kein stilles null.** Jeder Vorgang, der ohne Lauf bleibt, trägt den Satz,
 * warum. „Ohne Arasul" steht nur dann da, wenn das Gerät der App wirklich
 * nichts gegeben hat; alles andere wird benannt, mit Status und Antwort.
 *
 * Die Vorgänge liegen im Speicher. Ein Neustart des Containers vergisst sie,
 * und das steht auch so in der README: eine App bekommt am Gerät heute keinen
 * eigenen Datenordner, und eine Datenbank, die sich die App selbst mitbringt,
 * wäre eine zweite Ablage neben der, die das Produkt später vorsieht. Was diese
 * App wirklich braucht, entscheidet ihr Plan.
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8080);
const NAME = process.env.ARASUL_APP_NAME || "{{name}}";
const FLOW = "freigabe";

/**
 * Die Vereinbarung mit dem Gerät, so wie das Kit sie beim Einspielen aus dem
 * Kontrakt geschrieben hat. Fehlt die Datei oder steht darin nichts, gibt es
 * keinen Rahmen, und das ist kein Fehler, sondern der Weg ohne Arasul.
 */
function vereinbarungLesen() {
  const datei = join(dirname(fileURLToPath(import.meta.url)), "arasul.json");
  try {
    const gelesen = JSON.parse(readFileSync(datei, "utf8"));
    return gelesen && typeof gelesen === "object" ? gelesen : {};
  } catch {
    return {};
  }
}

const VEREINBARUNG = vereinbarungLesen();
const KOPF = VEREINBARUNG.kopf || null;
const WEGE = VEREINBARUNG.wege || {};
const BASIS_NAME = VEREINBARUNG.umgebung?.basis || null;
const KEY_NAME = VEREINBARUNG.umgebung?.schluessel || null;
const BASIS = BASIS_NAME ? String(process.env[BASIS_NAME] || "").replace(/\/+$/, "") : "";
const SCHLUESSEL = KEY_NAME ? String(process.env[KEY_NAME] || "") : "";

/**
 * Warum diese App keinen Flow starten kann, in einem Satz, oder `null`, wenn
 * sie es kann. Der Satz nennt die Stelle und nicht das Ergebnis: „ohne Arasul"
 * ist eine Aussage über das Gerät, „der Wert ist leer" eine über den Container,
 * und die beiden zu verwechseln hat den Freigabe-Schritt Tage gekostet.
 */
function warumKeinRahmen() {
  if (!BASIS_NAME || !KEY_NAME || !KOPF) {
    return (
      "Dieses Gerät hat der App keine Schnittstelle gegeben: neben dem Backend liegt keine " +
      "ausgefüllte arasul.json. Ohne Arasul hält kein Flow an und niemand entscheidet."
    );
  }
  if (!BASIS) return `Das Gerät hat ${BASIS_NAME} nicht in den Container gelegt, die App kennt ihre Schnittstelle nicht.`;
  if (!SCHLUESSEL) return `Das Gerät hat ${KEY_NAME} nicht in den Container gelegt, die App hat keinen Schlüssel.`;
  if (!WEGE.flow_starten) {
    return `Dieses Gerät nennt in seinem Kontrakt keinen Weg, einen Flow zu starten. ${NAME} kann ${FLOW} dort nicht anfordern.`;
  }
  return null;
}

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

/** Ein Weg aus der Vereinbarung, mit Werten statt Platzhaltern. */
function weg(name, werte = {}) {
  const eintrag = WEGE[name];
  if (!eintrag?.pfad) return null;
  return {
    verb: eintrag.verb || "GET",
    pfad: eintrag.pfad.replace(/\{([a-z_]+)\}/g, (ganz, schluessel) =>
      schluessel in werte ? encodeURIComponent(String(werte[schluessel])) : ganz
    ),
  };
}

/**
 * Ein Aufruf an die Schnittstelle des Geräts.
 *
 * Zurück geht, was sie antwortet, und im Fehlerfall ein Satz darüber, was
 * schiefging. Ein Aufruf, der still nichts zurückgibt, wäre hier der teuerste
 * Fehler: die App sähe aus wie eine, auf der niemand entscheidet.
 */
async function arasul(name, werte, rumpf) {
  const ziel = weg(name, werte);
  if (!ziel) return { code: null, daten: null, fehler: `Der Kontrakt dieses Geräts nennt den Weg ${name} nicht.` };
  try {
    const antwort = await fetch(`${BASIS}${ziel.pfad}`, {
      method: ziel.verb,
      headers: {
        [KOPF]: SCHLUESSEL,
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
    return {
      code: antwort.status,
      daten,
      fehler: antwort.ok
        ? null
        : `${ziel.verb} ${ziel.pfad} wurde mit Status ${antwort.status} beantwortet${
            daten?.error?.message ? `: ${daten.error.message}` : ""
          }.`,
    };
  } catch (fehler) {
    return { code: 0, daten: null, fehler: `${ziel.verb} ${ziel.pfad} war nicht erreichbar: ${fehler.message}` };
  }
}

/**
 * Der Inhalt einer Antwort, egal ob sie einen Umschlag trägt.
 *
 * Das Produkt antwortet an manchen Wegen mit `data` darum herum und an anderen
 * ohne. Wer sich auf eine der beiden Formen festlegt, wirft die andere weg, und
 * das sieht danach aus wie eine leere Antwort.
 */
function inhalt(daten) {
  if (!daten || typeof daten !== "object") return {};
  for (const umschlag of ["data", "body", "ergebnis"]) {
    const innen = daten[umschlag];
    if (innen && typeof innen === "object") return innen;
  }
  return daten;
}

/**
 * Hat das Gerät zugestimmt?
 *
 * Gefragt wird nach der Klasse der Antwort und nicht nach einer Zahl. Welche
 * genau ein Weg zurückgibt, ist ein Wert des Produkts: die Vorlage hat sich
 * darauf festgelegt, und beim ersten Weg, der 200 statt 202 antwortete, fiel
 * die Nummer des Laufs still unter den Tisch.
 */
function gelungen(code) {
  return typeof code === "number" && code >= 200 && code < 300;
}

/** Die Nummer eines Laufs aus einer Antwort, unter welchem der üblichen Namen sie auch steht. */
function laufnummer(daten) {
  const feld = inhalt(daten);
  for (const name of ["run_id", "lauf", "lauf_id", "id"]) {
    const wert = feld[name];
    if (typeof wert === "number" || (typeof wert === "string" && wert.trim())) return wert;
  }
  return null;
}

/** Eine Liste aus einer Antwort, unter ihrem Namen oder als Antwort selbst. */
function liste(daten, name) {
  const feld = inhalt(daten);
  if (Array.isArray(feld[name])) return feld[name];
  if (Array.isArray(feld)) return feld;
  if (Array.isArray(daten)) return daten;
  return [];
}

const vorgaenge = [];
let naechsteNummer = 1;

/** Wie die Freigabe steht, so steht der Vorgang. Die Namen links kommen vom Gerät. */
const STATUS = {
  offen: "wartet",
  wartet: "wartet",
  bestaetigt: "genehmigt",
  genehmigt: "genehmigt",
  abgelehnt: "abgelehnt",
  abgelaufen: "abgelaufen",
  verfallen: "abgelaufen",
};

/**
 * Den Stand eines Vorgangs nachziehen.
 *
 * Gefragt wird das Gerät nach den Freigaben, die dieser App gehören, und
 * gesucht wird die zu genau diesem Lauf. Die App fragt nicht nach fremden
 * Läufen und könnte es nicht: der Namensraum steckt im Schlüssel, nicht in der
 * Anfrage.
 */
async function nachziehen(vorgang) {
  if (!vorgang.lauf || vorgang.status !== "wartet") return;
  const { code, daten, fehler } = await arasul("freigaben_lesen");
  if (!gelungen(code)) {
    vorgang.hinweis = fehler;
    return;
  }
  const freigabe = liste(daten, "freigaben").find((eintrag) => String(laufnummer(eintrag)) === String(vorgang.lauf));
  if (!freigabe) return;
  const stand = STATUS[freigabe.status];
  if (!stand) {
    vorgang.hinweis = `Das Gerät nennt die Freigabe "${freigabe.status}", und diesen Stand kennt ${NAME} nicht.`;
    return;
  }
  vorgang.status = stand;
  vorgang.hinweis = null;
  vorgang.entschieden_von = freigabe.entschieden_von || null;
  vorgang.begruendung = freigabe.begruendung || null;
  vorgang.frist = freigabe.frist || null;

  // Nach der Bestätigung läuft der Flow ab dem angehaltenen Schritt weiter und
  // schreibt einen Satz. Der gehört an den Vorgang, sobald er da ist.
  if (vorgang.status === "genehmigt" && !vorgang.bemerkung) {
    const lauf = await arasul("lauf_lesen", { lauf: vorgang.lauf });
    if (gelungen(lauf.code)) {
      const laufstand = inhalt(lauf.daten);
      if (laufstand.status === "fertig") vorgang.bemerkung = laufstand.result || laufstand.ergebnis || null;
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
    const fehlt = warumKeinRahmen();
    return json(antwort, 200, {
      app: NAME,
      nutzer,
      rolle,
      // Ob die Plattform da ist, behauptet diese App nicht: sie sagt, ob das
      // Gerät ihr eine Schnittstelle und einen Schlüssel gegeben hat, und wenn
      // nicht, woran es liegt.
      arasul: !fehlt,
      hinweis: fehlt,
      geraet: VEREINBARUNG.geraet || null,
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

    const fehlt = warumKeinRahmen();
    if (fehlt) {
      // Ohne Rahmen gibt es keinen Lauf und damit keine Freigabe. Der Vorgang
      // bleibt liegen, und es steht dran, warum: erfinden wäre schlimmer.
      vorgang.status = "ohne entscheidung";
      vorgang.hinweis = fehlt;
    } else {
      const { code, daten, fehler } = await arasul(
        "flow_starten",
        { flow: FLOW },
        { args: { sache: vorgang.titel, von: vorgang.von, text: vorgang.text }, wait_for_result: false }
      );
      const lauf = gelungen(code) ? laufnummer(daten) : null;
      if (lauf !== null) {
        vorgang.lauf = lauf;
      } else {
        // Der Rahmen steht, der Lauf kam trotzdem nicht zustande. Das ist etwas
        // anderes als „ohne Arasul", und es wird auch anders benannt: sonst
        // sucht der Nächste den Fehler dort, wo keiner ist.
        vorgang.status = "ohne lauf";
        vorgang.hinweis =
          fehler ||
          `Der Flow ${FLOW} wurde mit Status ${code} angenommen, in der Antwort stand aber keine Nummer des Laufs.`;
      }
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
  // Beim Start einmal sagen, woran diese App hängt. Wer im Protokoll des
  // Containers nachsieht, soll die Antwort dort finden und nicht raten.
  const fehlt = warumKeinRahmen();
  process.stdout.write(
    fehlt
      ? `${NAME} startet keinen Flow: ${fehlt}\n`
      : `${NAME} spricht mit ${VEREINBARUNG.geraet || "dem Gerät"} über ${BASIS_NAME}, Schlüssel aus ${KEY_NAME}.\n`
  );
});

// Docker schickt SIGTERM. Ohne diese Zeilen wartet es zehn Sekunden und
// schießt dann, bei jedem Einspielen aufs Neue.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
