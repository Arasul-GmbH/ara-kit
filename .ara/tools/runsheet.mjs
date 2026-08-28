#!/usr/bin/env node
/**
 * Laufzettel: das Gedächtnis einer Geräteeinrichtung.
 *
 * Eine Einrichtung dauert Stunden, wird unterbrochen und überlebt mehrere Sitzungen.
 * Der Laufzettel hält fest, was erledigt ist und was als Nächstes kommt. Er wird
 * angehängt, nie umgeschrieben.
 *
 *   node .ara/tools/runsheet.mjs --create --customer mueller --device zentrale
 *   node .ara/tools/runsheet.mjs --customer mueller --show
 *   node .ara/tools/runsheet.mjs --customer mueller --phase 3 --state done \
 *        --entry "Installation gelaufen. Nachweis: alle Dienste gesund."
 *
 * Ein Gerät ohne Kunden (Unternehmen, oder das eigene Gerät des Partners) liegt
 * unter devices/<gerät>/. Dann fällt --customer weg:
 *
 *   node .ara/tools/runsheet.mjs --create --device zentrale
 *   node .ara/tools/runsheet.mjs --device zentrale --show
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ROOT,
  devicePath,
  ensureDir,
  fail,
  helpOnly,
  now,
  parseArgs,
  readFrontmatter,
  resolveDevice,
  writeFrontmatter,
} from "./lib/kit.mjs";

const PHASES = [
  "Vorbereitung am Schreibtisch",
  "Betriebssystem",
  "Erstkontakt über das Netz",
  "Arasul installieren",
  "Nachbereitung",
  "Nachweis",
  "Abnahme",
];

const STATES = ["open", "running", "paused", "done"];

const STATE_LABEL = {
  open: "offen",
  running: "läuft",
  paused: "unterbrochen",
  done: "fertig",
};

helpOnly(import.meta.url);
const arg = parseArgs();

if (arg.create) {
  if (typeof arg.device !== "string") {
    fail("Zum Anlegen brauche ich --device, bei einem Kundengerät dazu --customer.");
  }
  const customer = typeof arg.customer === "string" ? arg.customer : null;
  const dir = ensureDir(devicePath(customer, arg.device));
  const file = join(dir, "runsheet.md");
  if (existsSync(file)) fail(`Es gibt schon einen Laufzettel: ${file}`);

  writeFileSync(file, readFileSync(join(ROOT, ".ara", "templates", "runsheet.md"), "utf8"));
  writeFrontmatter(file, {
    customer: customer || "",
    device: arg.device,
    profile: typeof arg.profile === "string" ? arg.profile : "",
    phase: 0,
    state: "running",
    started: now(),
    updated: now(),
  });
  console.log(`Laufzettel angelegt: ${relative(ROOT, file)}`);
  process.exit(0);
}

let target;
try {
  target = resolveDevice(
    typeof arg.customer === "string" ? arg.customer : null,
    typeof arg.device === "string" ? arg.device : null
  );
} catch (error) {
  fail(error.message);
}

const label = target.customer ? `${target.customer}/${target.device}` : target.device;
const file = join(target.path, "runsheet.md");
if (!existsSync(file)) {
  fail(
    `Für ${label} gibt es noch keinen Laufzettel.\n` +
      `Anlegen mit: node .ara/tools/runsheet.mjs --create` +
      `${target.customer ? ` --customer ${target.customer}` : ""} --device ${target.device}`
  );
}

// Anzeigen
if (arg.show || (!arg.entry && arg.phase === undefined && !arg.state)) {
  const { fields } = readFrontmatter(file);
  const phase = Number(fields.phase ?? 0);
  const entries = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("### "));

  console.log(
    [
      `# Stand: ${label}`,
      "",
      `- Phase ${phase} von 6: ${PHASES[phase] ?? "unbekannt"}`,
      `- Zustand: ${STATE_LABEL[fields.state] ?? fields.state ?? "unbekannt"}`,
      `- Plattformprofil: ${fields.profile || "noch nicht bestätigt"}`,
      `- Begonnen: ${fields.started || "unbekannt"}, zuletzt: ${fields.updated || "unbekannt"}`,
      "",
      entries.length ? "## Bisherige Schritte" : "Noch keine Schritte protokolliert.",
      ...entries.slice(-12).map((line) => `- ${line.replace(/^###\s*/, "")}`),
    ].join("\n")
  );
  process.exit(0);
}

// Eintragen
const phase = arg.phase !== undefined ? Number(arg.phase) : null;
if (phase !== null && (!Number.isInteger(phase) || phase < 0 || phase > 6)) {
  fail("--phase muss eine Zahl von 0 bis 6 sein.");
}
const state = typeof arg.state === "string" ? arg.state : null;
if (state && !STATES.includes(state)) {
  fail(`--state muss eines von ${STATES.join(", ")} sein.`);
}
if (typeof arg.entry !== "string" || !arg.entry.trim()) {
  fail('--entry braucht Text. Beispiel: --entry "SSH gehärtet, Zugang gegengeprüft."');
}

const { fields } = readFrontmatter(file);
const usedPhase = phase ?? Number(fields.phase ?? 0);
const usedState = state ?? fields.state ?? "running";
const heading =
  `### Phase ${usedPhase}: ${PHASES[usedPhase] ?? "unbekannt"} · ` +
  `${STATE_LABEL[usedState] ?? usedState} · ${now()}`;

appendFileSync(file, `\n${heading}\n${arg.entry.trim()}\n`);
writeFrontmatter(file, { phase: usedPhase, state: usedState, updated: now() });

console.log(
  `Eingetragen bei ${label}: Phase ${usedPhase}, ${STATE_LABEL[usedState] ?? usedState}.`
);
