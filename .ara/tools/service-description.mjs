#!/usr/bin/env node
/**
 * Die Leistungsbeschreibung, gefüllt mit Werten vom Gerät.
 *
 *   node .ara/tools/service-description.mjs --device orin
 *   node .ara/tools/service-description.mjs --customer mueller --device werk2
 *   node .ara/tools/service-description.mjs --device orin --out <datei.md>
 *   node .ara/tools/service-description.mjs --device orin --json
 *   node .ara/tools/service-description.mjs --device orin --force
 *
 * **Warum das ein Werkzeug ist und keine Handarbeit.** Die Leistungsbeschreibung
 * wird unterschrieben. Eine Fassungsnummer, die dort falsch steht, ist keine
 * Ungenauigkeit, sondern eine Zusage, die nicht stimmt, und der häufigste Weg
 * dorthin ist die Anlage aus dem letzten Angebot mit neuem Datum. Was das Gerät
 * beantworten kann, holt darum dieses Werkzeug, und zwar jedes Mal neu.
 *
 * **Es füllt nur, was gemessen wurde.** Der Reifegrad je Funktionsbereich, die
 * Zielplattform aus dem Spiegel, die Verbindungen nach außen und alles, was aus
 * dem konkreten Fall kommt, bleiben Platzhalter: sie sind Entscheidungen und
 * keine Messwerte. Was offen blieb, steht am Ende der Ausgabe, und `pdf.mjs`
 * druckt nichts, solange ein Platzhalter darin steht.
 *
 * Gemessen wird über `maintain.mjs`, damit es die Frage „was steht auf diesem
 * Gerät" nicht zweimal im Kit gibt.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ROOT, customerPath, devicePath, ensureDir, fail, now, parseArgs, readDevice, today } from "./lib/kit.mjs";
import { modelNames } from "./lib/maintain.mjs";

const TEMPLATE = join(ROOT, ".ara", "vorlagen", "leistungsbeschreibung.md");
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);

if (!str(arg.device) && !str(arg.customer)) {
  console.log(
    [
      "Leistungsbeschreibung mit Werten vom Gerät",
      "",
      "  --device <name>        welches Gerät",
      "  --customer <name>      bei einem Kundengerät",
      "  --out <datei>          anderer Ablageort als der vorgesehene",
      "  --force                eine vorhandene Fassung desselben Tages ersetzen",
      "  --json                 maschinenlesbar",
      "  --base <url>           andere Adresse als die aus der Akte",
      "  --insecure             ein selbst ausgestelltes Zertifikat annehmen",
    ].join("\n")
  );
  process.exit(0);
}

let device;
try {
  device = readDevice(str(arg.customer), str(arg.device));
} catch (error) {
  fail(error.message);
}
const place = device.customer ? `${device.customer}/${device.device}` : device.device;

// --- Messen ------------------------------------------------------------------

/**
 * Der Zustand des Geräts, von `maintain.mjs`.
 *
 * `--no-ssh`: für dieses Papier zählt, was die Plattform von sich sagt, und
 * nicht, wie voll die Platte ist. Der Zustand des Rechners gehört in den
 * Wartungsbericht, nicht in eine Beschaffenheitsvereinbarung.
 */
function measure() {
  const args = ["--device", device.device, "--json", "--no-ssh"];
  if (device.customer) args.push("--customer", device.customer);
  if (str(arg.base)) args.push("--base", str(arg.base));
  if (arg.insecure) args.push("--insecure");
  const run = spawnSync("node", [join(ROOT, ".ara", "tools", "maintain.mjs"), ...args], {
    encoding: "utf8",
  });
  try {
    return JSON.parse(run.stdout);
  } catch {
    fail(
      `${place} ließ sich nicht befragen, und ohne Messung entsteht dieses Papier nicht.\n` +
        (run.stderr || run.stdout || "maintain.mjs hat nichts ausgegeben.").trim()
    );
  }
}

const state = measure();
if (!state.api) {
  fail(
    [
      `Zu ${place} steht keine Schnittstelle, es wurde nichts gemessen.`,
      ...(state.missing || []).map((satz) => `  ${satz}`),
      "",
      "Ohne Messung keine Leistungsbeschreibung: was hier hineingeschrieben wird, wird unterschrieben.",
    ].join("\n")
  );
}

const apps = state.apps || {};
const models = modelNames(state.models?.data);
const hardware = [device.fields.model, device.fields.serial && `Seriennummer ${device.fields.serial}`]
  .filter(Boolean)
  .join(", ");

/**
 * Die Apps als Zeile für Abschnitt 6.
 *
 * „keine" ist eine Aussage und darf nur dastehen, wenn das Gerät seine Apps
 * selbst aufgezählt hat. Hat das Kit nur nach den Kennungen gefragt, die es
 * kennt, beweist eine leere Antwort nichts, und dann bleibt der Platzhalter.
 */
function appsValue() {
  if (apps.state !== "gelesen") return null;
  if (apps.found?.length) {
    return apps.found
      .map((app) => `${app.id}${app.live ? ` (live ${app.live})` : app.test ? ` (nur Teststand ${app.test})` : ""}`)
      .join(", ");
  }
  return apps.source === "kontrakt" ? "keine" : null;
}

/**
 * Die Felder der Vorlage, die aus einer Messung kommen.
 *
 * Je Feld der Platzhalter, wie er in der Vorlage steht, der gemessene Wert und
 * die Quelle im Klartext. Fehlt der Platzhalter in der Vorlage, hat sich die
 * Vorlage geändert, und dann sagt das Werkzeug das, statt still nichts zu tun.
 */
const FIELDS = [
  {
    name: "Softwarestand",
    find: "{Fassung, vom Gerät gelesen}",
    value: state.platform?.arasul || null,
    source: "Kontrakt des Geräts, Feld arasul",
    section: "Kopf",
  },
  {
    name: "Kontraktfassung",
    find: "{Zahl, vom Gerät gelesen}",
    value: state.api?.contract !== null && state.api?.contract !== undefined ? String(state.api.contract) : null,
    source: "Kontrakt des Geräts, Feld kontrakt",
    section: "Kopf",
  },
  {
    name: "Erhebungsdatum",
    find: "{JJJJ-MM-TT}",
    value: today(),
    source: "der Tag dieser Messung",
    section: "Kopf",
  },
  {
    name: "Erhoben gegen",
    find: "{den Spiegelstand oder das gelieferte Gerät}",
    value: `das gelieferte Gerät ${place}, über seine Schnittstelle`,
    source: "diese Messung",
    section: "Kopf",
  },
  {
    name: "Gerät",
    find: "{Modell, Seriennummer}",
    value: hardware || null,
    source: `die Geräteakte ${relative(ROOT, device.file)}`,
    section: "Kopf",
  },
  {
    name: "Sprachmodell",
    find: "{Kennung und Fassung}",
    value: models.length ? models.join(", ") : null,
    source: state.models?.endpoint ? `das Gerät, ${state.models.endpoint}` : "das Gerät",
    section: "Abschnitt 5",
  },
  {
    name: "Installierte Erweiterungen",
    find: "{keine | Liste mit Fassung und\nLizenzgeber}",
    value: appsValue(),
    source: apps.source === "kontrakt" ? "das Gerät zählt seine Apps selbst auf" : "die Apps, nach denen gefragt wurde",
    section: "Abschnitt 6",
  },
];

// --- Schreiben ---------------------------------------------------------------

const template = readFileSync(TEMPLATE, "utf8");
let text = template;
const filled = [];
const open = [];

for (const field of FIELDS) {
  if (!template.includes(field.find)) {
    open.push({ ...field, why: `die Vorlage führt "${field.find}" nicht mehr, das Werkzeug muss nachgezogen werden` });
    continue;
  }
  if (!field.value) {
    open.push({ ...field, why: whyMissing(field) });
    continue;
  }
  text = text.replace(field.find, field.value);
  filled.push(field);
}

/** Warum ein Wert fehlt. Ein Satz, der stimmt, statt eines leeren Feldes. */
function whyMissing(field) {
  if (field.name === "Gerät") return "in der Geräteakte stehen weder model noch serial";
  if (field.name === "Sprachmodell") {
    return state.models?.text
      ? `das Gerät hat keine Kennung genannt: ${state.models.text}`
      : "das Gerät hat dazu nichts gesagt";
  }
  if (field.name === "Installierte Erweiterungen") {
    return apps.state !== "gelesen"
      ? `die Apps wurden nicht gemessen: ${apps.note || "ohne Angabe"}`
      : "das Gerät zählt seine Apps nicht selbst auf, und eine leere Antwort auf gefragte Kennungen beweist kein \"keine\"";
  }
  return "das Gerät hat dazu nichts gesagt";
}

/**
 * Der Satz im Dokument, der sagt, was gemessen wurde und wann.
 *
 * Er steht im Dokument und nicht nur im Kommentar daneben: der Kunde soll
 * lesen, welche Angaben aus einer Messung an seinem Gerät stammen und welche
 * aus einer Einschätzung.
 */
const sections = [...new Set(filled.map((f) => f.section))];
const measuredLine =
  `Gemessen am ${today()} um ${now().slice(11)} am Gerät ${place}, über seine Schnittstelle. ` +
  (sections.length
    ? `Aus dieser Messung stammen die Werte im ${sections.join(", in ")}.`
    : "Aus dieser Messung stammt kein einziger Wert, das Gerät hat zu allem geschwiegen.");

/** Die Herkunft je Wert, für den Partner und nicht für den Kunden: sie landet nicht im PDF. */
const provenance = [
  "<!--",
  `ERHEBUNG ${now()} am Gerät ${place}, Schnittstelle ${state.api.base}, Kit-Schlüssel ${state.api.key_ref}.`,
  "Werkzeug: node .ara/tools/service-description.mjs",
  "",
  "Gefüllt, je Wert die Quelle:",
  ...filled.map((f) => `- ${f.name}: ${f.value.replace(/\n/g, " ")}   (${f.source})`),
  "",
  "Offen geblieben, und warum:",
  ...open.map((f) => `- ${f.name} (${f.section}): ${f.why}`),
  ...(open.length ? [] : ["- nichts"]),
  "",
  "Nicht gemessen und darum von Hand: der Reifegrad je Funktionsbereich (Abschnitt 3),",
  "die Zielplattform und ihr Erprobungsstand aus dem Spiegel (Abschnitt 2), die",
  "Verbindungen nach aussen (Abschnitt 7) und alles aus dem konkreten Fall.",
  "-->",
].join("\n");

const anchor = "\n\n## 1 Gegenstand und Entwicklungsstand";
if (!text.includes(anchor)) {
  fail("Die Vorlage hat keinen Abschnitt 1 mehr. Das Werkzeug muss nachgezogen werden, bevor es schreibt.");
}
text = text.replace(anchor, `\n\n${measuredLine}\n\n${provenance}${anchor}`);

const target = str(arg.out)
  ? resolve(arg.out)
  : join(
      device.customer ? join(customerPath(device.customer), "documents") : devicePath(null, device.device),
      `leistungsbeschreibung-${today()}.md`
    );

if (existsSync(target) && !arg.force) {
  fail(
    `${relative(ROOT, target)} liegt schon.\n` +
      "Alte Fassungen bleiben liegen, in einem Streit zählt die, die bei Vertragsschluss galt.\n" +
      "Mit --force wird die Fassung von heute ersetzt, oder gib --out <datei> an."
  );
}
ensureDir(dirname(target));
writeFileSync(target, text);

// --- Ergebnis ----------------------------------------------------------------

if (arg.json) {
  console.log(
    JSON.stringify(
      {
        device: place,
        file: relative(ROOT, target),
        measured: { arasul: state.platform?.arasul ?? null, kontrakt: state.api?.contract ?? null, models, apps: apps.found || [] },
        filled: filled.map((f) => ({ name: f.name, value: f.value, source: f.source })),
        open: open.map((f) => ({ name: f.name, section: f.section, why: f.why })),
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.log(`Geschrieben: ${relative(ROOT, target)}`);
console.log("");
console.log(`Gemessen an ${place}, Schnittstelle ${state.api.base}:`);
for (const field of filled) console.log(`  ${field.name}: ${field.value.replace(/\n/g, " ")}   (${field.source})`);
if (!filled.length) console.log("  nichts, das Gerät hat zu keinem Feld etwas gesagt");
console.log("");
if (open.length) {
  console.log("Offen geblieben, und das bleibt deine Arbeit:");
  for (const field of open) console.log(`  ${field.name} (${field.section}): ${field.why}`);
  console.log("");
}
console.log(
  [
    "Von Hand, weil es Entscheidungen sind und keine Messwerte:",
    "  Abschnitt 2: Zielplattform und Erprobungsstand aus dem Spiegel (node .ara/tools/mirror.mjs --refresh)",
    "  Abschnitt 3: Reifegrad je Funktionsbereich. abgenommen nur, was bei der Übergabe vorgeführt wird",
    "  Abschnitt 4 und 6: was dieser Kunde ausdrücklich nicht bekommt",
    "  Abschnitt 7: Verbindungen nach außen, am Gerät gemessen",
    "  Abschnitt 8: mit dem Kunden durchgehen",
    "",
    `Verfahren: .ara/knowledge/paperwork.md. Danach: node .ara/tools/pdf.mjs ${relative(ROOT, target)}`,
  ].join("\n")
);
