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
 *   node .ara/tools/device.mjs --name orin --keys                 which kit keys lie on the device
 *   node .ara/tools/device.mjs --name orin --revoke-key           revoke this kit's own key
 *   node .ara/tools/device.mjs --name orin --admin-login          get a session as administrator
 *   node .ara/tools/device.mjs --name orin --admin-login --token  only the credential, for a script
 *   node .ara/tools/device.mjs --name thor --probe findings.txt   dry run, findings from a file
 *   node .ara/tools/device.mjs --licence                          the way to account and token, no device needed
 *   printf '%s' "$TOKEN" | node .ara/tools/device.mjs --licence --store   check the pasted token, store it
 *   node .ara/tools/device.mjs                                    which files there are
 *   node .ara/tools/device.mjs --name mac --json                  the same as JSON
 *   node .ara/tools/device.mjs --help                             this help, nothing else
 *
 * The file lies under devices/<name>/, in both branches. A customer device lies
 * under customers/<customer>/devices/<name>/, and then --customer comes along.
 *
 * The tool only reads on the device. It changes something only with --install,
 * --deploy-key or --revoke-key, and that is an intervention that belongs confirmed
 * beforehand.
 *
 * Recognition runs without prior knowledge: the tool reads what the device says about
 * itself (vendor, model, architecture, running system) and holds that against the
 * device profiles under .ara/knowledge/devices/. Every profile carries the date it is
 * from and where its knowledge came from. Whether the matching profile in the product's
 * catalogue was verified on the device or only built from manufacturer documentation
 * comes from the mirror, and that line stands before every intervention. Without a
 * mirror the tool says that it cannot read the level instead of guessing one.
 *
 * --probe <file> is the dry run: the findings come from a file instead of from a
 * device. Same recognition, same profile, same verification level, but nothing is
 * written and nothing is changed. That is how a device that is not here gets talked
 * about, and how the self-test carries Thor and DGX Spark.
 *
 * Two ways lead to a device with Arasul, and the tool knows both: one on which the
 * platform already runs only needs the kit key (--deploy-key); one without gets it
 * with --install arasul. How that runs stands in lib/install.mjs.
 *
 * The kit key carries app:deploy and nothing else. A device collects them: every run
 * with --deploy-key leaves one behind. --keys shows what lies there, as the device
 * lists it, and marks the one this kit uses; --revoke-key revokes exactly that one and
 * forgets it. A foreign key it never touches, and the file names none afterwards.
 *
 * For everything an administrator does, --admin-login gives a session: the start password from the installation goes
 * from the secret store straight into the login, back comes a credential, and the
 * password is never displayed. Route and user name come from the artifact when it
 * names them, otherwise from --login-path and --login-user. What the two fields of the
 * login are called there is --login-user-field and --login-password-field. See
 * lib/session.mjs.
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
 *   node .ara/tools/device.mjs --licence                          der Weg zu Konto und Token, ohne Gerät
 *   printf '%s' "$TOKEN" | node .ara/tools/device.mjs --licence --store   eingefügten Token prüfen und hinterlegen
 *   node .ara/tools/device.mjs --name orin --install arasul --net-name werk2
 *   node .ara/tools/device.mjs --name orin --install arasul --despite-traces
 *   node .ara/tools/device.mjs --name orin --deploy-key           Kit-Schlüssel am Gerät anlegen
 *   node .ara/tools/device.mjs --name orin --keys                 welche Kit-Schlüssel am Gerät liegen
 *   node .ara/tools/device.mjs --name orin --revoke-key           den eigenen Kit-Schlüssel widerrufen
 *   node .ara/tools/device.mjs --name orin --admin-login          Sitzung als Administrator holen
 *   node .ara/tools/device.mjs --name orin --admin-login --token  nur den Ausweis, für ein Skript
 *   node .ara/tools/device.mjs --name thor --probe befunde.txt    Trockenlauf, Befunde aus einer Datei
 *   node .ara/tools/device.mjs                                    welche Akten es gibt
 *   node .ara/tools/device.mjs --name mac --json                  dasselbe als JSON
 *   node .ara/tools/device.mjs --help                             diese Hilfe, sonst nichts
 *
 * Die Akte liegt unter devices/<name>/, in beiden Zweigen. Ein Kundengerät liegt
 * unter customers/<kunde>/devices/<name>/, dann kommt --customer dazu.
 *
 * Das Werkzeug liest auf dem Gerät nur. Es ändert erst mit --install,
 * --deploy-key oder --revoke-key etwas, und das ist ein Eingriff, der vorher
 * bestätigt gehört.
 *
 * Die Erkennung läuft ohne Vorwissen: das Werkzeug liest, was das Gerät über sich
 * sagt (Hersteller, Modell, Architektur, laufendes System), und hält das gegen die
 * Geräteprofile unter .ara/knowledge/devices/. Jedes Profil trägt seinen Stand und
 * seine Quelle. Ob das dazugehörige Profil im Katalog des Produkts am Gerät
 * verifiziert oder nur nach Herstellerdoku gebaut wurde, kommt aus dem Spiegel, und
 * diese Zeile steht vor jedem Eingriff. Ohne Spiegel sagt das Werkzeug, dass es die
 * Stufe nicht lesen kann, statt eine zu raten.
 *
 * --probe <datei> ist der Trockenlauf: die Befunde kommen aus einer Datei statt von
 * einem Gerät. Dieselbe Erkennung, dasselbe Profil, derselbe Verifikationsstand, aber
 * geschrieben wird nichts und verändert auch nichts. So wird über ein Gerät geredet,
 * das nicht dasteht, und so führt der Selbsttest Thor und DGX Spark.
 *
 * Zwei Wege führen zu einem Gerät mit Arasul, und das Werkzeug kennt beide: eines,
 * auf dem die Plattform schon läuft, braucht nur noch den Kit-Schlüssel
 * (--deploy-key); eines ohne bekommt sie mit --install arasul. Wie das abläuft,
 * steht in lib/install.mjs.
 *
 * Der Kit-Schlüssel trägt app:deploy und sonst nichts. Ein Gerät sammelt sie: jeder
 * Lauf mit --deploy-key lässt einen liegen. --keys zeigt, was dort liegt, so wie das
 * Gerät es auflistet, und markiert den, mit dem dieses Kit arbeitet; --revoke-key
 * widerruft genau diesen und vergisst ihn. Einen fremden fasst es nie an, und die Akte
 * nennt danach keinen mehr.
 *
 * Für alles, was ein Administrator tut, gibt --admin-login eine Sitzung: das Startpasswort aus der
 * Installation geht dabei aus der Geheimnis-Ablage direkt in die Anmeldung,
 * zurück kommt ein Ausweis, und angezeigt wird das Passwort nie. Weg und
 * Benutzername kommen aus dem Artefakt, wenn es sie nennt, sonst aus --login-path
 * und --login-user. Wie die beiden Felder der Anmeldung dort heißen, sagen
 * --login-user-field und --login-password-field. Siehe lib/session.mjs.
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
import {
  PROBE,
  VERDICTS,
  arasulRunning,
  deployKeyName,
  judge,
  parseProbe,
  services,
  secretSlug as slugFor,
  startPasswordRef,
  startRefName,
} from "./lib/device.mjs";
import { platformOf, readProfiles, supportedDevices, verificationLine, verificationOf } from "./lib/platform.mjs";
import {
  ROOT,
  customerPath,
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
import { forgetSecret, getSecret, hasSecret, otherStore, setSecret } from "./lib/secrets.mjs";
import { baseUrl, call, certificateKind, reason } from "./lib/arasul.mjs";
import { CONTRACT_PATH, catchUpLines, checkVersion } from "./lib/contract.mjs";
import { TOKEN_FIELDS, loginBody, loginSpec, pickToken } from "./lib/session.mjs";
import { BUY_URL, STORE_CALL, buyLines, checkToken, cleanToken, installTargets, knownDevices, tokenShape } from "./lib/licence.mjs";
import {
  createKey,
  fetchMirror,
  installCommand,
  installTarget,
  installerEntry,
  listKeys,
  releaseData,
  revokeKey,
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
 * prüft Arasul kein Token, und das Kit trägt auch keines dorthin. Woher er
 * kommt und was er kostet, steht in lib/licence.mjs, an einer Stelle.
 */
const TOKEN_QUESTION =
  t(
    "The installer needs a token, and none is stored.",
    "Für den Installer braucht es einen Token, und es ist keiner hinterlegt."
  ) +
  "\n" +
  buyLines().join("\n") +
  "\n" +
  t(`Hand it in with: ${STORE_CALL}`, `Hineingeben mit: ${STORE_CALL}`);

helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);
const customer = str(arg.customer);

/**
 * Der Trockenlauf: die Befunde kommen aus einer Datei statt von einem Gerät.
 *
 * Das Kit soll über ein Gerät sprechen können, das nicht dasteht. Ein Partner,
 * der vor der Anschaffung wissen will, was das Kit über einen Thor sagt, bekommt
 * hier dieselbe Erkennung, dasselbe Profil und denselben Verifikationsstand wie
 * an echter Hardware, nur eben von einer Attrappe. Der Selbsttest fährt Thor und
 * DGX Spark genau so, es gibt für beide kein Gerät.
 *
 * **Ein Trockenlauf schreibt nichts.** Keine Akte, kein Merker, kein Eingriff.
 * Eine Akte für ein Gerät, das es nicht gibt, wäre eine Behauptung.
 */
const dryRun = str(arg.probe);
if (dryRun) {
  for (const forbidden of ["install", "deploy-key", "admin-login", "keys", "revoke-key"]) {
    if (arg[forbidden]) {
      fail(
        t(
          `--probe is a dry run, it changes nothing. --${forbidden} needs a device.`,
          `--probe ist ein Trockenlauf, er ändert nichts. --${forbidden} braucht ein Gerät.`
        )
      );
    }
  }
  if (!existsSync(dryRun)) {
    fail(t(`There is no findings file ${dryRun}.`, `Die Befunddatei ${dryRun} gibt es nicht.`));
  }
  if (!str(arg.name)) {
    fail(
      t(
        "A dry run needs a name for the device it is about: --name <name>.",
        "Ein Trockenlauf braucht einen Namen für das Gerät, um das es geht: --name <name>."
      )
    );
  }
}

// --- Der Kaufweg -------------------------------------------------------------

/**
 * Konto, Token, Gerät: ohne eigenen Befehl, ohne Gerät im Aufruf.
 *
 * Wer nach dem Kauf fragt, landet hier, und /device landet hier von selbst,
 * sobald ein unterstütztes Gerät ohne Token vor ihm steht. Ohne --store sagt
 * der Lauf, wo es Konto und Token gibt und ob schon einer liegt. Mit --store
 * liest er den eingefügten Token von der Standardeingabe, prüft die Form, fragt
 * das Portal, legt ihn ab und sagt, auf welche Akten eine Installation passt.
 * Der Token steht dabei nie in einem Argument und nie in einer Ausgabe.
 */
async function licencePath() {
  const stored = hasSecret("ARASUL_TOKEN");
  const devices = knownDevices();
  const targets = installTargets(devices);
  const result = { stored, buy_url: BUY_URL, devices, targets, checked: null, stored_in: null };

  if (arg.store) {
    if (process.stdin.isTTY) {
      fail(
        t(
          `--store reads the token from the pipe, not from an argument: ${STORE_CALL}`,
          `--store liest den Token aus der Leitung, nicht aus einem Argument: ${STORE_CALL}`
        )
      );
    }
    let raw = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) raw += chunk;
    const token = cleanToken(raw);
    const shape = tokenShape(token);
    if (!shape.ok) {
      fail(
        t(
          `That is not a device token: ${shape.reason}. It comes from ${BUY_URL}, under devices.`,
          `Das ist kein Geräte-Token: ${shape.reason}. Er kommt von ${BUY_URL}, unter Geräte.`
        )
      );
    }
    const check = await checkToken(token);
    result.checked = { ok: check.ok, reachable: check.reachable, status: check.status, error: check.error || null, message: check.message };
    if (!check.ok) fail(check.message);
    result.stored_in = setSecret("ARASUL_TOKEN", token);
    result.stored = true;
  }

  const targetLines = () => {
    if (!targets.length) {
      return [
        t(
          "No file of a supported device without Arasul lies here yet. Create one first: /device <name>, " +
            "with address and login name. The verdict says whether Arasul runs on it.",
          "Es liegt noch keine Akte eines unterstützten Geräts ohne Arasul hier. Leg erst eine an: /device <name>, " +
            "mit Adresse und Anmeldename. Das Urteil sagt, ob Arasul darauf läuft."
        ),
      ];
    }
    if (targets.length === 1) {
      return [
        t(
          `One file fits: ${targets[0].place}. Install there, after a confirmation: ${targets[0].call}`,
          `Eine Akte passt: ${targets[0].place}. Dort installieren, nach Bestätigung: ${targets[0].call}`
        ),
      ];
    }
    return [
      t(
        `${targets.length} files fit. Ask through the interview tool which device it should be, then, after a confirmation:`,
        `${targets.length} Akten passen. Frag über das Interview-Werkzeug, welches Gerät es sein soll, dann, nach Bestätigung:`
      ),
      ...targets.map((d) => `  ${d.place}: ${d.call}`),
    ];
  };

  if (arg.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const lines = [t("# Arasul on a device", "# Arasul auf einem Gerät"), ""];
  if (arg.store) {
    lines.push(
      t(`- Token: checked with the portal and stored in ${result.stored_in}. ${result.checked.message}`,
        `- Token: beim Portal geprüft und hinterlegt in ${result.stored_in}. ${result.checked.message}`),
      "",
      ...targetLines()
    );
  } else if (stored) {
    lines.push(
      t("- Token: stored. Nothing to buy for this installation.", "- Token: hinterlegt. Für diese Installation ist nichts zu kaufen."),
      "",
      ...targetLines()
    );
  } else {
    lines.push(
      t("- Token: none stored.", "- Token: keiner hinterlegt."),
      "",
      ...buyLines(),
      "",
      t(
        "Ask through the interview tool whether Arasul should be installed, with the link in the question. " +
          `Yes means: the human opens ${BUY_URL}, creates the account, copies the token and pastes it here. ` +
          `Then: ${STORE_CALL}`,
        "Frag über das Interview-Werkzeug, ob Arasul installiert werden soll, mit dem Link in der Frage. " +
          `Ja heißt: der Mensch öffnet ${BUY_URL}, legt das Konto an, kopiert den Token und fügt ihn hier ein. ` +
          `Dann: ${STORE_CALL}`
      ),
      "",
      t("Which files an installation would fit afterwards:", "Auf welche Akten eine Installation danach passt:"),
      ...(targets.length ? targets.map((d) => `  ${d.place}`) : [t("  none yet, /device <name> first", "  noch keine, erst /device <name>")])
    );
  }
  console.log(lines.join("\n"));
}

if (arg.licence || arg.license || arg.lizenz) {
  await licencePath();
  process.exit(0);
}

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
if (customer && !existsSync(customerPath(customer))) {
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
if (!host && !dryRun) {
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
const secretSlug = slugFor(customer, name);
const startRef = startRefName(customer, name);

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
  let base;
  try {
    base = baseUrl(existing.api_base || host);
  } catch (error) {
    fail(`${error.message}\nNachsehen in ${relative(ROOT, file)}.`);
  }
  const deviceCall = `node .ara/tools/device.mjs${customer ? ` --customer ${customer}` : ""} --name ${name}`;

  /**
   * Ohne Startpasswort ist die Sitzung zu Ende, der Weg aber nicht.
   *
   * Der zweite Fremdtest am 29.08.2026 stand hier. Sein Gerät lief seit Wochen,
   * installiert hatte es jemand anders, und das Kit sagte einen Satz, der nur
   * fuer seine eigenen Installationen stimmte: „steht in der Erstausgabe am
   * Geraet". Auf einem fremden Geraet ist die Erstausgabe fort und das Passwort
   * laengst geaendert. Ein Werkzeug, das an dieser Stelle nur sagt, was fehlt,
   * laesst den Menschen stehen, obwohl es drei Wege gibt und keiner davon das
   * Kit braucht.
   */
  const password = getSecret(ref);
  if (!password) {
    fail(
      t(
        [
          `No start password lies under ${ref}, and the kit cannot fetch one: it comes into being`,
          "during the installation, and this device the kit did not install.",
          "",
          "Three ways, and all three lead on:",
          "",
          "1. Somebody knows it: the administrator of the device, or the first output of the",
          "   installation. Then it goes in once, and the same call works afterwards:",
          `     printf '%s' "<password>" | node .ara/tools/secrets.mjs --set ${ref}`,
          "2. It was changed on the device. Then the same way, with the one that holds today.",
          "3. Nobody knows it. Then the administrator does in the interface what the session would",
          `   have done: ${base} in the browser, logged in as administrator. Employees,`,
          "   permissions and their own password live there, and the kit is needed for none of them.",
          "   Which page carries what stands in the admin handbook of the artifact:",
          "     node .ara/tools/mirror.mjs --docs",
          "   Without a mirror: node .ara/tools/mirror.mjs --refresh fetches the artifact, also",
          "   without an installation.",
          "",
          `For rolling out apps no session is needed, the kit key carries that: ${deviceCall} --deploy-key`,
        ],
        [
          `Unter ${ref} liegt kein Startpasswort, und das Kit kann keines herbeiholen: es entsteht`,
          "bei der Installation, und dieses Gerät hat das Kit nicht installiert.",
          "",
          "Drei Wege, und alle drei führen weiter:",
          "",
          "1. Jemand kennt es: der Administrator des Geräts, oder die Erstausgabe der Installation.",
          "   Dann geht es einmal hinein, und derselbe Aufruf läuft danach durch:",
          `     printf '%s' "<passwort>" | node .ara/tools/secrets.mjs --set ${ref}`,
          "2. Es wurde am Gerät geändert. Dann derselbe Weg, mit dem, das heute gilt.",
          "3. Niemand kennt es. Dann tut der Administrator in der Oberfläche, was die Sitzung getan",
          `   hätte: ${base} im Browser, angemeldet als Administrator. Mitarbeiter,`,
          "   Freigaben und sein eigenes Passwort liegen dort, für keines davon braucht es das Kit.",
          "   Welche Seite was trägt, steht im Admin-Handbuch des Artefakts:",
          "     node .ara/tools/mirror.mjs --docs",
          "   Ohne Spiegel: node .ara/tools/mirror.mjs --refresh holt das Artefakt, auch ohne",
          "   Installation.",
          "",
          `Zum Ausrollen von Apps braucht es keine Sitzung, das trägt der Kit-Schlüssel: ${deviceCall} --deploy-key`,
        ]
      ).join("\n")
    );
  }

  const spec = loginSpec(releaseData(), {
    path: str(arg["login-path"]),
    user: str(arg["login-user"]),
    userField: str(arg["login-user-field"]),
    passwordField: str(arg["login-password-field"]),
  });
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
    if (answer.status === 429) {
      // Die Anmeldung ist begrenzt, und das ist keine Fehlbedienung. Ohne
      // diesen Zweig las die naechste Zeile sich, als stimmten die Feldnamen
      // nicht: am 28.08.2026 war das nach ein paar Laeufen der Fall, und
      // check-docs.mjs klopft bei jedem Lauf einmal mit an.
      fail(
        t(
          `${place} is counting the logins and refuses further ones for now (429). Wait, then the
` +
            "same call again. Every run of check-docs.mjs knocks here once as well.\n",
          `${place} zählt die Anmeldungen und weist weitere vorerst ab (429). Warte, dann derselbe
` +
            "Aufruf noch einmal. Jeder Lauf von check-docs.mjs klopft hier ebenfalls einmal an.\n"
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
          "Which ones this device expects stands in the API reference: node .ara/tools/mirror.mjs --docs\n" +
          "Pass them from there: --login-user-field <name> --login-password-field <name>.\n",
        `${place} hat die Anmeldung nicht angenommen (Status ${answer.status}).\n` +
          `Gerufen wurde POST ${spec.path} mit den Feldern ${spec.userField} und ${spec.passwordField}.\n` +
          "Welche dieses Gerät erwartet, steht in der API-Referenz: node .ara/tools/mirror.mjs --docs\n" +
          "Von dort mitgeben: --login-user-field <name> --login-password-field <name>.\n"
      ) + reason(answer)
    );
  }

  const token = pickToken(answer.data ?? answer.body);
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
const user = str(arg.user) || existing.ssh_user || (isLocal ? userInfo().username : null) || (dryRun ? "" : null);
if (user === null) fail(t("I need the login name on the device: --user <name>.", "Ich brauche den Anmeldenamen auf dem Gerät: --user <name>."));
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

/**
 * Führt das Prüfskript aus: über SSH, oder lokal, wenn das Ziel dieser Rechner
 * ist. Im Trockenlauf wird nichts ausgeführt, die Befunde stehen schon da.
 */
function probe() {
  if (dryRun) {
    return { transport: "dry-run", ssh: "dry-run", output: readFileSync(dryRun, "utf8"), message: "" };
  }
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
const profiles = readProfiles();
const found = judge(facts, profiles);
const svc = services(facts);

// --- Das Profil und sein Verifikationsstand ----------------------------------
//
// Zwei getrennte Auskünfte, und sie kommen aus zwei getrennten Quellen. Welche
// Hardware das hier ist, sagt das Blatt des Kits unter .ara/knowledge/devices/,
// mit Stand und Quelle. Ob das Profil dazu am Gerät verifiziert oder nur nach
// Herstellerdoku gebaut wurde, sagt allein der Katalog des Produkts im Spiegel.
// Das Kit füllt die zweite Auskunft nie aus der ersten auf.

const platform = platformOf(found.profile, found.memoryGb);
const verification = platform.id
  ? verificationOf(platform.id)
  : { level: null, reason: platform.reason || t("no catalogue profile", "kein Katalogprofil") };

/** Was am Gerät erkannt wurde, jede Angabe mit der Stelle, die sie hergibt. */
function recognitionLines() {
  const source = (where) => (where ? t(` (from ${where})`, ` (aus ${where})`) : "");
  return [
    t(
      `- Reachable: ${
        run.transport === "ssh"
          ? `yes, over SSH, ${label}`
          : run.transport === "local"
            ? `this computer itself, SSH ${label} refused`
            : run.transport === "dry-run"
              ? `not checked, dry run from ${dryRun}`
              : `no, ${label}`
      }`,
      `- Erreichbar: ${
        run.transport === "ssh"
          ? `ja, über SSH, ${label}`
          : run.transport === "local"
            ? `dieser Rechner selbst, SSH ${label} abgelehnt`
            : run.transport === "dry-run"
              ? `nicht geprüft, Trockenlauf aus ${dryRun}`
              : `nein, ${label}`
      }`
    ),
    t(`- Vendor: ${found.vendor || "not recognised"}`, `- Hersteller: ${found.vendor || "nicht erkannt"}`) +
      source(found.vendorSource),
    t(`- Model: ${found.hardware}`, `- Modell: ${found.hardware}`) +
      source(facts.dt_model ? "/proc/device-tree/model" : facts.dmi_model ? "/sys/class/dmi/id/product_name" : ""),
    t(`- Architecture: ${found.arch || "not recognised"}`, `- Architektur: ${found.arch || "nicht erkannt"}`),
    t(`- Running system: ${found.os}`, `- Laufendes System: ${found.os}`) +
      (found.kernel ? t(`, kernel ${found.kernel}`, `, Kern ${found.kernel}`) : "") +
      (found.memoryGb ? t(`, ${found.memoryGb} GB memory`, `, ${found.memoryGb} GB Arbeitsspeicher`) : "") +
      (found.diskFreeGb !== null ? t(`, ${found.diskFreeGb} GB free`, `, ${found.diskFreeGb} GB frei`) : ""),
  ];
}

/**
 * Das Profil, sein Alter, seine Quelle und der Verifikationsstand.
 *
 * Dieser Block steht vor jedem Eingriff und in jedem Bericht. Er darf nie
 * fehlen: eine ausgelassene Zeile über den Verifikationsstand liest sich wie
 * eine Bestätigung, und eine Bestätigung ist sie nicht.
 */
function profileLines() {
  const lines = [];
  if (found.profile) {
    lines.push(
      t(
        `- Kit profile: ${found.profile.id}, ${found.profile.vendor} ${found.profile.family}, ` +
          `sheet ${found.profile.sheet}`,
        `- Kit-Profil: ${found.profile.id}, ${found.profile.vendor} ${found.profile.family}, ` +
          `Blatt ${found.profile.sheet}`
      ),
      t(
        `- As of: ${found.profile.as_of}. Source: ${found.profile.source}`,
        `- Stand: ${found.profile.as_of}. Quelle: ${found.profile.source}`
      )
    );
    lines.push(
      platform.id
        ? t(`- Catalogue profile: ${platform.id}`, `- Katalogprofil: ${platform.id}`)
        : t(
            `- Catalogue profile: none named, ${platform.reason}`,
            `- Katalogprofil: keines genannt, ${platform.reason}`
          ),
      `- ${verificationLine(verification)}`
    );
    return lines;
  }
  // Ohne Blatt gibt es auch nichts zu verifizieren. Hier eine Stufe zu melden
  // hieße, über ein Gerät zu sprechen, über das im Kit nichts geschrieben steht.
  lines.push(
    t(
      "- Kit profile: none. No sheet under .ara/knowledge/devices/ fits this hardware.",
      "- Kit-Profil: keines. Kein Blatt unter .ara/knowledge/devices/ passt zu dieser Hardware."
    ),
    t(
      "- Catalogue profile and verification level: nothing to read. Without a sheet the kit names no " +
        "catalogue profile, and without a catalogue profile there is no level it could look up.",
      "- Katalogprofil und Verifikationsstand: nichts zu lesen. Ohne Blatt nennt das Kit kein " +
        "Katalogprofil, und ohne Katalogprofil gibt es keine Stufe, die es nachschlagen könnte."
    )
  );
  return lines;
}

// --- Die Kit-Schlüssel am Gerät ----------------------------------------------

/**
 * Welche Schlüssel am Gerät liegen, und welcher davon dieser hier ist.
 *
 * Ein Gerät sammelt sie. Jeder Lauf mit `--deploy-key` legt einen an, jeder
 * Fremdtest bringt einen mit, und am 29.08.2026 lagen acht davon auf einem Orin,
 * drei davon mit demselben Namen. Wer dann aufräumen will, muss wissen, welcher
 * seiner ist, und diese Frage beantwortet nur die Ablage: der Präfix, den das
 * Gerät nennt, ist der Anfang des Schlüssels, der hier hinterlegt ist.
 *
 * **Die Liste kommt vom Gerät und wird nicht umgeschrieben.** Was in ihr steht,
 * gehört dem Produkt. Das Kit setzt eine Marke an die eigene Zeile und sonst
 * nichts hinzu.
 */
function keyList() {
  // Ohne Verbindung gibt es nichts zu lesen. Der Zweig ist wichtig: `runRemote`
  // faellt ohne SSH auf die lokale Shell zurueck, und ein `find` nach dem Skript
  // liefe dann auf diesem Rechner statt auf dem Geraet.
  if (run.transport === "none") {
    fail(
      t(
        `No connection to ${label}, so nothing can be read about the keys on ${place}.`,
        `Keine Verbindung zu ${label}, also ist über die Schlüssel auf ${place} nichts zu lesen.`
      )
    );
  }
  const stored = existing.api_key_ref ? getSecret(existing.api_key_ref) : null;
  const found = listKeys(sshArgs, run.transport, stored);
  return { stored, ...found };
}

/** Die Liste, gezeigt. Ohne Eingriff. */
function showKeys() {
  const list = keyList();
  if (!list.ok) fail(scrub(list.message));
  if (arg.json) {
    console.log(
      JSON.stringify(
        {
          device: place,
          key_ref: existing.api_key_ref || null,
          mine: list.mine?.prefix || null,
          keys: list.keys.map(({ prefix, mine, line }) => ({ prefix, mine, line })),
        },
        null,
        2
      )
    );
    process.exit(0);
  }
  const deviceCall = `node .ara/tools/device.mjs${customer ? ` --customer ${customer}` : ""} --name ${name}`;
  console.log(
    [
      t(`# Kit keys on ${place}`, `# Kit-Schlüssel auf ${place}`),
      "",
      list.keys.length
        ? t(
            `${list.keys.length} of them, as the device lists them:`,
            `${list.keys.length} Stück, so wie das Gerät sie auflistet:`
          )
        : t("The device lists none.", "Das Gerät führt keinen."),
      "",
      ...list.keys.map((entry) => `  ${entry.line}${entry.mine ? t("   <- this kit", "   <- dieses Kit") : ""}`),
      "",
      list.mine
        ? t(
            `This kit's key is ${list.mine.prefix}, stored under ${existing.api_key_ref}.\n` +
              `Revoke it: ${deviceCall} --revoke-key`,
            `Der Schlüssel dieses Kits ist ${list.mine.prefix}, hinterlegt unter ${existing.api_key_ref}.\n` +
              `Widerrufen: ${deviceCall} --revoke-key`
          )
        : existing.api_key_ref
          ? t(
              `None of them is this kit's. The file names the entry ${existing.api_key_ref}; either ` +
                `nothing lies under it, or it belongs to another device.\n` +
                `A new key for this one: ${deviceCall} --deploy-key`,
              `Keiner davon gehört diesem Kit. Die Akte nennt den Eintrag ${existing.api_key_ref}; entweder ` +
                `liegt darunter nichts, oder er gehört zu einem anderen Gerät.\n` +
                `Ein neuer für dieses: ${deviceCall} --deploy-key`
            )
          : t(
              `No key is stored for ${place}: ${deviceCall} --deploy-key`,
              `Für ${place} ist kein Schlüssel hinterlegt: ${deviceCall} --deploy-key`
            ),
    ].join("\n")
  );
  process.exit(0);
}

/**
 * Was ein Widerruf in die Akte schreibt.
 *
 * Das Protokoll der Akte ist deutsch, wie jeder andere Eintrag darin auch. Es
 * steht hier und nicht unten im Ablauf, damit es beim Lesen ein Absatz bleibt
 * und nicht zwischen zwei Handgriffen steht.
 */
function revokeNote({ prefix, script, ref, forgotten, elsewhere }) {
  const wo = run.transport === "ssh" ? `SSH ${label}` : `lokal, SSH ${label} abgelehnt`;
  return (
    `\n### ${now()} · ${wo}\n` +
    `Kit-Schlüssel ${prefix} am Gerät widerrufen (${script}). ` +
    `Eintrag ${ref} ${forgotten ? `aus der Ablage ${forgotten} genommen` : "lag in der gewählten Ablage nicht"}, ` +
    "api_key_ref in der Akte geleert. Ein neuer entsteht mit --deploy-key." +
    (elsewhere ? ` Derselbe Name liegt in der Ablage ${elsewhere}; der gehört einem anderen Klon und bleibt liegen.` : "") +
    "\n"
  );
}

/**
 * Den eigenen Schlüssel widerrufen. Nur den eigenen.
 *
 * Widerrufen wird, was am Gerät zu dem Wert in der Ablage passt, und nichts
 * sonst. Ein Schlüssel, den ein anderer angelegt hat, gehört diesem Kit nicht,
 * auch wenn er denselben Namen trägt: Namen wiederholen sich, Präfixe nicht.
 *
 * Danach ist der Wert in der Ablage kein Geheimnis mehr, sondern ein toter
 * Zugang, der beim nächsten Aufruf eine 401 ergäbe. Er wird deshalb vergessen,
 * und die Akte trägt keinen Verweis mehr auf ihn. Der Weg zurück ist kein
 * Widerruf des Widerrufs, sondern ein neuer Schlüssel.
 */
function revokeOwnKey() {
  const deviceCall = `node .ara/tools/device.mjs${customer ? ` --customer ${customer}` : ""} --name ${name}`;
  if (!existing.api_key_ref) {
    fail(
      t(
        `The file for ${place} names no kit key, so there is nothing to revoke.\n` +
          `What lies on the device: ${deviceCall} --keys`,
        `Die Akte von ${place} nennt keinen Kit-Schlüssel, also gibt es nichts zu widerrufen.\n` +
          `Was am Gerät liegt: ${deviceCall} --keys`
      )
    );
  }
  const list = keyList();
  if (!list.ok) fail(scrub(list.message));
  if (!list.stored) {
    fail(
      t(
        `Under ${existing.api_key_ref} nothing is stored, so the kit cannot tell which of the ` +
          `${list.keys.length} keys on the device is its own. It revokes none of them.\n` +
          `Whoever knows it revokes it on the device itself, with the prefix from: ${deviceCall} --keys`,
        `Unter ${existing.api_key_ref} liegt nichts, also kann das Kit nicht sagen, welcher der ` +
          `${list.keys.length} Schlüssel am Gerät seiner ist. Es widerruft keinen.\n` +
          `Wer ihn kennt, widerruft ihn am Gerät selbst, mit dem Präfix aus: ${deviceCall} --keys`
      )
    );
  }
  if (!list.mine) {
    fail(
      t(
        `The device lists no key that fits the entry ${existing.api_key_ref}. It was already revoked ` +
          "and removed, or it belongs to another device. Nothing revoked.\n" +
          `What lies there: ${deviceCall} --keys`,
        `Das Gerät führt keinen Schlüssel, der zum Eintrag ${existing.api_key_ref} passt. Er wurde ` +
          "schon widerrufen und entfernt, oder er gehört zu einem anderen Gerät. Widerrufen wurde nichts.\n" +
          `Was dort liegt: ${deviceCall} --keys`
      )
    );
  }

  const done = revokeKey(sshArgs, run.transport, list.mine.prefix);
  if (!done.ok) fail(scrub(done.message));

  const forgotten = forgetSecret(existing.api_key_ref);
  // Was in der ANDEREN Ablage liegt, gehört einem anderen Klon auf diesem
  // Rechner. Es wird genannt und nicht angefasst.
  const elsewhere = otherStore(existing.api_key_ref);
  writeFrontmatter(file, { api_key_ref: "", checked: now() });
  appendFileSync(
    file,
    revokeNote({ prefix: list.mine.prefix, script: done.script, ref: existing.api_key_ref, forgotten, elsewhere })
  );

  console.log(
    [
      t(`# Kit key revoked on ${place}`, `# Kit-Schlüssel auf ${place} widerrufen`),
      "",
      t(
        `- Revoked: ${list.mine.prefix}, the key this kit was using. The device says:`,
        `- Widerrufen: ${list.mine.prefix}, der Schlüssel, mit dem dieses Kit gearbeitet hat. Das Gerät sagt:`
      ),
      ...(done.output ? done.output.split("\n").map((line) => `    ${line}`) : []),
      t(
        `- The entry ${existing.api_key_ref} is out of the store${forgotten ? ` (${forgotten})` : ""}, ` +
          "api_key_ref in the file is empty.",
        `- Der Eintrag ${existing.api_key_ref} ist aus der Ablage heraus${forgotten ? ` (${forgotten})` : ""}, ` +
          "api_key_ref in der Akte ist leer."
      ),
      ...(elsewhere
        ? [
            t(
              `- The same name lies in the other store (${elsewhere}). It belongs to another clone on this ` +
                "computer and stayed where it was.",
              `- Derselbe Name liegt in der anderen Ablage (${elsewhere}). Der gehört einem anderen Klon auf ` +
                "diesem Rechner und ist liegen geblieben."
            ),
          ]
        : []),
      t(
        "- Every other key on the device stayed as it was.",
        "- Jeder andere Schlüssel am Gerät ist geblieben, wie er war."
      ),
      "",
      t(
        `From now on the kit rolls nothing onto this device. A new key: ${deviceCall} --deploy-key`,
        `Ab jetzt rollt das Kit nichts mehr auf dieses Gerät. Ein neuer Schlüssel: ${deviceCall} --deploy-key`
      ),
    ].join("\n")
  );
  process.exit(0);
}

if (arg.keys) showKeys();
if (arg["revoke-key"]) revokeOwnKey();

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

// Vor dem Eingriff, nicht danach. Wer auf einem Gerät etwas verändert, soll
// vorher gelesen haben, worauf sich das Kit dabei stützt und wie belastbar das
// ist. Im reinen Lesebetrieb steht derselbe Block unten im Bericht.
if (wanted.length || arg["deploy-key"]) {
  console.log(
    [
      t("## Device profile, before the start", "## Geräteprofil, vor dem Start"),
      "",
      ...profileLines(),
      "",
    ].join("\n")
  );
}
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
      "Fetching the installer, with the stored token. The mirror comes into being right now.",
      "Installer holen, mit dem hinterlegten Token. Der Spiegel entsteht genau jetzt."
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
  const keyName = deployKeyName(
    readFrontmatter(join(ROOT, "business", "company.md")).fields,
    readFrontmatter(join(ROOT, "business", "profile.md")).fields
  );
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

if (!dryRun) ensureDir(dir);
if (fresh && !dryRun) writeFileSync(file, readFileSync(TEMPLATE, "utf8"));
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
  // Das Katalogprofil steht nur dann in der Akte, wenn der Spiegel es wirklich
  // führt. Sonst wäre es eine Zusage über Modell, Engine und Speicherbudget, die
  // niemand nachlesen kann: die Leistungsbeschreibung liest genau dieses Feld.
  if (platform.id && verification.level) changes.profile = platform.id;
  if (found.verdict !== "supported" && !existing.noted_on) changes.noted_on = today();
  if (!existing.status || existing.status === "planned") changes.status = "delivered";
}
// Die Geheimnisse liegen in der Ablage, die Akte trägt nur ihre Namen.
if (deployKey?.ok) changes.api_key_ref = deployKey.ref;
const pwRef = startPasswordRef({
  noted: existing.start_password_ref,
  installed: arasul?.ok ? arasul.passwordRef : null,
  ref: startRef,
  stored: hasSecret(startRef),
});
if (pwRef) changes.start_password_ref = pwRef;
if (arasul?.ok) {
  changes.status = "installing";
  changes.net_name = arasul.netName;
  // Ein frisch installiertes Gerät trägt ein Zertifikat aus seiner eigenen
  // Geräte-CA. Ohne diesen Eintrag scheiterte am 28.08.2026 der erste Aufruf
  // gegen die Schnittstelle an SELF_SIGNED_CERT_IN_CHAIN, direkt nach einer
  // Installation, die das Kit selbst gemacht hatte. Das Kit weiß hier, welches
  // Zertifikat dort liegt: es hat gerade zugesehen, wie es entstanden ist.
  changes.tls = "selfsigned";
}

/**
 * Und auf einem Gerät, auf dem Arasul schon lief, wird nachgesehen.
 *
 * Das war der Fund des Fremdtests am 29.08.2026: der Eintrag entstand nur nach
 * einer Installation, die das Kit selbst gemacht hatte. Wer ein laufendes Gerät
 * in die Hand bekam, schrieb `tls: selfsigned` von Hand hin, nachdem der erste
 * Aufruf abgebrochen war.
 *
 * Geraten wird nichts: `certificateKind` ruft zweimal, einmal mit Prüfung und
 * einmal ohne, und trägt nur ein, was dabei herauskam. Was nicht zu messen war,
 * bleibt leer, und dann sagt der Abbruch weiter, was zu tun ist.
 */
if (!changes.tls && !existing.tls && arasulRunning(svc.arasul.state) && (existing.api_base || host)) {
  try {
    const art = await certificateKind(baseUrl(existing.api_base || host));
    if (art === "selfsigned") changes.tls = "selfsigned";
  } catch {
    // Die Schnittstelle war nicht zu erreichen. Das ist keine Aussage über ihr
    // Zertifikat, und ein Eintrag daraus wäre eine erfundene.
  }
}
// --- Der Kontrakt, beim ersten Kontakt ---------------------------------------

/**
 * Versteht dieses Kit, was dieses Gerät verspricht?
 *
 * Die Frage gehört hierher und nicht erst an den Deploy. Am 30.08.2026 stand
 * eine Werkstatt auf Kontrakt 3, der Orin führte 5, und der Partner erfuhr es
 * daran, dass `--deploy` mit „Nichts eingespielt" abbrach. Er suchte den Fehler
 * danach in seiner App. Beim ersten Kontakt mit dem Gerät ist die Zahl schon
 * lesbar, und der Weg heraus ist ein Aufruf.
 *
 * Gelesen wird nur der Kontrakt, der einzige Pfad, den das Kit auswendig kennt.
 * Was nicht zu lesen war, wird gesagt und nicht geraten: eine Plattform, die
 * gerade erst hochkommt, ist keine Aussage über ihre Fassung.
 */
async function readContract() {
  const ref = deployKey?.ok ? deployKey.ref : existing.api_key_ref || "";
  const address = existing.api_base || host;
  if (!ref || !address) return null;
  const secret = getSecret(ref);
  if (!secret) return { ok: false, message: t(`${ref} is not in the store.`, `${ref} steht nicht in der Ablage.`) };
  try {
    const answer = await call({
      base: baseUrl(address),
      key: secret,
      path: CONTRACT_PATH,
      insecure: (changes.tls || existing.tls || "").toLowerCase() === "selfsigned",
      timeout: 20_000,
    });
    if (!answer.ok) return { ok: false, message: reason(answer) };
    return { ok: true, version: checkVersion(answer.data) };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

// Gefragt wird, wo eine Schnittstelle zu erwarten ist: Arasul läuft, wurde
// gerade installiert, oder die Akte nennt einen Kit-Schlüssel, also war das Kit
// schon einmal an dieser Schnittstelle. Sonst nicht: eine Absage von einem
// Rechner, auf dem nie etwas lief, ist keine Auskunft.
let contractState = null;
if (
  !dryRun &&
  run.transport !== "none" &&
  (arasulRunning(svc.arasul.state) || arasul?.ok || Boolean(existing.api_key_ref))
) {
  contractState = await readContract();
}
if (contractState?.ok) {
  // Die Zahl des Geräts steht danach in der Akte: /init findet sie dort ohne
  // Gerät wieder und sagt vor jeder Arbeit, dass dieses Kit nachziehen muss.
  changes.contract = contractState.version.device ?? "";
  console.log(
    contractState.version.ok
      ? `\n${contractState.version.text}`
      : [
          "",
          t(
            `This kit does not understand the contract of ${place}.`,
            `Dieses Kit versteht den Kontrakt von ${place} nicht.`
          ),
          contractState.version.text,
        ].join("\n")
  );
} else if (contractState) {
  console.log(
    t(
      `\nThe contract of ${place} could not be read, so the contract version stays unmeasured: ${scrub(contractState.message)}`,
      `\nDer Kontrakt von ${place} war nicht zu lesen, die Kontraktfassung bleibt darum ungemessen: ${scrub(contractState.message)}`
    )
  );
}

if (!dryRun) writeFrontmatter(file, changes);

const entry = [
  `### ${now()} · ${run.transport === "ssh" ? `SSH ${label}` : run.transport === "local" ? `lokal, SSH ${label} abgelehnt` : `keine Verbindung zu ${label}`}`,
  known
    ? `Hardware: ${found.hardware}. System: ${found.os} (${found.arch}). ` +
      `Docker: ${svc.docker.text}. Ollama: ${svc.ollama.text}. Arasul: ${svc.arasul.text}. ` +
      `Urteil: ${found.verdictText} (${found.reason}).`
    : `Keine Verbindung. ${run.message || ""}`.trim(),
  // Profil, Stand, Quelle und Verifikationsstand gehören ins Protokoll und
  // nicht nur auf den Bildschirm: in einem halben Jahr soll nachlesbar sein,
  // worauf sich die Einrichtung dieses Geräts gestützt hat.
  ...(known ? [profileLines().map((line) => line.replace(/^- /, "")).join(" · ")] : []),
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
  ...(contractState
    ? [
        contractState.ok
          ? `Kontrakt gelesen: das Gerät führt Fassung ${contractState.version.device}, dieses Kit versteht bis ` +
            `${contractState.version.kit}. ${contractState.version.ok ? "Sie passen zueinander." : `Das Kit muss nachziehen: ${catchUpLines()[1]}`}`
          : `Kontrakt nicht gelesen, die Fassung des Geräts bleibt ungemessen: ${scrub(contractState.message)}`,
      ]
    : []),
].join("\n");
if (!dryRun) {
  appendFileSync(file, `\n${entry}\n`);
  writeState({ device: name, customer: customer || null });
}

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

/**
 * Der Kaufweg als nächster Schritt: unterstütztes Gerät, nichts von Arasul
 * läuft, kein Token liegt. Hier beginnt er, und nirgends sonst.
 */
function buyStep() {
  return (
t(
        "This device carries Arasul, and no token is stored. Ask through the interview tool whether it should " +
          `be installed, with the link in the question: ${BUY_URL}. `,
        "Dieses Gerät trägt Arasul, und es ist kein Token hinterlegt. Frag über das Interview-Werkzeug, ob es " +
          `installiert werden soll, mit dem Link in der Frage: ${BUY_URL}. `
      ) +
        buyLines().slice(1, 3).join(" ") +
        t(
          ` Yes means: the human pastes the token here, you hand it in with ${STORE_CALL}, and the tool says which file to install on. No means: it stays noted here, nothing else happens.`,
          ` Ja heißt: der Mensch fügt den Token hier ein, du gibst ihn hinein mit ${STORE_CALL}, und das Werkzeug sagt, auf welche Akte installiert wird. Nein heißt: es bleibt hier vermerkt, sonst passiert nichts.`
        )
  );
}

function nextSteps() {
  const steps = [];
  if (dryRun) {
    // Ein Trockenlauf hat kein Gerät, also auch keinen nächsten Schritt daran.
    // Was er kann, ist die Erkennung zeigen, und was er nicht kann, sagt er.
    steps.push(
      t(
        `The findings come from ${dryRun}, not from a device. Nothing was written and nothing was ` +
          "changed. As soon as the device is there, the same run works without --probe: " +
          `node .ara/tools/device.mjs --host <address> --user <name> --name ${name}`,
        `Die Befunde kommen aus ${dryRun}, nicht von einem Gerät. Geschrieben wurde nichts und ` +
          "verändert auch nichts. Sobald das Gerät dasteht, läuft derselbe Lauf ohne --probe: " +
          `node .ara/tools/device.mjs --host <adresse> --user <name> --name ${name}`
      )
    );
    if (!verification.level) {
      steps.push(
        t(
          "The verification level stayed unread. It stands in the mirror, and the mirror comes into " +
            "being at an installation: node .ara/tools/mirror.mjs --refresh fetches it just to read up.",
          "Der Verifikationsstand blieb ungelesen. Er steht im Spiegel, und der entsteht bei einer " +
            "Installation: node .ara/tools/mirror.mjs --refresh holt ihn nur zum Nachlesen."
        )
      );
    }
    if (found.verdict === "supported" && svc.arasul.state !== "running" && !hasSecret("ARASUL_TOKEN")) {
      steps.push(buyStep());
    }
    return steps;
  }
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
  // Steht das Kit hinter dem Gerät, kommt das zuerst. Jeder andere Schritt
  // bricht daran ab, und wer die Reihenfolge umdreht, sucht den Grund später
  // in seiner App.
  if (contractState?.ok && !contractState.version.ok) {
    steps.push(
      t(
        `First the kit, then this device: it carries contract version ${contractState.version.device}, ` +
          `and this kit understands up to ${contractState.version.kit}. `,
        `Erst das Kit, dann dieses Gerät: es führt Kontraktfassung ${contractState.version.device}, ` +
          `und dieses Kit versteht bis ${contractState.version.kit}. `
      ) + catchUpLines()[1]
    );
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
    // Was Arasul brächte, steht im Abschlussblock und nicht auch noch hier:
    // zweimal derselbe Satz liest sich wie ein Verkaufsgespräch.
    steps.push(
      t(
        `Noted in the file since ${changes.noted_on || existing.noted_on}. Without Arasul it ends here, ` +
          "and the rest of the kit works on this computer.",
        `Vorgemerkt in der Akte seit ${changes.noted_on || existing.noted_on}. Ohne Arasul endet es hier, ` +
          "und der Rest des Kits läuft auf diesem Rechner."
      )
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
      // Ob das Kit zu diesem Gerät passt, hat dieser Lauf schon gelesen. Passt
      // es nicht, steht das ganz oben, und die Frage hier noch einmal zu
      // stellen hiesse, eine beantwortete Frage als offen auszugeben.
      if (contractState?.ok && contractState.version.ok) {
        steps.push(
          t(
            `Arasul runs, the kit key lies under ${keyRef}, and the contract of this device fits this kit. ` +
              `The whole contract: node .ara/tools/app.mjs ${where} --contract`,
            `Arasul läuft, der Kit-Schlüssel liegt unter ${keyRef}, und der Kontrakt dieses Geräts passt zu diesem Kit. ` +
              `Der ganze Kontrakt: node .ara/tools/app.mjs ${where} --contract`
          )
        );
      } else if (!contractState?.ok) {
        steps.push(
          t(
            `Arasul runs and the kit key lies under ${keyRef}. Does the kit fit this device? `,
            `Arasul läuft und der Kit-Schlüssel liegt unter ${keyRef}. Passt das Kit zu diesem Gerät? `
          ) + `node .ara/tools/app.mjs ${where} --contract`
        );
      }
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
      // Fund 4 des Fremdtests am 29.08.2026: dass ein Geraet Kit-Schluessel
      // sammelt und man seinen eigenen wiederfinden koennen muss, stand nur im
      // Blatt. Wer nur die naechsten Schritte liest, erfuhr es nicht.
      steps.push(
        t(
          `Which kit keys lie on the device, and which of them is this kit's: node .ara/tools/device.mjs ` +
            `--name ${name}${customer ? ` --customer ${customer}` : ""} --keys`,
          `Welche Kit-Schlüssel am Gerät liegen und welcher davon dieser ist: node .ara/tools/device.mjs ` +
            `--name ${name}${customer ? ` --customer ${customer}` : ""} --keys`
        )
      );
      steps.push(t(`Running operation: /maintain ${place}.`, `Laufender Betrieb: /maintain ${place}.`));
    }
  } else if (!hasSecret("ARASUL_TOKEN")) {
    steps.push(buyStep());
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
          "That fetches the installer with the stored token, pushes it onto the device, " +
            "calls it with a start password and a network name and creates the kit key afterwards. Create a runsheet beforehand: ",
          "Das holt den Installer mit dem hinterlegten Token, schiebt ihn auf das Gerät, " +
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
 * Das Ende auf einem Rechner, der Arasul nicht trägt.
 *
 * Ein Werkzeug, das hier nur "nicht unterstützt" sagt, lässt jemanden mit einem
 * Nein stehen, der gerade zum ersten Mal etwas ausprobiert hat. Es gibt drei
 * Dinge zu sagen, und keines davon ist ein Verkaufsgespräch: welche Geräte es
 * heute trägt, dass Fragen zu Arasul auch ohne Gerät beantwortet werden, und
 * einen ruhigen Satz zur Lizenz. Danach ist Schluss.
 */
function closingLines() {
  if (found.verdict !== "unsupported") return [];
  const carriers = supportedDevices(profiles);
  return [
    "",
    t("## Without a matching device", "## Ohne passendes Gerät"),
    "",
    t(
      `Arasul does not run on this computer. ${ARASUL_SENTENCE}`,
      `Arasul läuft auf diesem Rechner nicht. ${ARASUL_SENTENCE}`
    ),
    "",
    t("Which devices carry it, according to the sheets in the kit:", "Welche Geräte es tragen, nach den Blättern im Kit:"),
    "",
    ...carriers.map(
      (device) =>
        `- ${device.family}: ${VERDICTS[device.support]} (${device.sheet})`
    ),
    "",
    t(
      "Questions about Arasul do not need a device. Ask them here: what it is, what it needs, " +
        "what it does not do. The kit answers them from .ara/knowledge/sales.md and " +
        ".ara/knowledge/extensions.md, and it says when it does not know something.",
      "Fragen zu Arasul brauchen kein Gerät. Stell sie hier: was es ist, was es braucht, was es " +
        "nicht tut. Das Kit beantwortet sie aus .ara/knowledge/sales.de.md und " +
        ".ara/knowledge/extensions.de.md, und es sagt, wenn es etwas nicht weiß."
    ),
    "",
    t(
      "On the licence, calmly: this kit is under the Apache licence 2.0 and stays usable without " +
        "Arasul. Device files, runsheets, calculation and paperwork work on this computer as they " +
        "are. What Arasul costs: an account at " + BUY_URL + " is free and brings one free device token " +
        "for personal use, every further installation is bought, commercial use needs the licence at " +
        "3,000 euros net. The token is a gate in front of the download and no licence check.",
      "Zur Lizenz, ruhig: dieses Kit steht unter der Apache-Lizenz 2.0 und bleibt ohne Arasul " +
        "brauchbar. Geräteakten, Laufzettel, Kalkulation und Papier laufen auf diesem Rechner so, " +
        "wie sie sind. Was Arasul kostet: ein Konto unter " + BUY_URL + " ist kostenlos und bringt einen " +
        "kostenlosen Geräte-Token für den persönlichen Gebrauch, jede weitere Installation wird gekauft, " +
        "kommerzieller Einsatz braucht die Lizenz zu 3.000 Euro netto. Der Token ist eine Schranke vor dem " +
        "Download und keine Lizenzprüfung."
    ),
  ];
}

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
        file: dryRun ? null : relative(ROOT, file),
        dry_run: dryRun || null,
        fresh,
        host,
        user,
        port,
        transport: run.transport,
        ssh: run.ssh,
        ...found,
        // Das Blatt als Pfad, nicht als Objekt: was drinsteht, liest man dort.
        profile: found.profile
          ? {
              id: found.profile.id,
              vendor: found.profile.vendor,
              family: found.profile.family,
              sheet: found.profile.sheet,
              as_of: found.profile.as_of,
              source: found.profile.source,
            }
          : null,
        platform: platform.id,
        platform_reason: platform.reason,
        verification: verification.level,
        verification_reason: verification.reason,
        verification_line: verificationLine(verification),
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
        // Die Fassung des Geräts, gelesen und nicht behauptet. `null` heißt:
        // nicht gemessen, und das ist etwas anderes als "passt".
        contract: contractState?.ok
          ? { device: contractState.version.device, kit: contractState.version.kit, ok: contractState.version.ok }
          : null,
        next: steps,
        licence: { token_stored: hasSecret("ARASUL_TOKEN"), buy_url: BUY_URL, store_call: STORE_CALL },
        closing: closingLines().filter((line) => line && !line.startsWith("#")),
      },
      null,
      2
    )
  );
  process.exit(code);
}

const lines = [
  `# ${place}${dryRun ? t(" (dry run)", " (Trockenlauf)") : fresh ? t(" (file created)", " (Akte angelegt)") : ""}`,
  "",
  dryRun
    ? t(
        `- File: none. A dry run writes nothing, the findings come from ${dryRun}.`,
        `- Akte: keine. Ein Trockenlauf schreibt nichts, die Befunde kommen aus ${dryRun}.`
      )
    : t(`- File: ${relative(ROOT, file)}`, `- Akte: ${relative(ROOT, file)}`),
];
if (run.message && run.transport !== "ssh" && run.transport !== "dry-run") {
  lines.push(t(`- SSH says: ${run.message}`, `- SSH sagt: ${run.message}`));
}
lines.push("", t("## Recognition", "## Erkennung"), "", ...recognitionLines());
if (known) {
  lines.push(
    ...(found.gpu ? [t(`- Graphics: ${found.gpu}`, `- Grafik: ${found.gpu}`)] : []),
    "",
    t("## Device profile", "## Geräteprofil"),
    "",
    ...profileLines(),
    "",
    t("## What is on it", "## Was darauf ist"),
    "",
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
lines.push(...closingLines());
console.log(lines.join("\n"));
process.exit(code);
