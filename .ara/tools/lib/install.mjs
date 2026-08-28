/**
 * Arasul auf ein Gerät bringen, und den Schlüssel holen, mit dem das Kit
 * danach Apps darauf rollt.
 *
 * Der Weg in vier Schritten, und jeder hat einen Grund:
 *
 * 1. **Der Spiegel ist das Artefakt.** `mirror.mjs` holt es mit dem Token aus
 *    dem Portal über `arasul.de/api/download` und legt es nach `.ara/mirror/`,
 *    mit Stand und Quelle in `STATE.json`. Genau hier entsteht der Spiegel und
 *    sonst nirgends.
 * 2. **Der Installer läuft am Gerät.** Das Artefakt geht über die bestehende
 *    SSH-Verbindung dorthin, in einen Ordner mit der Fassung im Namen. Das Token
 *    bleibt auf dem Rechner des Partners: es wird zum Herunterladen gebraucht,
 *    nicht zum Installieren, und was das Gerät nie gesehen hat, kann von dort
 *    auch nicht abfließen.
 * 3. **Wie er heißt, sagt das Artefakt selbst**, in `arasul-release.json`.
 *    Gerufen wird er mit Startpasswort und Netzname, denn nur dabei entstehen
 *    Netzname, Fassung, Startpasswort und die Erstausgabe am Gerät.
 * 4. **Der Kit-Schlüssel entsteht am Gerät.** Er trägt den Bereich `app:deploy`,
 *    erscheint genau einmal und liegt danach in der Geheimnis-Ablage des Kits.
 *    Die Geräteakte trägt nur seinen Namen. Im Portal steht er nie.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./kit.mjs";
import { t } from "./i18n.mjs";

/**
 * Wo der Spiegel liegt. Als Funktion und nicht als Konstante, damit ein Lauf
 * ihn umlenken kann (ARA_MIRROR), ohne einen echten Spiegel zu überschreiben.
 */
function mirrorDir() {
  return process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
}

/**
 * Wohin das Artefakt am Gerät ausgepackt wird.
 *
 * **Nicht nach `$HOME/arasul`.** Genau diesen Ordner wertet die Spurensuche des
 * Kits als Hinweis auf eine vorhandene Plattform (`lib/device.mjs`). Lag das
 * Artefakt dort, hielt der nächste Lauf das eigene Paket für eine Installation
 * und verweigerte die Arbeit: der Fremdtest am 28.08.2026 kam auf einem frisch
 * zurückgesetzten Gerät nicht mehr weiter, weil das Kit sich selbst gefunden
 * hatte. Der Ordner trägt darum die Fassung im Namen, und das hat einen zweiten
 * Nutzen: zwei Stände liegen nebeneinander, und man sieht, womit installiert
 * wurde.
 */
export function installTarget(version) {
  const clean = String(version || "").trim().replace(/[^A-Za-z0-9._-]/g, "-");
  return `"$HOME/arasul-${clean || "installer"}"`;
}

/**
 * Die Datei, in der das Artefakt selbst sagt, wie es installiert wird.
 *
 * Der Einstiegspunkt steht **dort** und nicht hier: das Kit liest den Namen aus
 * dieser Datei, prüft, dass es die genannte Datei im Artefakt wirklich gibt,
 * und hört sonst auf. Bis zum 28.08.2026 rief es stattdessen einen Namen auf,
 * den es auswendig kannte, und der war falsch: der Installer legt Netzname,
 * Fassung, Startpasswort und die Erstausgabe an, und nichts davon entstand.
 */
const RELEASE_FILE = "arasul-release.json";

/**
 * Unter welchen Feldnamen der Einstiegspunkt in `arasul-release.json` stehen
 * kann, und die zwei Schalter, mit denen er gerufen wird.
 *
 * Das ist die eine Stelle im Kit, an der etwas über die Form des Artefakts
 * steht, und es ist bewusst wenig: der Dateiname kommt aus der Datei, nur der
 * Weg dorthin steht hier. Findet das Kit kein Feld, das es kennt, rät es nicht,
 * sondern sagt, was es gesucht hat.
 */
const ENTRY_FIELDS = [
  "einstiegspunkt",
  "einstieg",
  "entrypoint",
  "entry",
  "installer",
  "install",
  "installation",
  "skript",
  "script",
  "datei",
  "file",
];

/**
 * Unter welchen Feldnamen das Artefakt seine eigene Fassung nennt.
 *
 * Bis zum 28.08.2026 las das Kit die Fassung nur aus einer Datei `VERSION`.
 * Das Artefakt bringt keine mit, also stand danach überall „Fassung unbekannt":
 * im Spiegel, in der Geräteakte und im Ordnernamen am Gerät. Die Zahl lag die
 * ganze Zeit in `arasul-release.json`, direkt neben dem Einstiegspunkt.
 */
const VERSION_FIELDS = ["fassung", "version", "produktversion", "stand", "release"];
const OPTION_PASSWORD = "--passwort";
const OPTION_NAME = "--name";

/** Der Name der Datei, die am Gerät den Kit-Schlüssel ausstellt (Jet-Phase C5). */
const KEY_SCRIPT = "kit-schluessel.sh";

/**
 * Beim Packen bleiben die Beiwerkdateien von macOS draußen.
 *
 * `COPYFILE_DISABLE=1` hält `tar` davon ab, die erweiterten Attribute einer
 * Datei als zweite Datei `._name` mitzuschreiben. `--exclude` fängt die, die
 * schon auf der Platte liegen. Am 28.08.2026 kamen so 1124 Dateien `._*` mit
 * dem Artefakt an das Gerät, und Traefik stieg an `dynamic/._middlewares.yml`
 * aus: eine Datei, die niemand geschrieben hat, hielt die ganze Installation an.
 */
export const APPLEDOUBLE = "._*";
export const packEnv = () => ({ ...process.env, COPYFILE_DISABLE: "1" });

/**
 * Nichts, was wie ein Schlüssel oder ein Passwort aussieht, geht in eine
 * Ausgabe oder ein Protokoll. `--passwort` steht im Aufruf des Installers, und
 * der Aufruf wird angezeigt, damit der Mensch mitliest.
 *
 * `secrets` sind Werte, die dieser Lauf selbst kennt: das gewürfelte
 * Startpasswort steht in keiner erkennbaren Form, es sieht aus wie beliebiger
 * Text. Wer es hier hineingibt, bekommt es auch dann maskiert, wenn der
 * Installer es allein auf eine Zeile schreibt.
 */
export function scrub(text, secrets = []) {
  let out = String(text || "")
    .replace(/\baras_[A-Za-z0-9_-]{4,}/g, "aras_…")
    .replace(new RegExp(`(${OPTION_PASSWORD}\\s+)('[^']*'|"[^"]*"|\\S+)`, "g"), "$1…");
  for (const secret of secrets) {
    if (typeof secret !== "string" || secret.length < 4) continue;
    out = out.split(secret).join("…");
  }
  return out;
}

/**
 * Ein Strom, der mitgelesen und dabei maskiert wird.
 *
 * Der Fremdtest am 28.08.2026 sah den Kit-Schlüssel im Klartext auf dem
 * Bildschirm: der Installer druckt ihn in seine Erstausgabe, und das Kit reichte
 * diese Ausgabe unverändert durch. Danach schrieb es „Klartext wird nicht
 * angezeigt", und das stimmte in dem Moment schon nicht mehr.
 *
 * Maskiert wird zeilenweise, denn ein Geheimnis kann über zwei Stücke des Stroms
 * verteilt ankommen. Ein angefangenes Stück wird trotzdem sofort gezeigt, solange
 * daraus kein Geheimnis mehr werden kann: sonst bliebe die Frage des Installers
 * nach dem sudo-Passwort unsichtbar, bis jemand blind Enter drückt.
 */
export function createMasker(secrets = []) {
  const known = secrets.filter((value) => typeof value === "string" && value.length >= 4);
  let carry = "";

  /** Kann aus diesem Rest noch ein Geheimnis werden? Dann wartet er auf mehr. */
  const growing = (tail) => {
    if (/(^|[^A-Za-z0-9_-])a(r(a(s(_[A-Za-z0-9_-]*)?)?)?)?$/.test(tail)) return true;
    return known.some((secret) => {
      for (let length = 1; length < secret.length; length++) {
        if (tail.endsWith(secret.slice(0, length))) return true;
      }
      return false;
    });
  };

  return {
    /** Was von diesem Stück jetzt schon gezeigt werden darf, maskiert. */
    push(chunk) {
      carry += String(chunk);
      let out = "";
      const cut = carry.lastIndexOf("\n");
      if (cut >= 0) {
        out = scrub(carry.slice(0, cut + 1), known);
        carry = carry.slice(cut + 1);
      }
      if (carry && !growing(carry)) {
        out += scrub(carry, known);
        carry = "";
      }
      return out;
    },
    /** Der Rest am Ende. Danach ist nichts mehr zurückgehalten. */
    flush() {
      const rest = carry ? scrub(carry, known) : "";
      carry = "";
      return rest;
    },
  };
}

/**
 * Was der Installer nicht konnte.
 *
 * Am 28.08.2026 lief „SSH-Hardening fehlgeschlagen" und „Firewall-Setup
 * fehlgeschlagen (nicht kritisch), must be run as root" durch das Kit, ohne dass
 * es sie noch einmal genannt hätte. Sie standen irgendwo in mehreren hundert
 * Zeilen Installerausgabe, und das Gerät ging danach als fertig durch.
 *
 * Gesucht wird nach den Worten, mit denen ein Installer eine Absage schreibt.
 * Das Kit deutet sie nicht: es sammelt die Zeilen und legt sie am Ende noch
 * einmal hin. Eine Zeile zu viel ist besser als eine verschwiegene.
 */
const TROUBLE =
  /(fehlgeschlagen|schlug fehl|nicht kritisch|übersprungen|uebersprungen|konnte nicht|verweigert|warnung|warning|failed|failure|skipped|skipping|not critical|must be run as root|permission denied|no such file)/i;

/**
 * Eine Absage sagt, dass ein Schritt nicht stattgefunden hat. Eine Warnung sagt,
 * dass etwas auffiel. Beides kommt in die Liste, die Absagen zuerst: wenn
 * abgeschnitten werden muss, faellt die Warnung und nicht die Absage.
 */
const REFUSAL =
  /(fehlgeschlagen|schlug fehl|nicht kritisch|übersprungen|uebersprungen|konnte nicht|verweigert|failed|failure|skipped|skipping|not critical|must be run as root|permission denied|no such file)/i;

/**
 * Der Schluessel, an dem zwei Zeilen als dieselbe gelten. Der Installer schreibt
 * dieselbe Warnung mit einem Zeitstempel davor, und ohne diesen Schritt steht
 * sie achtmal in der Liste und draengt heraus, worauf es ankommt.
 */
function troubleKey(line) {
  return line
    .replace(/\btime="[^"]*"\s*/g, "")
    .replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:?\d{2}|Z)?/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function troubles(text, { limit = 12 } = {}) {
  const refusals = [];
  const warnings = [];
  const seen = new Set();
  for (const raw of String(text || "").split(/\r?\n/)) {
    // Farbcodes sind keine Worte: sie stehen dem Lesen im Weg und sonst nichts.
    const line = scrub(raw)
      .replace(/\x1B\[[0-9;]*m/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!line || !TROUBLE.test(line)) continue;
    const key = troubleKey(line);
    if (seen.has(key)) continue;
    seen.add(key);
    (REFUSAL.test(line) ? refusals : warnings).push(line);
  }
  const found = [...refusals, ...warnings];
  if (found.length <= limit) return found;
  // Abgeschnitten wird gesagt, nicht verschwiegen: sonst sieht die Liste
  // vollstaendig aus und ist es nicht.
  const rest = found.length - limit;
  return [
    ...found.slice(0, limit),
    t(
      `and ${rest} more lines of the same kind, in the installer's output`,
      `und ${rest} weitere Zeilen dieser Art, in der Ausgabe des Installers`
    ),
  ];
}

// --- Der Spiegel -------------------------------------------------------------

export function mirrorState() {
  const file = join(mirrorDir(), "STATE.json");
  if (!existsSync(file)) return null;
  try {
    const state = JSON.parse(readFileSync(file, "utf8"));
    // Ein Spiegel, der vor dieser Fassung des Kits geholt wurde, trägt in seinem
    // Stand keine Zahl. Im Artefakt steht sie trotzdem, und dann gilt sie.
    return state.version ? state : { ...state, version: releaseVersion() };
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

/** Der erste Wert unter einem der genannten Feldnamen, egal wie tief er liegt. */
function pickField(node, fields, depth = 0) {
  if (typeof node === "string" || typeof node === "number") {
    const value = String(node).trim();
    return value && !value.includes("\n") ? value : null;
  }
  if (!node || typeof node !== "object" || depth > 2) return null;
  for (const field of fields) {
    if (!(field in node)) continue;
    const found = pickField(node[field], fields, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Was in `arasul-release.json` steht, oder null. Das Kit deutet es nicht, es liest. */
export function releaseData(dir = mirrorDir()) {
  const file = join(dir, RELEASE_FILE);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** Die Fassung, die das Artefakt selbst nennt. Nicht geraten, gelesen. */
export function releaseVersion(dir = mirrorDir()) {
  return pickField(releaseData(dir), VERSION_FIELDS) || null;
}

/**
 * Sagt das geholte Artefakt, wie es installiert wird?
 *
 * Die Antwort ist immer beides wert: `{ ok: true, file }` mit dem Einstiegspunkt,
 * oder `{ ok: false, reason }` mit dem Satz, den der Mensch lesen soll. Geraten
 * wird nichts, weder ein Dateiname, wenn `arasul-release.json` fehlt, noch ein
 * Weg, wenn die dort genannte Datei im Artefakt nicht liegt.
 */
export function installerEntry() {
  if (!existsSync(join(mirrorDir(), RELEASE_FILE))) {
    return { ok: false, reason: t(`No ${RELEASE_FILE} lies in the artifact.`, `Im Artefakt liegt kein ${RELEASE_FILE}.`) };
  }
  const data = releaseData();
  if (!data) {
    return { ok: false, reason: t(`${RELEASE_FILE} is not readable.`, `${RELEASE_FILE} ist nicht lesbar.`) };
  }
  const named = pickField(data, ENTRY_FIELDS);
  if (!named) {
    return {
      ok: false,
      reason: t(
        `${RELEASE_FILE} names no entry point. Searched under: ${ENTRY_FIELDS.join(", ")}.`,
        `${RELEASE_FILE} nennt keinen Einstiegspunkt. Gesucht wurde unter: ${ENTRY_FIELDS.join(", ")}.`
      ),
    };
  }
  const file = named.replace(/^\.\//, "");
  if (file.startsWith("/") || file.split("/").includes("..")) {
    return {
      ok: false,
      reason: t(
        `${RELEASE_FILE} names "${named}", and that points out of the artifact.`,
        `${RELEASE_FILE} nennt "${named}", und das zeigt aus dem Artefakt heraus.`
      ),
    };
  }
  if (!existsSync(join(mirrorDir(), file))) {
    return {
      ok: false,
      reason: t(
        `${RELEASE_FILE} names "${named}", but that file does not lie in the artifact.`,
        `${RELEASE_FILE} nennt "${named}", diese Datei liegt aber nicht im Artefakt.`
      ),
    };
  }
  return { ok: true, file, release: data };
}

/** Ein Wert für die Shell am Gerät, in einfachen Anführungszeichen. */
function quote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Der Aufruf am Gerät, so wie das Artefakt ihn dokumentiert.
 *
 * `--passwort` und `--name` sind keine Höflichkeit: **nur dieser Aufruf** legt
 * am Gerät Netzname, Fassung, Startpasswort und die Erstausgabe an. Wer den
 * Einstiegspunkt ohne sie ruft, bekommt ein Gerät ohne Zugang.
 *
 * Zurück kommen zwei Fassungen desselben Befehls: eine zum Ausführen und eine
 * zum Anzeigen. Der Mensch soll mitlesen können, ohne dass das Startpasswort
 * über den Bildschirm und in die Geräteakte wandert.
 */
export function installCommand(entry, { password, netName } = {}) {
  const parts = [`./${entry.file}`];
  if (password) parts.push(OPTION_PASSWORD, quote(password));
  if (netName) parts.push(OPTION_NAME, quote(netName));
  const command = parts.join(" ");
  return { command, shown: scrub(command) };
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

/**
 * Der Installer, mitgelesen statt durchgereicht.
 *
 * Er läuft minutenlang und will beobachtet werden, also geht seine Ausgabe
 * weiter auf den Bildschirm und seine Eingabe kommt weiter vom Terminal: der
 * Installer fragt nach dem sudo-Passwort, und dort sitzt ein Mensch. Anders als
 * vorher sieht das Kit die Ausgabe dabei selbst. Daraus folgen zwei Dinge, die
 * am 28.08.2026 beide gefehlt haben: der Kit-Schlüssel und das Startpasswort
 * werden maskiert, bevor sie über den Bildschirm gehen, und was der Installer
 * nicht konnte, steht danach noch einmal beisammen.
 *
 * Je Strom ein eigener Masker: stdout und stderr kommen unabhängig an, und ein
 * gemeinsamer Zwischenspeicher würde ihre halben Zeilen ineinander schieben.
 */
export function runInstaller(sshArgs, transport, command, { secrets = [] } = {}) {
  return new Promise((done) => {
    const child =
      transport === "ssh"
        ? spawn("ssh", ["-t", ...sshArgs, command], { stdio: ["inherit", "pipe", "pipe"] })
        : spawn("sh", ["-c", command], { stdio: ["inherit", "pipe", "pipe"] });

    let output = "";
    const attach = (stream) => {
      const masker = createMasker(secrets);
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => {
        const text = masker.push(chunk);
        if (!text) return;
        output += text;
        process.stdout.write(text);
      });
      return masker;
    };
    const maskers = [attach(child.stdout), attach(child.stderr)];

    const finish = (status) => {
      for (const masker of maskers) {
        const rest = masker.flush();
        if (!rest) continue;
        output += rest;
        process.stdout.write(rest);
      }
      done({ status, output, troubles: troubles(output) });
    };
    child.on("close", finish);
    child.on("error", (error) => {
      output += `\n${error.message}`;
      finish(1);
    });
  });
}

/**
 * Schiebt einen Ordner an das Gerät und packt ihn dort aus.
 *
 * Ohne Angabe ist das der Spiegel: das ist der Weg, für den die Funktion
 * entstanden ist. `from` gibt es, weil derselbe Weg noch einmal gebraucht wird,
 * wenn eine App auf ein Gerät ohne Arasul geht (Phase E5): zwei Nachbauten
 * desselben Rohrs liefen auseinander, und der zweite wäre der ungetestete.
 */
export async function ship(sshArgs, transport, target = installTarget(mirrorState()?.version), from = mirrorDir()) {
  // Beide Seiten halten die Beiwerkdateien von macOS heraus: beim Packen, damit
  // sie gar nicht erst entstehen, und beim Auspacken, damit auch ein Artefakt
  // ohne sie ankommt, das schon welche mitbrachte.
  const unpack = `tar -xzf - --exclude '${APPLEDOUBLE}' -C ${target}`;
  if (transport !== "ssh") {
    const run = spawnSync(
      "sh",
      ["-c", `mkdir -p ${target} && tar -czf - --exclude '${APPLEDOUBLE}' -C ${JSON.stringify(from)} . | ${unpack}`],
      { encoding: "utf8", env: packEnv() }
    );
    return { ok: run.status === 0, message: (run.stderr || "").trim() };
  }
  return new Promise((done) => {
    const pack = spawn("tar", ["-czf", "-", "--exclude", APPLEDOUBLE, "-C", from, "."], {
      stdio: ["ignore", "pipe", "pipe"],
      env: packEnv(),
    });
    const push = spawn("ssh", [...sshArgs, `mkdir -p ${target} && ${unpack}`], {
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
    // `arasul-*` ist der Ordner, in den das Kit selbst das Artefakt legt.
    `for d in "$HOME/arasul" "$HOME"/arasul-* /opt/arasul /arasul; do ` +
      `[ -d "$d" ] && find "$d" -maxdepth 5 -name ${KEY_SCRIPT} -type f 2>/dev/null | head -1; ` +
      `done | head -1`
  );
  const script = (find.stdout || "").trim().split("\n")[0];
  if (!script) {
    return {
      ok: false,
      message: t(
        `No ${KEY_SCRIPT} can be found on the device. It belongs to the platform: either no Arasul ` +
          "runs there, or the version is older than the deploy over the interface.",
        `Am Gerät ist kein ${KEY_SCRIPT} zu finden. Es gehört zur Plattform: entweder läuft dort ` +
          "kein Arasul, oder die Fassung ist älter als der Deploy über die Schnittstelle."
      ),
    };
  }
  const run = runRemote(sshArgs, transport, `bash ${JSON.stringify(script)} anlegen ${JSON.stringify(name)}`);
  if (run.status !== 0) {
    return {
      ok: false,
      message:
        scrub(`${run.stdout}\n${run.stderr}`.trim()) ||
        t("The device issued no key.", "Das Gerät hat keinen Schlüssel ausgestellt."),
    };
  }
  // Der Klartext steht auf der Zeile mit dem Wort Schlüssel, der Präfix auf der
  // darunter. Ohne die Beschriftung gilt der längere von beiden: ein Präfix ist
  // per Bauart kürzer als der Schlüssel, zu dem er gehört.
  const tokens = [...String(run.stdout).matchAll(/\baras_[A-Za-z0-9_-]{4,}/g)].map((m) => m[0]);
  if (!tokens.length) {
    return {
      ok: false,
      message: t("The device's answer contains no key.", "Die Antwort des Geräts enthält keinen Schlüssel."),
    };
  }
  const labelled = String(run.stdout)
    .split("\n")
    .find((line) => /schl(ü|ue)ssel/i.test(line) && /\baras_/.test(line));
  const key = labelled
    ? labelled.match(/\baras_[A-Za-z0-9_-]{4,}/)[0]
    : tokens.sort((a, b) => b.length - a.length)[0];
  return { ok: true, key, script };
}
