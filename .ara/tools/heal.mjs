#!/usr/bin/env node
/**
 * Self-healing: fix what is broken on a running device, only inside the Arasul
 * directory tree, and take every step back one by one.
 *
 *   node .ara/tools/heal.mjs --device orin                 establish, fix, verify, record
 *   node .ara/tools/heal.mjs --customer mueller --device werk2
 *   node .ara/tools/heal.mjs --device orin --plan          only say what it would do
 *   node .ara/tools/heal.mjs --device orin --list          the interventions so far
 *   node .ara/tools/heal.mjs --device orin --undo H-0003   restore the state before H-0003
 *   node .ara/tools/heal.mjs --device orin --json          machine readable
 *   node .ara/tools/heal.mjs --device orin --wait 90       seconds to wait for a healthcheck
 *
 * Three limits, and they stand in lib/heal.mjs and not only here: only containers
 * of the Arasul tree, never the bootloader or the system, and only what has a way
 * back. A container that runs but reports unhealthy would need a restart, and a
 * restart has no way back: that is a question, and the tool asks it instead of
 * acting.
 *
 * Every intervention lands in the device file under Prüfungen and in
 * interventions.json next to it, with the state before, the state after and the
 * command that takes it back. --undo reads exactly that entry.
 *
 * === deutsch ===
 *
 * Selbstheilung: am laufenden Gerät in Ordnung bringen, was nicht läuft, nur im
 * Verzeichnisbaum von Arasul, und jeden Schritt einzeln zurücknehmen.
 *
 *   node .ara/tools/heal.mjs --device orin                 feststellen, beheben, nachweisen, protokollieren
 *   node .ara/tools/heal.mjs --customer mueller --device werk2
 *   node .ara/tools/heal.mjs --device orin --plan          nur sagen, was es täte
 *   node .ara/tools/heal.mjs --device orin --list          die bisherigen Eingriffe
 *   node .ara/tools/heal.mjs --device orin --undo H-0003   den Stand vor H-0003 herstellen
 *   node .ara/tools/heal.mjs --device orin --json          maschinenlesbar
 *   node .ara/tools/heal.mjs --device orin --wait 90       Sekunden auf einen Healthcheck warten
 *
 * Drei Grenzen, und sie stehen in lib/heal.mjs und nicht nur hier: nur Container
 * des Arasul-Baums, nie der Bootloader oder das System, und nur, was einen Weg
 * zurück hat. Ein Container, der läuft und unhealthy meldet, bräuchte einen
 * Neustart, und der hat keinen Weg zurück: das ist eine Frage, und das Werkzeug
 * stellt sie, statt zu handeln.
 *
 * Jeder Eingriff landet in der Geräteakte unter Prüfungen und in
 * interventions.json daneben, mit Zustand davor, Zustand danach und dem Befehl,
 * der ihn zurücknimmt. --undo liest genau diesen Eintrag.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { t } from "./lib/i18n.mjs";
import { ROOT, fail, helpOnly, now, parseArgs, readDevice, sshArgs as sshArgsFrom } from "./lib/kit.mjs";
import {
  HEAL_PROBE,
  findFaults,
  ledgerEntry,
  nextId,
  parseHealProbe,
  planFor,
  reached,
  readVerify,
  recordLines,
} from "./lib/heal.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

if (!str(arg.customer) && !str(arg.device)) {
  console.log(
    t(
      [
        "Self-healing. Fix a device inside the Arasul tree, with a way back per step",
        "",
        "  --customer <name>   which customer. Without a customer devices/ applies",
        "  --device <name>     which device",
        "  --plan              only say what it would do, change nothing",
        "  --list              the interventions recorded so far",
        "  --undo <id>         restore the state before this intervention",
        "  --wait <seconds>    how long to wait for a healthcheck, 60 without an entry",
        "  --json              machine readable",
      ].join("\n"),
      [
        "Selbstheilung. Ein Gerät im Arasul-Baum in Ordnung bringen, mit Weg zurück je Schritt",
        "",
        "  --customer <name>   welcher Kunde. Ohne Kunden gilt devices/",
        "  --device <name>     welches Gerät",
        "  --plan              nur sagen, was es täte, nichts ändern",
        "  --list              die bisher protokollierten Eingriffe",
        "  --undo <id>         den Stand vor diesem Eingriff herstellen",
        "  --wait <sekunden>   wie lange auf einen Healthcheck gewartet wird, ohne Angabe 60",
        "  --json              maschinenlesbar",
      ].join("\n")
    )
  );
  process.exit(0);
}

let device;
try {
  device = readDevice(str(arg.customer), str(arg.device));
} catch (error) {
  fail(error.message);
}
const place = { device: device.device, customer: device.customer };
const placeText = device.customer ? `${device.customer}/${device.device}` : device.device;
const ledgerFile = join(device.path, "interventions.json");
const waitSeconds = Math.max(0, Number(str(arg.wait) ?? 60) || 0);

// --- Das Protokoll -----------------------------------------------------------

function readLedger() {
  if (!existsSync(ledgerFile)) return [];
  try {
    const list = JSON.parse(readFileSync(ledgerFile, "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLedger(list) {
  writeFileSync(ledgerFile, JSON.stringify(list, null, 2) + "\n");
}

/** Ein Eintrag in die Akte, unter Prüfungen, mit Zeit und Überschrift. */
function record(title, lines) {
  appendFileSync(device.file, `\n### ${now()} · ${title}\n${lines.join("\n")}\n`);
}

if (arg.list) {
  const ledger = readLedger();
  if (arg.json) {
    console.log(JSON.stringify({ device: placeText, interventions: ledger }, null, 2));
    process.exit(0);
  }
  console.log(t(`# Interventions on ${placeText}`, `# Eingriffe an ${placeText}`));
  console.log("");
  if (!ledger.length) {
    console.log(t("None recorded yet.", "Noch keiner protokolliert."));
    process.exit(0);
  }
  for (const e of ledger) {
    console.log(
      `- ${e.id} · ${e.time} · ${e.label} · ` +
        t(`result ${e.result}`, `Ergebnis ${e.result}`) +
        (e.undone ? t(` · taken back ${e.undone}`, ` · zurückgenommen ${e.undone}`) : "")
    );
  }
  process.exit(0);
}

// --- Die Verbindung ----------------------------------------------------------
//
// Die Verbindungsdaten kommen aus der Akte, wie bei remote.mjs. Ist das Ziel
// dieser Rechner selbst und SSH abgelehnt, läuft es lokal: so führt der
// Selbsttest das Werkzeug mit einer Attrappe von Docker, ohne ein Gerät.

let sshArgs;
let label;
try {
  ({ args: sshArgs, label } = sshArgsFrom(device.fields, { batch: true }));
} catch (error) {
  fail(error.message);
}
const isLocal = LOCAL_HOSTS.has(device.fields.address || device.fields.hostname || "");

let transport = null;
function run(command, { input } = {}) {
  if (transport === "local") {
    const r = spawnSync("sh", input ? ["-s"] : ["-c", command], { input, encoding: "utf8" });
    return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
  }
  const r = spawnSync("ssh", [...sshArgs, input ? "sh -s" : command], { input, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function connect() {
  const remote = spawnSync("ssh", [...sshArgs, "echo bereit"], { encoding: "utf8" });
  if (remote.status === 0 && /bereit/.test(remote.stdout)) return "ssh";
  if (isLocal) return "local";
  fail(
    t(
      `No connection to ${label} (${placeText}). Self-healing needs the device: ` +
        `node .ara/tools/remote.mjs --device ${device.device}${device.customer ? ` --customer ${device.customer}` : ""} --check`,
      `Keine Verbindung zu ${label} (${placeText}). Die Selbstheilung braucht das Gerät: ` +
        `node .ara/tools/remote.mjs --device ${device.device}${device.customer ? ` --customer ${device.customer}` : ""} --check`
    )
  );
}
transport = connect();

/** Wartet, bis der Nachweis steht oder die Zeit um ist. Ein Healthcheck braucht Sekunden. */
function verifyUntil(plan) {
  const started = Date.now();
  let check = readVerify(run(plan.verify).stdout);
  while (!check.settled && Date.now() - started < waitSeconds * 1000) {
    spawnSync("sleep", ["2"]);
    check = readVerify(run(plan.verify).stdout);
  }
  return check;
}

// --- Die Rücknahme -----------------------------------------------------------

if (str(arg.undo)) {
  const ledger = readLedger();
  const entry = ledger.find((e) => e.id === arg.undo);
  if (!entry) {
    fail(
      t(
        `There is no intervention ${arg.undo} on ${placeText}. --list shows which ones there are.`,
        `Einen Eingriff ${arg.undo} gibt es an ${placeText} nicht. --list zeigt, welche es gibt.`
      )
    );
  }
  if (entry.undone) {
    fail(t(`${entry.id} was already taken back on ${entry.undone}.`, `${entry.id} wurde schon am ${entry.undone} zurückgenommen.`));
  }
  (arg.json ? console.error : console.log)(t(`Taking back ${entry.id} on ${label}: ${entry.undo}`, `${entry.id} zurücknehmen an ${label}: ${entry.undo}`));
  const back = run(entry.undo);
  // Der Nachweis: derselbe Blick wie beim Eingriff, verglichen mit dem Zustand davor.
  const check = verifyUntil({ verify: entry.verify });
  const restored = back.status === 0 && check.status === entry.before.status;
  entry.undone = now();
  entry.restored = restored;
  entry.afterUndo = { status: check.status, health: check.health };
  writeLedger(ledger);
  const lines = t(
    [
      `Intervention ${entry.id} taken back: ${entry.undo}. Return code ${back.status}.`,
      `State before the intervention: ${entry.before.status}. State now: ${check.status || "unreadable"}.`,
      restored ? "The state before it is restored." : "The state before it was not reached, see above.",
    ],
    [
      `Eingriff ${entry.id} zurückgenommen: ${entry.undo}. Rückgabecode ${back.status}.`,
      `Zustand vor dem Eingriff: ${entry.before.status}. Zustand jetzt: ${check.status || "nicht lesbar"}.`,
      restored ? "Der Stand davor ist wiederhergestellt." : "Der Stand davor wurde nicht erreicht, siehe oben.",
    ]
  );
  record(t(`Way back ${entry.id}`, `Rücknahme ${entry.id}`), lines);
  if (arg.json) {
    console.log(JSON.stringify({ device: placeText, undone: entry, restored }, null, 2));
  } else {
    console.log(lines.join("\n"));
    console.log(t(`Recorded in ${relative(ROOT, device.file)}.`, `Protokolliert in ${relative(ROOT, device.file)}.`));
  }
  process.exit(restored ? 0 : 1);
}

// --- Feststellen -------------------------------------------------------------

const probe = run(null, { input: HEAL_PROBE });
const facts = parseHealProbe(probe.stdout);
if (facts.done !== "ja") {
  fail(
    t(
      `The reading script did not run through on ${label}.\n${(probe.stderr || "").trim()}`,
      `Das Prüfskript ist auf ${label} nicht durchgelaufen.\n${(probe.stderr || "").trim()}`
    )
  );
}
if (!facts.docker) {
  fail(
    t(
      `No Docker on ${label}, so nothing the self-healing could look after. Arasul runs in containers.`,
      `Kein Docker auf ${label}, also nichts, worum sich die Selbstheilung kümmern könnte. Arasul läuft in Containern.`
    )
  );
}
const { faults, outside } = findFaults(facts);
const plans = faults.map((fault) => ({ fault, plan: planFor(fault, facts.docker) }));

const out = [];
out.push(t(`# Self-healing ${placeText}`, `# Selbstheilung ${placeText}`), "");
out.push(
  t(
    `- Arasul tree: ${facts.tree.length ? facts.tree.join(", ") : "no folder found"}`,
    `- Arasul-Baum: ${facts.tree.length ? facts.tree.join(", ") : "kein Ordner gefunden"}`
  ),
  t(
    `- Containers: ${facts.container.length}, of which broken in the tree: ${faults.length}, broken outside: ${outside.length}`,
    `- Container: ${facts.container.length}, davon im Baum kaputt: ${faults.length}, außerhalb kaputt: ${outside.length}`
  )
);
for (const o of outside) {
  out.push(
    t(
      `- Outside the tree, stays as it is: ${o.name} (${o.state}${o.health ? `, ${o.health}` : ""})`,
      `- Außerhalb des Baums, bleibt liegen: ${o.name} (${o.state}${o.health ? `, ${o.health}` : ""})`
    )
  );
}

// --- Beheben -----------------------------------------------------------------

const done = [];
const questions = [];
const ledger = readLedger();

for (const { fault, plan } of plans) {
  if (!plan.ok) {
    const logs = arg.plan ? "" : run(plan.logs).stdout.trim();
    questions.push({ fault, reason: plan.reason, logs });
    continue;
  }
  if (arg.plan) {
    done.push({ fault, plan, result: "planned" });
    continue;
  }
  const id = nextId(ledger);
  // Bei --json gehört die Standardausgabe dem Bericht, der Fortschritt geht daneben.
  (arg.json ? console.error : console.log)(t(`${id}: ${plan.label} on ${label} ...`, `${id}: ${plan.label} an ${label} ...`));
  // Erst der Eintrag, dann der Nachweis: bricht der Lauf mittendrin ab, steht
  // der Eingriff trotzdem im Protokoll, und der Weg zurück mit ihm.
  const fix = run(plan.fix);
  const entry = ledgerEntry({ id, time: now(), fault, plan, result: fix.status === 0 ? "running" : "failed" });
  ledger.push(entry);
  writeLedger(ledger);

  const check = fix.status === 0 ? verifyUntil(plan) : { status: "", health: "" };
  entry.after = { status: check.status, health: check.health };
  entry.result = reached(check, plan.wanted) ? "fixed" : "failed";
  writeLedger(ledger);
  record(t(`Intervention ${id}`, `Eingriff ${id}`), recordLines(entry, place));

  if (entry.result === "fixed") {
    done.push({ fault, plan, result: "fixed", entry });
  } else {
    // Aufgegeben. Der Eingriff bleibt protokolliert und lässt sich zurücknehmen,
    // die Frage geht an den Menschen, mit dem, was der Container selbst sagt.
    const logs = run(plan.logs).stdout.trim();
    questions.push({
      fault,
      entry,
      reason: t(
        `${fault.name} was started (${id}) and does not stay up: ${check.status || "unreadable"}` +
          `${check.health ? ` (${check.health})` : ""}. The kit gives up here.`,
        `${fault.name} wurde gestartet (${id}) und bleibt nicht oben: ${check.status || "nicht lesbar"}` +
          `${check.health ? ` (${check.health})` : ""}. Das Kit gibt hier auf.`
      ),
      logs,
      stderr: (fix.stderr || "").trim(),
    });
  }
}

// --- Bericht -----------------------------------------------------------------

if (arg.json) {
  console.log(
    JSON.stringify(
      {
        device: placeText,
        transport,
        tree: facts.tree,
        containers: facts.container.length,
        outside: outside.map((o) => ({ name: o.name, state: o.state, health: o.health })),
        done: done.map((d) => ({ target: d.fault.name, label: d.plan.label, result: d.result, id: d.entry?.id || null })),
        questions: questions.map((q) => ({ target: q.fault.name, reason: q.reason, id: q.entry?.id || null, logs: q.logs })),
        plan: Boolean(arg.plan),
      },
      null,
      2
    )
  );
  process.exit(questions.length ? 1 : 0);
}

out.push("");
if (!faults.length) {
  out.push(t("Nothing to heal in the tree, every container of it runs.", "Nichts zu heilen im Baum, jeder Container darin läuft."));
}
if (done.length) {
  out.push(arg.plan ? t("## What it would do", "## Was es täte") : t("## Done", "## Erledigt"), "");
  for (const d of done) {
    out.push(
      arg.plan
        ? t(
            `- ${d.plan.label}: ${d.plan.fix}. Way back: ${d.plan.undo}. Nothing was changed.`,
            `- ${d.plan.label}: ${d.plan.fix}. Weg zurück: ${d.plan.undo}. Geändert wurde nichts.`
          )
        : t(
            `- ${d.entry.id}: ${d.plan.label}, now ${d.entry.after.status}${d.entry.after.health ? ` (${d.entry.after.health})` : ""}. ` +
              `Way back: node .ara/tools/heal.mjs --device ${device.device}${device.customer ? ` --customer ${device.customer}` : ""} --undo ${d.entry.id}`,
            `- ${d.entry.id}: ${d.plan.label}, jetzt ${d.entry.after.status}${d.entry.after.health ? ` (${d.entry.after.health})` : ""}. ` +
              `Weg zurück: node .ara/tools/heal.mjs --device ${device.device}${device.customer ? ` --customer ${device.customer}` : ""} --undo ${d.entry.id}`
          )
    );
  }
}
if (questions.length) {
  out.push("", t("## Where the kit gives up and asks", "## Wo das Kit aufgibt und fragt"), "");
  for (const q of questions) {
    out.push(`- ${q.reason}`);
    if (q.stderr) out.push(`  ${q.stderr.split("\n")[0]}`);
    if (q.logs) out.push(t("  Last lines of the container:", "  Letzte Zeilen des Containers:"), ...q.logs.split("\n").slice(-8).map((l) => `    ${l}`));
  }
  out.push(
    "",
    t(
      "Establish the cause along .ara/knowledge/diagnostics.md. What would come next is a restart or a change to a file, " +
        "and both need a confirmation with intent, target and way back.",
      "Ursache feststellen nach .ara/knowledge/diagnostics.de.md. Was als Nächstes käme, ist ein Neustart oder eine Änderung an einer Datei, " +
        "und beides braucht eine Bestätigung mit Absicht, Ziel und Weg zurück."
    )
  );
}
if (!arg.plan && (done.length || questions.some((q) => q.entry))) {
  out.push("", t(`Recorded in ${relative(ROOT, device.file)} and ${relative(ROOT, ledgerFile)}.`, `Protokolliert in ${relative(ROOT, device.file)} und ${relative(ROOT, ledgerFile)}.`));
}
console.log(out.join("\n"));
process.exit(questions.length ? 1 : 0);
