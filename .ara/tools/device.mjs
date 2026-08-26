#!/usr/bin/env node
/**
 * /device: Akte anlegen, SSH prüfen, Hardware und Betriebssystem erkennen, Urteil.
 *
 *   node .ara/tools/device.mjs --host localhost --name mac        erstes Mal: Akte und Prüfung
 *   node .ara/tools/device.mjs --host 10.0.0.5 --user arasul --name zentrale
 *   node .ara/tools/device.mjs --name mac                         Akte da: Zustand und nächste Schritte
 *   node .ara/tools/device.mjs --name mac --install docker,ollama Docker und Ollama aufsetzen (Linux)
 *   node .ara/tools/device.mjs                                    welche Akten es gibt
 *   node .ara/tools/device.mjs --name mac --json                  dasselbe als JSON
 *
 * Die Akte liegt unter devices/<name>/, in beiden Zweigen. Ein Kundengerät liegt
 * unter customers/<kunde>/devices/<name>/, dann kommt --customer dazu.
 *
 * Das Werkzeug liest auf dem Gerät nur. Es ändert erst mit --install etwas, und
 * das ist ein Eingriff, der vorher bestätigt gehört. Das Urteil folgt der Regel in
 * lib/device.mjs: Orin und Thor tragen Arasul, DGX Spark und andere NVIDIA-Rechner
 * sind angekündigt, alles andere wird vorgemerkt. Werte für das Gerät (Profil,
 * Modell, Engine) stehen weiter nur im Spiegel, nicht hier.
 *
 * Ist das Ziel dieser Rechner selbst (localhost) und SSH abgelehnt, prüft das
 * Werkzeug lokal und schreibt das so in die Akte. Für ein fremdes Gerät gibt es
 * diesen Umweg nicht.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join, relative } from "node:path";
import { PROBE, VERDICTS, judge, parseProbe, services } from "./lib/device.mjs";
import {
  ROOT,
  devicePath,
  ensureDir,
  fail,
  listCustomers,
  listDevices,
  now,
  parseArgs,
  readFrontmatter,
  today,
  writeFrontmatter,
} from "./lib/kit.mjs";

const STATE = join(ROOT, ".ara", "state.json");
const TEMPLATE = join(ROOT, ".ara", "templates", "device.md");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const INSTALLABLE = ["docker", "ollama"];

const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);
const customer = str(arg.customer);

// --- Merker -----------------------------------------------------------------

function readState() {
  try {
    return JSON.parse(readFileSync(STATE, "utf8"));
  } catch {
    return {};
  }
}

function writeState(changes) {
  writeFileSync(STATE, JSON.stringify({ ...readState(), ...changes }, null, 2) + "\n");
}

// --- Welche Akte -------------------------------------------------------------

function overview() {
  const lines = [];
  const own = listDevices(null);
  if (own.length) lines.push(`Geräte ohne Kunden (devices/): ${own.join(", ")}`);
  for (const c of listCustomers()) {
    const list = listDevices(c);
    if (list.length) lines.push(`Kunde ${c}: ${list.join(", ")}`);
  }
  return lines;
}

let name = str(arg.name);
if (!name) {
  const state = readState();
  const candidates = listDevices(customer);
  if (!customer && state.device && listDevices(state.customer || null).includes(state.device)) {
    name = state.device;
  } else if (candidates.length === 1) {
    name = candidates[0];
  } else {
    const lines = overview();
    if (arg.json) {
      console.log(JSON.stringify({ devices: listDevices(null), customers: Object.fromEntries(listCustomers().map((c) => [c, listDevices(c)])) }, null, 2));
      process.exit(0);
    }
    console.log(
      lines.length
        ? `Welches Gerät? ${lines.join(". ")}. Angeben mit --name <name>.`
        : "Noch keine Geräteakte. Beim ersten Mal: node .ara/tools/device.mjs --host <adresse> --name <name>"
    );
    process.exit(lines.length ? 1 : 0);
  }
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  fail(`Der Gerätename "${name}" passt nicht: klein, Ziffern und Bindestriche, sonst nichts.`);
}
if (customer && !existsSync(join(ROOT, "customers", customer))) {
  fail(`Den Kunden "${customer}" gibt es nicht. Erst /customer ${customer}.`);
}

const dir = devicePath(customer, name);
const file = join(dir, "device.md");
const place = customer ? `${customer}/${name}` : name;
const fresh = !existsSync(file);

// --- Verbindung -------------------------------------------------------------

const existing = fresh ? {} : readFrontmatter(file).fields;
const host = str(arg.host) || existing.address || existing.hostname;
if (!host) {
  fail(
    fresh
      ? `Beim ersten Mal brauche ich die Adresse: node .ara/tools/device.mjs --host <adresse> --name ${name}`
      : `In ${relative(ROOT, file)} steht keine Adresse. Nachreichen mit --host <adresse>.`
  );
}
const isLocal = LOCAL_HOSTS.has(host);
const user = str(arg.user) || existing.ssh_user || (isLocal ? userInfo().username : null);
if (!user) fail("Ich brauche den Anmeldenamen auf dem Gerät: --user <name>.");
const port = str(arg.port) || existing.ssh_port || "22";
const key = str(arg.key) || existing.ssh_key || "";

const sshArgs = ["-o", "ConnectTimeout=8", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", "-p", port];
if (key) {
  const keyPath = key.startsWith("/") ? key : join(homedir(), ".ssh", key);
  if (!existsSync(keyPath)) fail(`Der Schlüssel ${key} liegt nicht unter ${keyPath}.`);
  sshArgs.push("-i", keyPath);
}
sshArgs.push(`${user}@${host}`);
const label = `${user}@${host}:${port}`;

/** Führt das Prüfskript aus: über SSH, oder lokal, wenn das Ziel dieser Rechner ist. */
function probe() {
  const remote = spawnSync("ssh", [...sshArgs, "sh -s"], { input: PROBE, encoding: "utf8" });
  if (remote.status === 0 && /@done=ja/.test(remote.stdout)) {
    return { transport: "ssh", ssh: "ok", output: remote.stdout, message: "" };
  }
  const message = (remote.stderr || "").trim().split("\n").slice(0, 3).join(" ");
  if (isLocal) {
    const local = spawnSync("sh", ["-s"], { input: PROBE, encoding: "utf8" });
    return { transport: "local", ssh: "refused", output: local.stdout, message };
  }
  return { transport: "none", ssh: "refused", output: "", message };
}

const run = probe();
const facts = parseProbe(run.output);
const found = judge(facts);
const svc = services(facts);

// --- Optional: Docker und Ollama aufsetzen -----------------------------------

const install = str(arg.install)
  ? String(arg.install).split(",").map((s) => s.trim()).filter(Boolean)
  : [];
for (const what of install) {
  if (!INSTALLABLE.includes(what)) fail(`--install kennt nur ${INSTALLABLE.join(" und ")}, nicht "${what}".`);
}
const installed = [];
if (install.length) {
  if (run.transport === "none") fail("Ohne Verbindung wird nichts aufgesetzt.");
  if (!/linux/i.test(facts.uname || "")) {
    fail("Docker und Ollama setzt das Werkzeug nur auf Linux auf. Auf diesem System bleibt das Handarbeit.");
  }
  // Die Installationswege der Hersteller. Beide brauchen Root, also sudo mit
  // Passwort am Terminal, darum läuft das mit durchgereichter Ein- und Ausgabe.
  const steps = {
    docker: "curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker \"$(id -un)\"",
    ollama: "curl -fsSL https://ollama.com/install.sh | sh",
  };
  for (const what of install) {
    if ((what === "docker" && svc.docker.state !== "missing") || (what === "ollama" && svc.ollama.state !== "missing")) {
      console.log(`${what}: schon vorhanden, nichts zu tun.`);
      continue;
    }
    console.log(`\n${what} aufsetzen auf ${label} ...`);
    const step = run.transport === "ssh"
      ? spawnSync("ssh", ["-t", ...sshArgs, steps[what]], { stdio: "inherit" })
      : spawnSync("sh", ["-c", steps[what]], { stdio: "inherit" });
    installed.push({ what, ok: step.status === 0 });
    if (step.status !== 0) console.log(`${what}: Installation mit Rückgabecode ${step.status} beendet.`);
  }
  // Danach noch einmal hinsehen, damit die Akte den Zustand trägt, nicht die Absicht.
  const again = probe();
  Object.assign(facts, parseProbe(again.output));
  Object.assign(svc, services(facts));
}

// --- Akte -------------------------------------------------------------------

ensureDir(dir);
if (fresh) writeFileSync(file, readFileSync(TEMPLATE, "utf8"));
const known = run.transport !== "none";
const changes = {
  name,
  customer: customer || "",
  address: host,
  ssh_user: user,
  ssh_port: port,
  ssh: run.transport === "local" ? "local" : run.ssh,
  checked: now(),
};
if (key) changes.ssh_key = key;
if (known) {
  Object.assign(changes, {
    hardware: found.hardware,
    os: found.os,
    arch: found.arch,
    hostname: facts.hostname || existing.hostname || "",
    verdict: found.verdict,
    docker: svc.docker.state,
    ollama: svc.ollama.state,
    arasul: svc.arasul.state,
  });
  if (found.verdict !== "supported" && !existing.noted_on) changes.noted_on = today();
  if (!existing.status || existing.status === "planned") changes.status = "delivered";
}
writeFrontmatter(file, changes);

const entry = [
  `### ${now()} · ${run.transport === "ssh" ? `SSH ${label}` : run.transport === "local" ? `lokal, SSH ${label} abgelehnt` : `keine Verbindung zu ${label}`}`,
  known
    ? `Hardware: ${found.hardware}. System: ${found.os} (${found.arch}). ` +
      `Docker: ${svc.docker.text}. Ollama: ${svc.ollama.text}. Arasul: ${svc.arasul.text}. ` +
      `Urteil: ${found.verdictText} (${found.reason}).`
    : `Keine Verbindung. ${run.message || ""}`.trim(),
  ...installed.map((i) => `Aufgesetzt: ${i.what}, ${i.ok ? "Installation durchgelaufen" : "Installation abgebrochen"}.`),
].join("\n");
appendFileSync(file, `\n${entry}\n`);

writeState({ device: name, customer: customer || null });

// --- Nächste Schritte --------------------------------------------------------

const ARASUL_SENTENCE =
  "Mit Arasul bekäme dieses Gerät Anmeldung, Teststand und Live-Schaltung für Apps, " +
  "Freigaben und Flows, dazu Sicherung und Wartung aus einer Hand.";

function nextSteps() {
  const steps = [];
  if (run.transport === "none") {
    steps.push(
      `Erst der Zugang: node .ara/tools/find-device.mjs --host ${host} zeigt, ob das Gerät antwortet. ` +
        "Schlüssel ausrollen nach .ara/knowledge/remote-access.md, dann noch einmal prüfen."
    );
    return steps;
  }
  if (run.transport === "local") {
    steps.push(
      "SSH auf diesem Rechner ist aus. Geprüft wurde lokal, das reicht für die Akte. " +
        "Für den Fernzugriff durch das Kit muss Remote Login an sein."
    );
  }
  if (found.verdict === "unsupported") {
    steps.push(`Vorgemerkt in der Akte seit ${changes.noted_on || existing.noted_on}. Ohne Arasul endet es hier. ${ARASUL_SENTENCE}`);
  } else if (found.verdict === "soon") {
    steps.push(
      `Vorgemerkt in der Akte seit ${changes.noted_on || existing.noted_on}. Sobald der Spiegel ein Profil für diese ` +
        "Hardware führt (node .ara/tools/mirror.mjs), geht es weiter. Bis dahin: Zugang härten nach " +
        ".ara/knowledge/remote-access.md."
    );
  } else if (svc.arasul.state === "found") {
    steps.push(`Arasul ist offenbar da. Betreuung über /maintain ${place}, Produktstand aus dem Spiegel.`);
  } else {
    steps.push(
      "Arasul installieren: Spiegel holen (node .ara/tools/mirror.mjs), Laufzettel anlegen " +
        `(node .ara/tools/runsheet.mjs --create${customer ? ` --customer ${customer}` : ""} --device ${name}), ` +
        "Verfahren in .ara/knowledge/device.md. Die Installation mit Token über /device kommt in einer späteren Kit-Fassung."
    );
  }
  const missing = INSTALLABLE.filter((w) => svc[w].state === "missing");
  if (missing.length && /linux/i.test(facts.uname || "")) {
    steps.push(
      `Optional, nach Bestätigung: node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} ` +
        `--install ${missing.join(",")}`
    );
  }
  return steps;
}

const steps = nextSteps();

if (arg.json) {
  console.log(
    JSON.stringify(
      {
        name,
        customer,
        file: relative(ROOT, file),
        fresh,
        host,
        user,
        port,
        transport: run.transport,
        ssh: run.ssh,
        ...found,
        docker: svc.docker,
        ollama: svc.ollama,
        arasul: svc.arasul,
        installed,
        next: steps,
      },
      null,
      2
    )
  );
  process.exit(run.transport === "none" ? 1 : 0);
}

const lines = [
  `# ${place}${fresh ? " (Akte angelegt)" : ""}`,
  "",
  `- Akte: ${relative(ROOT, file)}`,
  `- Verbindung: ${run.transport === "ssh" ? `SSH steht, ${label}` : run.transport === "local" ? `SSH ${label} abgelehnt, lokal geprüft` : `keine, ${label}`}` +
    (run.message && run.transport !== "ssh" ? ` (${run.message})` : ""),
];
if (known) {
  lines.push(
    `- Hardware: ${found.hardware}${found.gpu ? `, Grafik ${found.gpu}` : ""}`,
    `- System: ${found.os} (${found.arch})` +
      (found.memoryGb ? `, ${found.memoryGb} GB Arbeitsspeicher` : "") +
      (found.diskFreeGb !== null ? `, ${found.diskFreeGb} GB frei` : ""),
    `- Docker: ${svc.docker.text}`,
    `- Ollama: ${svc.ollama.text}`,
    `- Arasul: ${svc.arasul.text}`,
    "",
    `**Urteil: ${VERDICTS[found.verdict]}.** ${found.reason}.`
  );
}
lines.push("", "## Nächste Schritte", "", ...steps.map((s) => `- ${s}`));
console.log(lines.join("\n"));
process.exit(run.transport === "none" ? 1 : 0);
