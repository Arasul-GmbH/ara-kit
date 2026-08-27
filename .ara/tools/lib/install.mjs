/**
 * Arasul auf ein Gerät bringen, und den Schlüssel holen, mit dem das Kit
 * danach Apps darauf rollt.
 *
 * Der Weg in drei Schritten, und jeder hat einen Grund:
 *
 * 1. **Der Spiegel ist das Artefakt.** `mirror.mjs` holt es mit dem Token aus
 *    dem Portal über `arasul.de/api/download` und legt es nach `.ara/mirror/`,
 *    mit Stand und Quelle in `STATE.json`. Genau hier entsteht der Spiegel und
 *    sonst nirgends.
 * 2. **Der Installer läuft am Gerät.** Das Artefakt geht über die bestehende
 *    SSH-Verbindung dorthin. Das Token bleibt auf dem Rechner des Partners: es
 *    wird zum Herunterladen gebraucht, nicht zum Installieren, und was das
 *    Gerät nie gesehen hat, kann von dort auch nicht abfließen.
 * 3. **Der Kit-Schlüssel entsteht am Gerät.** Er trägt den Bereich `app:deploy`,
 *    erscheint genau einmal und liegt danach in der Geheimnis-Ablage des Kits.
 *    Die Geräteakte trägt nur seinen Namen. Im Portal steht er nie.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./kit.mjs";

const MIRROR = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");

/** Wohin das Artefakt am Gerät ausgepackt wird. */
export const TARGET = '"$HOME/arasul"';

/**
 * Der einzige Produktwert, der im Kit steht, und er steht nur hier.
 *
 * Das Artefakt sagt heute nicht selbst, wie es installiert wird. Bis es das
 * tut (Jet-Phase C10, Auslieferung), nimmt das Kit denselben Einstiegspunkt,
 * den die Auslieferung der Website nimmt (`arasul.de/api/install`): eine
 * ausführbare Datei `arasul` in der Wurzel des Artefakts, gerufen mit
 * `bootstrap`. Findet das Kit sie nicht, rät es nicht, sondern hört auf.
 */
const ENTRY = { file: "arasul", command: "./arasul bootstrap" };

/** Der Name der Datei, die am Gerät den Kit-Schlüssel ausstellt (Jet-Phase C5). */
const KEY_SCRIPT = "kit-schluessel.sh";

/** Nichts, was wie ein Schlüssel aussieht, geht in eine Ausgabe oder ein Protokoll. */
export function scrub(text) {
  return String(text || "").replace(/\baras_[A-Za-z0-9_-]{4,}/g, "aras_…");
}

// --- Der Spiegel -------------------------------------------------------------

export function mirrorState() {
  const file = join(MIRROR, "STATE.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Holt das Artefakt. Der Aufruf geht über `mirror.mjs`, damit das Token nur an
 * einer einzigen Stelle im Kit gelesen wird und nirgends durch einen zweiten
 * Prozess wandert.
 */
export function fetchMirror() {
  const run = spawnSync("node", [join(ROOT, ".ara", "tools", "mirror.mjs"), "--refresh"], {
    encoding: "utf8",
  });
  const output = `${run.stdout || ""}${run.stderr || ""}`.trim();
  if (run.status !== 0) return { ok: false, message: output };
  return { ok: true, message: output, state: mirrorState() };
}

/** Sagt das geholte Artefakt, wie es installiert wird? */
export function installerEntry() {
  if (!existsSync(join(MIRROR, ENTRY.file))) return null;
  return ENTRY.command;
}

// --- Am Gerät ----------------------------------------------------------------

/**
 * Ein Befehl am Gerät. `interactive` reicht Ein- und Ausgabe durch, damit der
 * Installer nach dem sudo-Passwort fragen kann und der Mensch mitliest.
 */
export function runRemote(sshArgs, transport, command, { interactive = false } = {}) {
  const options = interactive ? { stdio: "inherit" } : { encoding: "utf8" };
  const run =
    transport === "ssh"
      ? spawnSync("ssh", [...(interactive ? ["-t"] : []), ...sshArgs, command], options)
      : spawnSync("sh", ["-c", command], options);
  return { status: run.status, stdout: run.stdout || "", stderr: run.stderr || "" };
}

/** Schiebt das Artefakt an das Gerät und packt es dort aus. */
export async function ship(sshArgs, transport, target = TARGET) {
  if (transport !== "ssh") {
    const run = spawnSync("sh", ["-c", `mkdir -p ${target} && tar -czf - -C '${MIRROR}' . | tar -xzf - -C ${target}`], {
      encoding: "utf8",
    });
    return { ok: run.status === 0, message: (run.stderr || "").trim() };
  }
  return new Promise((done) => {
    const pack = spawn("tar", ["-czf", "-", "-C", MIRROR, "."], { stdio: ["ignore", "pipe", "pipe"] });
    const push = spawn("ssh", [...sshArgs, `mkdir -p ${target} && tar -xzf - -C ${target}`], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let message = "";
    pack.stderr.on("data", (d) => (message += d));
    push.stderr.on("data", (d) => (message += d));
    pack.stdout.pipe(push.stdin);
    let offen = 2;
    let failed = false;
    const fertig = (code) => {
      if (code !== 0) failed = true;
      if (--offen === 0) done({ ok: !failed, message: message.trim() });
    };
    pack.on("close", fertig);
    push.on("close", fertig);
    pack.on("error", (error) => ((message += error.message), fertig(1)));
    push.on("error", (error) => ((message += error.message), fertig(1)));
  });
}

/**
 * Legt am Gerät einen Kit-Schlüssel an und gibt ihn genau einmal zurück.
 *
 * Gesucht wird die Datei, nicht ihr Pfad: wo das Jet-Repo am Gerät liegt,
 * hängt davon ab, wie installiert wurde. Die Ausgabe wird nicht ausgegeben und
 * nicht protokolliert, sie enthält den Schlüssel im Klartext.
 */
export function createKey(sshArgs, transport, name) {
  const find = runRemote(
    sshArgs,
    transport,
    // Nur unter den Orten, an denen die Plattform liegen kann. Ein find über das
    // ganze Benutzerverzeichnis wäre auf einem vollen Gerät minutenlang unterwegs.
    `for d in "$HOME/arasul" /opt/arasul /arasul; do ` +
      `[ -d "$d" ] && find "$d" -maxdepth 5 -name ${KEY_SCRIPT} -type f 2>/dev/null | head -1; ` +
      `done | head -1`
  );
  const script = (find.stdout || "").trim().split("\n")[0];
  if (!script) {
    return {
      ok: false,
      message:
        `Am Gerät ist kein ${KEY_SCRIPT} zu finden. Es gehört zur Plattform: entweder läuft dort ` +
        "kein Arasul, oder die Fassung ist älter als der Deploy über die Schnittstelle.",
    };
  }
  const run = runRemote(sshArgs, transport, `bash ${JSON.stringify(script)} anlegen ${JSON.stringify(name)}`);
  if (run.status !== 0) {
    return { ok: false, message: scrub(`${run.stdout}\n${run.stderr}`.trim()) || "Das Gerät hat keinen Schlüssel ausgestellt." };
  }
  // Der Klartext steht auf der Zeile mit dem Wort Schlüssel, der Präfix auf der
  // darunter. Ohne die Beschriftung gilt der längere von beiden: ein Präfix ist
  // per Bauart kürzer als der Schlüssel, zu dem er gehört.
  const tokens = [...String(run.stdout).matchAll(/\baras_[A-Za-z0-9_-]{4,}/g)].map((m) => m[0]);
  if (!tokens.length) return { ok: false, message: "Die Antwort des Geräts enthält keinen Schlüssel." };
  const labelled = String(run.stdout)
    .split("\n")
    .find((line) => /schl(ü|ue)ssel/i.test(line) && /\baras_/.test(line));
  const key = labelled
    ? labelled.match(/\baras_[A-Za-z0-9_-]{4,}/)[0]
    : tokens.sort((a, b) => b.length - a.length)[0];
  return { ok: true, key, script };
}
