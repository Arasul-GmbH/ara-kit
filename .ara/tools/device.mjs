#!/usr/bin/env node
/**
 * /device: create the file, check SSH, recognise hardware and operating system, verdict.
 *
 *   node .ara/tools/device.mjs --host localhost --name mac        first time: file and check
 *   node .ara/tools/device.mjs --host 10.0.0.5 --user arasul --name zentrale
 *   node .ara/tools/device.mjs --name mac                         file there: state and next steps
 *   node .ara/tools/device.mjs --name mac --install docker,ollama set up Docker and Ollama (Linux)
 *   node .ara/tools/device.mjs --name orin --install arasul       install Arasul (token needed)
 *   node .ara/tools/device.mjs --name orin --install arasul --net-name werk2
 *   node .ara/tools/device.mjs --name orin --install arasul --despite-traces
 *   node .ara/tools/device.mjs --name orin --deploy-key           create the kit key on the device
 *   node .ara/tools/device.mjs --name orin --admin-login          get a session as administrator
 *   node .ara/tools/device.mjs --name orin --admin-login --token  only the credential, for a script
 *   node .ara/tools/device.mjs                                    which files there are
 *   node .ara/tools/device.mjs --name mac --json                  the same as JSON
 *   node .ara/tools/device.mjs --help                             this help, nothing else
 *
 * The file lies under devices/<name>/, in both branches. A customer device lies
 * under customers/<customer>/devices/<name>/, and then --customer comes along.
 *
 * The tool only reads on the device. It changes something only with --install or
 * --deploy-key, and that is an intervention that belongs confirmed beforehand. The
 * verdict follows the rule in lib/device.mjs: Orin and Thor carry Arasul, DGX Spark
 * and other NVIDIA computers are announced, everything else gets noted down. Values
 * for the device (profile, model, engine) still stand only in the mirror, not here.
 *
 * Two ways lead to a device with Arasul, and the tool knows both: one on which the
 * platform already runs only needs the kit key (--deploy-key); one without gets it
 * with --install arasul. How that runs stands in lib/install.mjs.
 *
 * The kit key carries app:deploy and nothing else. For everything an administrator
 * does, --admin-login gives a session: the start password from the installation goes
 * from the secret store straight into the login, back comes a credential, and the
 * password is never displayed. Route and user name come from the artifact when it
 * names them, otherwise from --login-path and --login-user. See lib/session.mjs.
 *
 * The trace search distinguishes three situations: the platform runs, only remains
 * lie there, or there is nothing. Installing over remains happens only when
 * --despite-traces stands there, and that belongs confirmed beforehand.
 *
 * If the target is this computer itself (localhost) and SSH is refused, the tool
 * checks locally and writes that into the file. For a foreign device there is no
 * such detour.
 *
 * === deutsch ===
 *
 * /device: Akte anlegen, SSH prüfen, Hardware und Betriebssystem erkennen, Urteil.
 *
 *   node .ara/tools/device.mjs --host localhost --name mac        erstes Mal: Akte und Prüfung
 *   node .ara/tools/device.mjs --host 10.0.0.5 --user arasul --name zentrale
 *   node .ara/tools/device.mjs --name mac                         Akte da: Zustand und nächste Schritte
 *   node .ara/tools/device.mjs --name mac --install docker,ollama Docker und Ollama aufsetzen (Linux)
 *   node .ara/tools/device.mjs --name orin --install arasul       Arasul installieren (Token nötig)
 *   node .ara/tools/device.mjs --name orin --install arasul --net-name werk2
 *   node .ara/tools/device.mjs --name orin --install arasul --despite-traces
 *   node .ara/tools/device.mjs --name orin --deploy-key           Kit-Schlüssel am Gerät anlegen
 *   node .ara/tools/device.mjs --name orin --admin-login          Sitzung als Administrator holen
 *   node .ara/tools/device.mjs --name orin --admin-login --token  nur den Ausweis, für ein Skript
 *   node .ara/tools/device.mjs                                    welche Akten es gibt
 *   node .ara/tools/device.mjs --name mac --json                  dasselbe als JSON
 *   node .ara/tools/device.mjs --help                             diese Hilfe, sonst nichts
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
 * Der Kit-Schlüssel trägt app:deploy und sonst nichts. Für alles, was ein
 * Administrator tut, gibt --admin-login eine Sitzung: das Startpasswort aus der
 * Installation geht dabei aus der Geheimnis-Ablage direkt in die Anmeldung,
 * zurück kommt ein Ausweis, und angezeigt wird das Passwort nie. Weg und
 * Benutzername kommen aus dem Artefakt, wenn es sie nennt, sonst aus --login-path
 * und --login-user. Siehe lib/session.mjs.
 *
 * Die Spurensuche unterscheidet drei Lagen: die Plattform läuft, es liegen nur
 * Reste da, oder da ist nichts. Über Reste hinweg wird nur installiert, wenn
 * --despite-traces dabeisteht, und das gehört vorher bestätigt.
 *
 * Ist das Ziel dieser Rechner selbst (localhost) und SSH abgelehnt, prüft das
 * Werkzeug lokal und schreibt das so in die Akte. Für ein fremdes Gerät gibt es
 * diesen Umweg nicht.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join, relative } from "node:path";
import { PROBE, VERDICTS, arasulRunning, judge, parseProbe, services } from "./lib/device.mjs";
import {
  ROOT,
  devicePath,
  ensureDir,
  fail,
  helpOnly,
  listCustomers,
  listDevices,
  now,
  parseArgs,
  readFrontmatter,
  today,
  writeFrontmatter,
} from "./lib/kit.mjs";
import { localized, t } from "./lib/i18n.mjs";
import { getSecret, hasSecret, setSecret } from "./lib/secrets.mjs";
import { baseUrl, call, reason } from "./lib/arasul.mjs";
import { TOKEN_FIELDS, loginBody, loginSpec, pickToken } from "./lib/session.mjs";
import {
  createKey,
  fetchMirror,
  installCommand,
  installTarget,
  installerEntry,
  releaseData,
  runInstaller,
  scrub,
  ship,
} from "./lib/install.mjs";

const STATE = join(ROOT, ".ara", "state.json");
const TEMPLATE = localized(join(ROOT, ".ara", "templates", "device.md"));
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

helpOnly(import.meta.url);
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
        ? t(
            `Which device? ${lines.join(". ")}. Name it with --name <name>.`,
            `Welches Gerät? ${lines.join(". ")}. Angeben mit --name <name>.`
          )
        : t(
            "No device file yet. The first time: node .ara/tools/device.mjs --host <address> --name <name>",
            "Noch keine Geräteakte. Beim ersten Mal: node .ara/tools/device.mjs --host <adresse> --name <name>"
          )
    );
    process.exit(lines.length ? 1 : 0);
  }
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  fail(
    t(
      `The device name "${name}" does not fit: lower case, digits and hyphens, nothing else.`,
      `Der Gerätename "${name}" passt nicht: klein, Ziffern und Bindestriche, sonst nichts.`
    )
  );
}
if (customer && !existsSync(join(ROOT, "customers", customer))) {
  fail(
    t(
      `There is no customer "${customer}". First /customer ${customer}.`,
      `Den Kunden "${customer}" gibt es nicht. Erst /customer ${customer}.`
    )
  );
}

const dir = devicePath(customer, name);
const file = join(dir, "device.md");
const place = customer ? `${customer}/${name}` : name;
const fresh = !existsSync(file);

// --- Verbindung -------------------------------------------------------------

const existing = fresh ? {} : readFrontmatter(file).fields;

/**
 * `--admin-login` geht nicht über SSH, sondern an die Schnittstelle des Geräts.
 * Es braucht darum nur eine Adresse, keinen Anmeldenamen und keinen Schlüssel.
 */
const loginOnly = Boolean(arg["admin-login"]);
const host = str(arg.host) || existing.address || existing.hostname || (loginOnly ? existing.api_base || "" : "");
if (!host) {
  fail(
    fresh
      ? t(
          `The first time I need the address: node .ara/tools/device.mjs --host <address> --name ${name}`,
          `Beim ersten Mal brauche ich die Adresse: node .ara/tools/device.mjs --host <adresse> --name ${name}`
        )
      : t(
          `${relative(ROOT, file)} holds neither an address nor an interface. Supply one with --host <address>.`,
          `In ${relative(ROOT, file)} steht weder eine Adresse noch eine Schnittstelle. Nachreichen mit --host <adresse>.`
        )
  );
}

/**
 * Der Namensteil, unter dem die Geheimnisse dieses Geräts liegen. Die Akte
 * trägt nur diese Namen, nie die Werte.
 */
const secretSlug = (customer ? `${customer}_${name}` : name).toUpperCase().replace(/[^A-Z0-9]/g, "_");
const startRef = `ARASUL_START_${secretSlug}`;

// --- Die erste Anmeldung als Administrator -----------------------------------

/**
 * Aus dem Startpasswort wird eine Sitzung, ohne dass das Passwort sichtbar wird.
 *
 * Der Fremdtest am 28.08.2026 kam an dieser Stelle nicht weiter. Das Kit hatte
 * das Startpasswort bei der Installation gewürfelt und ordentlich abgelegt, es
 * gab aber keinen Weg, es für die erste Anmeldung zu benutzen: kein Werkzeug
 * reichte es weiter, und anzeigen darf man es nicht. Ein Geheimnis, an das
 * niemand herankommt, ist kein Geheimnis, sondern ein verlorener Zugang.
 *
 * Das Werkzeug meldet sich darum selbst an. Es braucht dafür keine Verbindung
 * über SSH und kein Urteil über die Hardware, nur die Adresse aus der Akte und
 * den Eintrag aus der Ablage, und es läuft deshalb vor der Geräteprüfung.
 */
async function adminLogin() {
  if (fresh) {
    fail(
      t(
        `There is no file for ${place} yet, so no address and no start password either.\n` +
          `First: node .ara/tools/device.mjs --host <address> --name ${name}`,
        `Für ${place} gibt es noch keine Akte, also auch keine Adresse und kein Startpasswort.\n` +
          `Erst: node .ara/tools/device.mjs --host <adresse> --name ${name}`
      )
    );
  }
  const ref = existing.start_password_ref || startRef;
  const password = getSecret(ref);
  if (!password) {
    fail(
      t(
        `No start password lies under ${ref}.\n` +
          "It comes into being when the kit installs itself (--install arasul). If the device was set\n" +
          "up by hand, the password stands in the first output on the device. Store it from there:\n",
        `Unter ${ref} liegt kein Startpasswort.\n` +
          "Es entsteht, wenn das Kit selbst installiert (--install arasul). Wurde das Gerät von Hand\n" +
          "aufgesetzt, steht das Passwort in der Erstausgabe am Gerät. Von dort hinterlegen:\n"
      ) + `  printf '%s' "<passwort>" | node .ara/tools/secrets.mjs --set ${ref}`
    );
  }

  const spec = loginSpec(releaseData(), {
    path: str(arg["login-path"]),
    user: str(arg["login-user"]),
  });
  let base;
  try {
    base = baseUrl(existing.api_base || host);
  } catch (error) {
    fail(`${error.message}\nNachsehen in ${relative(ROOT, file)}.`);
  }
  const insecure = Boolean(arg.insecure) || (existing.tls || "").toLowerCase() === "selfsigned";

  let answer;
  try {
    answer = await call({
      base,
      method: "POST",
      path: spec.path,
      json: loginBody(spec, password),
      insecure,
    });
  } catch (error) {
    fail(error.message);
  }

  if (!answer.ok) {
    if (answer.status === 404) {
      fail(
        t(
          `${place} does not know ${spec.path}. Where this device keeps its login stands in the\n` +
            "API reference of the artifact, not in the kit:\n" +
            "  node .ara/tools/mirror.mjs --docs\n" +
            "Pass the route from there: --login-path <route>.\n",
          `${place} kennt ${spec.path} nicht. Wo dieses Gerät seine Anmeldung führt, steht in der\n` +
            "API-Referenz des Artefakts, nicht im Kit:\n" +
            "  node .ara/tools/mirror.mjs --docs\n" +
            "Den Weg von dort mitgeben: --login-path <weg>.\n"
        ) + reason(answer)
      );
    }
    if (answer.status === 401 || answer.status === 403) {
      fail(
        t(
          `${place} refuses the login (${answer.status}). Two reasons come into question: the\n` +
            `administrator is not called "${spec.user}" there (then --login-user <name>), or the\n` +
            `start password from ${ref} no longer holds because it was changed on the device.\n`,
          `${place} weist die Anmeldung ab (${answer.status}). Zwei Gründe kommen infrage: der\n` +
            `Administrator heißt dort nicht "${spec.user}" (dann --login-user <name>), oder das\n` +
            `Startpasswort aus ${ref} gilt nicht mehr, weil es am Gerät geändert wurde.\n`
        ) + reason(answer)
      );
    }
    fail(
      t(
        `${place} did not accept the login (status ${answer.status}).\n` +
          `Called was POST ${spec.path} with the fields ${spec.userField} and ${spec.passwordField}.\n` +
          "Which ones this device expects stands in the API reference: node .ara/tools/mirror.mjs --docs\n",
        `${place} hat die Anmeldung nicht angenommen (Status ${answer.status}).\n` +
          `Gerufen wurde POST ${spec.path} mit den Feldern ${spec.userField} und ${spec.passwordField}.\n` +
          "Welche dieses Gerät erwartet, steht in der API-Referenz: node .ara/tools/mirror.mjs --docs\n"
      ) + reason(answer)
    );
  }

  const token = pickToken(answer.data);
  if (!token) {
    fail(
      t(
        `${place} accepted the login, but its answer holds no credential the kit can\n` +
          `make anything of. Searched under: ${TOKEN_FIELDS.join(", ")}.\n` +
          "What this device's answer looks like stands in the API reference of the artifact.",
        `${place} hat die Anmeldung angenommen, in der Antwort steht aber kein Ausweis, mit dem das\n` +
          `Kit etwas anfangen kann. Gesucht wurde unter: ${TOKEN_FIELDS.join(", ")}.\n` +
          "Wie die Antwort dieses Geräts aussieht, steht in der API-Referenz des Artefakts."
      )
    );
  }

  // Für ein Skript: nur der Ausweis, ohne einen Satz drumherum. Beendet wird
  // erst, wenn er wirklich draußen ist: auf einer Leitung schreibt Node
  // verzögert, und ein sofortiges Ende schnitte ihn ab.
  if (arg.token) {
    await new Promise((geschrieben) => process.stdout.write(token, geschrieben));
    process.exit(0);
  }
  if (arg.json) {
    console.log(
      JSON.stringify(
        { device: place, base, path: spec.path, user: spec.user, sources: spec.sources, password_ref: ref, bearer: token },
        null,
        2
      )
    );
    process.exit(0);
  }

  const woher = t(
    { aufruf: "from the call", artefakt: "from the artifact", kit: "from the kit's fallback" },
    { aufruf: "aus dem Aufruf", artefakt: "aus dem Artefakt", kit: "aus dem Rückfall des Kits" }
  );
  const wo = `${customer ? `--customer ${customer} ` : ""}--name ${name}`;
  console.log(
    [
      t(`# Session for ${place}`, `# Sitzung für ${place}`),
      "",
      t(
        `- Logged in at ${base} with POST ${spec.path}, as "${spec.user}"`,
        `- Angemeldet an ${base} mit POST ${spec.path}, als "${spec.user}"`
      ),
      t(
        `- The route comes ${woher[spec.sources.path]}, the user name ${woher[spec.sources.user]}`,
        `- Der Weg kommt ${woher[spec.sources.path]}, der Benutzername ${woher[spec.sources.user]}`
      ),
      t(
        `- The start password came from ${ref}. It is not displayed.`,
        `- Das Startpasswort kam aus ${ref}. Angezeigt wird es nicht.`
      ),
      "",
      t("Credential for the header:", "Ausweis für die Kopfzeile:"),
      "",
      `  ${token}`,
      "",
      ...t(
        [
          "With it the manual steps work for which the kit has no command, first of all the first",
          "employee and the first permission:",
        ],
        [
          "Damit gehen die Handgriffe, für die das Kit keinen Befehl hat, allen voran der erste",
          "Mitarbeiter und die erste Freigabe:",
        ]
      ),
      "",
      `  SITZUNG=$(node .ara/tools/device.mjs ${wo} --admin-login --token)`,
      '  curl -sS -H "Authorization: Bearer $SITZUNG" ...',
      "",
      ...t(
        [
          "Route and body for the next call stand in the API reference of the artifact, not in the",
          "kit: node .ara/tools/mirror.mjs --docs. The procedure stands in .ara/knowledge/device.md.",
        ],
        [
          "Weg und Rumpf für den nächsten Aufruf stehen in der API-Referenz des Artefakts, nicht im",
          "Kit: node .ara/tools/mirror.mjs --docs. Das Verfahren steht in .ara/knowledge/device.md.",
        ]
      ),
    ].join("\n")
  );
  process.exit(0);
}

if (arg["admin-login"]) await adminLogin();

// --- Die Verbindung über SSH -------------------------------------------------
// Ab hier geht es auf das Gerät selbst, und dafür braucht es einen Anmeldenamen.
// Die Anmeldung an der Schnittstelle ist zu diesem Zeitpunkt schon durch, sie
// kommt ohne diese Angaben aus.

const isLocal = LOCAL_HOSTS.has(host);
const user = str(arg.user) || existing.ssh_user || (isLocal ? userInfo().username : null);
if (!user) fail(t("I need the login name on the device: --user <name>.", "Ich brauche den Anmeldenamen auf dem Gerät: --user <name>."));
const port = str(arg.port) || existing.ssh_port || "22";
const key = str(arg.key) || existing.ssh_key || "";

const sshArgs = ["-o", "ConnectTimeout=8", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", "-p", port];
if (key) {
  const keyPath = key.startsWith("/") ? key : join(homedir(), ".ssh", key);
  if (!existsSync(keyPath)) fail(t(`The key ${key} is not at ${keyPath}.`, `Der Schlüssel ${key} liegt nicht unter ${keyPath}.`));
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
  if (!INSTALLABLE.includes(what)) {
    fail(
      t(
        `--install only knows ${INSTALLABLE.join(", ")}, not "${what}".`,
        `--install kennt nur ${INSTALLABLE.join(", ")}, nicht "${what}".`
      )
    );
  }
}
const wantsArasul = wanted.includes("arasul");
const install = wanted.filter((what) => what !== "arasul");
const installed = [];
if (install.length) {
  if (run.transport === "none") fail(t("Without a connection nothing gets set up.", "Ohne Verbindung wird nichts aufgesetzt."));
  if (!/linux/i.test(facts.uname || "")) {
    fail(
      t(
        "The tool sets up Docker and Ollama on Linux only. On this system that stays manual work.",
        "Docker und Ollama setzt das Werkzeug nur auf Linux auf. Auf diesem System bleibt das Handarbeit."
      )
    );
  }
  // Die Installationswege der Hersteller. Beide brauchen Root, also sudo mit
  // Passwort am Terminal, darum läuft das mit durchgereichter Ein- und Ausgabe.
  const steps = {
    docker: "curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker \"$(id -un)\"",
    ollama: "curl -fsSL https://ollama.com/install.sh | sh",
  };
  for (const what of install) {
    // Was da ist, wird nicht noch einmal aufgesetzt, und der Satz sagt, was
    // gefunden wurde: auf einem Gerät mit Arasul fährt das Modell im Container,
    // und ein zweites Ollama daneben wäre ein zweites Modell im Speicher.
    if (svc[what] && svc[what].state !== "missing") {
      console.log(`${what}: ${svc[what].text}. ` + t("Nothing to do.", "Nichts zu tun."));
      continue;
    }
    console.log(t(`\nsetting up ${what} on ${label} ...`, `\n${what} aufsetzen auf ${label} ...`));
    const step = run.transport === "ssh"
      ? spawnSync("ssh", ["-t", ...sshArgs, steps[what]], { stdio: "inherit" })
      : spawnSync("sh", ["-c", steps[what]], { stdio: "inherit" });
    installed.push({ what, ok: step.status === 0 });
    if (step.status !== 0) {
      console.log(
        t(
          `${what}: installation ended with return code ${step.status}.`,
          `${what}: Installation mit Rückgabecode ${step.status} beendet.`
        )
      );
    }
  }
  // Danach noch einmal hinsehen, damit die Akte den Zustand trägt, nicht die Absicht.
  const again = probe();
  Object.assign(facts, parseProbe(again.output));
  Object.assign(svc, services(facts));
}

// --- Arasul installieren -----------------------------------------------------

/**
 * Der Name, unter dem das Gerät im Netz des Kunden auftritt.
 *
 * Standard ist der Name der Akte: er ist schon geprüft (klein, Ziffern,
 * Bindestriche) und er ist der Name, unter dem der Partner ohnehin über das
 * Gerät spricht. Wer einen anderen will, sagt ihn mit --net-name.
 */
function netName() {
  const wanted = str(arg["net-name"]) || name;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(wanted)) {
    fail(
      t(
        `The network name "${wanted}" does not fit: lower case, digits and hyphens, nothing else.`,
        `Der Netzname "${wanted}" passt nicht: klein, Ziffern und Bindestriche, sonst nichts.`
      )
    );
  }
  return wanted;
}

/**
 * Das Startpasswort für die erste Anmeldung am Gerät.
 *
 * Es geht als `--passwort` in den Installer, denn nur dort entsteht es. Damit
 * es nicht im Gespräch, im Protokoll oder in der Geräteakte landet, wird es
 * gewürfelt und sofort in die Geheimnis-Ablage gelegt; die Akte trägt nur den
 * Namen des Eintrags. Wer ein eigenes setzen will, legt es vorher selbst ab:
 *
 *   printf '%s' "<passwort>" | node .ara/tools/secrets.mjs --set <eintrag>
 *
 * Am Gerät steht es danach zusätzlich in der Erstausgabe, die der Installer
 * schreibt. Das ist die Fassung, die dem Administrator des Geräts gehört.
 */
function startPassword(ref) {
  const existing = getSecret(ref);
  if (existing) return { password: existing, fresh: false };
  // base64url, damit kein Zeichen darin die Shell am Gerät beschäftigt.
  const password = randomBytes(18).toString("base64url");
  setSecret(ref, password);
  return { password, fresh: true };
}

/**
 * Der zweite Weg zu einem Gerät mit Arasul: die Plattform ist noch nicht drauf.
 *
 * Fünf Halte, bevor irgendetwas passiert: eine Verbindung, ein unterstütztes
 * Gerät, keine laufende Plattform, Docker, ein Token. Fehlt eines davon, hört
 * das Werkzeug auf und sagt warum, statt eine halbe Installation zu
 * hinterlassen. Reste ohne laufende Plattform sind ein sechster Halt, aber
 * einer mit Weg: --despite-traces geht darüber hinweg.
 */
async function installArasul() {
  if (run.transport === "none") fail(t("Without a connection nothing gets installed.", "Ohne Verbindung wird nichts installiert."));
  // Der Netzname wird vor dem Download geprüft. Ein Tippfehler soll nicht erst
  // auffallen, wenn das Artefakt schon am Gerät liegt.
  const net = netName();
  if (found.verdict !== "supported") {
    fail(
      t(
        `Arasul does not run on this device: ${found.reason}. Verdict: ${found.verdictText}.\n` +
          "It is noted down in the file, nothing gets installed.",
        `Auf diesem Gerät läuft Arasul nicht: ${found.reason}. Urteil: ${found.verdictText}.\n` +
          "Vorgemerkt ist es in der Akte, installiert wird nichts."
      )
    );
  }
  const where = `node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""}`;
  if (svc.arasul.state === "running") {
    fail(
      t(
        `Arasul already runs on ${place}: ${svc.arasul.text}.\n` +
          "A second installation on top would not be a setup but an update, and that is a different path.\n" +
          `If only the kit key is missing: ${where} --deploy-key`,
        `Auf ${place} läuft Arasul schon: ${svc.arasul.text}.\n` +
          "Eine zweite Installation darüber wäre kein Aufsetzen, sondern ein Update, und das ist ein anderer Weg.\n" +
          `Wenn nur der Kit-Schlüssel fehlt: ${where} --deploy-key`
      )
    );
  }
  if (svc.arasul.state === "traces" && !arg["despite-traces"]) {
    fail(
      t(
        `Traces lie on ${place}, but nothing runs: ${svc.arasul.text}.\n` +
          "That is the state after an aborted attempt or after a factory reset where something\n" +
          "stayed behind. An installation over it is possible, but it can meet what is already there.\n" +
          `If that is wanted: ${where} --install arasul --despite-traces`,
        `Auf ${place} liegen Reste, aber es läuft nichts: ${svc.arasul.text}.\n` +
          "Das ist der Zustand nach einem abgebrochenen Versuch oder nach einem Werksreset, bei dem etwas\n" +
          "stehen geblieben ist. Eine Installation darüber ist möglich, sie kann aber auf Vorhandenes treffen.\n" +
          `Wenn das gewollt ist: ${where} --install arasul --despite-traces`
      )
    );
  }
  if (svc.docker.state === "missing") {
    fail(
      t(
        `No Arasul without Docker, the platform runs in containers.\nFirst: ${where} --install docker`,
        `Ohne Docker kein Arasul, die Plattform läuft in Containern.\nErst: ${where} --install docker`
      )
    );
  }
  if (!hasSecret("ARASUL_TOKEN")) fail(TOKEN_QUESTION);

  console.log(
    t(
      "Fetching the installer, with the token from the partner portal. The mirror comes into being right now.",
      "Installer holen, mit dem Token aus dem Partnerportal. Der Spiegel entsteht genau jetzt."
    )
  );
  const fetched = fetchMirror();
  if (!fetched.ok) {
    fail(t(`The installer could not be fetched.\n${fetched.message}`, `Der Installer ließ sich nicht holen.\n${fetched.message}`));
  }
  console.log(fetched.message);

  const entry = installerEntry();
  if (!entry.ok) {
    fail(
      t(
        `The fetched artifact names no way to install itself: ${entry.reason}\n` +
          "The kit does not guess here. Look in .ara/mirror/ at what came along, and report it to the product team.",
        `Das geholte Artefakt nennt keinen Weg, sich zu installieren: ${entry.reason}\n` +
          "Das Kit rät hier nicht. Sieh in .ara/mirror/ nach, was mitgeliefert wurde, und melde es ans Produktteam."
      )
    );
  }

  const state = fetched.state || {};
  const target = installTarget(state.version);
  console.log(t(`Pushing the artifact to ${label}, to ${target} ...`, `Artefakt an ${label} schieben, nach ${target} ...`));
  const shipped = await ship(sshArgs, run.transport, target);
  if (!shipped.ok) {
    fail(
      t(
        `The artifact did not arrive on the device.\n${shipped.message}`,
        `Das Artefakt kam nicht am Gerät an.\n${shipped.message}`
      )
    );
  }

  const secret = startPassword(startRef);
  const command = installCommand(entry, { password: secret.password, netName: net });
  console.log(
    t(
      `\nThe installer runs on the device: ${command.shown}. That takes a while and wants reading along.\n` +
        `Network name ${net}, start password ${secret.fresh ? "freshly rolled" : "from the store"} and stored under ${startRef}. ` +
        "Its plain text is not displayed.\n" +
        "The installer's output is read along and masked while doing so: it prints keys and\n" +
        "passwords into its first output, and neither belongs on the screen.\n",
      `\nInstaller läuft auf dem Gerät: ${command.shown}. Das dauert und will mitgelesen werden.\n` +
        `Netzname ${net}, Startpasswort ${secret.fresh ? "neu gewürfelt" : "aus der Ablage"} und hinterlegt unter ${startRef}. ` +
        "Sein Klartext wird nicht angezeigt.\n" +
        "Die Ausgabe des Installers wird mitgelesen und dabei maskiert: er druckt Schlüssel und\n" +
        "Passwort in seine Erstausgabe, und beides gehört nicht auf den Bildschirm.\n"
    )
  );
  // Mitgelesen statt durchgereicht. Nur so kann das Kit hinterher sagen, was der
  // Installer nicht konnte, und nur so bleibt der Klartext vom Bildschirm weg.
  const step = await runInstaller(sshArgs, run.transport, `cd ${target} && ${command.command}`, {
    secrets: [secret.password],
  });
  return {
    ok: step.status === 0,
    status: step.status,
    entry: command.shown,
    target,
    netName: net,
    passwordRef: startRef,
    troubles: step.troubles,
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
      t(
        `\nThe installer bailed out with return code ${arasul.status}. Nothing gets talked up:\n` +
          "read the last output, fix the cause and call the same command again.",
        `\nDer Installer ist mit Rückgabecode ${arasul.status} ausgestiegen. Nichts wird schöngeredet:\n` +
          "lies die letzte Ausgabe, behebe die Ursache und ruf denselben Befehl noch einmal auf."
      )
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
  if (run.transport === "none") {
    return { ok: false, message: t("Without a connection there is no key.", "Ohne Verbindung gibt es keinen Schlüssel.") };
  }
  const company = readFrontmatter(join(ROOT, "business", "company.md")).fields;
  const keyName = `Ara-Kit ${company.name || company.company || "Partner"}`;
  const made = createKey(sshArgs, run.transport, keyName);
  if (!made.ok) return made;
  const ref = `ARASUL_KEY_${secretSlug}`;
  try {
    setSecret(ref, made.key);
  } catch (error) {
    return {
      ok: false,
      message: t(`The key could not be stored: ${error.message}`, `Der Schlüssel ließ sich nicht ablegen: ${error.message}`),
    };
  }
  return { ok: true, ref, label: keyName, script: made.script };
}

let deployKey = null;
if (arg["deploy-key"] || (arasul && arasul.ok)) {
  deployKey = makeDeployKey();
  console.log(
    deployKey.ok
      ? t(
          `\nKit key created as "${deployKey.label}" and stored under ${deployKey.ref}. ` +
            "Its plain text is not displayed and stands in no file of the kit.",
          `\nKit-Schlüssel angelegt als "${deployKey.label}" und hinterlegt unter ${deployKey.ref}. ` +
            "Sein Klartext wird nicht angezeigt und steht in keiner Datei des Kits."
        )
      : t(`\nNo kit key: ${scrub(deployKey.message)}`, `\nKein Kit-Schlüssel: ${scrub(deployKey.message)}`)
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
// Die Geheimnisse liegen in der Ablage, die Akte trägt nur ihre Namen.
if (deployKey?.ok) changes.api_key_ref = deployKey.ref;
if (arasul?.ok) {
  changes.status = "installing";
  changes.net_name = arasul.netName;
  changes.start_password_ref = arasul.passwordRef;
  // Ein frisch installiertes Gerät trägt ein Zertifikat aus seiner eigenen
  // Geräte-CA. Ohne diesen Eintrag scheiterte am 28.08.2026 der erste Aufruf
  // gegen die Schnittstelle an SELF_SIGNED_CERT_IN_CHAIN, direkt nach einer
  // Installation, die das Kit selbst gemacht hatte. Das Kit weiß hier, welches
  // Zertifikat dort liegt: es hat gerade zugesehen, wie es entstanden ist.
  changes.tls = "selfsigned";
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
  ...(arasul
    ? [
        `Arasul installiert: ${arasul.ok ? "Installer durchgelaufen" : `Installer abgebrochen, Rückgabecode ${arasul.status}`}. ` +
          `Artefakt vom ${arasul.fetched || "unbekannt"}, Quelle ${arasul.source || "unbekannt"}, ` +
          `Fassung ${arasul.version || "unbekannt"}, ausgepackt nach ${arasul.target}. ` +
          `Aufruf am Gerät: ${arasul.entry}. Netzname ${arasul.netName}, ` +
          `Startpasswort hinterlegt unter ${arasul.passwordRef}, hier steht es nicht.` +
          (arasul.ok ? " Zertifikat: selbst ausgestellt, aus der Geräte-CA (tls: selfsigned)." : ""),
        ...(arasul.troubles?.length
          ? [
              "Was der Installer nicht konnte, wörtlich aus seiner Ausgabe:",
              ...arasul.troubles.map((line) => `- ${line}`),
            ]
          : []),
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

const ARASUL_SENTENCE = t(
  "With Arasul this device would get a login, a staging slot and going live for apps, " +
    "permissions and flows, plus backup and maintenance from one source.",
  "Mit Arasul bekäme dieses Gerät Anmeldung, Teststand und Live-Schaltung für Apps, " +
    "Freigaben und Flows, dazu Sicherung und Wartung aus einer Hand."
);

const keyRef = deployKey?.ok ? deployKey.ref : existing.api_key_ref || "";
const startPwRef = arasul?.ok ? arasul.passwordRef : existing.start_password_ref || "";
const where = `${customer ? `--customer ${customer} ` : ""}--device ${name}`;

function nextSteps() {
  const steps = [];
  if (run.transport === "none") {
    steps.push(
      t(
        `Access first: node .ara/tools/find-device.mjs --host ${host} shows whether the device answers. ` +
          "Roll out a key along .ara/knowledge/remote-access.md, then check again.",
        `Erst der Zugang: node .ara/tools/find-device.mjs --host ${host} zeigt, ob das Gerät antwortet. ` +
          "Schlüssel ausrollen nach .ara/knowledge/remote-access.md, dann noch einmal prüfen."
      )
    );
    return steps;
  }
  if (run.transport === "local") {
    steps.push(
      t(
        "SSH on this computer is off. Checking happened locally, that is enough for the file. " +
          "For remote access by the kit, remote login has to be on.",
        "SSH auf diesem Rechner ist aus. Geprüft wurde lokal, das reicht für die Akte. " +
          "Für den Fernzugriff durch das Kit muss Remote Login an sein."
      )
    );
  }
  if (found.verdict === "unsupported") {
    steps.push(
      t(
        `Noted in the file since ${changes.noted_on || existing.noted_on}. Without Arasul it ends here. `,
        `Vorgemerkt in der Akte seit ${changes.noted_on || existing.noted_on}. Ohne Arasul endet es hier. `
      ) + ARASUL_SENTENCE
    );
  } else if (found.verdict === "soon") {
    steps.push(
      t(
        `Noted in the file since ${changes.noted_on || existing.noted_on}. As soon as the mirror carries a profile for this ` +
          "hardware (node .ara/tools/mirror.mjs), it continues. Until then: harden access along " +
          ".ara/knowledge/remote-access.md.",
        `Vorgemerkt in der Akte seit ${changes.noted_on || existing.noted_on}. Sobald der Spiegel ein Profil für diese ` +
          "Hardware führt (node .ara/tools/mirror.mjs), geht es weiter. Bis dahin: Zugang härten nach " +
          ".ara/knowledge/remote-access.md."
      )
    );
  } else if (arasulRunning(svc.arasul.state)) {
    // Das Gerät läuft schon. Was jetzt fehlt, ist der Schlüssel, mit dem das Kit
    // Apps darauf rollt, und danach der Kontrakt: er sagt, ob beide zueinander passen.
    if (!keyRef) {
      steps.push(
        t(
          "Arasul runs. For the kit to roll apps onto it, it needs a kit key from the device: ",
          "Arasul läuft. Damit das Kit Apps darauf rollen kann, braucht es einen Kit-Schlüssel vom Gerät: "
        ) + `node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} --deploy-key`
      );
    } else {
      steps.push(
        t(
          `Arasul runs and the kit key lies under ${keyRef}. Does the kit fit this device? `,
          `Arasul läuft und der Kit-Schlüssel liegt unter ${keyRef}. Passt das Kit zu diesem Gerät? `
        ) + `node .ara/tools/app.mjs ${where} --contract`
      );
      // Der Kit-Schlüssel trägt app:deploy. Der erste Mitarbeiter und die erste
      // Freigabe brauchen eine Sitzung, und die gibt es aus dem Startpasswort.
      if (startPwRef) {
        steps.push(
          t(
            "The first employee and their permission belong to the handover. Without a browser that needs " +
              `a session as administrator: node .ara/tools/device.mjs --name ${name}` +
              `${customer ? ` --customer ${customer}` : ""} --admin-login. ` +
              "Route and body of the next call stand in the API reference of the artifact " +
              "(node .ara/tools/mirror.mjs --docs), the procedure in .ara/knowledge/device.md.",
            "Der erste Mitarbeiter und seine Freigabe gehören zur Abnahme. Ohne Browser braucht es dafür " +
              `eine Sitzung als Administrator: node .ara/tools/device.mjs --name ${name}` +
              `${customer ? ` --customer ${customer}` : ""} --admin-login. ` +
              "Weg und Rumpf des nächsten Aufrufs stehen in der API-Referenz des Artefakts " +
              "(node .ara/tools/mirror.mjs --docs), das Verfahren in .ara/knowledge/device.md."
          )
        );
      }
      steps.push(t(`Running operation: /maintain ${place}.`, `Laufender Betrieb: /maintain ${place}.`));
    }
  } else {
    const traces = svc.arasul.state === "traces";
    steps.push(
      (traces
        ? t(
            `Traces of Arasul lie there, but nothing runs: ${svc.arasul.text}. ` +
              "Look first at what of it is still needed. Then install, explicitly over it: ",
            `Es liegen Reste von Arasul da, es läuft aber nichts: ${svc.arasul.text}. ` +
              "Erst nachsehen, was davon noch gebraucht wird. Dann installieren, ausdrücklich darüber hinweg: "
          )
        : t("Install Arasul: ", "Arasul installieren: ")) +
        `node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} --install arasul` +
        `${traces ? " --despite-traces" : ""}. ` +
        t(
          "That fetches the installer with the token from the portal (five per partner free of charge), pushes it onto the device, " +
            "calls it with a start password and a network name and creates the kit key afterwards. Create a runsheet beforehand: ",
          "Das holt den Installer mit dem Token aus dem Portal (fünf je Partner kostenlos), schiebt ihn auf das Gerät, " +
            "ruft ihn mit Startpasswort und Netzname und legt danach den Kit-Schlüssel an. Vorher Laufzettel anlegen: "
        ) +
        `node .ara/tools/runsheet.mjs --create${customer ? ` --customer ${customer}` : ""} --device ${name}. ` +
        t("Procedure in .ara/knowledge/device.md.", "Verfahren in .ara/knowledge/device.md.")
    );
  }
  const missing = SERVICES.filter((w) => svc[w].state === "missing");
  if (missing.length && /linux/i.test(facts.uname || "")) {
    steps.push(
      t("Optional, after a confirmation: ", "Optional, nach Bestätigung: ") +
        `node .ara/tools/device.mjs --name ${name}${customer ? ` --customer ${customer}` : ""} ` +
        `--install ${missing.join(",")}`
    );
  }
  return steps;
}

const steps = nextSteps();

/**
 * Was der Installer nicht konnte, noch einmal beisammen.
 *
 * Am 28.08.2026 liefen „SSH-Hardening fehlgeschlagen" und „Firewall-Setup
 * fehlgeschlagen (nicht kritisch), must be run as root" durch das Kit hindurch:
 * sie standen in mehreren hundert Zeilen Installerausgabe, und danach galt das
 * Gerät als fertig. „Nicht kritisch" sagt der Installer über seinen eigenen
 * Lauf, nicht über das Gerät beim Kunden: ein Gerät ohne Härtung und ohne
 * Firewall geht so in ein fremdes Netz.
 */
function troubleSection() {
  if (!arasul?.troubles?.length) return [];
  return [
    "",
    t("## What the installer could not do", "## Was der Installer nicht konnte"),
    "",
    ...arasul.troubles.map((line) => `- ${line}`),
    "",
    ...t(
      [
        "The kit caught up on none of it. Go through it before the device goes into a customer network:",
        "harden access along .ara/knowledge/remote-access.md, everything else on the device with root rights.",
        "It also stands in the file, under Prüfungen.",
      ],
      [
        "Das Kit hat nichts davon nachgeholt. Geh es durch, bevor das Gerät in ein Kundennetz geht:",
        "Zugang härten nach .ara/knowledge/remote-access.md, alles andere am Gerät mit Root-Rechten.",
        "Es steht auch in der Akte, unter Prüfungen.",
      ]
    ),
  ];
}

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
        start_password_ref: arasul?.ok ? arasul.passwordRef : existing.start_password_ref || null,
        net_name: arasul?.ok ? arasul.netName : existing.net_name || null,
        tls: arasul?.ok ? "selfsigned" : existing.tls || null,
        arasul_install: arasul
          ? {
              ok: arasul.ok,
              version: arasul.version,
              source: arasul.source,
              target: arasul.target,
              entry: arasul.entry,
              // Was der Installer nicht konnte. Leer heißt: er hat nichts gemeldet.
              troubles: arasul.troubles || [],
            }
          : null,
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
  `# ${place}${fresh ? t(" (file created)", " (Akte angelegt)") : ""}`,
  "",
  t(`- File: ${relative(ROOT, file)}`, `- Akte: ${relative(ROOT, file)}`),
  t(
    `- Connection: ${run.transport === "ssh" ? `SSH stands, ${label}` : run.transport === "local" ? `SSH ${label} refused, checked locally` : `none, ${label}`}`,
    `- Verbindung: ${run.transport === "ssh" ? `SSH steht, ${label}` : run.transport === "local" ? `SSH ${label} abgelehnt, lokal geprüft` : `keine, ${label}`}`
  ) + (run.message && run.transport !== "ssh" ? ` (${run.message})` : ""),
];
if (known) {
  lines.push(
    `- Hardware: ${found.hardware}` + (found.gpu ? t(`, graphics ${found.gpu}`, `, Grafik ${found.gpu}`) : ""),
    t(`- System: ${found.os} (${found.arch})`, `- System: ${found.os} (${found.arch})`) +
      (found.memoryGb ? t(`, ${found.memoryGb} GB memory`, `, ${found.memoryGb} GB Arbeitsspeicher`) : "") +
      (found.diskFreeGb !== null ? t(`, ${found.diskFreeGb} GB free`, `, ${found.diskFreeGb} GB frei`) : ""),
    `- Docker: ${svc.docker.text}`,
    `- Ollama: ${svc.ollama.text}`,
    `- Arasul: ${svc.arasul.text}`,
    t(
      `- Kit key: ${keyRef ? `stored under ${keyRef}` : "none"}`,
      `- Kit-Schlüssel: ${keyRef ? `hinterlegt unter ${keyRef}` : "keiner"}`
    ),
    ...(startPwRef
      ? [
          t(
            `- Start password: stored under ${startPwRef}, log in with it over --admin-login`,
            `- Startpasswort: hinterlegt unter ${startPwRef}, Anmeldung damit über --admin-login`
          ),
        ]
      : []),
    "",
    t(`**Verdict: ${VERDICTS[found.verdict]}.** ${found.reason}.`, `**Urteil: ${VERDICTS[found.verdict]}.** ${found.reason}.`)
  );
}
lines.push(...troubleSection());
lines.push("", t("## Next steps", "## Nächste Schritte"), "", ...steps.map((s) => `- ${s}`));
console.log(lines.join("\n"));
process.exit(code);
