/**
 * Muster Mandanten: der Test "die Suche findet nichts Fremdes".
 *
 * Liegt in einer App aus der Vorlage unter `backend/probe/fremde-suche.mjs`, neben
 * `fremde-akte.mjs`, und läuft wie dieser gegen eine laufende App, lokal oder am Gerät im
 * Teststand. Die Kopfleiste des Geräts fragt jede App mit `GET suche?q=<text>&limit=<n>` im Namen
 * dessen, der tippt (`.ara/knowledge/search.md`). Was dort herauskommt, muss so eng sein wie seine
 * Liste: wer eine Akte nicht sieht, findet sie auch nicht.
 *
 * Er legt zwei Probe-Akten an, ordnet je einen Mitarbeiter einer zu, A legt in seiner einen
 * Vorgang mit einem Wort an, das sonst nirgends steht, und hängt, wenn die App Belege kennt, ein
 * kleines PNG mit demselben Wort im Namen an. Dann sucht jeder nach dem Wort:
 *
 *   - A findet seinen Vorgang (und seinen Beleg). Findet A nichts, sucht die App nicht, und der Test
 *     sagt das, statt ein leeres Ergebnis bei B als bestanden zu zählen.
 *   - B findet nichts davon, weder unter dem Wort noch unter dem Titel noch unter dem Dateinamen.
 *   - Ohne Anmeldung findet niemand etwas.
 *
 * Dazu die Form, wie der Vertrag sie verlangt: `{ data: [...] }`, höchstens zehn Treffer auch mit
 * `limit=50`, jeder mit `titel`, `unterzeile`, `art` und `pfad`, der Pfad beginnt mit `/`; ein
 * leeres `q` und eines mit einem Zeichen geben eine leere Liste und keinen Fehler.
 *
 * **Er braucht dieselben drei Sitzungen wie `fremde-akte.mjs`**, in derselben Datei:
 *
 *   1. `verwaltung`: ein Konto mit der Rolle, die Mandanten pflegt, dem die App im Teststand
 *      freigegeben ist. Es legt die zwei Akten an und ordnet zu.
 *   2. `a` und `b`: zwei Mitarbeiter OHNE diese Rolle, beiden die App im Teststand freigegeben.
 *
 *   {
 *     "verwaltung": { "name": "<konto mit der rolle>", "kopf": { "authorization": "Bearer <ausweis>" } },
 *     "a": { "name": "<mitarbeiter a>", "kopf": { "authorization": "Bearer <ausweis>" } },
 *     "b": { "name": "<mitarbeiter b>", "kopf": { "authorization": "Bearer <ausweis>" } }
 *   }
 *
 *   node backend/probe/fremde-suche.mjs --basis https://<gerät>/apps/<id>/test/api --sitzungen <datei> --unsicher
 *
 * Wie die Ausweise ohne Browser in die Datei kommen, steht im Kopf von `fremde-akte.mjs`. Lokal,
 * ohne Geheimnis, gehen auch `--verwaltung`, `--a` und `--b` mit demselben JSON im Aufruf. Der Test
 * zeigt nie eine Sitzung, auch nicht in einer Fehlermeldung.
 *
 * **Die Probe schreibt in die Datenbank der App**, darum nur in den Teststand: zwei Akten
 * "Probe-…", ein Vorgang darin, in Arbeit, ohne Lauf, und kurz ein Beleg. Den Beleg entfernt sie
 * und die Zuordnungen löst sie am Ende wieder, danach sieht niemand diese Akten mehr.
 *
 * `--unsicher` nimmt das selbst ausgestellte Zertifikat eines Geräts an, für die Anfragen dieses
 * Tests und sonst nirgends.
 *
 * Ausgang 0, wenn alles hält, sonst 1 mit dem Satz, was nicht hielt; 2, wenn er nicht laufen kann.
 */

import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";

function argument(name) {
  const stelle = process.argv.indexOf(`--${name}`);
  return stelle > 0 ? process.argv[stelle + 1] : null;
}

const WER = {
  verwaltung: "ein Konto mit der Rolle, die Mandanten pflegt, dem die App freigegeben ist",
  a: "Mitarbeiter A, ohne diese Rolle",
  b: "Mitarbeiter B, ohne diese Rolle",
};

const datei = argument("sitzungen");
let sitzungen = null;
if (datei) {
  try {
    sitzungen = JSON.parse(readFileSync(datei, "utf8"));
  } catch (fehler) {
    console.error(`Die Datei der Sitzungen ist nicht lesbar: ${fehler.code || "kein JSON"}.`);
    process.exit(2);
  }
}

function mensch(name) {
  let m = sitzungen?.[name] ?? null;
  if (!m && argument(name)) m = JSON.parse(argument(name));
  if (!m || !m.name || typeof m.kopf !== "object") {
    console.error(
      `Es fehlt die Sitzung "${name}" (${WER[name]}). Der Test braucht drei: verwaltung, a und b, ` +
        "in einer Datei mit --sitzungen <datei>. Wie sie aussieht, steht im Kopf dieser Datei."
    );
    process.exit(2);
  }
  return m;
}

const unsicher = process.argv.includes("--unsicher");
const basis = (argument("basis") || "").replace(/\/+$/, "");
if (!basis) {
  console.error("--basis fehlt: die Adresse der laufenden App, bis einschließlich /api.");
  process.exit(2);
}
const verwaltung = mensch("verwaltung");
const a = mensch("a");
const b = mensch("b");

function anfrage(methode, adresse, kopf, rumpf) {
  const url = new URL(adresse);
  const modul = url.protocol === "https:" ? https : http;
  const optionen = { method: methode, headers: kopf, ...(url.protocol === "https:" && unsicher ? { rejectUnauthorized: false } : {}) };
  return new Promise((fertig) => {
    const req = modul.request(url, optionen, (antwort) => {
      const teile = [];
      antwort.on("data", (t) => teile.push(t));
      antwort.on("end", () => fertig({ status: antwort.statusCode, text: Buffer.concat(teile).toString("utf8") }));
    });
    req.on("error", (e) => {
      const zertifikat = /certificate|SELF_SIGNED|DEPTH_ZERO/i.test(`${e.code} ${e.message}`);
      console.error(
        zertifikat
          ? "Das Zertifikat der App ist selbst ausgestellt und das Gerät hat es nicht beglaubigt. Ist es das Gerät, das Sie kennen, lassen Sie den Test noch einmal mit --unsicher laufen."
          : `Die App antwortet nicht (${e.code || e.message}). Läuft sie, und stimmt --basis?`
      );
      process.exit(2);
    });
    if (rumpf) req.write(rumpf);
    req.end();
  });
}

function lesen(antwort) {
  try {
    return JSON.parse(antwort.text);
  } catch {
    return null;
  }
}

async function ruf(wer, methode, pfad, rumpf) {
  const kopf = { "content-type": "application/json", ...wer.kopf };
  const antwort = await anfrage(methode, `${basis}${pfad}`, kopf, rumpf ? JSON.stringify(rumpf) : undefined);
  return { code: antwort.status, daten: lesen(antwort) };
}

/** Eine Suche, wie die Kopfleiste sie stellt. */
const suche = (wer, q, limit) => ruf(wer, "GET", `/suche?q=${encodeURIComponent(q)}${limit === undefined ? "" : `&limit=${limit}`}`);

const befunde = [];
const pruefen = (ok, satz) => {
  befunde.push({ ok, satz });
  console.log(`${ok ? "ok    " : "FEHLER"} ${satz}`);
};

/** Ist die Antwort in der Form des Vertrags? Zurück kommt der erste Satz, der nicht stimmt, oder null. */
function formFehler(r) {
  if (r.code !== 200) return `Status ${r.code}`;
  if (!r.daten || !Array.isArray(r.daten.data)) return "keine Liste unter data";
  if (r.daten.data.length > 10) return `${r.daten.data.length} Treffer, höchstens zehn`;
  for (const treffer of r.daten.data) {
    for (const feld of ["titel", "unterzeile", "art", "pfad"]) {
      if (typeof treffer?.[feld] !== "string") return `ein Treffer ohne ${feld}`;
    }
    if (!treffer.pfad.startsWith("/")) return `der Pfad ${treffer.pfad.slice(0, 40)} beginnt nicht mit /`;
  }
  return null;
}

// Gibt es die Route überhaupt? Ohne sie ist alles Weitere kein Befund über fremde Treffer.
const leer = await suche(a, "");
if (leer.code === 404) {
  console.error("Die App beantwortet GET suche nicht (404). Erst die Suche nachziehen: .ara/knowledge/search.md im Kit.");
  process.exit(1);
}
pruefen(!formFehler(leer) && leer.daten.data.length === 0, `Ein leeres q gibt eine leere Liste: ${formFehler(leer) ?? `${leer.daten.data.length} Treffer`}`);
const kurz = await suche(a, "P");
pruefen(!formFehler(kurz) && kurz.daten.data.length === 0, `Ein Zeichen gibt eine leere Liste: ${formFehler(kurz) ?? `${kurz.daten.data.length} Treffer`}`);

// Jeder öffnet die App einmal: zugeordnet wird nur, wer da war.
for (const wer of [a, b, verwaltung]) await ruf(wer, "GET", "/mandanten");

const marke = Date.now().toString(36);
// Ein Wort, das sonst in keiner Akte steht, und ein Titel, der es trägt.
const wort = `Suchprobe${marke}`;
const titel = `Probe ${wort} Podest`;
const x = (await ruf(verwaltung, "POST", "/mandanten", { name: `Probe-X-${marke}` })).daten?.mandant?.id;
const y = (await ruf(verwaltung, "POST", "/mandanten", { name: `Probe-Y-${marke}` })).daten?.mandant?.id;
if (!x || !y) {
  console.error(
    `Die Verwaltung (${verwaltung.name}) konnte keine Probe-Akten anlegen. Sie braucht die Rolle, die Mandanten pflegt, ` +
      "und die App muss ihr im Teststand freigegeben sein. Zwei Mitarbeiter allein reichen nicht: der Test braucht drei Sitzungen."
  );
  process.exit(1);
}
const zuA = await ruf(verwaltung, "POST", "/zuordnungen", { benutzer: a.name, mandant: x });
const zuB = await ruf(verwaltung, "POST", "/zuordnungen", { benutzer: b.name, mandant: y });
if (![200, 201].includes(zuA.code) || ![200, 201].includes(zuB.code)) {
  console.error(`Zuordnen ging nicht (${zuA.code}, ${zuB.code}): ${JSON.stringify(zuA.daten)} ${JSON.stringify(zuB.daten)}`);
  process.exit(1);
}

/** Ein Bild aus einem Punkt, das kleinste PNG: als Beleg an der Probe-Akte. */
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082",
  "hex"
);

let dokument = null;
try {
  const angelegt = await ruf(a, "POST", "/vorgaenge", { titel, text: "Eine Akte von A, nur für die Suche.", mandant: x });
  const id = angelegt.daten?.vorgang?.id;
  pruefen(angelegt.code === 201 && Boolean(id), `A legt in der eigenen Akte an: ${angelegt.code}`);

  // Ein Beleg mit dem Wort im Namen, wenn die App Belege kennt (Muster Dokumente und Belege).
  const kopf = { ...a.kopf, "content-type": "image/png", "x-dateiname": encodeURIComponent(`${wort}-beleg.png`) };
  const beleg = await anfrage("POST", `${basis}/dokumente?vorgang=${id}`, kopf, PNG);
  dokument = beleg.status === 201 ? lesen(beleg)?.dokument?.id ?? null : null;

  const vonA = await suche(a, wort);
  pruefen(!formFehler(vonA), `Die Antwort hat die Form des Vertrags: ${formFehler(vonA) ?? "ja"}`);
  const eigene = (vonA.daten?.data || []).filter((t) => t.titel.includes(wort));
  // Findet A nichts, sucht die App nicht in den Vorgängen, und ein leeres Ergebnis bei B bewiese nichts.
  pruefen(
    eigene.length > 0,
    eigene.length
      ? `A findet den eigenen Vorgang: ${eigene.length} Treffer, Pfad ${eigene[0].pfad}`
      : `A findet den eigenen Vorgang „${titel}“ nicht: die App sucht nicht in den Vorgängen, und was B nicht findet, bewiese nichts`
  );
  if (dokument) pruefen(eigene.some((t) => t.titel.includes(`${wort}-beleg`)), "A findet den eigenen Beleg unter seinem Namen");

  for (const [was, q] of [
    ["unter dem Wort", wort],
    ["unter dem ganzen Titel", titel],
    ["klein geschrieben", wort.toLowerCase()],
    ...(dokument ? [["unter dem Namen des Belegs", `${wort}-beleg`]] : []),
  ]) {
    const r = await suche(b, q);
    const fremd = (r.daten?.data || []).filter((t) => t.titel.includes(wort) || t.pfad === `/?nr=${id}`);
    pruefen(!formFehler(r) && fremd.length === 0, `B findet die Akte von A nicht ${was}: ${formFehler(r) ?? `${fremd.length} fremde Treffer`}`);
  }
  const ohne = await suche({ name: "", kopf: {} }, wort);
  const ohneTreffer = ohne.code === 200 ? (ohne.daten?.data || []).length : 0;
  pruefen([200, 401, 404].includes(ohne.code) && ohneTreffer === 0, `Ohne Anmeldung: ${ohne.code}, ${ohneTreffer} Treffer, erwartet keiner`);

  const viele = await suche(a, "Probe", 50);
  pruefen(!formFehler(viele), `Mit limit=50 höchstens zehn Treffer: ${formFehler(viele) ?? `${viele.daten.data.length}`}`);
  if (!dokument) console.log("nicht eingehängt, nicht geprüft: Muster Dokumente oder Belege (kein Beleg an der Probe-Akte)");
} finally {
  if (dokument) await ruf(a, "DELETE", `/dokumente/${dokument}`);
  await ruf(verwaltung, "DELETE", `/zuordnungen?benutzer=${encodeURIComponent(a.name)}&mandant=${x}`);
  await ruf(verwaltung, "DELETE", `/zuordnungen?benutzer=${encodeURIComponent(b.name)}&mandant=${y}`);
}

const schlecht = befunde.filter((f) => !f.ok);
console.log(schlecht.length ? `\n${schlecht.length} von ${befunde.length} Prüfungen sind rot.` : `\nAlle ${befunde.length} Prüfungen halten: die Suche findet nichts Fremdes.`);
process.exit(schlecht.length ? 1 : 0);
