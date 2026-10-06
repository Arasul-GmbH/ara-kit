/**
 * Muster Mandanten: der Test "eine fremde Akte gibt 404".
 *
 * Liegt in einer App aus der Vorlage unter `backend/probe/fremde-akte.mjs` und läuft gegen eine
 * laufende App, lokal oder am Gerät im Teststand. Er legt zwei Probe-Akten an, ordnet je einen
 * Mitarbeiter einer zu, und prüft dann aus Sicht des einen alles, was er an der Akte des anderen
 * versuchen könnte: ansehen, ändern, einreichen, in ihr anlegen, sie in der Liste finden. Jedes
 * Mal muss 404 kommen, nie 403 und nie die Akte selbst. 403 sagte, dass es sie gibt.
 *
 * **Er braucht drei Sitzungen, nicht zwei.** Handtest 06.10.2026: mit den Cookies von zwei
 * Mitarbeitern brach er ab, weil niemand die Probe-Akten anlegen durfte.
 *
 *   1. `verwaltung`: ein Konto mit der Rolle, die Mandanten pflegt (am Gerät meist admin), und
 *      dem die App im Teststand freigegeben ist. Es legt die zwei Akten an und ordnet zu.
 *   2. `a` und `b`: zwei Mitarbeiter OHNE diese Rolle, beiden die App im Teststand freigegeben.
 *      Mit der Rolle sähe einer womöglich alle Akten (`alleSehen`), und der Test bewiese nichts.
 *
 * Die Sitzungen stehen in einer Datei, nicht im Aufruf: was in einem Aufruf steht, steht im
 * Protokoll der Arbeit und in der Geschichte der Shell. Die Datei legt der Mensch an, der sich im
 * Browser angemeldet hat, mit Rechten nur für sich (`chmod 600`), und löscht sie danach:
 *
 *   {
 *     "verwaltung": { "name": "<konto mit der rolle>", "kopf": { "cookie": "<sitzung>" } },
 *     "a": { "name": "<mitarbeiter a>", "kopf": { "cookie": "<sitzung>" } },
 *     "b": { "name": "<mitarbeiter b>", "kopf": { "cookie": "<sitzung>" } }
 *   }
 *
 *   node backend/probe/fremde-akte.mjs --basis https://<gerät>/apps/<id>/test/api --sitzungen <datei> --unsicher
 *
 * `name` ist der Name, wie das Gerät ihn in der Kopfzeile setzt, `kopf` das, was die Anfrage
 * dieses Menschen trägt: lokal die Kopfzeilen des Kontrakts, am Gerät die Sitzung (`cookie`).
 * Lokal, ohne Geheimnis, gehen auch `--verwaltung`, `--a` und `--b` mit demselben JSON im Aufruf.
 * Der Test zeigt nie eine Sitzung, auch nicht in einer Fehlermeldung.
 *
 * **Die Probe schreibt in die Datenbank der App**, darum nur in den Teststand: zwei Akten
 * "Probe-…" und eine Akte darin, in Arbeit, ohne Lauf. Die Zuordnungen löst sie am Ende wieder,
 * danach sieht niemand diese Akten mehr.
 *
 * Ein Gerät mit selbst ausgestelltem Zertifikat (`tls: selfsigned` in der Geräteakte) braucht
 * `--unsicher`: dann nimmt der Test dieses Zertifikat an, für seine eigenen Anfragen und sonst
 * nirgends. Ohne den Schalter prüft er das Zertifikat. Die Prüfung im ganzen Prozess abzuschalten
 * (`NODE_TLS_REJECT_UNAUTHORIZED=0`) ist der falsche Weg.
 *
 * Ausgang 0, wenn alles hält, sonst 1 mit dem Satz, was nicht hielt.
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

async function ruf(wer, methode, pfad, rumpf) {
  const kopf = { "content-type": "application/json", ...wer.kopf };
  const antwort = await anfrage(methode, `${basis}${pfad}`, kopf, rumpf ? JSON.stringify(rumpf) : undefined);
  let daten = null;
  try {
    daten = JSON.parse(antwort.text);
  } catch {
    // Keine JSON-Antwort: die Prüfung unten sagt es.
  }
  return { code: antwort.status, daten };
}

const befunde = [];
const pruefen = (ok, satz) => {
  befunde.push({ ok, satz });
  console.log(`${ok ? "ok    " : "FEHLER"} ${satz}`);
};

// Jeder öffnet die App einmal: zugeordnet wird nur, wer da war.
for (const wer of [a, b, verwaltung]) await ruf(wer, "GET", "/mandanten");

const marke = Date.now().toString(36);
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

try {
  const angelegt = await ruf(a, "POST", "/vorgaenge", { titel: `Probe ${marke}`, text: "Eine Akte von A.", mandant: x });
  const id = angelegt.daten?.vorgang?.id;
  pruefen(angelegt.code === 201 && Boolean(id), `A legt in der eigenen Akte an: ${angelegt.code}`);
  const eigene = await ruf(a, "GET", `/vorgaenge/${id}`);
  pruefen(eigene.code === 200, `A sieht die eigene Akte: ${eigene.code}`);

  const an = [
    ["B sieht die Akte von A", await ruf(b, "GET", `/vorgaenge/${id}`)],
    ["B ändert die Akte von A", await ruf(b, "PUT", `/vorgaenge/${id}`, { titel: "Übernommen", text: "" })],
    ["B reicht die Akte von A ein", await ruf(b, "POST", `/vorgaenge/${id}/einreichen`)],
    ["B legt in der Akte von A an", await ruf(b, "POST", "/vorgaenge", { titel: "Eingeschmuggelt", mandant: x })],
  ];
  for (const [was, r] of an) pruefen(r.code === 404, `${was}: ${r.code}, erwartet 404`);

  const liste = await ruf(b, "GET", "/vorgaenge");
  pruefen(liste.code === 200 && !(liste.daten?.vorgaenge || []).some((v) => v.id === id), "B findet die Akte von A nicht in der eigenen Liste");
  const akten = await ruf(b, "GET", "/mandanten");
  pruefen(akten.code === 200 && !(akten.daten?.mandanten || []).some((m) => m.id === x), "B sieht den Mandanten von A nicht");
  const verwalten = await ruf(b, "GET", "/zuordnungen");
  pruefen(verwalten.code === 403, `B ruft die Zuweisung auf: ${verwalten.code}, erwartet 403 (dass es die Verwaltung gibt, ist kein Geheimnis)`);
  const ohne = await ruf({ name: "", kopf: {} }, "GET", `/vorgaenge/${id}`);
  pruefen(ohne.code === 404 || ohne.code === 401, `Ohne Anmeldung: ${ohne.code}, erwartet 404 oder 401`);
} finally {
  await ruf(verwaltung, "DELETE", `/zuordnungen?benutzer=${encodeURIComponent(a.name)}&mandant=${x}`);
  await ruf(verwaltung, "DELETE", `/zuordnungen?benutzer=${encodeURIComponent(b.name)}&mandant=${y}`);
}

const schlecht = befunde.filter((f) => !f.ok);
console.log(schlecht.length ? `\n${schlecht.length} von ${befunde.length} Prüfungen sind rot.` : `\nAlle ${befunde.length} Prüfungen halten: eine fremde Akte gibt 404.`);
process.exit(schlecht.length ? 1 : 0);
