#!/usr/bin/env node
/**
 * Runsheet: the memory of a device setup.
 *
 * A setup takes hours, gets interrupted and survives several sessions. The runsheet
 * records what is done and what comes next. It gets appended to, never rewritten.
 *
 *   node .ara/tools/runsheet.mjs --create --customer mueller --device zentrale
 *   node .ara/tools/runsheet.mjs --customer mueller --show
 *   node .ara/tools/runsheet.mjs --customer mueller --phase 3 --state done \
 *        --entry "Installation done. Evidence: all services healthy."
 *
 * A device without a customer (a company, or the partner's own device) lies under
 * devices/<device>/. Then --customer falls away:
 *
 *   node .ara/tools/runsheet.mjs --create --device zentrale
 *   node .ara/tools/runsheet.mjs --device zentrale --show
 *
 * === deutsch ===
 *
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
import { localized, t } from "./lib/i18n.mjs";

const PHASES = t(
  [
    "Preparation at the desk",
    "Operating system",
    "First contact over the network",
    "Install Arasul",
    "Follow-up",
    "Evidence",
    "Handover",
  ],
  [
    "Vorbereitung am Schreibtisch",
    "Betriebssystem",
    "Erstkontakt über das Netz",
    "Arasul installieren",
    "Nachbereitung",
    "Nachweis",
    "Abnahme",
  ]
);

const STATES = ["open", "running", "paused", "done"];

const STATE_LABEL = t(
  { open: "open", running: "running", paused: "interrupted", done: "done" },
  { open: "offen", running: "läuft", paused: "unterbrochen", done: "fertig" }
);

helpOnly(import.meta.url);
const arg = parseArgs();

if (arg.create) {
  if (typeof arg.device !== "string") {
    fail(
      t(
        "To create one I need --device, and for a customer device --customer as well.",
        "Zum Anlegen brauche ich --device, bei einem Kundengerät dazu --customer."
      )
    );
  }
  const customer = typeof arg.customer === "string" ? arg.customer : null;
  const dir = ensureDir(devicePath(customer, arg.device));
  const file = join(dir, "runsheet.md");
  if (existsSync(file)) fail(t(`There is a runsheet already: ${file}`, `Es gibt schon einen Laufzettel: ${file}`));

  writeFileSync(file, readFileSync(localized(join(ROOT, ".ara", "templates", "runsheet.md")), "utf8"));
  writeFrontmatter(file, {
    customer: customer || "",
    device: arg.device,
    profile: typeof arg.profile === "string" ? arg.profile : "",
    phase: 0,
    state: "running",
    started: now(),
    updated: now(),
  });
  console.log(t(`Runsheet created: ${relative(ROOT, file)}`, `Laufzettel angelegt: ${relative(ROOT, file)}`));
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
    t(`There is no runsheet for ${label} yet.\nCreate one with: `, `Für ${label} gibt es noch keinen Laufzettel.\nAnlegen mit: `) +
      `node .ara/tools/runsheet.mjs --create` +
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

  const unknown = t("unknown", "unbekannt");
  console.log(
    [
      t(`# State: ${label}`, `# Stand: ${label}`),
      "",
      t(`- Phase ${phase} of 6: ${PHASES[phase] ?? unknown}`, `- Phase ${phase} von 6: ${PHASES[phase] ?? unknown}`),
      t(
        `- State: ${STATE_LABEL[fields.state] ?? fields.state ?? unknown}`,
        `- Zustand: ${STATE_LABEL[fields.state] ?? fields.state ?? unknown}`
      ),
      t(
        `- Platform profile: ${fields.profile || "not confirmed yet"}`,
        `- Plattformprofil: ${fields.profile || "noch nicht bestätigt"}`
      ),
      t(
        `- Started: ${fields.started || unknown}, last: ${fields.updated || unknown}`,
        `- Begonnen: ${fields.started || unknown}, zuletzt: ${fields.updated || unknown}`
      ),
      "",
      entries.length
        ? t("## Steps so far", "## Bisherige Schritte")
        : t("No steps recorded yet.", "Noch keine Schritte protokolliert."),
      ...entries.slice(-12).map((line) => `- ${line.replace(/^###\s*/, "")}`),
    ].join("\n")
  );
  process.exit(0);
}

// Eintragen
const phase = arg.phase !== undefined ? Number(arg.phase) : null;
if (phase !== null && (!Number.isInteger(phase) || phase < 0 || phase > 6)) {
  fail(t("--phase has to be a number from 0 to 6.", "--phase muss eine Zahl von 0 bis 6 sein."));
}
const state = typeof arg.state === "string" ? arg.state : null;
if (state && !STATES.includes(state)) {
  fail(t(`--state has to be one of ${STATES.join(", ")}.`, `--state muss eines von ${STATES.join(", ")} sein.`));
}
if (typeof arg.entry !== "string" || !arg.entry.trim()) {
  fail(
    t(
      '--entry needs text. Example: --entry "SSH hardened, access cross-checked."',
      '--entry braucht Text. Beispiel: --entry "SSH gehärtet, Zugang gegengeprüft."'
    )
  );
}

const { fields } = readFrontmatter(file);
const usedPhase = phase ?? Number(fields.phase ?? 0);
const usedState = state ?? fields.state ?? "running";
const heading =
  `### Phase ${usedPhase}: ${PHASES[usedPhase] ?? t("unknown", "unbekannt")} · ` +
  `${STATE_LABEL[usedState] ?? usedState} · ${now()}`;

appendFileSync(file, `\n${heading}\n${arg.entry.trim()}\n`);
writeFrontmatter(file, { phase: usedPhase, state: usedState, updated: now() });

console.log(
  t(
    `Recorded at ${label}: phase ${usedPhase}, ${STATE_LABEL[usedState] ?? usedState}.`,
    `Eingetragen bei ${label}: Phase ${usedPhase}, ${STATE_LABEL[usedState] ?? usedState}.`
  )
);
