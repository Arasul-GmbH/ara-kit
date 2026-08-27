#!/usr/bin/env node
/**
 * /device: Akte anlegen, SSH prüfen, Hardware und Betriebssystem erkennen, Urteil.
 *
 *   node .ara/tools/device.mjs --host localhost --name mac        erstes Mal: Akte und Prüfung
 *   node .ara/tools/device.mjs --host 10.0.0.5 --user arasul --name zentrale
 *   node .ara/tools/device.mjs --name mac                         Akte da: Zustand und nächste Schritte
 *   node .ara/tools/device.mjs --name mac --install docker,ollama Docker und Ollama aufsetzen (Linux)
 *   node .ara/tools/device.mjs --name orin --install arasul       Arasul installieren (Token nötig)
 *   node .ara/tools/device.mjs --name orin --deploy-key           Kit-Schlüssel am Gerät anlegen
 *   node .ara/tools/device.mjs                                    welche Akten es gibt
 *   node .ara/tools/device.mjs --name mac --json                  dasselbe als JSON
 *
 * Die Akte liegt unter devices/<name>/, in beiden Zweigen. Ein Kundengerät liegt
 * unter customers/<kunde>/devices/<name>/, dann kommt --customer dazu.
 *
 * Das Werkzeug liest auf dem Gerät nur. Es ändert erst mit --install oder
 * --deploy-key etwas, und das ist ein Eingriff, der vorher bestätigt gehört. Das
 * Urteil folgt der Regel in lib/device.mjs: Orin und Thor tragen Arasul, DGX Spark
 * und andere NVIDIA-Rechner sind angekündigt, alles andere wird vorgemerkt. Werte
 * für das Gerät (Profil, Modell, Engine) stehen weiter nur im Spiegel, nicht hier.
 *
 * Zwei Wege führen zu einem Gerät mit Arasul, und das Werkzeug kennt beide: eines,
 * auf dem die Plattform schon läuft, braucht nur noch den Kit-Schlüssel
 * (--deploy-key); eines ohne bekommt sie mit --install arasul. Wie das abläuft,
 * steht in lib/install.mjs.
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
import { hasSecret, setSecret } from "./lib/secrets.mjs";
import { TARGET, createKey, fetchMirror, installerEntry, runRemote, scrub, ship } from "./lib/install.mjs";

const STATE = join(ROOT, ".ara", "state.json");
const TEMPLATE = join(ROOT, ".ara", "templates", "device.md");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const INSTALLABLE = ["docker", "ollama", "arasul"];
/** Was das Prüfskript als Dienst meldet und was deshalb "fehlt" heißen kann. */
const SERVICES = ["docker", "ollama"];

/**
 * Die Token-Frage stellt sich genau hier und sonst nirgends: beim Onboarding
 * gibt es nichts zu installieren, und ohne Installation braucht das Kit kein
 * Token. Es ist eine Schranke vor dem Download, keine Lizenzprüfung. Am Gerät
 * prüft Arasul kein Token, und das Kit trägt auch keines dorthin.
 */
const TOKEN_QUESTION =
  "Für den Installer braucht es ein Token aus dem Partnerportal.\n" +
  "Jeder Partner bekommt dort fünf Download-Token kostenlos, weitere auf Nachfrage per Mail.\n" +
  "Es ist eine Schranke vor dem Download, keine Lizenzprüfung: am Gerät prüft Arasul kein Token.\n" +
  "Hinterlegen mit: node .ara/tools/secrets.mjs --set ARASUL_TOKEN";

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

const wanted = str(arg.install)
  ? String(arg.install).split(",").map((s) => s.trim()).filter(Boolean)
  : [];
for (const what of wanted) {
  if (!INSTALLABLE.includes(what)) fail(`--install kennt nur ${INSTALLABLE.join(", ")}, nicht "${what}".`);
}
const wantsArasul = wanted.includes("arasul");
const install = wanted.filter((what) => what !== "arasul");
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

// --- Arasul installieren -----------------------------------------------------

/**
 * Der zweite Weg zu einem Gerät mit Arasul: die Plattform ist noch nicht drauf.
 *
 * Vier Halte, bevor irgendetwas passiert: eine Verbindung, ein unterstütztes
 * Gerät, Docker, ein Token. Fehlt eines davon, hört das Werkzeug auf und sagt
 * warum, statt eine halbe Installation zu hinterlassen.
 */
async function installArasul() {
  if (run.transport === "none") fail("Ohne Verbindung wird nichts installiert.");
  if (found.verdict !== "supported") {
    fail(
      `Auf diesem Gerät läuft Arasul nicht: ${found.reason}. Urteil: ${found.verdictText}.\n` +
        "Vorgemerkt ist es in der Akte, installiert wird nichts."
    );
  }
  if (svc.arasul.state === "found") {
    fail(
      `Auf ${place} sind schon Spuren von Arasul: ${svc.arasul.text}.\n` +
        "Eine zweite Installation darüber wäre kein Aufsetzen, sondern ein Update, und das ist ein anderer Weg.\n" +
        `Wenn nur der Kit-Schlüssel fehlt: node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} --deploy-key`
    );
  }
  if (svc.docker.state === "missing") {
    fail(
      "Ohne Docker kein Arasul, die Plattform läuft in Containern.\n" +
        `Erst: node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} --install docker`
    );
  }
  if (!hasSecret("ARASUL_TOKEN")) fail(TOKEN_QUESTION);

  console.log("Installer holen, mit dem Token aus dem Partnerportal. Der Spiegel entsteht genau jetzt.");
  const fetched = fetchMirror();
  if (!fetched.ok) fail(`Der Installer ließ sich nicht holen.\n${fetched.message}`);
  console.log(fetched.message);

  const entry = installerEntry();
  if (!entry) {
    fail(
      "Das geholte Artefakt nennt keinen Weg, sich zu installieren.\n" +
        "Das Kit rät hier nicht. Sieh in .ara/mirror/ nach, was mitgeliefert wurde, und melde es ans Produktteam."
    );
  }

  console.log(`Artefakt an ${label} schieben ...`);
  const shipped = await ship(sshArgs, run.transport);
  if (!shipped.ok) fail(`Das Artefakt kam nicht am Gerät an.\n${shipped.message}`);

  console.log(`\nInstaller läuft auf dem Gerät: ${entry}. Das dauert und will mitgelesen werden.\n`);
  const step = runRemote(sshArgs, run.transport, `cd ${TARGET} && ${entry}`, { interactive: true });
  const state = fetched.state || {};
  return {
    ok: step.status === 0,
    status: step.status,
    entry,
    version: state.version ?? null,
    source: state.source ?? null,
    fetched: state.fetched ?? null,
  };
}

let arasul = null;
if (wantsArasul) {
  arasul = await installArasul();
  if (!arasul.ok) {
    console.log(
      `\nDer Installer ist mit Rückgabecode ${arasul.status} ausgestiegen. Nichts wird schöngeredet:\n` +
        "lies die letzte Ausgabe, behebe die Ursache und ruf denselben Befehl noch einmal auf."
    );
  }
  const again = probe();
  Object.assign(facts, parseProbe(again.output));
  Object.assign(svc, services(facts));
}

// --- Der Kit-Schlüssel für den Deploy ----------------------------------------

/**
 * Er entsteht am Gerät und erscheint dort genau einmal. Das Kit legt ihn in die
 * Geheimnis-Ablage und schreibt nur den Namen des Eintrags in die Akte: ein
 * Schlüssel im Klartext in einer Datei wäre einer, der mit ihr mitwandert. Im
 * Portal steht er nie, er gehört dem Administrator des Geräts.
 */
function makeDeployKey() {
  if (run.transport === "none") return { ok: false, message: "Ohne Verbindung gibt es keinen Schlüssel." };
  const company = readFrontmatter(join(ROOT, "business", "company.md")).fields;
  const keyName = `Ara-Kit ${company.name || company.company || "Partner"}`;
  const made = createKey(sshArgs, run.transport, keyName);
  if (!made.ok) return made;
  const ref = `ARASUL_KEY_${(customer ? `${customer}_${name}` : name).toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  try {
    setSecret(ref, made.key);
  } catch (error) {
    return { ok: false, message: `Der Schlüssel ließ sich nicht ablegen: ${error.message}` };
  }
  return { ok: true, ref, label: keyName, script: made.script };
}

let deployKey = null;
if (arg["deploy-key"] || (arasul && arasul.ok)) {
  deployKey = makeDeployKey();
  console.log(
    deployKey.ok
      ? `\nKit-Schlüssel angelegt als "${deployKey.label}" und hinterlegt unter ${deployKey.ref}. ` +
          "Sein Klartext wird nicht angezeigt und steht in keiner Datei des Kits."
      : `\nKein Kit-Schlüssel: ${scrub(deployKey.message)}`
  );
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
// Der Schlüssel selbst liegt in der Geheimnis-Ablage, die Akte trägt nur seinen Namen.
if (deployKey?.ok) changes.api_key_ref = deployKey.ref;
if (arasul?.ok) changes.status = "installing";
writeFrontmatter(file, changes);

const entry = [
  `### ${now()} · ${run.transport === "ssh" ? `SSH ${label}` : run.transport === "local" ? `lokal, SSH ${label} abgelehnt` : `keine Verbindung zu ${label}`}`,
  known
    ? `Hardware: ${found.hardware}. System: ${found.os} (${found.arch}). ` +
      `Docker: ${svc.docker.text}. Ollama: ${svc.ollama.text}. Arasul: ${svc.arasul.text}. ` +
      `Urteil: ${found.verdictText} (${found.reason}).`
    : `Keine Verbindung. ${run.message || ""}`.trim(),
  ...installed.map((i) => `Aufgesetzt: ${i.what}, ${i.ok ? "Installation durchgelaufen" : "Installation abgebrochen"}.`),
  ...(arasul
    ? [
        `Arasul installiert: ${arasul.ok ? "Installer durchgelaufen" : `Installer abgebrochen, Rückgabecode ${arasul.status}`}. ` +
          `Artefakt vom ${arasul.fetched || "unbekannt"}, Quelle ${arasul.source || "unbekannt"}, ` +
          `Fassung ${arasul.version || "unbekannt"}. Aufruf am Gerät: ${arasul.entry}.`,
      ]
    : []),
  ...(deployKey
    ? [
        deployKey.ok
          ? `Kit-Schlüssel angelegt (${deployKey.label}), Bereich app:deploy, hinterlegt unter ${deployKey.ref}. Klartext nur am Gerät, einmalig.`
          : `Kit-Schlüssel nicht angelegt: ${scrub(deployKey.message)}`,
      ]
    : []),
].join("\n");
appendFileSync(file, `\n${entry}\n`);

writeState({ device: name, customer: customer || null });

// --- Nächste Schritte --------------------------------------------------------

const ARASUL_SENTENCE =
  "Mit Arasul bekäme dieses Gerät Anmeldung, Teststand und Live-Schaltung für Apps, " +
  "Freigaben und Flows, dazu Sicherung und Wartung aus einer Hand.";

const keyRef = deployKey?.ok ? deployKey.ref : existing.api_key_ref || "";
const where = `${customer ? `--customer ${customer} ` : ""}--device ${name}`;

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
    // Das Gerät läuft schon. Was jetzt fehlt, ist der Schlüssel, mit dem das Kit
    // Apps darauf rollt, und danach der Kontrakt: er sagt, ob beide zueinander passen.
    if (!keyRef) {
      steps.push(
        "Arasul ist da. Damit das Kit Apps darauf rollen kann, braucht es einen Kit-Schlüssel vom Gerät: " +
          `node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} --deploy-key`
      );
    } else {
      steps.push(
        `Arasul ist da und der Kit-Schlüssel liegt unter ${keyRef}. Passt das Kit zu diesem Gerät? ` +
          `node .ara/tools/app.mjs ${where} --contract`
      );
      steps.push(`Laufender Betrieb: /maintain ${place}.`);
    }
  } else {
    steps.push(
      `Arasul installieren: node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} --install arasul. ` +
        "Das holt den Installer mit dem Token aus dem Portal (fünf je Partner kostenlos), schiebt ihn auf das Gerät " +
        "und legt danach den Kit-Schlüssel an. Vorher Laufzettel anlegen: " +
        `node .ara/tools/runsheet.mjs --create${customer ? ` --customer ${customer}` : ""} --device ${name}. ` +
        "Verfahren in .ara/knowledge/device.md."
    );
  }
  const missing = SERVICES.filter((w) => svc[w].state === "missing");
  if (missing.length && /linux/i.test(facts.uname || "")) {
    steps.push(
      `Optional, nach Bestätigung: node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} ` +
        `--install ${missing.join(",")}`
    );
  }
  return steps;
}

const steps = nextSteps();

// Ein Rückgabecode sagt, ob das gelungen ist, worum gebeten wurde. Eine
// abgebrochene Installation und ein Schlüssel, den es nicht gibt, sind kein Erfolg.
const code = run.transport === "none" || (arasul && !arasul.ok) || (deployKey && !deployKey.ok) ? 1 : 0;

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
        // Nie der Wert, nur ob und unter welchem Namen er liegt.
        api_key_ref: keyRef || null,
        arasul_install: arasul ? { ok: arasul.ok, version: arasul.version, source: arasul.source } : null,
        deploy_key: deployKey ? { ok: deployKey.ok, ref: deployKey.ref || null } : null,
        next: steps,
      },
      null,
      2
    )
  );
  process.exit(code);
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
    `- Kit-Schlüssel: ${keyRef ? `hinterlegt unter ${keyRef}` : "keiner"}`,
    "",
    `**Urteil: ${VERDICTS[found.verdict]}.** ${found.reason}.`
  );
}
lines.push("", "## Nächste Schritte", "", ...steps.map((s) => `- ${s}`));
console.log(lines.join("\n"));
process.exit(code);
