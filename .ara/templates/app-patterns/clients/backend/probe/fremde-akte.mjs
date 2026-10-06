/**
 * Muster Mandanten: der Test "eine fremde Akte gibt 404".
 *
 * Liegt in einer App aus der Vorlage unter `backend/probe/fremde-akte.mjs` und läuft gegen eine
 * laufende App, lokal oder am Gerät im Teststand. Er legt zwei Probe-Akten an, ordnet je einen
 * Mitarbeiter einer zu, und prüft dann aus Sicht des einen alles, was er an der Akte des anderen
 * versuchen könnte: ansehen, ändern, einreichen, in ihr anlegen, sie in der Liste finden. Jedes
 * Mal muss 404 kommen, nie 403 und nie die Akte selbst. 403 sagte, dass es sie gibt.
 *
 * **Auch die Wege, die eine Beleg-App mitbringt** (Muster Dokumente, Belege, Verlauf): A hängt
 * ein kleines PNG an seinen Vorgang, und B versucht Beleg, Bytes, Original, Verlauf, Entfernen und
 * Anhängen; nichts davon darf er finden. Ein Weg, den A an der eigenen Akte nicht erreicht, ist in
 * dieser App nicht eingehängt, und der Test sagt das, statt ein 404 als bestanden zu zählen.
 *
 * **Er braucht drei Sitzungen, nicht zwei.** Handtest 06.10.2026: mit den Cookies von zwei
 * Mitarbeitern brach er ab, weil niemand die Probe-Akten anlegen durfte.
 *
 *   1. `verwaltung`: ein Konto mit der Rolle, die Mandanten pflegt (am Gerät meist admin), und
 *      dem die App im Teststand freigegeben ist. Es legt die zwei Akten an und ordnet zu.
 *   2. `a` und `b`: zwei Mitarbeiter OHNE diese Rolle, beiden die App im Teststand freigegeben.
 *      Mit der Rolle sähe einer womöglich alle Akten (`alleSehen`), und der Test bewiese nichts.
 *
 * **Der Weg ohne Browser kommt zuerst.** Die Ausweise holt das Kit, nicht ein Mensch mit Cookies:
 * `node .ara/tools/device.mjs --name <gerät> --admin-login --login-user <konto> --password-ref <name>
 * --token` meldet das Konto am Gerät an, mit dem Passwort aus der Ablage des Kits
 * (`.ara/tools/secrets.mjs`), und reicht den Ausweis nur einem aufrufenden Kit-Werkzeug über einen
 * eigenen Kanal (`adminSession` in `.ara/tools/lib/kit.mjs`). Auf dem Bildschirm erscheint er nie.
 * Ein kleines Skript des Kits ruft `adminSession` je Konto einmal und schreibt den Ausweis als
 * `"authorization": "Bearer <ausweis>"` in die Datei unten, mit Rechten nur für sich (`0o600`).
 * Die Passwörter der Konten liegen als Geheimnisse in der Ablage, nie im Aufruf.
 * Nur wenn das nicht geht, holt ein Mensch die Cookies im Browser (`"cookie": "<sitzung>"`).
 *
 * Die Sitzungen stehen in einer Datei, nicht im Aufruf: was in einem Aufruf steht, steht im
 * Protokoll der Arbeit und in der Geschichte der Shell. Die Datei bleibt geschützt (`chmod 600`),
 * der Ausweis geht nie in eine Ausgabe, und sie wird danach gelöscht:
 *
 *   {
 *     "verwaltung": { "name": "<konto mit der rolle>", "kopf": { "authorization": "Bearer <ausweis>" } },
 *     "a": { "name": "<mitarbeiter a>", "kopf": { "authorization": "Bearer <ausweis>" } },
 *     "b": { "name": "<mitarbeiter b>", "kopf": { "authorization": "Bearer <ausweis>" } }
 *   }
 *
 *   node backend/probe/fremde-akte.mjs --basis https://<gerät>/apps/<id>/test/api --sitzungen <datei> --unsicher
 *
 * `name` ist der Name, wie das Gerät ihn in der Kopfzeile setzt, `kopf` das, was die Anfrage
 * dieses Menschen trägt: lokal die Kopfzeilen des Kontrakts, am Gerät der Ausweis (`authorization`)
 * oder die Sitzung des Browsers (`cookie`).
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

/** Ein Bild aus einem Punkt, das kleinste PNG: als Beleg an der Probe-Akte. */
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082",
  "hex"
);

/** Eine Datei hochladen, roh im Rumpf, wie das Muster Dokumente es nimmt. */
async function hochladen(wer, pfad) {
  const kopf = { ...wer.kopf, "content-type": "image/png", "x-dateiname": encodeURIComponent(`probe-${marke}.png`) };
  const antwort = await anfrage("POST", `${basis}${pfad}`, kopf, PNG);
  let daten = null;
  try {
    daten = JSON.parse(antwort.text);
  } catch {
    // Keine JSON-Antwort: die Prüfung unten sagt es.
  }
  return { code: antwort.status, daten };
}

let dokument = null;
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

  // Die Wege der Beleg-App. Erst A an der eigenen Akte: was A nicht erreicht, ist nicht eingehängt.
  const beleg = await hochladen(a, `/dokumente?vorgang=${id}`);
  dokument = beleg.code === 201 ? beleg.daten?.dokument?.id ?? null : null;
  const wege = [
    ["den Beleg von A in seiner Liste", `/vorgaenge/${id}/belege`, "Muster Belege"],
    ["das Original von A (beleg.png)", `/vorgaenge/${id}/beleg.png`, "Muster Belege"],
    ["das Blatt von A (original.png)", `/vorgaenge/${id}/original.png`, "Vorlage"],
    ["den Verlauf von A", `/vorgaenge/${id}/verlauf`, "Muster Verlauf"],
    ...(dokument ? [["die Bytes des Belegs von A", `/dokumente/${dokument}/datei`, "Muster Dokumente"]] : []),
  ];
  const ohneWeg = [];
  for (const [was, pfad, muster] of wege) {
    const eigen = await ruf(a, "GET", pfad);
    if (eigen.code !== 200) {
      ohneWeg.push(`${muster} (${pfad.replace(String(id), "<nr>")}: ${eigen.code})`);
      continue;
    }
    const fremd = await ruf(b, "GET", pfad);
    pruefen(fremd.code === 404, `B holt ${was}: ${fremd.code}, erwartet 404`);
  }
  if (dokument) {
    const liste = await ruf(b, "GET", "/dokumente");
    pruefen(liste.code !== 200 || !(liste.daten?.dokumente || []).some((d) => d.id === dokument), "B findet den Beleg von A nicht unter den Dokumenten");
    const anhaengen = await hochladen(b, `/dokumente?vorgang=${id}`);
    pruefen(anhaengen.code === 404, `B hängt einen Beleg an die Akte von A: ${anhaengen.code}, erwartet 404`);
    const weg = await ruf(b, "DELETE", `/dokumente/${dokument}`);
    pruefen(weg.code === 404, `B entfernt den Beleg von A: ${weg.code}, erwartet 404`);
  } else {
    ohneWeg.push(`Muster Dokumente oder Belege (Anhängen: ${beleg.code})`);
  }
  if (ohneWeg.length) console.log(`nicht eingehängt, nicht geprüft: ${ohneWeg.join(", ")}`);
} finally {
  if (dokument) await ruf(a, "DELETE", `/dokumente/${dokument}`);
  await ruf(verwaltung, "DELETE", `/zuordnungen?benutzer=${encodeURIComponent(a.name)}&mandant=${x}`);
  await ruf(verwaltung, "DELETE", `/zuordnungen?benutzer=${encodeURIComponent(b.name)}&mandant=${y}`);
}

const schlecht = befunde.filter((f) => !f.ok);
console.log(schlecht.length ? `\n${schlecht.length} von ${befunde.length} Prüfungen sind rot.` : `\nAlle ${befunde.length} Prüfungen halten: eine fremde Akte gibt 404.`);
process.exit(schlecht.length ? 1 : 0);
