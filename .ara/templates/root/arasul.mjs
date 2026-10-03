#!/usr/bin/env node
/**
 * The bridge between this folder and the apps on an Arasul device.
 *
 * One file, runs with Node alone. It comes out of the Ara-Kit, and after laying out it needs the
 * kit no more. It does what an agent in this folder cannot do by itself: hold a credential for a
 * device, sync the folders the device shares with this person, ask which apps the person is
 * assigned, read what each app says about itself, and call the routes an app names, and no others.
 *
 *   node arasul.mjs login <address> --user <name>      log in (the password is asked for, never shown)
 *   node arasul.mjs login <address> --token-stdin      a credential instead of name and password
 *   node arasul.mjs login                              only the proposals and the places, no new login
 *   node arasul.mjs login --approve <checksum>         approve one proposal, per proposal
 *   node arasul.mjs login --withdraw                   take back what approving entered
 *   node arasul.mjs status                             one line on the sync, device, credential, folder, proposals
 *   node arasul.mjs sync                               sync the company folder, write apps/<id>/APP.md
 *   node arasul.mjs sync --plan                        what a sync would move up and down, writing nothing
 *   node arasul.mjs sync --install [--every <min>]     sync in the background: launchd and keychain on a Mac, task scheduler on Windows
 *   node arasul.mjs sync --uninstall                   take the agent back, revoke the token
 *   node arasul.mjs apps                               the assigned apps with their routes, writes APP.md
 *   node arasul.mjs call <app> <route> [name=value ...] [--write] [--method <verb>]
 *
 * The credential lies in ~/.config/arasul/credentials.json (0600; on Windows in %APPDATA%\arasul, readable by
 * the Windows user alone), one entry per device with its
 * address and credential. Never in this folder. The login takes a name and
 * a password, has the device issue a credential for this computer with it, and keeps only that:
 * the session of the login has an end and carries everything the human may do, a credential says
 * who somebody is and opens no administration. Neither the password nor anything of it is stored.
 * ARASUL_CONFIG_DIR names another folder for it.
 *
 * `sync` asks the device where its file service lies and which folders this person has, and lays
 * each one down at its real place in this tree: the room of the root at the top of this folder,
 * a folder of level 1 as a folder at the top, one of level 2 below its parent. The syncing itself
 * is done by the command line client of the file service, unpacked out of its desktop package;
 * --client names where it lies. The client logs in with the same password as the device, so `sync`
 * asks for it and stores it nowhere, the sync in the background aside. What a machine makes, what belongs to this computer and what
 * the client writes itself stays out. `sync` also writes sicht.md, the view of this person: from
 * the device as soon as it delivers one, until then out of what the device says about folders and
 * apps. The state of the last sync lies next to the credential, in firmenordner.json.
 *
 * The vendor's client is offered by `login` and `sync --install` when it is missing, and
 * `--fetch-client` fetches it from the vendor's releases, checked against its checksum, unpacked next
 * to the credential and installed nowhere. The device names every address of its file service; the
 * first one that answers from here is taken.
 *
 * On Windows the same job goes to the task scheduler (a task of the person logged in, a launcher without
 * a window, the log written by node itself) and the access lies in a file only that Windows user can read
 * (icacls), where a Mac has the keychain. The vendor's desktop app is installed by hand there.
 *
 * `sync --install` hands the sync to launchd on a Mac: an agent of the person logged in runs
 * `sync --background` every five minutes (--every names another interval), and an app token of the
 * file service, issued once with the password, lies in the keychain for it and in no file. The
 * credential is asked first at every run, so revoking it on the device stops the sync. A conflict
 * or an error comes as a notification of macOS, once per state. `status` says in its first line
 * when the last sync went through, how much changed here since, and how many conflicts lie in the
 * tree. `sync --uninstall` takes the agent back and revokes the token. Before it sets anything up,
 * `--install` lets launchd run a check once and reads what launchd's node reaches: on a Mac it does
 * not get into the local network, and the line says so with the way out.
 *
 * Where the files that make the root differ, a newer bridge takes the place of an older one on both
 * sides by itself. Everything else stops sync for a person who writes the root, until `--keep-mine`
 * moves the device's version into `.claude/device-old/<time>/` on the device.
 *
 * What never goes along: what a machine makes, what belongs to this computer, `.env` and `.env.*`
 * at every depth, and what the .gitignore at the top of this root leaves out. `sync --plan` shows
 * beforehand, per folder, how many files of what size would go up and down, which ones conflict
 * and what stays home, and writes nothing. What the client deletes here because it was deleted on
 * the device is kept in a trash next to the credential, and the output says where. A folder the
 * device no longer names, withdrawn from this person or thrown away, never goes into the root: sync
 * moves it next to the root, into `<root>-withdrawn/`, before the client runs, and deletes nothing.
 *
 * `deploy` puts this root onto the device: the check script runs first and a finding stops it,
 * then the tree goes into the room of the root through the same client, and a download into a
 * throwaway folder proves what arrived. The room is made as an administrator when it is missing,
 * with a session that lives for exactly those requests. settings.json, hooks, .git and
 * node_modules never go along, nor do the folders the device shares separately.
 *
 * `call` calls only routes that the app names in its field `agent`, fetched fresh from the app
 * with every call. A route that changes something needs --write. The proposal of this root allows
 * `apps` and the reading form of `call` without asking: with --write the agent asks the human.
 * The password and the token are never written to the output. The certificate of a device that
 * carries its own is pinned once at login with --insecure, not switched off.
 *
 * `--settings <file>` names another settings file than the agent's own for the proposals,
 * `--device <name>` another device than the last one logged in to.
 *
 * === deutsch ===
 *
 * Die Brücke zwischen diesem Ordner und den Apps auf einem Arasul-Gerät.
 *
 * Eine Datei, läuft mit Node allein. Sie kommt aus dem Ara-Kit und braucht es nach dem Anlegen
 * nicht mehr. Sie tut, was ein Agent in diesem Ordner nicht selbst kann: einen Ausweis für ein
 * Gerät halten, die Ordner abgleichen, die das Gerät diesem Menschen freigibt, fragen, welche
 * Apps ihm zugewiesen sind, lesen, was jede App über sich sagt, und die Routen aufrufen, die eine
 * App nennt, und keine anderen.
 *
 *   node arasul.mjs login <adresse> --user <name>      anmelden (das Passwort wird gefragt, nie gezeigt)
 *   node arasul.mjs login <adresse> --token-stdin      einen Ausweis statt Name und Passwort
 *   node arasul.mjs login                              nur Vorschläge und Orte, keine neue Anmeldung
 *   node arasul.mjs login --approve <prüfsumme>        einen Vorschlag freigeben, je Vorschlag
 *   node arasul.mjs login --withdraw                   zurücknehmen, was das Freigeben eintrug
 *   node arasul.mjs status                             eine Zeile zum Abgleich, Gerät, Ausweis, Ordner, Vorschläge
 *   node arasul.mjs sync                               den Firmenordner abgleichen, apps/<id>/APP.md schreiben
 *   node arasul.mjs sync --plan                        was ein Abgleich hoch und runter bewegte, ohne zu schreiben
 *   node arasul.mjs sync --install [--every <min>]     Abgleich im Hintergrund: launchd und Schlüsselbund am Mac, Aufgabenplanung unter Windows
 *   node arasul.mjs sync --uninstall                   Agent zurücknehmen, Token widerrufen
 *   node arasul.mjs apps                               die zugewiesenen Apps mit ihren Routen, schreibt APP.md
 *   node arasul.mjs call <app> <route> [name=wert ...] [--write] [--method <verb>]
 *
 * Der Ausweis liegt in ~/.config/arasul/credentials.json (0600; unter Windows in %APPDATA%\arasul, nur für den
 * Windows-Benutzer lesbar), je Gerät ein Eintrag mit Adresse
 * und Ausweis. Nie in diesem Ordner. Die Anmeldung nimmt Name und Passwort,
 * lässt sich damit vom Gerät einen Ausweis für diesen Rechner ausstellen und behält nur den: die
 * Sitzung der Anmeldung hat ein Ende und trägt alles, was der Mensch darf, ein Ausweis sagt, wer
 * jemand ist, und öffnet keine Verwaltung. Weder das Passwort noch etwas davon wird abgelegt.
 * ARASUL_CONFIG_DIR nennt einen anderen Ordner dafür.
 *
 * `sync` fragt das Gerät, wo sein Dateidienst liegt und welche Ordner dieser Mensch hat, und legt
 * jeden an seine echte Stelle in diesem Baum: den Raum der Wurzel oben in diesen Ordner, einen
 * Ordner der Ebene 1 als Ordner oben, einen der Ebene 2 unter seinen Eltern. Das Abgleichen
 * selbst tut der Kommandozeilen-Klient des Dateidienstes, entpackt aus seinem Desktop-Paket;
 * --client nennt, wo er liegt. Der Klient meldet sich mit demselben Passwort an wie das Gerät,
 * also fragt `sync` danach und legt es nirgends ab, den Abgleich im Hintergrund ausgenommen. Was eine Maschine macht, was zu diesem Rechner
 * gehört und was der Klient selbst schreibt, bleibt draußen. `sync` schreibt außerdem sicht.md,
 * die Sicht dieses Menschen: vom Gerät, sobald es eine liefert, bis dahin aus dem, was das Gerät
 * über Ordner und Apps sagt. Der Stand des letzten Abgleichs liegt neben dem Ausweis, in
 * firmenordner.json.
 *
 * Den Klienten des Herstellers bieten `login` und `sync --install` an, wenn er fehlt, und
 * `--fetch-client` holt ihn aus den Veröffentlichungen des Herstellers, geprüft an seiner
 * Prüfsumme, entpackt neben den Ausweis und nirgends installiert. Das Gerät nennt jede Adresse
 * seines Dateidienstes; genommen wird die erste, die von hier antwortet.
 *
 * Unter Windows geht dieselbe Arbeit an die Aufgabenplanung (eine Aufgabe des angemeldeten Menschen, ein
 * Starter ohne Fenster, das Protokoll schreibt node selbst) und der Zugang liegt in einer Datei, die nur dieser
 * Windows-Benutzer lesen kann (icacls), wo ein Mac den Schlüsselbund hat. Die Desktop-App des Herstellers wird dort
 * von Hand installiert.
 *
 * `sync --install` übergibt den Abgleich am Mac an launchd: ein Agent des angemeldeten Menschen
 * führt alle fünf Minuten `sync --background` aus (--every nennt einen anderen Abstand), und ein
 * App-Token des Dateidienstes, einmal mit dem Passwort ausgestellt, liegt dafür im Schlüsselbund
 * und in keiner Datei. Der Ausweis wird bei jedem Lauf zuerst gefragt, ein am Gerät widerrufener Ausweis hält den
 * Abgleich also an. Ein Konflikt oder ein Fehler kommt als Mitteilung von macOS, einmal je Stand.
 * `status` sagt in seiner ersten Zeile, wann der letzte Abgleich durchging, wie viel sich hier
 * seitdem geändert hat und wie viele Konflikte im Baum liegen. `sync --uninstall` nimmt den Agenten
 * zurück und widerruft das Token. Bevor es etwas einrichtet, lässt `--install` launchd einmal
 * prüfen und liest, was node aus launchd erreicht: am Mac kommt es nicht ins lokale Netz, und die
 * Zeile sagt das mit dem Ausweg.
 *
 * Wo die Dateien, die die Wurzel ausmachen, verschieden sind, löst eine neuere Brücke die ältere auf
 * beiden Seiten von selbst ab. Alles andere hält sync für jemanden an, der die Wurzel schreibt, bis
 * `--keep-mine` die Fassung des Geräts am Gerät nach `.claude/geraet-alt/<zeit>/` legt.
 *
 * Was nie mitgeht: was eine Maschine macht, was zu diesem Rechner gehört, `.env` und `.env.*` in
 * jeder Tiefe, und was die .gitignore oben in dieser Wurzel auslässt. `sync --plan` zeigt vorher je
 * Ordner, wie viele Dateien welcher Größe hoch und runter gingen, welche in Konflikt stehen und was
 * zu Hause bleibt, und schreibt nichts. Was der Klient hier löscht, weil es am Gerät gelöscht
 * wurde, bleibt in einem Papierkorb neben dem Ausweis, und die Ausgabe sagt, wo. Ein Ordner, den
 * das Gerät nicht mehr nennt, entzogen oder weggeworfen, geht nie in die Wurzel: sync verschiebt
 * ihn vor dem Klienten neben die Wurzel, nach `<wurzel>-entzogen/`, und löscht nichts.
 *
 * `deploy` legt diese Wurzel aufs Gerät: zuerst läuft das Prüfskript, und ein Befund hält an,
 * dann geht der Baum über denselben Klienten in den Raum der Wurzel, und ein Herunterladen in
 * einen Wegwerfordner beweist, was angekommen ist. Der Raum ist die Wurzel des Geräts, Ebene 0
 * mit der Art wurzel, unter der Kennung, die das Gerät nennt. Führt das Gerät keine, wird sie als
 * Administrator angelegt, mit einer Sitzung, die genau für diese Anfragen lebt; führt es eine,
 * wird nie eine zweite angelegt. settings.json, Hooks, .git und node_modules gehen nie mit, die
 * Ordner, die das Gerät einzeln freigibt, auch nicht.
 *
 * `call` ruft nur Routen auf, die die App in ihrem Feld `agent` nennt, bei jedem Aufruf frisch
 * von der App geholt. Eine Route, die etwas ändert, verlangt --write. Der Vorschlag dieser Wurzel
 * erlaubt `apps` und die lesende Form von `call` ohne Rückfrage: mit --write fragt der Agent den
 * Menschen. Das Passwort und das Token stehen nie in der Ausgabe. Das Zertifikat eines Geräts mit
 * eigenem wird bei der Anmeldung einmal mit --insecure festgehalten, nicht abgeschaltet.
 *
 * `--settings <datei>` nennt für die Vorschläge eine andere Einstellungsdatei als die des Agenten
 * selbst, `--device <name>` ein anderes Gerät als das Standardgerät.
 */

import { spawnSync } from "node:child_process";
import { X509Certificate, createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { Agent as HttpAgent, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { homedir, hostname, tmpdir, userInfo } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { connect as tlsConnect } from "node:tls";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * The kit version this bridge came with. Where two bridges meet in the room of the root, the newer
 * one takes the place of the older one on both sides; the kit's selftest holds it equal to the
 * kit's own version.
 */
const BRIDGE = "0.66.1";

const HERE = dirname(fileURLToPath(import.meta.url));
// The root is where this file lies: `node arasul.mjs` works from every folder.
const ROOT = HERE;

/**
 * The system this runs on. ARASUL_PLATFORM names another one, for a test that stands in for a
 * system it is not run on: the kit's selftest lets a Mac act as Windows with it, and stands in for
 * icacls and schtasks with programs of its own. Nobody else needs it.
 */
const PLATFORM = process.env.ARASUL_PLATFORM || process.platform;
const IS_WIN = PLATFORM === "win32";
const IS_MAC = PLATFORM === "darwin";

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

const META = readJson(join(ROOT, ".claude", "root.json"), null);
// Without a root the language of this computer decides: a root that is still to come down from
// the device has no root.json yet, and the first sync speaks before it arrives.
let german = META ? META.language === "de" : /^de/i.test(process.env.LANG || (IS_WIN ? Intl.DateTimeFormat().resolvedOptions().locale : "") || "");
const t = (en, de) => (german ? de : en);
/** The kit's check reads `readAgent` in the language of its own profile, not of a root. */
export function speak(language) {
  german = language === "de";
}

/**
 * What this file assumes about the device. These are statements about the product, and like every
 * one of them they belong checked on a device: the routes are the ones the kit's documentation
 * self-test knocks at (`check-docs.mjs`). As of 2026-09-22, out of the API reference of the
 * product. A device that says otherwise wins, and the message of a refusal names the route.
 */
const DEVICE = Object.freeze({
  login: "api/auth/login",
  userField: "username",
  passwordField: "password",
  session: "api/auth/session",
  credentials: "api/ausweise",
  mine: "api/apps/meine",
  logout: "api/auth/logout",
  folders: "api/firmenordner",
  // The question before a sync, since 2026-09-28: 409 GRENZE_ERREICHT with a sentence when it does not fit.
  fits: "api/firmenordner/passt",
  // The view of a person, as the device delivers it since 2026-09-22. A 404 here means: not yet.
  view: "api/firmenordner/sicht",
  // Administration of the company folder: a session, never a credential.
  rooms: "api/firmenordner/ordner",
  appBase: (id) => `apps/${id}/api/`,
  agent: "agent",
});

const METHODS = Object.freeze(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const PARAM_TYPES = Object.freeze(["string", "number", "integer", "boolean"]);
const APP_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;
const TOKEN_FIELDS = ["token", "access_token", "accesstoken", "zugang", "sitzung", "jwt", "bearer", "id_token"];
const MAX_ANSWER = 50 * 1024 * 1024;

// --- The field `agent` ---------------------------------------------------------------------
// The one place that knows its shape. The kit's `app.mjs --check` reads this very function, so
// what the check calls well formed is what this file accepts.

/** One line, no control characters, no backticks: text that comes from an app is data. */
function oneLine(value, max = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/`/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** A path relative to the app's interface: no scheme, no `..`, no query, no `//`. */
export function relativePath(path) {
  if (typeof path !== "string") return null;
  const bare = path.replace(/^\/+/, "");
  if (!bare || bare.length > 200 || !/^[A-Za-z0-9._~\-/]+$/.test(bare)) return null;
  const parts = bare.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null;
  return bare;
}

/**
 * The field `agent` of an app: a list of routes, each with `method`, `path`, `purpose`, `params`
 * (`name`, `type`, `required`) and `writes`. Returns the routes that are well formed and one
 * problem per thing that is not. What is not listed, the CLI does not call.
 */
export function readAgent(field) {
  const routes = [];
  const problems = [];
  if (!Array.isArray(field)) {
    return { routes, problems: [t("agent is not a list of routes", "agent ist keine Liste von Routen")] };
  }
  const seen = new Set();
  field.forEach((entry, index) => {
    const at = `agent[${index}]`;
    const fail = (text) => problems.push(`${at}: ${text}`);
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(t("is not an object", "ist kein Objekt"));
      return;
    }
    const known = ["method", "path", "purpose", "params", "writes"];
    const stray = Object.keys(entry).filter((key) => !known.includes(key));
    if (stray.length) fail(t(`unknown field ${stray.join(", ")}`, `unbekanntes Feld ${stray.join(", ")}`));
    let ok = true;
    if (!METHODS.includes(entry.method)) {
      fail(t(`method must be one of ${METHODS.join(", ")}`, `method muss eines von ${METHODS.join(", ")} sein`));
      ok = false;
    }
    const path = relativePath(entry.path);
    if (!path) {
      fail(t("path must be relative to the app's interface, without .. and without a query", "path muss relativ zur Schnittstelle der App sein, ohne .. und ohne Anfrage"));
      ok = false;
    }
    const purpose = typeof entry.purpose === "string" ? entry.purpose.trim() : "";
    if (!purpose || /[\r\n]/.test(purpose) || purpose.length > 200) {
      fail(t("purpose must be one sentence on one line, at most 200 characters", "purpose muss ein Satz in einer Zeile sein, höchstens 200 Zeichen"));
      ok = false;
    }
    if (typeof entry.writes !== "boolean") {
      fail(t("writes must be true or false", "writes muss true oder false sein"));
      ok = false;
    } else if (["PUT", "PATCH", "DELETE"].includes(entry.method) && !entry.writes) {
      fail(t(`${entry.method} changes something, writes has to be true`, `${entry.method} ändert etwas, writes muss true sein`));
      ok = false;
    }
    const params = [];
    if (!Array.isArray(entry.params)) {
      fail(t("params must be a list, empty if the route takes none", "params muss eine Liste sein, leer, wenn die Route keine nimmt"));
      ok = false;
    } else {
      entry.params.forEach((param, at2) => {
        const label = `${at}.params[${at2}]`;
        if (!param || typeof param !== "object" || Array.isArray(param)) {
          problems.push(`${label}: ${t("is not an object", "ist kein Objekt")}`);
          ok = false;
          return;
        }
        const strayParam = Object.keys(param).filter((key) => !["name", "type", "required"].includes(key));
        if (strayParam.length) problems.push(`${label}: ${t(`unknown field ${strayParam.join(", ")}`, `unbekanntes Feld ${strayParam.join(", ")}`)}`);
        if (typeof param.name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(param.name)) {
          problems.push(`${label}: ${t("name must be a plain identifier", "name muss eine einfache Kennung sein")}`);
          ok = false;
        } else if (params.some((known2) => known2.name === param.name)) {
          problems.push(`${label}: ${t(`${param.name} stands there twice`, `${param.name} steht doppelt da`)}`);
          ok = false;
        }
        if (!PARAM_TYPES.includes(param.type)) {
          problems.push(`${label}: ${t(`type must be one of ${PARAM_TYPES.join(", ")}`, `type muss eines von ${PARAM_TYPES.join(", ")} sein`)}`);
          ok = false;
        }
        if (typeof param.required !== "boolean") {
          problems.push(`${label}: ${t("required must be true or false", "required muss true oder false sein")}`);
          ok = false;
        }
        if (ok) params.push({ name: param.name, type: param.type, required: param.required });
      });
    }
    if (ok) {
      const key = `${entry.method} ${path}`;
      if (seen.has(key)) {
        fail(t(`${key} stands there twice`, `${key} steht doppelt da`));
        return;
      }
      seen.add(key);
      routes.push({ method: entry.method, path, purpose, params, writes: entry.writes });
    }
  });
  return { routes, problems };
}

// --- Output and arguments ------------------------------------------------------------------

const say = (line = "") => process.stdout.write(`${line}\n`);
const warn = (line) => process.stderr.write(`${line}\n`);

class Stop extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}
const stop = (message, code = 1) => {
  throw new Stop(message, code);
};

const FLAGS_WITH_VALUE = ["user", "name", "approve", "device", "method", "settings", "client", "credential-name", "every", "language"];
const FLAGS_ALONE = ["write", "insecure", "password-stdin", "token-stdin", "withdraw", "json", "help", "plan", "keep-mine", "install", "uninstall", "background", "reach", "fetch-client", "default"];

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const cut = arg.indexOf("=");
    const name = arg.slice(2, cut < 0 ? undefined : cut);
    if (FLAGS_ALONE.includes(name)) {
      if (cut >= 0) stop(t(`--${name} takes no value.`, `--${name} nimmt keinen Wert.`), 2);
      out.flags[name] = true;
    } else if (FLAGS_WITH_VALUE.includes(name)) {
      const value = cut >= 0 ? arg.slice(cut + 1) : argv[++i];
      if (value === undefined || (cut < 0 && value.startsWith("--"))) stop(t(`--${name} needs a value.`, `--${name} braucht einen Wert.`), 2);
      (out.flags[name] ||= []).push(value);
    } else {
      const near = [...FLAGS_ALONE, ...FLAGS_WITH_VALUE].find((known) => known.startsWith(name) || name.startsWith(known));
      stop(t(`Unknown switch --${name}${near ? `, did you mean --${near}?` : ""}`, `Unbekannter Schalter --${name}${near ? `, meintest du --${near}?` : ""}`), 2);
    }
  }
  return out;
}

const one = (args, name) => args.flags[name]?.[args.flags[name].length - 1];

// --- The credential ------------------------------------------------------------------------

// On Windows the place for what belongs to one person's programs is %APPDATA%, not a dot folder.
const CONFIG_DIR = process.env.ARASUL_CONFIG_DIR
  ? resolve(process.env.ARASUL_CONFIG_DIR)
  : IS_WIN
    ? join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "arasul")
    : join(homedir(), ".config", "arasul");
const CREDENTIALS = join(CONFIG_DIR, "credentials.json");

// --- Files for this person alone ------------------------------------------------------------
// On a Mac or Linux that is a file mode. Windows knows no mode: a file there is read by the people
// its access list names, so the list is cut down to this one user with icacls, which every Windows
// brings. A folder gets the list with the rule that its files inherit it, so everything that is
// made in it later is private from its first byte. Measured on Windows: not yet, see the steps in
// the pull request of K26.

const ICACLS = process.env.ARASUL_ICACLS || "icacls";
/** Who may read: the Windows user that runs this, as DOMAIN\name. */
const windowsUser = () => `${process.env.USERDOMAIN ? `${process.env.USERDOMAIN}\\` : ""}${process.env.USERNAME || userInfo().username}`;
/** The groups whose rule in an access list means "others can read this". */
const OPEN_TO_OTHERS = /(?:^|\s)(?:Everyone|BUILTIN\\Users|NT AUTHORITY\\Authenticated Users|[^\s:\\]+\\Domain Users):/im;

/** Cut the access list of a file or folder down to this user. True when icacls took it (or here is no Windows). */
function ownerOnly(path, { folder = false } = {}) {
  if (!IS_WIN) {
    try {
      chmodSync(path, folder ? 0o700 : 0o600);
    } catch {
      return false;
    }
    return true;
  }
  const run = spawnSync(ICACLS, [path, "/inheritance:r", "/grant:r", `${windowsUser()}:${folder ? "(OI)(CI)F" : "F"}`], { encoding: "utf8", timeout: 30_000, windowsHide: true });
  return run.status === 0;
}

/** Can anybody else read this? On Windows by the access list, elsewhere by the mode. */
function openToOthers(path) {
  if (!IS_WIN) return Boolean(statSync(path).mode & 0o077);
  const run = spawnSync(ICACLS, [path], { encoding: "utf8", timeout: 30_000, windowsHide: true });
  return run.status === 0 && OPEN_TO_OTHERS.test(run.stdout || "");
}

let configSecured = false;
/** The folder of the credential exists and, on Windows, is private. Said once if icacls did not take it. */
function ensureConfigDir() {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  if (IS_WIN && !configSecured) {
    configSecured = true;
    if (!ownerOnly(CONFIG_DIR, { folder: true })) {
      warn(t(
        `${CONFIG_DIR} could not be restricted to your Windows user (icacls). It lies in your own profile, which other users do not read by default. Check with: icacls "${CONFIG_DIR}"`,
        `${CONFIG_DIR} ließ sich nicht auf deinen Windows-Benutzer beschränken (icacls). Er liegt in deinem eigenen Profil, das andere Benutzer standardmäßig nicht lesen. Prüfen mit: icacls "${CONFIG_DIR}"`
      ));
    }
  }
}

const privateHint = () => (IS_WIN ? t("readable by your Windows user only", "nur für deinen Windows-Benutzer lesbar") : t("mode 0600", "Rechte 0600"));

function readCredentials() {
  if (!existsSync(CREDENTIALS)) return { version: 1, devices: {} };
  if (openToOthers(CREDENTIALS)) {
    ownerOnly(CREDENTIALS);
    warn(IS_WIN
      ? t(`${CREDENTIALS} was readable by other users. Restricted to your Windows user.`, `${CREDENTIALS} war für andere Benutzer lesbar. Auf deinen Windows-Benutzer beschränkt.`)
      : t(`${CREDENTIALS} was readable by others. Set to 0600.`, `${CREDENTIALS} war für andere lesbar. Auf 0600 gesetzt.`));
  }
  const data = readJson(CREDENTIALS, null);
  if (!data || typeof data.devices !== "object") {
    stop(t(`${CREDENTIALS} is not readable. Nothing was changed. Look at it or delete it and log in again.`, `${CREDENTIALS} lässt sich nicht lesen. Nichts wurde geändert. Sieh sie an oder lösche sie und melde dich neu an.`));
  }
  return data;
}

function writeCredentials(data) {
  ensureConfigDir();
  const temporary = join(CONFIG_DIR, `.credentials-${process.pid}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  ownerOnly(temporary);
  renameSync(temporary, CREDENTIALS);
}

/** The device this call means: --device, else the default device, else the only one. */
function chooseDevice(args) {
  const data = readCredentials();
  const names = Object.keys(data.devices);
  const wanted = one(args, "device") || data.default || (names.length === 1 ? names[0] : null);
  if (!names.length) {
    stop(t("No device is logged in. First: node arasul.mjs login <address> --user <name>", "Kein Gerät ist angemeldet. Zuerst: node arasul.mjs login <adresse> --user <name>"));
  }
  if (!wanted || !data.devices[wanted]) {
    stop(t(`Which device? Known: ${names.join(", ")}. Say --device <name>.`, `Welches Gerät? Bekannt: ${names.join(", ")}. Sag --device <name>.`));
  }
  return { name: wanted, entry: data.devices[wanted] };
}

/** The expiry of a session token that is a JWT, in milliseconds, or null. */
function expiryOf(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function tokenIn(node, depth = 0) {
  if (typeof node === "string") return node.trim() || null;
  if (!node || typeof node !== "object" || depth > 3) return null;
  for (const field of TOKEN_FIELDS) {
    if (!(field in node)) continue;
    const found = tokenIn(node[field], depth + 1);
    if (found) return found;
  }
  for (const value of Object.values(node)) {
    if (!value || typeof value !== "object") continue;
    const found = tokenIn(value, depth + 1);
    if (found) return found;
  }
  return null;
}

// --- Talking to the device -----------------------------------------------------------------

function baseOf(input) {
  const raw = String(input || "").trim();
  if (!raw) stop(t("The address of the device is missing.", "Die Adresse des Geräts fehlt."), 2);
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    stop(t(`'${raw}' is not an address.`, `'${raw}' ist keine Adresse.`), 2);
  }
  if (url.username || url.password) stop(t("Leave name and password out of the address.", "Lass Name und Passwort aus der Adresse weg."), 2);
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

const TLS_CODES = new Set([
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
]);

/**
 * A request the device may take twice without harm. Only these go out on a kept connection: after
 * a long client run the proxy in front of the file service has closed it (idle 180 s at Traefik,
 * measured on 2026-09-28 as write EPIPE after five minutes), and the first write then fails before
 * the device read anything. Such a request is sent once more on a fresh connection. MKCOL counts:
 * a folder that is there already answers 405, and that is taken as made.
 */
const REPEATABLE = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE", "PROPFIND", "MKCOL"]);
/** What a connection the other side closed while it lay idle looks like here. */
const DROPPED = (error) => ["EPIPE", "ECONNRESET"].includes(error?.code) || /socket hang up/i.test(error?.message || "");
/** A connection of its own for one request: never a kept one that may be dead already. */
const FRESH = { http: new HttpAgent({ keepAlive: false }), https: new HttpsAgent({ keepAlive: false }) };

async function send(target, options) {
  const method = (options.method || "GET").toUpperCase();
  if (!REPEATABLE.has(method)) return sendOnce(target, options, true);
  try {
    return await sendOnce(target, options, false);
  } catch (error) {
    if (!DROPPED(error)) throw error;
    return sendOnce(target, options, true);
  }
}

function sendOnce({ address, ca }, { method = "GET", path, token, basic, json, body, headers: more = {}, timeout = 30_000, limit = MAX_ANSWER }, fresh) {
  const url = new URL(path, address.endsWith("/") ? address : `${address}/`);
  const secure = url.protocol === "https:";
  const headers = { Accept: "application/json", ...more };
  if (token) headers.Authorization = `Bearer ${token}`;
  // Name and password, for the file service only: it takes them, the device's own routes do not.
  if (basic) headers.Authorization = `Basic ${Buffer.from(`${basic.user}:${basic.password}`).toString("base64")}`;
  let payload = null;
  if (json !== undefined) {
    payload = Buffer.from(JSON.stringify(json));
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = payload.length;
  } else if (body !== undefined) {
    payload = Buffer.from(body);
    headers["Content-Length"] = payload.length;
  }
  const options = { method, headers };
  if (fresh) options.agent = secure ? FRESH.https : FRESH.http;
  // A certificate that was accepted at login is the trust anchor for this device and for nothing
  // else. The name is not compared then: the device is reached by an address, its own certificate
  // rarely carries it.
  if (secure && ca) {
    options.ca = [ca];
    options.checkServerIdentity = () => undefined;
  }
  return new Promise((done, failed) => {
    const req = (secure ? httpsRequest : httpRequest)(url, options, (res) => {
      const parts = [];
      let size = 0;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > limit) req.destroy(Object.assign(new Error("answer too large"), { code: "ETOOBIG" }));
        else parts.push(chunk);
      });
      res.on("end", () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts) }));
      res.on("error", failed);
    });
    req.setTimeout(timeout, () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", failed);
    req.end(payload);
  });
}

/** What went wrong in one sentence, without ever naming a secret. */
function explain(error, address) {
  if (TLS_CODES.has(error.code)) {
    return t(
      `The certificate of ${address} cannot be verified (${error.code}). A device in a company network usually carries its own. If you know that it is this device, log in once with --insecure: the certificate is then pinned for this device.`,
      `Das Zertifikat von ${address} ist nicht überprüfbar (${error.code}). Ein Gerät im Firmennetz trägt meist ein eigenes. Wenn du weißt, dass es dieses Gerät ist, melde dich einmal mit --insecure an: das Zertifikat wird dann für dieses Gerät festgehalten.`
    );
  }
  if (["ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND", "ENETUNREACH"].includes(error.code)) {
    return t(`${address} does not answer (${error.code}). Is the device on, is the address right, is the VPN up?`, `${address} antwortet nicht (${error.code}). Ist das Gerät an, stimmt die Adresse, steht das VPN?`);
  }
  if (error.code === "ETIMEDOUT") return t(`${address} did not answer in time.`, `${address} hat nicht rechtzeitig geantwortet.`);
  if (error.code === "ETOOBIG") return t("The answer is larger than 50 MB. Not read.", "Die Antwort ist größer als 50 MB. Nicht gelesen.");
  return `${address}: ${error.message}`;
}

async function ask(target, options) {
  try {
    return await send(target, options);
  } catch (error) {
    if (error instanceof Stop) throw error;
    // Not reached is a state that passes, a reboot of the device for instance, and the sync in the
    // background says it later than a refusal.
    const failure = new Stop(explain(error, target.address));
    failure.unreachable = !TLS_CODES.has(error.code);
    throw failure;
  }
}

function jsonOf(answer) {
  try {
    return answer.body.length ? JSON.parse(answer.body.toString("utf8")) : null;
  } catch {
    return null;
  }
}

/** The one certificate at the top of what a device presents, for pinning it once. */
function fetchCertificate(address) {
  const url = new URL(address);
  return new Promise((done, failed) => {
    const socket = tlsConnect({ host: url.hostname, port: Number(url.port) || 443, rejectUnauthorized: false, servername: /^[\d.:]+$/.test(url.hostname) ? undefined : url.hostname }, () => {
      let top = socket.getPeerCertificate(true);
      while (top.issuerCertificate && top.issuerCertificate.fingerprint256 !== top.fingerprint256) top = top.issuerCertificate;
      socket.end();
      if (!top.raw) return failed(new Error("no certificate"));
      const body = top.raw.toString("base64").match(/.{1,64}/g).join("\n");
      done({ pem: `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\n`, fingerprint: top.fingerprint256, subject: top.subject?.CN || "", from: top.valid_from || "" });
    });
    socket.on("error", failed);
    socket.setTimeout(10_000, () => socket.destroy(new Error("timeout")));
  });
}

// --- Asking a human ------------------------------------------------------------------------

const interactive = () => Boolean(process.stdin.isTTY && process.stderr.isTTY);

function readAllStdin() {
  return new Promise((done) => {
    const parts = [];
    process.stdin.on("data", (chunk) => parts.push(chunk));
    process.stdin.on("end", () => done(Buffer.concat(parts).toString("utf8")));
  });
}

async function secretLine(question) {
  if (!interactive()) return null;
  return new Promise((done) => {
    process.stderr.write(question);
    let typed = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stderr.write("\n");
          return done(typed);
        }
        if (char === "\u0003") {
          process.stdin.setRawMode(false);
          process.stderr.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") typed = typed.slice(0, -1);
        else typed += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function visibleLine(question) {
  if (!interactive()) return null;
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((done) => rl.question(question, (answer) => { rl.close(); done(answer); }));
}

// --- Proposals: approving what an agent may do without asking ------------------------------
// The same steps and the same files as the kit's `root.mjs --enroll`, so that either can take
// back what the other entered. The selftest of the kit holds the two together.

const PROPOSAL_FILE = join(".claude", "proposal", "proposal.json");
const SIDES = ["allow", "deny", "ask", "additionalDirectories"];

function settingsFile(args) {
  const given = one(args, "settings");
  if (given) return resolve(given);
  return join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "settings.json");
}

const realDir = (dir) => realpathSync(resolve(dir));

function ledgerDir(dir, settings) {
  const name = String(readJson(join(dir, ".claude", "root.json"), {}).name || basename(dir) || "root")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "root";
  const id = createHash("sha256").update(realDir(dir)).digest("hex").slice(0, 8);
  return join(dirname(settings), "ara-roots", `${name}-${id}`);
}

/** Folders that may carry a proposal: this root, and every folder of level 2 below it. */
function proposalFolders() {
  const found = [];
  if (existsSync(join(ROOT, PROPOSAL_FILE))) found.push(ROOT);
  const subfolders = (dir) => {
    try {
      return readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && !entry.name.startsWith(".") && entry.name !== "node_modules")
        .map((entry) => join(dir, entry.name))
        .sort();
    } catch {
      return [];
    }
  };
  for (const first of subfolders(ROOT)) {
    for (const second of subfolders(first)) {
      if (existsSync(join(second, PROPOSAL_FILE))) found.push(second);
    }
  }
  return found;
}

const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);

function loadProposal(dir) {
  const file = join(dir, PROPOSAL_FILE);
  const label = dir === ROOT ? t("this root", "diese Wurzel") : relative(ROOT, dir);
  const proposal = readJson(file, null);
  const problems = [];
  if (!proposal || typeof proposal !== "object") return { dir, label, problems: [t("proposal.json is not readable", "proposal.json ist nicht lesbar")] };
  const script = proposal.hook?.script;
  if (proposal.hook) {
    if (typeof script !== "string" || basename(script) !== script || !existsSync(join(dir, ".claude", "proposal", script))) {
      problems.push(t("the hook names a script that is not next to the proposal", "der Hook nennt ein Skript, das nicht neben dem Vorschlag liegt"));
    }
  }
  const hash = createHash("sha256");
  const files = [PROPOSAL_FILE];
  if (proposal.hook && !problems.length) files.push(join(".claude", "proposal", script));
  for (const name of files) {
    hash.update(`${name}\n`);
    hash.update(readFileSync(join(dir, name)));
    hash.update("\n");
  }
  const permissions = proposal.permissions || {};
  // Lines for the house's CLAUDE.md: only into one of the two files a session loads, only text.
  let lines = null;
  if (proposal.lines !== undefined) {
    const file = proposal.lines?.file;
    const text = proposal.lines?.lines;
    if (!LINE_FILES.includes(file) || !Array.isArray(text) || !text.length || !text.every((line) => typeof line === "string" && line.trim() && !/[\r\n]/.test(line))) {
      problems.push(t(`the lines name a file other than ${LINE_FILES.join(" or ")}, or are no lines of text`, `die Zeilen nennen eine andere Datei als ${LINE_FILES.join(" oder ")}, oder sind keine Textzeilen`));
    } else {
      lines = { file, lines: text };
    }
  }
  return {
    dir,
    label,
    problems,
    lines,
    sum: hash.digest("hex"),
    hook: proposal.hook && !problems.length ? { event: proposal.hook.event || "PreToolUse", matcher: proposal.hook.matcher || "Write|Edit|NotebookEdit|Bash", script } : null,
    rules: Object.fromEntries(SIDES.map((side) => [side, list(permissions[side])])),
  };
}

/** Where lines of a proposal may go: the CLAUDE.md a session in this folder loads. */
const LINE_FILES = Object.freeze([".claude/CLAUDE.md", "CLAUDE.md"]);

/** Append the lines that are not there yet, after an empty line. What was appended is what is taken back. */
function appendLines(dir, lines) {
  const file = join(dir, ...lines.file.split("/"));
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const have = new Set(text.split(/\r?\n/));
  const fresh = lines.lines.filter((line) => !have.has(line));
  if (!fresh.length) return { file: lines.file, lines: [] };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${text.replace(/\n*$/, text ? "\n\n" : "")}${fresh.join("\n")}\n`);
  return { file: lines.file, lines: fresh };
}

/** Take appended lines out again, exactly those, and the empty line before them when it is left alone. */
function removeLines(dir, added) {
  if (!added?.lines?.length || !LINE_FILES.includes(added.file)) return;
  const file = join(dir, ...added.file.split("/"));
  if (!existsSync(file)) return;
  const gone = new Set(added.lines);
  const kept = readFileSync(file, "utf8").split("\n").filter((line) => !gone.has(line.replace(/\r$/, "")));
  const rest = kept.join("\n").replace(/\n*$/, "");
  // A file the approval made for the lines alone goes with them.
  if (!rest.trim()) rmSync(file, { force: true });
  else writeFileSync(file, `${rest}\n`);
}

/**
 * A shell rule whose command names no path, `Bash(node arasul.mjs call:*)`: it holds in whichever
 * folder a session starts. In the user's settings it would let any `arasul.mjs` of any folder on
 * this computer run without asking. So it goes into this folder's own `.claude/settings.local.json`,
 * which a session reads only here. Measured on 2026-09-28 with `claude -p` 2.1.283 in a folder
 * never trusted: a rule there let the command through, without it the command was refused.
 */
const hereOnly = (text) => /^Bash\(\S+ [^\s{~/]/.test(text);

/** The settings of this folder alone: never synced, never in the user's settings. */
const HERE_SETTINGS = join(".claude", "settings.local.json");

/**
 * Every written-out path that leads to this folder: the real one first, then the one typed through a
 * link above it. Claude Code matches a shell rule against the command as it is typed, so a rule with
 * `/private/tmp/haus` does not hold for `node /tmp/haus/arasul.mjs apps`, measured on 2026-09-28.
 * A spelling counts only when it leads to the same folder.
 */
export function spellings(dir) {
  const real = realDir(dir);
  const found = [real];
  const add = (path) => {
    try {
      if (path && isAbsolute(path) && !found.includes(path) && realpathSync(path) === real) found.push(path);
    } catch {
      // A spelling that leads nowhere is none.
    }
  };
  add(resolve(dir));
  // The shell's own spelling of where it stands, when this folder lies in it or below it.
  const pwd = process.env.PWD;
  if (pwd && isAbsolute(pwd)) {
    try {
      const rel = relative(realpathSync(pwd), real);
      if (!rel.startsWith("..") && !isAbsolute(rel)) add(rel ? join(pwd, rel) : pwd);
    } catch {
      // No PWD to go by.
    }
  }
  // macOS: /tmp, /var and /etc are links into /private.
  if (real.startsWith("/private/")) add(real.slice("/private".length));
  return found;
}

/** `{root}` becomes the written-out path, in the way the rule wants it: a shell rule as it is typed, in every spelling. */
function resolved(item) {
  const all = spellings(item.dir);
  const rule = (text) => (text.includes("{root}") ? all.map((abs) => text.replaceAll("{root}", text.startsWith("Bash(") ? abs : `/${abs}`)) : [text]);
  const user = {};
  const here = {};
  for (const side of SIDES) {
    const rules = item.rules[side];
    here[side] = side === "additionalDirectories" ? [] : rules.filter(hereOnly);
    user[side] = side === "additionalDirectories"
      ? rules.map((text) => text.replaceAll("{root}", all[0]))
      : [...new Set(rules.filter((text) => !hereOnly(text)).flatMap(rule))];
  }
  return { ...user, here };
}

/** Enter rules into the folder's own settings; what was there stays, what is entered is recorded. */
function enterHere(dir, rules) {
  if (!SIDES.some((side) => rules[side].length)) return null;
  const file = join(dir, HERE_SETTINGS);
  const added = { allow: [], deny: [], ask: [], additionalDirectories: [], made: !existsSync(file) };
  const settings = readSettings(file);
  settings.permissions ||= {};
  for (const side of SIDES) {
    const current = (settings.permissions[side] ||= []);
    for (const entry of rules[side]) {
      if (current.includes(entry)) continue;
      current.push(entry);
      added[side].push(entry);
    }
    if (!current.length) delete settings.permissions[side];
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
  return added;
}

/** Take out of the folder's own settings exactly what was entered; a file made for them alone goes. */
function removeHere(dir, added) {
  const file = join(dir, HERE_SETTINGS);
  if (!added || !existsSync(file)) return;
  const settings = readSettings(file);
  removeRecorded(settings, added);
  if (added.made && !Object.keys(settings).length) rmSync(file, { force: true });
  else writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

function readSettings(file) {
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    stop(t(`${file} is not valid JSON, nothing was written: ${error.message}`, `${file} ist kein gültiges JSON, nichts wurde geschrieben: ${error.message}`));
  }
}

function writeSettings(file, settings) {
  if (existsSync(file)) copyFileSync(file, `${file}.ara-backup`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

function removeRecorded(settings, added) {
  for (const side of SIDES) {
    const current = settings.permissions?.[side];
    if (!Array.isArray(current)) continue;
    settings.permissions[side] = current.filter((entry) => !(added?.[side] || []).includes(entry));
    if (!settings.permissions[side].length) delete settings.permissions[side];
  }
  if (settings.permissions && !Object.keys(settings.permissions).length) delete settings.permissions;
  const event = added?.hook?.event;
  const hooked = settings.hooks?.[event];
  if (event && Array.isArray(hooked)) {
    settings.hooks[event] = hooked
      .map((entry) => ({ ...entry, hooks: (entry.hooks || []).filter((one2) => one2.command !== added.hook.command) }))
      .filter((entry) => entry.hooks.length);
    if (!settings.hooks[event].length) delete settings.hooks[event];
    if (!Object.keys(settings.hooks).length) delete settings.hooks;
  }
}

/** none, current, changed or broken, like the kit's `root.mjs --show`. */
function stateOf(item, settingsPath) {
  const ledger = readJson(join(ledgerDir(item.dir, settingsPath), "consent.json"), null);
  if (!ledger) return { state: "none" };
  const settings = readJson(settingsPath, {});
  const event = ledger.added?.hook?.event;
  const hookless = !ledger.added?.hook;
  const hooked = hookless || (settings.hooks?.[event] || []).some((entry) => (entry.hooks || []).some((one2) => one2.command === ledger.added.hook.command));
  const copy = hookless || existsSync(join(ledgerDir(item.dir, settingsPath), basename(ledger.added.hook.command.match(/node "([^"]+)"/)?.[1] || "")));
  const state = !hooked || !copy ? "broken" : item.sum === ledger.sum ? "current" : "changed";
  return { state, at: ledger.at };
}

function approve(item, settingsPath) {
  const dir = ledgerDir(item.dir, settingsPath);
  const abs = realDir(item.dir);
  const rules = resolved(item);
  const settings = readSettings(settingsPath);
  const before = readJson(join(dir, "consent.json"), null);
  // A new approval replaces the old one entirely: first away what it entered.
  if (before) {
    removeRecorded(settings, before.added);
    removeLines(item.dir, before.added?.lines);
    removeHere(item.dir, before.added?.here);
  }

  const added = { allow: [], deny: [], ask: [], additionalDirectories: [] };
  settings.permissions ||= {};
  for (const side of SIDES) {
    const current = (settings.permissions[side] ||= []);
    for (const entry of rules[side]) {
      if (current.includes(entry)) continue;
      current.push(entry);
      added[side].push(entry);
    }
    if (!current.length) delete settings.permissions[side];
  }
  if (!Object.keys(settings.permissions).length) delete settings.permissions;
  if (item.hook) {
    const script = join(dir, item.hook.script);
    const command = `node "${script}" --root "${abs}"`;
    added.hook = { event: item.hook.event, command };
    settings.hooks ||= {};
    (settings.hooks[item.hook.event] ||= []).push({ matcher: item.hook.matcher, hooks: [{ type: "command", command }] });
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(item.dir, ".claude", "proposal", item.hook.script), script);
  } else {
    mkdirSync(dir, { recursive: true });
  }
  writeSettings(settingsPath, settings);
  const here = enterHere(item.dir, rules.here);
  if (here) added.here = here;
  if (item.lines) added.lines = appendLines(item.dir, item.lines);
  const today = localDay();
  writeFileSync(join(dir, "consent.json"), `${JSON.stringify({ root: abs, sum: item.sum, at: today, settings: settingsPath, added }, null, 2)}\n`);
  return { renewed: Boolean(before) };
}

/** Takes back what approving entered, for every approval that belongs to this root or below it. */
function withdrawAll(settingsPath) {
  const base = join(dirname(settingsPath), "ara-roots");
  const taken = [];
  if (!existsSync(base)) return taken;
  const settings = readSettings(settingsPath);
  const here = realDir(ROOT);
  for (const name of readdirSync(base)) {
    const ledger = readJson(join(base, name, "consent.json"), null);
    if (!ledger?.root || (ledger.root !== here && !ledger.root.startsWith(`${here}/`))) continue;
    removeRecorded(settings, ledger.added);
    if (existsSync(ledger.root)) {
      removeLines(ledger.root, ledger.added?.lines);
      removeHere(ledger.root, ledger.added?.here);
    }
    rmSync(join(base, name), { recursive: true, force: true });
    taken.push(relative(here, ledger.root) || t("this root", "diese Wurzel"));
  }
  if (taken.length) writeSettings(settingsPath, settings);
  return taken;
}

function showProposal(item, index, total, settingsPath) {
  const state = item.problems.length ? { state: "invalid" } : stateOf(item, settingsPath);
  const says = {
    none: t("not approved", "nicht freigegeben"),
    current: t(`approved on ${state.at}, this is the proposal that was approved`, `freigegeben am ${state.at}, das ist der Vorschlag, der freigegeben wurde`),
    changed: t("approved once, but the proposal has changed since. What was approved keeps running, this one does not", "einmal freigegeben, der Vorschlag hat sich seither geändert. Was freigegeben war, läuft weiter, dieser nicht"),
    broken: t("approved, but the hook is gone from the settings", "freigegeben, aber der Hook fehlt in den Einstellungen"),
    invalid: t("cannot be approved", "nicht freigebbar"),
  };
  say(`${t("Proposal", "Vorschlag")} ${index} ${t("of", "von")} ${total}: ${item.label}`);
  say(`  ${t("State", "Stand")}: ${says[state.state]}`);
  for (const problem of item.problems) say(`  ${t("Problem", "Problem")}: ${problem}`);
  if (item.problems.length) return state.state;
  const rules = resolved(item);
  if (item.hook) {
    say(`  ${t("Hook", "Hook")}: ${item.hook.event} ${t("on", "auf")} ${item.hook.matcher}`);
    say(`    node "${join(ledgerDir(item.dir, settingsPath), item.hook.script)}" --root "${realDir(item.dir)}"`);
  } else {
    say(`  ${t("Hook", "Hook")}: ${t("none, rules only", "keiner, nur Regeln")}`);
  }
  for (const side of SIDES) {
    if (!rules[side].length) continue;
    say(`  ${side}:`);
    for (const entry of rules[side]) say(`    ${entry}`);
  }
  if (SIDES.some((side) => rules.here[side].length)) {
    say(`  ${t(`Only in this folder, into .claude/settings.local.json: the command without a path holds only where a session starts here`, `Nur in diesem Ordner, nach .claude/settings.local.json: der Befehl ohne Pfad gilt nur, wo eine Sitzung hier startet`)}:`);
    for (const side of SIDES) {
      if (!rules.here[side].length) continue;
      say(`    ${side}:`);
      for (const entry of rules.here[side]) say(`      ${entry}`);
    }
  }
  if (item.lines) {
    say(`  ${t(`Lines for ${item.lines.file}, appended at its end`, `Zeilen für ${item.lines.file}, an ihr Ende gehängt`)}:`);
    for (const line of item.lines.lines) say(`    ${line}`);
  }
  say(`  ${t("Checksum", "Prüfsumme")}: ${item.sum}`);
  return state.state;
}

async function doProposals(args) {
  const settingsPath = settingsFile(args);
  const wanted = args.flags.approve || [];
  if (args.flags.withdraw) {
    const taken = withdrawAll(settingsPath);
    say(taken.length
      ? t(`Taken back: what approving entered for ${taken.join(", ")} is gone from ${settingsPath} and from .claude/settings.local.json, the copies of the hooks and lines it appended with it.`, `Zurückgenommen: was das Freigeben für ${taken.join(", ")} eintrug, ist aus ${settingsPath} und aus .claude/settings.local.json, die Kopien der Hooks und angehängte Zeilen mit ihnen.`)
      : t("Nothing was approved for this root, nothing to take back.", "Für diese Wurzel wurde nichts freigegeben, nichts zurückzunehmen."));
    return true;
  }
  const items = proposalFolders().map(loadProposal);
  if (!items.length) {
    say(t("Proposals: none in this root and none in a folder of level 2.", "Vorschläge: keine in dieser Wurzel und keine in einem Ordner der Ebene 2."));
    return true;
  }
  say(t(`Proposals for hooks and rules, from this root and the folders of level 2 (${items.length}). Nothing in them is active until you approve it, one by one.`, `Vorschläge für Hooks und Regeln, aus dieser Wurzel und den Ordnern der Ebene 2 (${items.length}). Nichts davon wirkt, bis du es freigibst, einen nach dem anderen.`));
  say();
  const states = items.map((item, index) => {
    const state = showProposal(item, index + 1, items.length, settingsPath);
    say();
    return state;
  });

  let clean = true;
  const chosen = new Set();
  for (const given of wanted) {
    const match = given.length >= 16 ? items.find((item) => item.sum?.startsWith(given)) : null;
    if (!match) {
      warn(t(`No proposal has the checksum ${given}. Too short, or the proposal has changed since you looked at it.`, `Kein Vorschlag hat die Prüfsumme ${given}. Zu kurz, oder der Vorschlag hat sich geändert, seit du ihn angesehen hast.`));
      clean = false;
    } else if (match.problems.length) {
      warn(t(`${match.label} cannot be approved.`, `${match.label} lässt sich nicht freigeben.`));
      clean = false;
    } else {
      chosen.add(match);
    }
  }
  if (!wanted.length && interactive()) {
    for (const [index, item] of items.entries()) {
      if (item.problems.length || states[index] === "current") continue;
      const answer = await visibleLine(t(`Approve ${item.label}? [y/N] `, `${item.label} freigeben? [j/N] `));
      if (/^(y|yes|j|ja)$/i.test((answer || "").trim())) chosen.add(item);
    }
  }
  for (const item of chosen) {
    const done = approve(item, settingsPath);
    say(done.renewed
      ? t(`Approved anew: ${item.label}, checksum ${item.sum.slice(0, 16)}. What the earlier approval entered was replaced.`, `Neu freigegeben: ${item.label}, Prüfsumme ${item.sum.slice(0, 16)}. Was die frühere Freigabe eintrug, wurde ersetzt.`)
      : t(`Approved: ${item.label}, checksum ${item.sum.slice(0, 16)}.`, `Freigegeben: ${item.label}, Prüfsumme ${item.sum.slice(0, 16)}.`));
  }
  if (chosen.size) {
    say(t(`  Settings: ${settingsPath}, the state before it next to it as .ara-backup. Taken back with: node arasul.mjs login --withdraw`, `  Einstellungen: ${settingsPath}, der Stand davor daneben als .ara-backup. Zurück mit: node arasul.mjs login --withdraw`));
    say(t("A running session reads its settings once: start the agent anew.", "Eine laufende Sitzung liest ihre Einstellungen einmal: starte den Agenten neu."));
  } else if (items.some((item, index) => !item.problems.length && states[index] !== "current")) {
    say(t("To approve one, per proposal with its checksum: node arasul.mjs login --approve <the first 16 characters of the checksum>", "Um einen freizugeben, je Vorschlag mit seiner Prüfsumme: node arasul.mjs login --approve <die ersten 16 Zeichen der Prüfsumme>"));
  }
  return clean;
}

// --- Places: where they lie on this computer -----------------------------------------------

function doPlaces() {
  const places = readJson(join(ROOT, ".claude", "places.json"), { places: [] }).places || [];
  say();
  if (!places.length) {
    say(t("Places: none named in .claude/places.json.", "Orte: keine in .claude/places.json genannt."));
    return;
  }
  say(t("Places on this computer:", "Orte auf diesem Rechner:"));
  for (const place of places) {
    let where = t("reference only, no local path named", "nur Verweis, kein lokaler Pfad genannt");
    if (place.local) {
      const path = place.local === "~" || place.local.startsWith("~/") ? join(homedir(), place.local.slice(1)) : isAbsolute(place.local) ? place.local : resolve(ROOT, place.local);
      where = existsSync(path) ? path : t(`${path} (not on this computer)`, `${path} (nicht auf diesem Rechner)`);
    }
    say(`  ${String(place.name).padEnd(18)} ${where}`);
  }
}

// --- Apps ----------------------------------------------------------------------------------

/** Answers of the device come in an envelope `data` or without one. */
const inner = (body) => (body && typeof body === "object" && !Array.isArray(body) && body.data !== undefined ? body.data : body);

async function assignedApps({ name, entry }) {
  const expires = expiryOf(entry.token);
  if (expires && expires < Date.now()) {
    stop(t(`The session for ${name} ended on ${new Date(expires).toISOString().slice(0, 16).replace("T", " ")}. Log in again: node arasul.mjs login ${entry.address} --user ${entry.user || "<name>"}`, `Die Sitzung für ${name} ist am ${new Date(expires).toISOString().slice(0, 16).replace("T", " ")} zu Ende gegangen. Melde dich neu an: node arasul.mjs login ${entry.address} --user ${entry.user || "<name>"}`));
  }
  const answer = await ask(entry, { path: DEVICE.mine, token: entry.token });
  refused(answer, name, entry);
  if (!answer.status || answer.status >= 300) stop(t(`${name} answers ${DEVICE.mine} with status ${answer.status}.`, `${name} antwortet auf ${DEVICE.mine} mit Status ${answer.status}.`));
  const data = inner(jsonOf(answer));
  if (!Array.isArray(data)) stop(t(`${name} answers ${DEVICE.mine} in a form this file does not know.`, `${name} antwortet auf ${DEVICE.mine} in einer Form, die diese Datei nicht kennt.`));
  const apps = [];
  for (const app of data) {
    if (!app || typeof app.id !== "string" || !APP_ID.test(app.id)) {
      warn(t(`An app with an id that does not fit is skipped: ${oneLine(app?.id, 40)}`, `Eine App mit einer Kennung, die nicht passt, wird übergangen: ${oneLine(app?.id, 40)}`));
      continue;
    }
    apps.push({ id: app.id, name: oneLine(app.name || app.id, 80), live: app.live && typeof app.live === "object" ? app.live : null, test: Boolean(app.test) });
  }
  return apps;
}

function refused(answer, name, entry) {
  if (answer.status === 401 || answer.status === 403) {
    stop(t(`${name} refuses the credential (${answer.status}): the session has ended or the token was revoked. Log in again: node arasul.mjs login ${entry.address}`, `${name} weist den Ausweis ab (${answer.status}): die Sitzung ist zu Ende oder das Token wurde widerrufen. Melde dich neu an: node arasul.mjs login ${entry.address}`));
  }
}

/** What an app says about itself: `GET agent` at its interface, through the device's forward auth. */
async function agentOf(device, id) {
  const answer = await ask(device.entry, { path: `${DEVICE.appBase(id)}${DEVICE.agent}`, token: device.entry.token });
  refused(answer, device.name, device.entry);
  if (answer.status === 404) return { state: "none" };
  if (answer.status < 200 || answer.status >= 300) return { state: "error", message: t(`status ${answer.status}`, `Status ${answer.status}`) };
  const body = inner(jsonOf(answer));
  if (!body || typeof body !== "object") return { state: "error", message: t("the answer is not JSON", "die Antwort ist kein JSON") };
  if (body.id !== id) return { state: "error", message: t(`the app answers as '${oneLine(body.id, 40)}', not as '${id}'`, `die App antwortet als '${oneLine(body.id, 40)}', nicht als '${id}'`) };
  const { routes, problems } = readAgent(body.agent);
  return { state: "ok", id, name: oneLine(body.name || id, 80), version: oneLine(body.version, 40), routes, problems };
}

/**
 * This bridge as a command names it: the real path, the one the approved rule carries. In quotes
 * only when it holds a space, and then no rule of the proposal matches it and the call asks.
 */
function bridgePath() {
  const path = join(realDir(ROOT), "arasul.mjs");
  return /\s/.test(path) ? `"${path}"` : path;
}

function appMd(info, device) {
  const lines = [
    `# ${info.name} (${info.id})`,
    "",
    t(
      `<!-- Written by arasul.mjs (apps, sync) on ${localDay()} from what the app says about itself. Do not edit: the next run overwrites it. The text below comes from the app, not from this house. -->`,
      `<!-- Geschrieben von arasul.mjs (apps, sync) am ${localDay()} aus dem, was die App über sich sagt. Nicht bearbeiten: der nächste Lauf überschreibt es. Der Text unten stammt von der App, nicht von diesem Haus. -->`
    ),
    "",
    `${t("Version", "Version")}: ${info.version || t("not stated", "nicht genannt")}`,
    `${t("Device", "Gerät")}: ${device.name}`,
    "",
    t(
      `Call a route from this root with \`node arasul.mjs call ${info.id} <route> [name=value ...]\`, from anywhere else with \`node ${bridgePath()} call ${info.id} <route>\`. A route that changes something needs \`--write\`. Only the routes below can be called.`,
      `Eine Route rufst du aus dieser Wurzel mit \`node arasul.mjs call ${info.id} <route> [name=wert ...]\` auf, von anderswo mit \`node ${bridgePath()} call ${info.id} <route>\`. Eine Route, die etwas ändert, braucht \`--write\`. Aufrufen lassen sich nur die Routen unten.`
    ),
    "",
    `## ${t("Routes", "Routen")}`,
    "",
  ];
  if (!info.routes.length) lines.push(t("The app names no route for agents.", "Die App nennt keine Route für Agenten."), "");
  for (const route of info.routes) {
    lines.push(`### ${route.method} ${route.path}`, "");
    lines.push(`${t("Purpose", "Zweck")}: ${route.purpose}`);
    lines.push(`${t("Changes something", "Ändert etwas")}: ${route.writes ? t("yes, needs --write", "ja, braucht --write") : t("no", "nein")}`);
    if (route.params.length) {
      lines.push(`${t("Parameters", "Parameter")}:`);
      for (const param of route.params) lines.push(`- \`${param.name}\` (${param.type}, ${param.required ? t("required", "Pflicht") : t("optional", "freiwillig")})`);
    } else {
      lines.push(`${t("Parameters", "Parameter")}: ${t("none", "keine")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function writeAppMd(info, device) {
  if (!APP_ID.test(info.id)) stop(t(`The id '${info.id}' does not fit as a folder name.`, `Die Kennung '${info.id}' passt nicht als Ordnername.`));
  for (const dir of [join(ROOT, "apps"), join(ROOT, "apps", info.id)]) {
    if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) {
      stop(t(`${relative(ROOT, dir)} is a link. Nothing is written through a link.`, `${relative(ROOT, dir)} ist ein Link. Durch einen Link wird nichts geschrieben.`));
    }
  }
  const target = join(ROOT, "apps", info.id, "APP.md");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, appMd(info, device));
  return relative(ROOT, target);
}

async function doApps(args, { write = true, quiet = false } = {}) {
  const device = chooseDevice(args);
  const assigned = await assignedApps(device);
  const infos = [];
  for (const app of assigned) {
    if (!app.live) {
      infos.push({ ...app, state: "test-only" });
      continue;
    }
    infos.push({ ...app, ...(await agentOf(device, app.id)) });
  }
  const written = [];
  if (write) {
    for (const info of infos) if (info.state === "ok") written.push(writeAppMd(info, device));
  }
  if (args.flags.json) {
    say(JSON.stringify(infos.map(({ id, name, state, version, routes, problems, message }) => ({ id, name, state, version, routes, problems, message })), null, 2));
    return infos;
  }
  if (quiet) return infos;
  if (!infos.length) {
    say(t(`No app is assigned to you on ${device.name}.`, `Auf ${device.name} ist dir keine App zugewiesen.`));
    return infos;
  }
  say(t(`Apps assigned to you on ${device.name}:`, `Apps, die dir auf ${device.name} zugewiesen sind:`));
  for (const info of infos) {
    say();
    say(`${info.id}${info.name && info.name !== info.id ? ` (${info.name})` : ""}${info.version ? `, ${info.version}` : ""}`);
    if (info.state === "test-only") say(`  ${t("Only the test stand is shared with you. Not listed further.", "Dir ist nur der Teststand freigegeben. Nicht weiter aufgeführt.")}`);
    else if (info.state === "none") say(`  ${t("The app does not describe itself: it has no route agent. Nothing can be called.", "Die App beschreibt sich nicht: sie hat keine Route agent. Aufrufen lässt sich nichts.")}`);
    else if (info.state === "error") say(`  ${t("The description could not be read", "Die Beschreibung ließ sich nicht lesen")}: ${info.message}`);
    else {
      if (!info.routes.length) say(`  ${t("The app names no route for agents.", "Die App nennt keine Route für Agenten.")}`);
      for (const route of info.routes) {
        say(`  ${route.method.padEnd(6)} ${route.path}${route.writes ? `  [${t("changes something", "ändert etwas")}]` : ""}`);
        say(`         ${route.purpose}`);
        if (route.params.length) say(`         ${route.params.map((param) => `${param.name}:${param.type}${param.required ? "*" : ""}`).join(" ")}`);
      }
      for (const problem of info.problems) say(`  ${t("Not listed, malformed", "Nicht aufgeführt, fehlerhaft")}: ${problem}`);
    }
  }
  if (written.length) {
    say();
    say(t(`Written: ${written.join(", ")}`, `Geschrieben: ${written.join(", ")}`));
  }
  const stale = existsSync(join(ROOT, "apps")) ? readdirSync(join(ROOT, "apps")).filter((name) => existsSync(join(ROOT, "apps", name, "APP.md")) && !infos.some((info) => info.id === name)) : [];
  if (stale.length) say(t(`Not assigned to you any more, the file stays: ${stale.map((name) => `apps/${name}/APP.md`).join(", ")}`, `Dir nicht mehr zugewiesen, die Datei bleibt: ${stale.map((name) => `apps/${name}/APP.md`).join(", ")}`));
  return infos;
}

// --- call ----------------------------------------------------------------------------------

function typed(param, raw, route) {
  if (param.type === "string") return raw;
  if (param.type === "boolean") {
    if (raw === "true" || raw === "false") return raw === "true";
  } else if (raw.trim() !== "" && Number.isFinite(Number(raw)) && (param.type === "number" || Number.isInteger(Number(raw)))) {
    return Number(raw);
  }
  return stop(t(`${param.name} must be of type ${param.type} for ${route.method} ${route.path}.`, `${param.name} muss vom Typ ${param.type} sein für ${route.method} ${route.path}.`), 2);
}

async function doCall(args) {
  const [, appId, routeName, ...pairs] = args._;
  if (!appId || !routeName) stop(t("call needs an app and a route: node arasul.mjs call <app> <route> [name=value ...]", "call braucht eine App und eine Route: node arasul.mjs call <app> <route> [name=wert ...]"), 2);
  if (!APP_ID.test(appId)) stop(t(`'${appId}' is not an app id.`, `'${appId}' ist keine App-Kennung.`), 2);
  const wanted = relativePath(routeName);
  if (!wanted) stop(t(`'${routeName}' is not a route of an app: a path without .. and without a query, parameters go as name=value.`, `'${routeName}' ist keine Route einer App: ein Pfad ohne .. und ohne Anfrage, Parameter gehen als name=wert.`), 2);

  const device = chooseDevice(args);
  // The device answers 403 for an app nobody assigned to this person, the same as for a dead credential.
  // The list of the assigned apps tells them apart, and it already stops with the right words when the credential is dead.
  const assigned = await assignedApps(device);
  if (!assigned.some((app) => app.id === appId)) {
    stop(t(
      `${appId} is not assigned to ${device.entry.user || "you"} on ${device.name}, so nothing can be called on it. The login is fine. Ask the administrator of the device to give you access to the app.${assigned.length ? ` Assigned now: ${assigned.map((app) => app.id).join(", ")}.` : " No app is assigned to you yet."}`,
      `${appId} ist ${device.entry.user || "dir"} auf ${device.name} nicht zugewiesen, darum lässt sich auf ihr nichts aufrufen. Die Anmeldung ist in Ordnung. Bitte den Administrator des Geräts, dir die App freizugeben.${assigned.length ? ` Zugewiesen ist jetzt: ${assigned.map((app) => app.id).join(", ")}.` : " Dir ist noch keine App zugewiesen."}`
    ));
  }
  const described = await agentOf(device, appId);
  if (described.state === "none") stop(t(`${appId} does not describe itself: it has no route agent. Nothing is called on it.`, `${appId} beschreibt sich nicht: sie hat keine Route agent. Auf ihr wird nichts aufgerufen.`));
  if (described.state === "error") stop(t(`The description of ${appId} could not be read: ${described.message}`, `Die Beschreibung von ${appId} ließ sich nicht lesen: ${described.message}`));
  const matching = described.routes.filter((route) => route.path === wanted);
  if (!matching.length) {
    stop(t(
      `${appId} does not name the route ${wanted} in its field agent. Only named routes are called. Named: ${described.routes.map((route) => `${route.method} ${route.path}`).join(", ") || "none"}.`,
      `${appId} nennt die Route ${wanted} nicht in ihrem Feld agent. Aufgerufen werden nur genannte Routen. Genannt: ${described.routes.map((route) => `${route.method} ${route.path}`).join(", ") || "keine"}.`
    ));
  }
  const verb = (one(args, "method") || "").toUpperCase();
  // Without --method: the form that fits the flag. With --write the one that changes something,
  // without it the one that only reads. One route alone is taken as it is.
  const fitting = matching.filter((entry) => entry.writes === Boolean(args.flags.write));
  const route = verb ? matching.find((entry) => entry.method === verb) : matching.length === 1 ? matching[0] : fitting.length === 1 ? fitting[0] : null;
  if (!route) {
    stop(verb
      ? t(`${appId} names ${wanted} only as ${matching.map((entry) => entry.method).join(", ")}, not as ${verb}.`, `${appId} nennt ${wanted} nur als ${matching.map((entry) => entry.method).join(", ")}, nicht als ${verb}.`)
      : t(`${wanted} exists as ${matching.map((entry) => entry.method).join(" and ")}: say which with --method.`, `${wanted} gibt es als ${matching.map((entry) => entry.method).join(" und ")}: sag mit --method, welche.`));
  }
  if (route.writes && !args.flags.write) {
    stop(t(
      `${route.method} ${route.path} of ${appId} changes something: ${route.purpose}\nIt runs only with --write, and whoever starts it has to be sure that the human wants it.`,
      `${route.method} ${route.path} von ${appId} ändert etwas: ${route.purpose}\nEs läuft nur mit --write, und wer es startet, muss sicher sein, dass der Mensch es will.`
    ));
  }
  const values = {};
  for (const pair of pairs) {
    const cut = pair.indexOf("=");
    if (cut < 1) stop(t(`'${pair}' is no parameter: name=value.`, `'${pair}' ist kein Parameter: name=wert.`), 2);
    const name = pair.slice(0, cut);
    const param = route.params.find((entry) => entry.name === name);
    if (!param) stop(t(`${route.method} ${route.path} takes no parameter ${name}. It takes: ${route.params.map((entry) => entry.name).join(", ") || "none"}.`, `${route.method} ${route.path} nimmt keinen Parameter ${name}. Sie nimmt: ${route.params.map((entry) => entry.name).join(", ") || "keine"}.`), 2);
    values[name] = typed(param, pair.slice(cut + 1), route);
  }
  const missing = route.params.filter((param) => param.required && !(param.name in values)).map((param) => param.name);
  if (missing.length) stop(t(`Missing: ${missing.join(", ")}.`, `Es fehlt: ${missing.join(", ")}.`), 2);

  let path = `${DEVICE.appBase(appId)}${route.path}`;
  let json;
  if (route.method === "GET") {
    const query = new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString();
    if (query) path += `?${query}`;
  } else if (Object.keys(values).length) {
    json = values;
  }
  const answer = await ask(device.entry, { method: route.method, path, token: device.entry.token, json, timeout: 120_000 });
  refused(answer, device.name, device.entry);
  await new Promise((written) => process.stdout.write(answer.body, written));
  if (answer.body.length && answer.body[answer.body.length - 1] !== 0x0a) process.stdout.write("\n");
  if (answer.status < 200 || answer.status >= 300) {
    warn(t(`${route.method} ${route.path} of ${appId}: status ${answer.status}.`, `${route.method} ${route.path} von ${appId}: Status ${answer.status}.`));
    return false;
  }
  return true;
}

// --- The company folder --------------------------------------------------------------------
// What the device shares with this person, laid down at its real place in this tree. Two sources
// and no third: the device says where its file service lies and which folders this person has,
// and the vendor's command line client does the syncing. This file speaks no WebDAV itself.

/**
 * What this file assumes about the file service, with the date it is from. Measured at a device
 * on 2026-09-22, not read out of a manual: the root of the device and a folder of level 1 are
 * rooms named by the folder's id, not by its display name, and a folder of level 2 hangs in the
 * room that holds what is shared with a person. A device that says otherwise wins.
 */
const SERVICE = Object.freeze({
  shared: "Shares",
  client: "opencloudcmd",
  password: "OPENCLOUD_TOKEN",
  // App tokens of the service: issued with the password, revoked with a DELETE (as of 2026-09-27).
  appTokens: "auth-app/tokens",
  /**
   * The root of the device: level 0 with this kind, exactly one per device, and the device lists
   * it first for every active person (measured on 2026-09-22). Its id comes out of the device's
   * answer, `firma` on the device measured, and is the name of its room in the file service. It is
   * recognised by level and kind and by nothing else: a folder of level 1 with any id is a folder
   * of level 1. `rootId` is the id the bridge gives a root it makes itself, the same one the
   * device's front end proposes.
   */
  rootKind: "wurzel",
  rootId: "firma",
});

/** The view of this person, written by sync at the top of the root. Per person, never synced. */
const VIEW_FILE = "sicht.md";

/** Is this folder of the device the root? Level 0 with the kind `wurzel`, and nothing else. */
const isRootRoom = (level, kind) => Number(level) === 0 && String(kind ?? "") === SERVICE.rootKind;

/** Where a client fetched by this file lies: next to the credential, per person, in no synced tree. */
const CLIENT_HOME = join(CONFIG_DIR, "klient");
const CLIENT_FETCHED = join(CLIENT_HOME, "OpenCloud.app", "Contents", "MacOS", "opencloudcmd");

/** Where the vendor's client lies when nobody says otherwise. It runs unpacked, without installing. */
const CLIENT_PLACES = Object.freeze(
  IS_WIN
    ? [
        ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs")]
          .filter(Boolean)
          .map((base) => join(base, "OpenCloud", `${SERVICE.client}.exe`)),
      ]
    : [
        "/Applications/OpenCloud.app/Contents/MacOS/opencloudcmd",
        join(homedir(), "Applications", "OpenCloud.app", "Contents", "MacOS", "opencloudcmd"),
        CLIENT_FETCHED,
      ]
);

/**
 * Where the vendor publishes its desktop package, as of 2026-09-27: the releases of this repository
 * on GitHub, one package per processor for macOS, each with a file that holds its SHA-256. The
 * command line client lies in the package and runs unpacked (measured with version 4.0.0).
 */
const CLIENT_RELEASES = process.env.ARASUL_CLIENT_RELEASE || "https://api.github.com/repos/opencloud-eu/desktop/releases/latest";

/**
 * Where a file goes that the client deleted here because it was deleted on the device: into a
 * folder next to the credential, and only when this computer cannot link there, into this one,
 * which is never synced.
 */
const TRASH = join(CONFIG_DIR, "papierkorb");
const TRASH_IN_ROOT = ".arasul-papierkorb";

/** What the state of the last sync is written to. No secret lies in it. */
const FOLDER_STATE = join(CONFIG_DIR, "firmenordner.json");

const FOLDER_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** The furniture of a root. A folder of level 1 with one of these ids is not laid down. */
const ROOT_OWN = Object.freeze(["apps", "scripts", ".claude", ".git"]);

/**
 * What never goes into the company folder.
 *
 * Four kinds, and each one for its own reason. **What a machine makes**: `.git`, `node_modules`,
 * `.next`, a Python environment and its caches are made again out of what is there, and they are
 * the bulk of every tree. `build` and `dist` are not on this list: as names they would keep a
 * house's own folder of that name home at every depth, a skill called build for instance. They
 * are what a machine makes only in a source tree, and `builtFolders` names them there. **What belongs to this computer**: the hooks and the settings
 * of an agent say what it may do here, and that is a decision per computer, not per house.
 * **What holds a secret**: `.env` and every `.env.*`, at every depth, because a prototype deep in
 * an experiment keeps its keys there just like the top does, and what goes into the company folder
 * goes to everybody who reads it. All of these hold at every depth of the tree, not only at its
 * top. **What the client itself writes**: its journal lies in the synced folder, and without this
 * line it reports conflicts about itself.
 *
 * The list goes to the client as a file, in its own format: one pattern per line. Measured
 * against the client on 2026-09-22 with a folder that carried every one of these: what stands
 * here stayed out, at the top and three levels down, and `.claude/skills/` went through. The
 * journal was called `.sync_journal.db`; the two lines next to it are what SQLite writes beside
 * such a file.
 */
const NEVER_SYNCED = Object.freeze([
  ".git",
  "node_modules",
  ".next",
  ".venv",
  "__pycache__",
  ".env",
  ".env.*",
  ".claude/hooks",
  "*/.claude/hooks",
  "settings.json",
  "settings.local.json",
  ".sync_*.db",
  ".sync_*.db-*",
  ".sync_*.db.ctmp",
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  TRASH_IN_ROOT,
]);

/**
 * What the root's own sync leaves out on top of that: the folders the device shares separately,
 * which lie in this tree at their place and are synced on their own, and what is per person.
 *
 * A name and not a path, because the client anchors no pattern at the top of a tree: a pattern
 * with a slash is matched from the beginning of the relative path, and a bare name at the top has
 * no slash to match. Measured on 2026-09-22 against the client, a name with a leading slash in
 * the list kept nothing out, and read in its source, csync_exclude.cpp. So a name stands here and is kept out at every
 * depth of the root. A folder deep in the root that carries the name of a room stays home.
 */
function rootExcludes(plan) {
  const names = new Set(["apps", VIEW_FILE]);
  for (const folder of plan.folders) if (!folder.root) names.add(folder.path.split("/")[0]);
  // A folder the device no longer names stays out as well, until it lies next to the root.
  for (const item of plan.gone || []) if (item.top) names.add(item.path);
  return [...NEVER_SYNCED, ...[...names].sort()];
}

/** Folders the walk does not go into: they are not synced, so nothing of ours lies in them. */
const NOT_WALKED = new Set([".git", "node_modules", ".next", ".venv", "__pycache__", TRASH_IN_ROOT]);

/**
 * The mark the client puts in the name of a file it could not merge. Two spellings: the one of the
 * client's family, `_conflict-`, and the one this client wrote on 2026-09-22 at a device, measured
 * with a file that differed on both sides: `name (conflicted copy 2026-09-22 201200).ext`.
 */
const CONFLICT_MARK = /_conflict-| \(conflicted copy /;

// --- What stays home, and what a sync would do ------------------------------------------------

/**
 * The rules of the .gitignore at the top of this root, read the way git reads them.
 *
 * What the house keeps out of its version control it keeps out of the company folder too: the
 * clones of its products, what runs, its secrets. Only the file at the top counts. A .gitignore
 * deeper down often keeps big media out of git that the house still shares with its people, and
 * the one at the top is the one the house wrote for the whole tree.
 */
function gitignoreRules() {
  const file = join(ROOT, ".gitignore");
  return existsSync(file) ? parseGitignore(readFileSync(file, "utf8")) : [];
}

/** The rules of a .gitignore out of its text. The kit's `root.mjs --adopt` reads with this one too. */
export function parseGitignore(text) {
  const rules = [];
  for (const raw of String(text).split(/\r?\n/)) {
    let line = raw.replace(/(?<!\\)\s+$/, "");
    if (!line || line.startsWith("#")) continue;
    const negate = line.startsWith("!");
    if (negate) line = line.slice(1);
    line = line.replace(/^\\([#!])/, "$1");
    const dirOnly = line.endsWith("/");
    line = line.replace(/\/+$/, "");
    if (!line) continue;
    const anchored = line.includes("/");
    const body = line.replace(/^\//, "");
    rules.push({ negate, dirOnly, anchored, body, regex: new RegExp(`${anchored ? "^" : "(?:^|/)"}${globSource(body)}$`) });
  }
  return rules;
}

/** A pattern of git as the source of a regular expression: `*` stays in its folder, `**` does not. */
function globSource(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (c === "*") out += "[^/]*";
    else if (c === "?") out += "[^/]";
    else if (c === "[" && glob.indexOf("]", i + 2) > i) {
      const end = glob.indexOf("]", i + 2);
      out += glob.slice(i, end + 1).replace(/^\[!/, "[^");
      i = end;
    } else if (c === "\\" && i + 1 < glob.length) {
      i += 1;
      out += glob[i].replace(/[.+^${}()|[\]\\*?]/g, "\\$&");
    } else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return out;
}

/** Does the .gitignore leave this path out? The last rule that matches decides, as in git. */
export function ignoredBy(rules, path, isDir) {
  let hit = null;
  for (const rule of rules) {
    if (rule.dirOnly && !isDir) continue;
    if (rule.regex.test(path)) hit = rule.negate ? null : rule;
  }
  return hit;
}

/**
 * One rule of git as one line of the client's list, where the client reads it the same way.
 *
 * A name without a slash stands for that name at every depth, for git and for the client alike.
 * A path with a slash inside is matched from the top by both. A name anchored at the top with a
 * leading slash is not: the client anchors no name (measured on 2026-09-22), so such a rule is
 * answered with the paths it hits in this tree. `undefined` means: answer it that way, an empty
 * string: it has nothing to do with this folder.
 */
function clientLine(rule, prefix) {
  if (rule.negate || rule.body.includes("**")) return undefined;
  if (!rule.anchored) return rule.body;
  if (!rule.body.includes("/")) return undefined;
  if (!prefix) return rule.body;
  if (rule.body.startsWith(`${prefix}/`)) return rule.body.slice(prefix.length + 1);
  return /[*?[]/.test(rule.body) ? undefined : "";
}

/** The entries of a folder, or none when it cannot be read. */
function entriesOf(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

const slashed = (path) => path.split("\\").join("/");

/**
 * What the .gitignore of this root adds to the client's list for one folder of this tree.
 *
 * Rules the client reads the same way go in as they are. The others go in as the paths they hit
 * right now: a line per folder or file, found by walking the tree. With a `!` in the file every
 * rule goes that way, because a line of the client cannot take back what another one kept out.
 */
function houseIgnores(local, base = []) {
  const rules = gitignoreRules();
  if (!rules.length) return { lines: [], pinned: new Set() };
  const prefix = slashed(relative(ROOT, local));
  const negations = rules.some((rule) => rule.negate);
  const lines = new Set();
  const pinned = new Set();
  const rest = [];
  for (const rule of rules) {
    const line = negations ? undefined : clientLine(rule, prefix);
    if (line === undefined) rest.push(rule);
    else if (line) lines.add(line);
  }
  if (rest.length) {
    const tests = [...base, ...lines].map(excludeTest);
    const walk = (at, deep) => {
      if (deep > 40) return;
      for (const entry of entriesOf(at)) {
        const path = join(at, entry.name);
        const mine = slashed(relative(local, path));
        if (entry.isSymbolicLink() || tests.some((test) => test(mine))) continue;
        const dir = entry.isDirectory();
        if (ignoredBy(negations ? rules : rest, slashed(relative(ROOT, path)), dir)) {
          lines.add(mine);
          if (!mine.includes("/")) pinned.add(mine);
          continue;
        }
        if (dir) walk(path, deep + 1);
      }
    };
    walk(local, 0);
  }
  return { lines: [...lines], pinned };
}

/** What marks a source tree: the same manifests as check 17 of the root's check script. */
const MANIFESTS = Object.freeze(["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "composer.json", "Gemfile"]);
const BUILT = Object.freeze(["build", "dist"]);

/**
 * The build folders of the source trees in this folder, as paths for the client's list.
 *
 * `build` and `dist` are made by a machine only where a manifest lies next to them. Elsewhere they
 * are the house's: a skill called build, a folder of drafts called dist. So they go into the list
 * as the paths they have in the tree right now, not as names. Only when a synced folder is itself
 * a source tree does its own `build` go as a bare name, and then it holds at every depth of that
 * folder: the client anchors no name at the top. `sync --plan` shows what that keeps home.
 */
function builtFolders(local, base = []) {
  const tests = base.map(excludeTest);
  const out = [];
  const walk = (at, deep) => {
    if (deep > 40) return;
    const entries = entriesOf(at);
    const source = entries.some((entry) => entry.isFile() && (MANIFESTS.includes(entry.name) || /\.(csproj|sln)$/.test(entry.name)));
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const path = join(at, entry.name);
      const rel = slashed(relative(local, path));
      if (tests.some((test) => test(rel))) continue;
      if (source && BUILT.includes(entry.name)) {
        out.push(rel);
        continue;
      }
      walk(path, deep + 1);
    }
  };
  walk(local, 0);
  return out;
}

/** The list for one folder: what never goes, what the root keeps to itself, what the house ignores, what was built. */
function excludesFor(plan, folder, local) {
  const base = folder.root ? rootExcludes(plan) : [...NEVER_SYNCED];
  const house = houseIgnores(local, base);
  const built = builtFolders(local, [...base, ...house.lines]);
  const list = [...new Set([...base, ...house.lines, ...built])];
  // A name that stands for one entry at the top, and that the client reads at every depth. What it
  // keeps home further down, the plan names: the .gitignore did not mean it.
  list.pinned = new Set([...house.pinned, ...built.filter((path) => !path.includes("/"))].filter((name) => !base.includes(name)));
  return list;
}

/** How much lies below a path: files and bytes, without following a link. */
function weigh(path) {
  let count = 0;
  let bytes = 0;
  const walk = (at, deep) => {
    let info;
    try {
      info = lstatSync(at);
    } catch {
      return;
    }
    if (info.isSymbolicLink()) return;
    if (!info.isDirectory()) {
      count += 1;
      bytes += info.size;
      return;
    }
    if (deep > 60) return;
    for (const entry of entriesOf(at)) walk(join(at, entry.name), deep + 1);
  };
  walk(path, 0);
  return { count, bytes };
}

/**
 * What lies below a folder as the client sees it through its list: the files it syncs, with size
 * and time to the second, and what stays home, weighed per line of the list that keeps it.
 */
function localTree(dir, excludes, { weighHome = true } = {}) {
  const tests = excludes.map((pattern) => [pattern, excludeTest(pattern)]);
  const files = new Map();
  const home = new Map();
  const over = [];
  const walk = (at, deep) => {
    if (deep > 40) return;
    for (const entry of entriesOf(at)) {
      const path = join(at, entry.name);
      const rel = slashed(relative(dir, path));
      if (entry.isSymbolicLink()) continue;
      const hit = tests.find(([, test]) => test(rel));
      if (hit && excludes.pinned?.has(hit[0]) && rel !== hit[0]) over.push(rel);
      if (hit) {
        if (weighHome) {
          const size = weigh(path);
          const had = home.get(hit[0]) || { count: 0, bytes: 0 };
          home.set(hit[0], { count: had.count + size.count, bytes: had.bytes + size.bytes });
        }
        continue;
      }
      if (entry.isDirectory()) walk(path, deep + 1);
      else if (entry.isFile()) {
        try {
          const info = statSync(path);
          // The client writes names decomposed (NFD) on this computer, the service answers them
          // composed (NFC): measured on 2026-09-27 with an umlaut. One key for both, the real name kept.
          files.set(rel.normalize("NFC"), { size: info.size, mtime: Math.floor(info.mtimeMs / 1000), path: rel });
        } catch {
          // Gone between reading the folder and looking at the file: it is not there.
        }
      }
    }
  };
  walk(dir, 0);
  return { files, home, over };
}

/** The codes of an address that is not reached at all, as opposed to one that answers with an error. */
const NOT_REACHED = new Set(["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNRESET", "EADDRNOTAVAIL"]);

/** Does an address answer at all? Any answer counts, an error of the certificate too: the network got there. */
async function reaches(address, ca, timeout = 8_000) {
  try {
    await send({ address, ca }, { path: "", timeout, limit: 64 * 1024 });
    return { address, ok: true };
  } catch (error) {
    if (TLS_CODES.has(error.code) || !NOT_REACHED.has(error.code)) return { address, ok: true };
    return { address, ok: false, code: error.code || "?" };
  }
}

/**
 * The address of the file service that answers from here. The first one the device names, and only
 * when it does not answer, the next. Measured on 2026-09-27: the device named `https://arasul:8443`,
 * and that name resolved on a Mac only through Tailscale; the device's LAN address answered.
 */
async function pickAddress(plan, device) {
  if (!plan.addresses || plan.addresses.length < 2) return plan.address;
  const tried = [];
  for (const address of plan.addresses) {
    const result = await reaches(address, device.entry.ca, 5_000);
    if (result.ok) {
      if (tried.length) say(`  ${t(`${tried.map((item) => `${item.address} (${item.code})`).join(", ")} does not answer from here, taking ${address}.`, `${tried.map((item) => `${item.address} (${item.code})`).join(", ")} antwortet von hier nicht, genommen wird ${address}.`)}`);
      plan.address = address;
      return address;
    }
    tried.push(result);
  }
  return plan.address;
}

/**
 * The spaces of the file service this person sees.
 *
 * Name and password go to the service as the client sends them, because the service takes nothing
 * else from a program (the device switches basic authentication on for exactly that, as of
 * 2026-09-22). The certificate is the one pinned for the device: the service lies on the device.
 */
async function spacesOf(plan, device, password) {
  const target = { address: plan.address, ca: device.entry.ca };
  const basic = { user: plan.user, password };
  const answer = await ask(target, { path: "graph/v1.0/me/drives", basic, timeout: 60_000 });
  if (answer.status === 401 || answer.status === 403) {
    stop(t(
      `The file service does not take the password of ${plan.user} (${answer.status}). Nothing was written.${inBackground ? " The access in the keychain no longer holds, ended, revoked or the password changed: node arasul.mjs sync --install issues a new one." : ""}`,
      `Der Dateidienst nimmt das Passwort von ${plan.user} nicht an (${answer.status}). Nichts wurde geschrieben.${inBackground ? " Der Zugang im Schlüsselbund gilt nicht mehr, abgelaufen, widerrufen oder das Passwort geändert: node arasul.mjs sync --install stellt einen neuen aus." : ""}`
    ));
  }
  if (answer.status < 200 || answer.status >= 300) {
    stop(t(`The file service answers the list of its spaces with status ${answer.status}.`, `Der Dateidienst antwortet auf die Liste seiner Räume mit Status ${answer.status}.`));
  }
  const list = jsonOf(answer)?.value;
  if (!Array.isArray(list)) stop(t("The file service answers the list of its spaces with something this file cannot read.", "Der Dateidienst antwortet auf die Liste seiner Räume mit etwas, das diese Datei nicht lesen kann."));
  return {
    target,
    basic,
    spaces: list.map((drive) => ({ id: String(drive?.id ?? ""), name: String(drive?.name ?? ""), type: String(drive?.driveType ?? ""), dav: String(drive?.root?.webDavUrl ?? "") })),
  };
}

/** Where a folder of the device lies in the file service, as a path for WebDAV, or null. */
function davOf(service, folder) {
  // A person's own space carries their user name. A folder whose id is that name has two spaces of
  // one name, and the folder's is the project space: measured on 2026-09-27, the service listed the
  // empty personal one first, and the plan compared with it.
  const byName = (name) => {
    const found = service.spaces.filter((space) => space.dav && (space.name === name || space.id === name));
    return found.find((space) => space.type === "project") || found.find((space) => space.type !== "personal") || found[0];
  };
  if (folder.root || folder.level === 1) {
    const space = byName(folder.id);
    return space ? new URL(space.dav).pathname.replace(/\/+$/, "") : null;
  }
  const shares = byName(SERVICE.shared) || service.spaces.find((space) => space.dav && space.type === "virtual");
  return shares ? `${new URL(shares.dav).pathname.replace(/\/+$/, "")}/${encodeURIComponent(folder.id)}` : null;
}

const PROPFIND = '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/><d:getlastmodified/></d:prop></d:propfind>';

/** The answers of one PROPFIND: path, folder or file, size, time. Read by pattern, the prefix of the namespace varies. */
function multistatus(xml) {
  const items = [];
  for (const block of xml.split(/<(?:[\w-]+:)?response[\s>]/).slice(1)) {
    const href = block.match(/<(?:[\w-]+:)?href>([^<]*)</)?.[1];
    if (!href) continue;
    const size = Number(block.match(/<(?:[\w-]+:)?getcontentlength>(\d+)</)?.[1] || 0);
    const modified = Date.parse(block.match(/<(?:[\w-]+:)?getlastmodified>([^<]*)</)?.[1] || "");
    const dir = /<(?:[\w-]+:)?collection\s*\/?>/.test(block);
    const decoded = href.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    items.push({ path: decodeURIComponent(decoded.replace(/^https?:\/\/[^/]+/, "")), dir, size, mtime: Number.isFinite(modified) ? Math.floor(modified / 1000) : 0 });
  }
  return items;
}

/**
 * What lies in one room of the file service, through the same list as here: one folder deep per
 * request, eight at a time, because a PROPFIND over the whole tree is switched off by default.
 */
async function remoteTree(service, dav, excludes) {
  const tests = excludes.map((pattern) => [pattern, excludeTest(pattern)]);
  const files = new Map();
  const home = new Map();
  const prefix = decodeURIComponent(dav);
  const queue = [""];
  let missing = false;
  while (queue.length) {
    const batch = queue.splice(0, 8);
    await Promise.all(batch.map(async (sub) => {
      const path = `${dav}/${sub ? `${sub.split("/").map(encodeURIComponent).join("/")}/` : ""}`;
      const answer = await ask(service.target, {
        method: "PROPFIND",
        path,
        basic: service.basic,
        body: PROPFIND,
        headers: { Depth: "1", "Content-Type": "application/xml; charset=utf-8", Accept: "application/xml" },
        timeout: 120_000,
        limit: 256 * 1024 * 1024,
      });
      if (answer.status === 404 && !sub) {
        missing = true;
        return;
      }
      if (answer.status !== 207) {
        stop(t(`The file service answers PROPFIND on ${sub || "/"} with status ${answer.status}. Nothing was written.`, `Der Dateidienst antwortet auf PROPFIND für ${sub || "/"} mit Status ${answer.status}. Nichts wurde geschrieben.`));
      }
      for (const item of multistatus(answer.body.toString("utf8"))) {
        if (!item.path.startsWith(prefix)) continue;
        const rel = item.path.slice(prefix.length).replace(/^\/+|\/+$/g, "");
        if (!rel || rel === sub) continue;
        const hit = tests.find(([, test]) => test(rel));
        if (hit) {
          const had = home.get(hit[0]) || { count: 0, bytes: 0 };
          home.set(hit[0], { count: had.count + (item.dir ? 0 : 1), bytes: had.bytes + (item.dir ? 0 : item.size) });
          continue;
        }
        if (item.dir) queue.push(rel);
        else files.set(rel.normalize("NFC"), { size: item.size, mtime: item.mtime });
      }
    }));
  }
  return { files, home, missing };
}

// The state of the last sync per folder, file by file: size and time here and there. The client
// sets the time of a file it moves to the time on the other side, but not always: an empty file
// carries the time of its upload on the device (measured on 2026-09-27). So both sides are kept,
// and each is compared with its own. With it a plan tells a file that is new on one side from one
// that was deleted on the other.
const BASES = join(CONFIG_DIR, "firmenordner-stand");
const baseFile = (local) => join(BASES, `${createHash("sha256").update(local).digest("hex").slice(0, 16)}.json`);

function readBase(local) {
  const data = readJson(baseFile(local), null);
  if (!data || data.local !== local || typeof data.files !== "object") return null;
  // remote: the state there, false when the room was listed and the file was not in it, null when unknown.
  const absent = data.listed ? false : null;
  return new Map(Object.entries(data.files).map(([path, [size, mtime, rsize, rmtime]]) => [path, { size, mtime, remote: rsize === undefined ? absent : { size: rsize, mtime: rmtime } }]));
}

/** The state after a sync: what lies here, and when the room was listed afterwards, what lies there. */
function writeBase(local, files, remote = null) {
  ensureConfigDir();
  mkdirSync(BASES, { recursive: true, mode: 0o700 });
  const temporary = join(BASES, `.stand-${process.pid}.tmp`);
  const entry = (path, file) => {
    const there = remote?.get(path);
    return there ? [file.size, file.mtime, there.size, there.mtime] : [file.size, file.mtime];
  };
  const data = { local, at: new Date().toISOString(), listed: Boolean(remote), files: Object.fromEntries([...files].map(([path, file]) => [path, entry(path, file)])) };
  writeFileSync(temporary, `${JSON.stringify(data)}\n`, { mode: 0o600 });
  renameSync(temporary, baseFile(local));
}

/**
 * Two states of a file are the same when size and time to the second agree, or, where the time
 * differs, when the content does: `sum` is filled by `settleSums` and only for files of equal size.
 * A file that was copied without its time (cp without -p, a download, an unzip) has the time of the
 * copy, and without the sum every such file would be a conflict on the first sync.
 */
const alike = (a, b) => a.size === b.size && (Math.abs(a.mtime - b.mtime) <= 1 || (a.sum !== undefined && a.sum === b.sum));

/**
 * The content sums of the files that lie on both sides with equal size and a different time, and of
 * those only: a plan over 20 000 files reads nothing where the times agree. Here the file is read,
 * there it is fetched. A file that cannot be read keeps no sum and stays different, as before.
 */
async function settleSums(service, dav, local, here, there) {
  const open = [...here].filter(([path, file]) => {
    const other = there.get(path);
    return other && other.size === file.size && Math.abs(other.mtime - file.mtime) > 1 && !CONFLICT_MARK.test(path.split("/").pop());
  });
  const empty = createHash("sha256").digest("hex");
  const queue = [...open];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [path, file] = next;
      const other = there.get(path);
      if (file.size === 0) {
        file.sum = empty;
        other.sum = empty;
        continue;
      }
      try {
        const mine = createHash("sha256").update(readFileSync(join(local, file.path))).digest("hex");
        const answer = await ask(service.target, { path: `${dav}/${path.split("/").map(encodeURIComponent).join("/")}`, basic: service.basic, timeout: 120_000, limit: file.size + 1024, headers: { Accept: "*/*" } });
        if (answer.status !== 200 || answer.body.length !== file.size) continue;
        file.sum = mine;
        other.sum = createHash("sha256").update(answer.body).digest("hex");
      } catch (error) {
        // A device that goes away is a device away; anything else leaves the file without a sum.
        if (error?.unreachable) throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
}

/** Is this folder one the person only reads? Nothing goes up from it, the file service refuses it. */
const readsOnly = (folder) => folder.right === "lesen";

/** The sentence for what lies in a folder that is only read: the plan and the sync say the same. */
const readOnlySentence = (list) => t(`does not go up, read only: ${fileCount(list.length)}: ${some(list, 3)}`, `geht nicht hoch, nur lesen: ${fileCount(list.length)}: ${some(list, 3)}`);

/**
 * `comparePlan` for one folder, with the content sums settled first. In a folder that is only read
 * what would go up cannot: it is named `blocked` instead, and sync keeps it at home.
 */
async function comparePlace(service, dav, folder, local, here, there, base) {
  if (dav) await settleSums(service, dav, local, here.files, there.files);
  const result = comparePlan(here.files, there.files, base);
  result.blocked = readsOnly(folder) ? result.up : [];
  if (readsOnly(folder)) result.up = [];
  result.held = heldByName(result, here.files, there.files);
  return result;
}

/**
 * What the client keeps out because of a name, though the human meant one path.
 *
 * A file that cannot go up and lies at the top goes to the client as its bare name, and the client
 * anchors no name at the top (measured on 2026-10-01 with the vendor's client: `/x.md`, `./x.md`
 * and `x.m[d/]` kept nothing out and the file went up). So the name holds at every depth: a file of
 * the same name further down neither comes down nor is compared. Those paths are named one by one,
 * and what would have come down from them is taken out of `down`.
 */
function heldByName(result, here, there) {
  const names = new Set(result.blocked.map((item) => item.path).filter((path) => !path.includes("/")));
  if (!names.size) return [];
  const held = [...new Set([...here.keys(), ...there.keys()])].filter((path) => path.includes("/") && names.has(path.split("/").pop())).sort();
  const gone = new Set(held);
  result.down = result.down.filter((item) => !gone.has(item.path));
  return held;
}

/** The sentence for what stays out of a read-only folder because a file of its name lies at the top. */
const heldSentence = (held) => t(
  `stays out as well, because a file of the same name lies at the top here and cannot go up, and the client keeps a name out at every depth: ${held.slice(0, 8).join(", ")}${held.length > 8 ? ", ..." : ""}. Rename or move the one at the top, then these are synced: the file itself only comes down once it is saved anew on the device.`,
  `bleibt auch draußen, weil oben hier eine Datei gleichen Namens liegt, die nicht hochgeht, und der Klient einen Namen in jeder Tiefe draußen hält: ${held.slice(0, 8).join(", ")}${held.length > 8 ? ", ..." : ""}. Benenne die oben um oder nimm sie weg, dann werden diese abgeglichen; die Datei selbst kommt erst herunter, wenn sie am Gerät neu gespeichert wird.`
);

/**
 * What a sync would do with each file, out of here, there and the state of the last sync.
 *
 * Without a state nothing is deleted: what lies on one side only goes to the other, and what lies
 * on both and differs is a conflict, the client keeps both. With a state, a file missing on one
 * side and unchanged on the other was deleted there, and goes on the other side too.
 */
function comparePlan(local, remote, base) {
  const out = { up: [], down: [], conflict: [], deleteThere: [], deleteHere: [], same: 0 };
  const paths = new Set([...local.keys(), ...remote.keys(), ...(base ? base.keys() : [])]);
  for (const path of [...paths].sort()) {
    // A conflicted copy stays where it came about, the client takes it nowhere; sync names it.
    if (CONFLICT_MARK.test(path.split("/").pop())) continue;
    const here = local.get(path);
    const there = remote.get(path);
    const was = base?.get(path);
    if (!here && !there) continue;
    if (!was) {
      if (here && there) {
        if (alike(here, there)) out.same += 1;
        else out.conflict.push({ path, size: here.size });
      } else if (here) out.up.push({ path, size: here.size });
      else out.down.push({ path, size: there.size });
      continue;
    }
    const changedHere = here && !alike(here, was);
    const changedThere = there && !alike(there, was.remote ? was.remote : was);
    if (here && there) {
      if (changedHere && changedThere && !alike(here, there)) out.conflict.push({ path, size: here.size });
      else if (changedHere && !changedThere) out.up.push({ path, size: here.size });
      else if (changedThere && !changedHere) out.down.push({ path, size: there.size });
      else out.same += 1;
    } else if (here) {
      // It was not there at the last sync either: it goes up, it was not deleted there.
      if (changedHere || was.remote === false) out.up.push({ path, size: here.size });
      else out.deleteHere.push({ path, size: here.size });
    } else if (changedThere) out.down.push({ path, size: there.size });
    else out.deleteThere.push({ path, size: there.size });
  }
  return out;
}

/** A size for a human, in the language of the root. */
function sized(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const text = unit === 0 ? String(value) : value.toFixed(value < 10 ? 1 : 0);
  return `${german ? text.replace(".", ",") : text} ${units[unit]}`;
}

const total = (list) => list.reduce((sum, item) => sum + item.size, 0);
const fileCount = (count) => (count === 1 ? t("1 file", "1 Datei") : t(`${count} files`, `${count} Dateien`));
const some = (list, max = 5) => `${list.slice(0, max).map((item) => item.path).join(", ")}${list.length > max ? ", ..." : ""}`;

/** What stays home, heaviest first, in one line per pattern. */
function sayHome(label, home) {
  const rows = [...home].filter(([, size]) => size.count > 0).sort((a, b) => b[1].bytes - a[1].bytes);
  if (!rows.length) return;
  say(`    ${label}:`);
  for (const [pattern, size] of rows.slice(0, 20)) say(`      ${pattern.padEnd(28)} ${fileCount(size.count)}, ${sized(size.bytes)}`);
  if (rows.length > 20) say(`      ${t(`and ${rows.length - 20} more lines of the list`, `und ${rows.length - 20} weitere Zeilen der Liste`)}`);
}

/**
 * `sync --plan`: what a sync would move, and nothing more.
 *
 * It asks the device for the folders, the file service for what lies in them, and looks at this
 * tree through the same list the client gets. It writes nothing: no file here, no APP.md, no view,
 * no state of a sync, and it does not start the client. The password is asked for, because the
 * file service shows its rooms to no one else.
 */
async function doPlan(args) {
  const device = chooseDevice(args);
  const plan = await askFolders(device);
  if (!plan.service) {
    say(`${t("Company folder", "Firmenordner")}: ${plan.reason}`);
    return false;
  }
  const head = () => {
    say(`${t("Company folder", "Firmenordner")}: ${plan.address || t("the device names no address", "das Gerät nennt keine Adresse")}. ${t("Plan only, nothing is written.", "Nur der Plan, nichts wird geschrieben.")}`);
    for (const item of plan.refused) say(`  ${t("Not synced", "Nicht abgeglichen")}: ${item.line}, ${item.why}`);
    sayGone(plan.gone);
  };
  if (!plan.folders.length) {
    head();
    say(`  ${t("No folder is shared with you. A sync would move nothing.", "Dir ist kein Ordner freigegeben. Ein Abgleich bewegte nichts.")}`);
    return !plan.refused.length;
  }
  if (!plan.address) stop(t("The device names no address of the file service.", "Das Gerät nennt keine Adresse des Dateidienstes."));
  if (!plan.user) stop(t("The device names no user for the file service.", "Das Gerät nennt keinen Benutzer für den Dateidienst."));
  const password = await askPassword(args, plan, device);
  await pickAddress(plan, device);
  const service = await spacesOf(plan, device, password);
  // Before the first line: a folder that is still to become a root speaks the house's language.
  await learnLanguage(service, plan);
  head();
  const rank = (folder) => (folder.root ? 0 : folder.level);
  const order = [...plan.folders].sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path));
  const sums = { up: [], down: [], conflict: [], deleteThere: [], deleteHere: [] };
  // First every folder compared, then the limit asked: an area and its project share one.
  const compared = [];
  for (const folder of order) {
    const local = placeOf(folder);
    const excludes = excludesFor(plan, folder, local);
    const here = existsSync(local) ? localTree(local, excludes) : { files: new Map(), home: new Map() };
    const dav = davOf(service, folder);
    const there = dav ? await remoteTree(service, dav, excludes) : { files: new Map(), home: new Map(), missing: true };
    const base = readBase(local);
    compared.push({ folder, local, excludes, here, dav, there, base, result: await comparePlace(service, dav, folder, local, here, there, base) });
  }
  const limits = await overLimit(device, plan, new Map(compared.map(({ folder, result }) => [folder.path, total(result.up)])));
  for (const { folder, local, excludes, here, dav, there, base, result } of compared) {
    // Only for whoever writes the root: a reader gets the device's version, and sync goes through.
    const rules = dav ? await rootRules(service, folder, local, excludes, { here, there, base, result }) : { stop: [], bridge: null, foreign: [] };
    // The bridge a reader keeps is no conflict: it has its own line below, and the client is told to leave it alone.
    if (rules.bridge?.keep) result.conflict = result.conflict.filter((item) => item.path !== "arasul.mjs");
    for (const key of Object.keys(sums)) sums[key].push(...result[key]);
    say();
    say(`  ${labelOf(folder)}   ${t("level", "Ebene")} ${folder.level}${folder.right ? `, ${folder.right}` : ""}`);
    if (there.missing) say(`    ${t("The file service shows no room for it to you yet: everything here would go up.", "Der Dateidienst zeigt dir dafür noch keinen Raum: alles hier ginge hoch.")}`);
    say(`    ${base ? t(`Compared with the last sync (${base.size} files).`, `Verglichen mit dem letzten Abgleich (${base.size} Dateien).`) : t("Never synced from here: what lies on one side only goes to the other, nothing is deleted.", "Von hier noch nie abgeglichen: was nur auf einer Seite liegt, geht auf die andere, gelöscht wird nichts.")}`);
    say(`    ${t("Up", "Hoch")}:                ${fileCount(result.up.length)}, ${sized(total(result.up))}${result.up.length ? `: ${some(result.up, 3)}` : ""}`);
    if (result.blocked.length) say(`    ${t("Up", "Hoch")}:                ${readOnlySentence(result.blocked)}`);
    say(`    ${t("Down", "Runter")}:              ${fileCount(result.down.length)}, ${sized(total(result.down))}${result.down.length ? `: ${some(result.down, 3)}` : ""}`);
    if (result.held.length) say(`    ${t("Down", "Runter")}:              ${heldSentence(result.held)}`);
    say(`    ${t("Unchanged", "Unverändert")}:         ${fileCount(result.same)}`);
    if (result.conflict.length) {
      say(`    ${t("Conflicts", "Konflikte")}:         ${fileCount(result.conflict.length)}, ${t("different on both sides, the client keeps both", "auf beiden Seiten anders, der Klient behält beide")}: ${some(result.conflict)}`);
    }
    if (limits.has(folder.path)) say(`    ${t("sync stops here", "sync hält hier an")}: ${limits.get(folder.path)}`);
    if (rules.stop.length) say(`    ${t(`sync stops here: ${rules.stop.join(", ")} make this root and differ on both sides. Keep one version on both sides first, or sync --keep-mine.`, `sync hält hier an: ${rules.stop.join(", ")} machen diese Wurzel aus und sind auf beiden Seiten verschieden. Behalte zuerst eine Fassung auf beiden Seiten, oder sync --keep-mine.`)}`);
    if (rules.bridge?.keep) say(`    ${keepBridgeSentence(rules.bridge)}`);
    if (rules.bridge?.way === "down") say(`    ${t(`arasul.mjs: the bridge in the room (${versionText(rules.bridge.theirs)}) is newer than this one (${versionText(rules.bridge.ours)}), sync takes it.`, `arasul.mjs: die Brücke im Raum (${versionText(rules.bridge.theirs)}) ist neuer als diese (${versionText(rules.bridge.ours)}), sync nimmt sie.`)}`);
    if (rules.foreign.length && (rules.first || rules.stop.length)) {
      say(`    ${t(
        `Foreign in the room of the root, ${fileCount(rules.foreign.length)} the device has and this root has not, or has otherwise. Without --keep-mine they come down at their names or as conflicts; with --keep-mine they go on the device into ${ASIDE()}/<time>/ and come down there only:`,
        `Fremd im Raum der Wurzel, ${fileCount(rules.foreign.length)}, die das Gerät hat und diese Wurzel nicht oder anders. Ohne --keep-mine kämen sie an ihren Namen oder als Konflikt herunter; mit --keep-mine gingen sie am Gerät nach ${ASIDE()}/<zeit>/ und kämen nur dort herunter:`
      )}`);
      for (const path of rules.foreign) say(`      ${path}`);
    }
    if (result.deleteHere.length) say(`    ${t("Deleted on the device", "Am Gerät gelöscht")}: ${fileCount(result.deleteHere.length)}, ${sized(total(result.deleteHere))}, ${t("would go here too, into the trash first", "ginge hier auch, zuerst in den Papierkorb")}: ${some(result.deleteHere)}`);
    if (result.deleteThere.length) say(`    ${t("Deleted here", "Hier gelöscht")}:     ${fileCount(result.deleteThere.length)}, ${sized(total(result.deleteThere))}, ${t("would go on the device too", "ginge am Gerät auch")}: ${some(result.deleteThere)}`);
    sayHome(t("Stays home", "Bleibt zu Hause"), here.home);
    if (here.over?.length) {
      say(`    ${t(
        `Stays home as well, though the .gitignore means only the one at the top: the client keeps a name out at every depth: ${here.over.slice(0, 5).join(", ")}${here.over.length > 5 ? ", ..." : ""}`,
        `Bleibt auch zu Hause, obwohl die .gitignore nur den oben meint: der Klient hält einen Namen in jeder Tiefe draußen: ${here.over.slice(0, 5).join(", ")}${here.over.length > 5 ? ", ..." : ""}`
      )}`);
    }
    sayHome(t("Stays on the device, does not come down", "Bleibt am Gerät, kommt nicht herunter"), there.home);
  }
  say();
  say(t(
    `In total: up ${fileCount(sums.up.length)}, ${sized(total(sums.up))}; down ${fileCount(sums.down.length)}, ${sized(total(sums.down))}; ${sums.conflict.length} conflicts; deleted on the device ${sums.deleteHere.length}, deleted here ${sums.deleteThere.length}.`,
    `Insgesamt: hoch ${fileCount(sums.up.length)}, ${sized(total(sums.up))}; runter ${fileCount(sums.down.length)}, ${sized(total(sums.down))}; ${sums.conflict.length} Konflikte; am Gerät gelöscht ${sums.deleteHere.length}, hier gelöscht ${sums.deleteThere.length}.`
  ));
  return true;
}

/**
 * The files that make this folder a root. Where one of them differs on both sides, the client puts
 * the device's version at its name and the house's next to it as a conflicted copy. Measured on
 * 2026-09-26 at a device whose root carried another house's scaffold: after the first sync the
 * house's `.gitignore` was a conflicted copy, the device's one decided, and the second sync took
 * the clones of four products up that the house's own had kept home. So a sync stops before the
 * client runs when one of these conflicts, and names them.
 */
const RULE_FILES = Object.freeze([".gitignore", ".claude/CLAUDE.md", ".claude/root.json", ".claude/places.json", "arasul.mjs"]);

/** The kit version a bridge came with, out of its text, or null for one from before 0.51.0. */
export function bridgeVersion(text) {
  const found = String(text).match(/^const BRIDGE = "(\d+)\.(\d+)\.(\d+)";$/m);
  return found ? found.slice(1).map(Number) : null;
}

/** Above zero when `a` is the newer one. A bridge without a version is older than any with one. */
function newer(a, b) {
  if (!a || !b) return (a ? 1 : 0) - (b ? 1 : 0);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** A reader cannot put its newer bridge into the room: it keeps it here, and says who lifts the one on the device. */
const keepBridgeSentence = (bridge) => bridge.writes ? t(
  `arasul.mjs: this bridge (${versionText(bridge.ours)}) is newer than the one on the device (${versionText(bridge.theirs)}). sync does not put it into the room, because every account that reads this root runs the one there; it keeps this one here and makes no conflicted copy. To lift the one on the device, run \`node arasul.mjs deploy\`.`,
  `arasul.mjs: diese Brücke (${versionText(bridge.ours)}) ist neuer als die am Gerät (${versionText(bridge.theirs)}). sync legt sie nicht in den Raum, weil jedes Konto, das diese Wurzel liest, die dort ausführt; es behält diese hier und legt keine Konfliktkopie an. Um die am Gerät zu heben, führe \`node arasul.mjs deploy\` aus.`
) : t(
  `arasul.mjs: this bridge (${versionText(bridge.ours)}) is newer than the one on the device (${versionText(bridge.theirs)}). You only read this root, so sync keeps this one here and makes no conflicted copy; the one on the device stays older until somebody with 'schreiben' runs deploy.`,
  `arasul.mjs: diese Brücke (${versionText(bridge.ours)}) ist neuer als die am Gerät (${versionText(bridge.theirs)}). Du liest diese Wurzel nur, darum behält sync diese hier und legt keine Konfliktkopie an; die am Gerät bleibt älter, bis jemand mit 'schreiben' deploy ausführt.`
);

const versionText = (version) => (version ? version.join(".") : t("from before 0.51.0", "von vor 0.51.0"));

/** Where `--keep-mine` puts the device's version of a root, on the device and so here. */
const ASIDE = () => `.claude/${t("device-old", "geraet-alt")}`;

/**
 * What the root's own files say before the client runs, for a person who writes the root.
 *
 * `stop`: files that make the root and differ on both sides; a sync stops at them unless the
 * person says `--keep-mine`. `bridge`: the bridge differs, and one side is the newer version. A newer
 * room's bridge takes the place of the older one here. A newer bridge here goes into the room only
 * where `lifts` is set, which is `deploy`: the room's bridge is what every reader runs, so a sync
 * keeps the newer one at home and names `deploy`. `foreign`: what `--keep-mine` moves aside,
 * the device's version of every file that conflicts and, at the first sync of a root that is one
 * already here, every file only the device has: that is the root of another house, or an older one
 * of this. Readers get the device's version, and that is right: the rules are the house's.
 */
async function rootRules(service, folder, local, excludes, known = null, lifts = false) {
  // A reader's bridge is a courtesy: where the room cannot be listed, the client runs as before and says it itself.
  if (folder.root && folder.right !== "schreiben") {
    try {
      return await rootRulesOf(service, folder, local, excludes, known, lifts);
    } catch {
      return { stop: [], bridge: null, foreign: [], there: null };
    }
  }
  return rootRulesOf(service, folder, local, excludes, known, lifts);
}

async function rootRulesOf(service, folder, local, excludes, known, lifts) {
  const none = { stop: [], bridge: null, foreign: [], there: null };
  if (!folder.root) return none;
  // A reader is not asked for the rules of the root, but the bridge is a file of the kit: a newer one
  // here must not turn into a conflicted copy because the room's older one sits at its name.
  const writes = folder.right === "schreiben";
  const dav = davOf(service, folder);
  if (!dav) return none;
  const there = known?.there || (await remoteTree(service, dav, excludes));
  const here = known?.here || localTree(local, excludes, { weighHome: false });
  const base = known ? known.base : readBase(local);
  const result = known?.result || (await comparePlace(service, dav, folder, local, here, there, base));
  const isRoot = existsSync(join(local, ".claude", "root.json"));
  const conflicts = result.conflict.map((item) => item.path);
  let stops = conflicts.filter((path) => RULE_FILES.includes(path));
  let bridge = null;
  // A newer bridge here is looked at whenever the two differ, not only at a conflict: after the first
  // sync the state holds each side against its own past, so the pair no longer counts as a conflict, and
  // the client would still put the room's older file at the name (measured 2026-10-01 at a device, second run).
  const hereBridge = here.files.get("arasul.mjs");
  const thereBridge = there.files.get("arasul.mjs");
  const differs = hereBridge && thereBridge && !alike(hereBridge, thereBridge);
  if ((conflicts.includes("arasul.mjs") || differs) && existsSync(join(local, "arasul.mjs"))) {
    const answer = await ask(service.target, { path: `${dav}/arasul.mjs`, basic: service.basic, timeout: 60_000 });
    const theirs = answer.status === 200 ? answer.body : null;
    const ours = readFileSync(join(local, "arasul.mjs"));
    const order = theirs ? newer(bridgeVersion(ours), bridgeVersion(theirs)) : 0;
    if (order > 0) bridge = { way: "up", keep: !(writes && lifts), writes, ours: bridgeVersion(ours), theirs: bridgeVersion(theirs), dav, body: ours, mtime: Math.floor(statSync(join(local, "arasul.mjs")).mtimeMs / 1000) };
    else if (order < 0 && isRoot && conflicts.includes("arasul.mjs")) bridge = { way: "down", ours: bridgeVersion(ours), theirs: bridgeVersion(theirs), body: theirs, mtime: there.files.get("arasul.mjs")?.mtime };
    // A folder that becomes a root takes the room's bridge anyway, see bootstrapBridge.
    if (bridge || !isRoot) stops = stops.filter((path) => path !== "arasul.mjs");
  }
  if (!writes) return { stop: [], bridge, foreign: [], there, first: !base };
  const handled = new Set(bridge ? ["arasul.mjs"] : []);
  const foreign = isRoot
    ? [...conflicts, ...(base ? [] : result.down.map((item) => item.path))].filter((path) => !handled.has(path)).sort()
    : [];
  return { stop: stops, bridge, foreign, there, first: !base };
}

/** Why a sync or a deploy stopped at the rules of the root, in one sentence with the way out. */
function ruleStop(paths) {
  return t(
    `Not synced: ${paths.join(", ")} differ here and on the device. The client would put the device's version at the name and this one next to it, and the rules of this root would change without anybody deciding it. Keep one version on both sides and sync again, or sync with --keep-mine: the device's version goes on the device into ${ASIDE()}/<time>/, stays there to be read, and this one takes its name. sync --plan names every file that would go there.`,
    `Nicht abgeglichen: ${paths.join(", ")} sind hier und am Gerät verschieden. Der Klient legte die Fassung des Geräts an den Namen und diese daneben, und die Regeln dieser Wurzel änderten sich, ohne dass jemand es entschieden hat. Behalte eine Fassung auf beiden Seiten und gleiche neu ab, oder gleiche mit --keep-mine ab: die Fassung des Geräts geht am Gerät nach ${ASIDE()}/<zeit>/, bleibt dort lesbar, und diese nimmt ihren Namen. sync --plan nennt jede Datei, die dorthin ginge.`
  );
}

const encoded = (rel) => rel.split("/").map(encodeURIComponent).join("/");

/**
 * The newer bridge takes the place of the older one, before the client runs, so that nothing
 * conflicts: up with a PUT that carries this file's time, down by writing the room's version here
 * with its time. Both sides then carry the same file at the same time.
 */
async function settleBridge(service, local, bridge) {
  if (bridge.keep) {
    say(`  ${keepBridgeSentence(bridge)}`);
  } else if (bridge.way === "up") {
    const answer = await ask(service.target, { method: "PUT", path: `${bridge.dav}/arasul.mjs`, basic: service.basic, body: bridge.body, headers: { "Content-Type": "application/octet-stream", "X-OC-Mtime": String(bridge.mtime) }, timeout: 120_000 });
    if (answer.status < 200 || answer.status >= 300) stop(t(`The file service did not take this bridge (status ${answer.status}). Nothing more was changed.`, `Der Dateidienst hat diese Brücke nicht angenommen (Status ${answer.status}). Sonst wurde nichts geändert.`));
    say(`  ${t(`arasul.mjs: this bridge (${versionText(bridge.ours)}) is newer than the one in the room (${versionText(bridge.theirs)}) and takes its place; everybody else gets it at their next sync.`, `arasul.mjs: diese Brücke (${versionText(bridge.ours)}) ist neuer als die im Raum (${versionText(bridge.theirs)}) und nimmt ihren Platz; alle anderen bekommen sie beim nächsten Abgleich.`)}`);
  } else {
    const file = join(local, "arasul.mjs");
    writeFileSync(file, bridge.body);
    if (bridge.mtime) utimesSync(file, bridge.mtime, bridge.mtime);
    say(`  ${t(`arasul.mjs: the bridge in the room (${versionText(bridge.theirs)}) is newer than this one (${versionText(bridge.ours)}) and takes its place here.`, `arasul.mjs: die Brücke im Raum (${versionText(bridge.theirs)}) ist neuer als diese (${versionText(bridge.ours)}) und nimmt hier ihren Platz.`)}`);
  }
}

/**
 * `--keep-mine`: the device's version of every foreign file moves on the device into one folder,
 * `.claude/geraet-alt/<date> <time>/` (`device-old` in an English root), at its path below it,
 * with WebDAV MOVE that overwrites nothing; a folder whose files all go moves as a whole. Then
 * nothing conflicts, the client takes this root up, and the other one comes down in that one
 * folder and nowhere else. Measured on 2026-09-27: moved next to each file, the device's rules and
 * nine files of another root came into every folder of the house's tree, and a conflicted copy of
 * the README stayed and counted at every run.
 */
async function moveForeign(service, folder, paths, remote) {
  const dav = davOf(service, folder);
  const now = new Date();
  const two = (n) => String(n).padStart(2, "0");
  const into = `${ASIDE()}/${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())} ${two(now.getHours())}${two(now.getMinutes())}`;
  const chosen = new Set(paths);
  const above = new Set();
  for (const path of paths) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i += 1) above.add(parts.slice(0, i).join("/"));
  }
  const all = [...remote.keys()];
  const whole = [...above]
    .filter((dir) => !`${into}/`.startsWith(`${dir}/`) && all.filter((file) => file.startsWith(`${dir}/`)).every((file) => chosen.has(file)))
    .sort();
  const units = [];
  for (const dir of whole) if (!units.some((unit) => dir.startsWith(`${unit}/`))) units.push(dir);
  for (const path of paths) if (!units.some((unit) => path.startsWith(`${unit}/`))) units.push(path);
  const made = new Set();
  const collection = async (rel) => {
    const parts = rel.split("/");
    for (let i = 1; i <= parts.length; i += 1) {
      const sub = parts.slice(0, i).join("/");
      if (made.has(sub)) continue;
      const answer = await ask(service.target, { method: "MKCOL", path: `${dav}/${encoded(sub)}`, basic: service.basic });
      if (answer.status !== 201 && answer.status !== 405) {
        stop(t(`The file service did not make ${sub} (status ${answer.status}). Nothing more was moved.`, `Der Dateidienst hat ${sub} nicht angelegt (Status ${answer.status}). Sonst wurde nichts verschoben.`));
      }
      made.add(sub);
    }
  };
  for (const unit of units.sort()) {
    const target = `${into}/${unit}`;
    await collection(target.slice(0, target.lastIndexOf("/")));
    const answer = await ask(service.target, {
      method: "MOVE",
      path: `${dav}/${encoded(unit)}`,
      basic: service.basic,
      headers: { Destination: new URL(`${dav}/${encoded(target)}`, service.target.address).href, Overwrite: "F" },
    });
    if (answer.status !== 201 && answer.status !== 204) {
      stop(t(`The file service did not move ${unit} aside (status ${answer.status}). Nothing more was changed.`, `Der Dateidienst hat ${unit} nicht zur Seite gelegt (Status ${answer.status}). Sonst wurde nichts geändert.`));
    }
  }
  return { into, files: paths.length };
}

/** One line after the move, in the output of sync and deploy. */
const sayMoved = (moved) => say(`  ${t(
  `The device's version, ${fileCount(moved.files)}, moved on the device into ${moved.into}/ and comes down there only; this root takes the names.`,
  `Die Fassung des Geräts, ${fileCount(moved.files)}, am Gerät nach ${moved.into}/ gelegt, sie kommt nur dort herunter; diese Wurzel nimmt die Namen.`
)}`);

/**
 * Nothing the client deletes here is lost.
 *
 * The client deletes here what was deleted on the device, that is what a sync does. So that no
 * file goes without a trace, every file it may touch gets a second name in the trash before it
 * runs: a hard link, not a copy, so it costs no space. What still lies at its place afterwards
 * loses that second name. What the client took away keeps it, and the output says where. Where
 * this computer cannot link into the trash next to the credential, the trash lies in this root,
 * in a folder that is never synced.
 */
function guardDeletions(local, excludes) {
  const { files: present } = localTree(local, excludes, { weighHome: false });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const own = `${basename(ROOT)}-${createHash("sha256").update(ROOT).digest("hex").slice(0, 8)}`;
  const within = slashed(relative(ROOT, local)) || ".";
  let base = join(TRASH, own, stamp, within);
  const linked = [];
  for (const path of [...present.values()].map((file) => file.path)) {
    const target = join(base, path);
    try {
      mkdirSync(dirname(target), { recursive: true });
      linkSync(join(local, path), target);
      linked.push(path);
    } catch (error) {
      if (error.code === "EXDEV" && !linked.length && base.startsWith(TRASH)) {
        base = join(ROOT, TRASH_IN_ROOT, stamp, within);
        try {
          mkdirSync(dirname(join(base, path)), { recursive: true });
          linkSync(join(local, path), join(base, path));
          linked.push(path);
        } catch {
          // A file that cannot be linked is not guarded; the count at the end says how many were.
        }
      }
    }
  }
  const prune = (dir) => {
    for (const entry of entriesOf(dir)) if (entry.isDirectory()) prune(join(dir, entry.name));
    try {
      if (!readdirSync(dir).length) rmSync(dir, { recursive: true, force: true });
    } catch {
      // Not empty, or gone already.
    }
  };
  return {
    guarded: linked.length,
    of: present.size,
    settle() {
      const gone = [];
      for (const path of linked) {
        if (existsSync(join(local, path))) rmSync(join(base, path), { force: true });
        else gone.push(path);
      }
      const top = base.slice(0, base.indexOf(stamp) + stamp.length);
      prune(top);
      return { gone, where: gone.length ? base : null };
    },
  };
}

/** The client of the vendor: named, or where it lies after unpacking, or on the path, or null. */
function findClient(args) {
  const given = one(args, "client") || process.env.ARASUL_OPENCLOUD_CMD;
  if (given) {
    const path = resolve(given);
    if (!existsSync(path)) stop(t(`${path} is not there. --client names the client of the vendor.`, `${path} ist nicht da. --client nennt den Klienten des Herstellers.`), 2);
    return path;
  }
  for (const place of CLIENT_PLACES) if (existsSync(place)) return place;
  for (const part of (process.env.PATH || "").split(delimiter)) {
    if (!part) continue;
    const path = join(part, IS_WIN ? `${SERVICE.client}.exe` : SERVICE.client);
    if (existsSync(path)) return path;
  }
  return null;
}

const clientMissing = () => IS_WIN ? t(
  `The command line client ${SERVICE.client}.exe is not on this computer. It belongs to the desktop app of the file service (OpenCloud Desktop for Windows), which the vendor does not publish among its GitHub releases (checked on 2026-10-02: packages for macOS and Linux only), so this file cannot fetch it. Install the desktop app from the vendor's download page, then run again or name the program: --client <path to ${SERVICE.client}.exe>. Looked in: ${CLIENT_PLACES.join(", ")} and on the path.`,
  `Der Kommandozeilen-Klient ${SERVICE.client}.exe ist nicht auf diesem Rechner. Er gehört zur Desktop-App des Dateidienstes (OpenCloud Desktop für Windows), die der Hersteller nicht unter seinen Veröffentlichungen auf GitHub anbietet (geprüft am 02.10.2026: nur Pakete für macOS und Linux), darum kann diese Datei ihn nicht holen. Installiere die Desktop-App von der Download-Seite des Herstellers, dann noch einmal, oder nenne das Programm: --client <pfad zu ${SERVICE.client}.exe>. Gesucht in: ${CLIENT_PLACES.join(", ")} und auf dem Pfad.`
) : t(
  `The command line client ${SERVICE.client} is not on this computer. It lies in the desktop package of the file service and runs unpacked, without installing. Looked in: ${CLIENT_PLACES.join(", ")} and on the path. ${IS_MAC ? "--fetch-client fetches it, checked against its checksum, into " + CLIENT_HOME + "; " : ""}--client names another place.`,
  `Der Kommandozeilen-Klient ${SERVICE.client} ist nicht auf diesem Rechner. Er liegt im Desktop-Paket des Dateidienstes und läuft entpackt, ohne Installation. Gesucht in: ${CLIENT_PLACES.join(", ")} und auf dem Pfad. ${IS_MAC ? "--fetch-client holt ihn, geprüft an seiner Prüfsumme, nach " + CLIENT_HOME + "; " : ""}--client nennt eine andere Stelle.`
);

/** An address fetched with its redirects, into memory or, with `file`, onto the disk with its SHA-256. */
function fetchUrl(url, { file = null, hops = 5 } = {}) {
  return new Promise((done, failed) => {
    const target = new URL(url);
    const req = (target.protocol === "https:" ? httpsRequest : httpRequest)(target, { headers: { "User-Agent": "arasul.mjs", Accept: "*/*" } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops > 0) {
        res.resume();
        return fetchUrl(new URL(res.headers.location, target).href, { file, hops: hops - 1 }).then(done, failed);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return failed(new Error(t(`${target.host} answers ${res.statusCode}`, `${target.host} antwortet ${res.statusCode}`)));
      }
      const hash = createHash("sha256");
      const parts = [];
      const out = file ? createWriteStream(file, { mode: 0o600 }) : null;
      res.on("data", (chunk) => {
        hash.update(chunk);
        if (out) out.write(chunk);
        else parts.push(chunk);
      });
      res.on("end", () => {
        const sum = hash.digest("hex");
        if (!out) return done({ body: Buffer.concat(parts), sum });
        out.end(() => done({ sum }));
      });
      res.on("error", failed);
    });
    req.setTimeout(120_000, () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", failed);
    req.end();
  });
}

/** The file of this name below a folder, or null. */
function findBelow(dir, name, deep = 0) {
  if (deep > 8) return null;
  for (const entry of entriesOf(dir)) {
    const path = join(dir, entry.name);
    if (entry.isFile() && entry.name === name) return path;
    if (entry.isDirectory()) {
      const found = findBelow(path, name, deep + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Fetch the vendor's desktop package for this Mac, check it against the checksum the vendor
 * publishes next to it, unpack it with pkgutil and keep only the app, next to the credential.
 * Nothing is installed, nothing asks for an administrator. Measured on 2026-09-27: the command
 * line client of version 4.0.0 runs out of the unpacked package.
 */
async function fetchClient() {
  if (IS_WIN && !process.env.ARASUL_CLIENT_RELEASE) stop(clientMissing());
  if (!IS_MAC && !process.env.ARASUL_CLIENT_RELEASE) {
    stop(t(
      `Fetching the client is built for a Mac. Here: the desktop package of the file service for this system, from the vendor's releases, then --client <path to ${SERVICE.client}>.`,
      `Das Holen des Klienten ist für einen Mac gebaut. Hier: das Desktop-Paket des Dateidienstes für dieses System, aus den Veröffentlichungen des Herstellers, dann --client <pfad zu ${SERVICE.client}>.`
    ));
  }
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";
  let release;
  try {
    release = JSON.parse((await fetchUrl(CLIENT_RELEASES)).body.toString("utf8"));
  } catch (error) {
    stop(t(`The list of the client's releases did not come: ${error.message}. Nothing was fetched.`, `Die Liste der Veröffentlichungen des Klienten kam nicht: ${error.message}. Nichts wurde geholt.`));
  }
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const pkg = assets.find((asset) => new RegExp(`macos.*${arch}\\.pkg$`).test(String(asset?.name)));
  const check = pkg && assets.find((asset) => asset?.name === `${pkg.name}.sha256`);
  if (!pkg || !check) stop(t(`The release ${oneLine(release?.tag_name, 40)} carries no package for macOS ${arch} with a checksum. Nothing was fetched.`, `Die Veröffentlichung ${oneLine(release?.tag_name, 40)} trägt kein Paket für macOS ${arch} mit Prüfsumme. Nichts wurde geholt.`));
  say(t(`Fetching ${pkg.name} (${sized(Number(pkg.size) || 0)}) from the vendor's releases ...`, `Hole ${pkg.name} (${sized(Number(pkg.size) || 0)}) aus den Veröffentlichungen des Herstellers ...`));
  mkdirSync(CLIENT_HOME, { recursive: true, mode: 0o700 });
  const work = mkdtempSync(join(CLIENT_HOME, ".laden-"));
  try {
    const file = join(work, basename(pkg.name));
    const expected = (await fetchUrl(check.browser_download_url)).body.toString("utf8").trim().split(/\s+/)[0].toLowerCase();
    const got = await fetchUrl(pkg.browser_download_url, { file });
    if (!/^[0-9a-f]{64}$/.test(expected) || got.sum !== expected) {
      stop(t(`The package does not carry the checksum the vendor names (${got.sum.slice(0, 16)} against ${expected.slice(0, 16)}). Deleted, nothing was unpacked.`, `Das Paket trägt nicht die Prüfsumme, die der Hersteller nennt (${got.sum.slice(0, 16)} gegen ${expected.slice(0, 16)}). Gelöscht, nichts wurde entpackt.`));
    }
    const unpacked = join(work, "entpackt");
    const run = spawnSync(process.env.ARASUL_PKGUTIL || "/usr/sbin/pkgutil", ["--expand-full", file, unpacked], { encoding: "utf8", timeout: 300_000 });
    const found = run.status === 0 ? findBelow(unpacked, SERVICE.client) : null;
    if (!found) stop(t(`pkgutil did not unpack ${SERVICE.client} out of the package: ${clientSaid(run)}`, `pkgutil hat ${SERVICE.client} nicht aus dem Paket entpackt: ${clientSaid(run)}`));
    const app = dirname(dirname(dirname(found)));
    rmSync(join(CLIENT_HOME, "OpenCloud.app"), { recursive: true, force: true });
    renameSync(app, join(CLIENT_HOME, "OpenCloud.app"));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  const proof = spawnSync(CLIENT_FETCHED, ["--version"], { encoding: "utf8", timeout: 30_000 });
  if (proof.status !== 0) stop(t(`The unpacked client does not start: ${clientSaid(proof)}`, `Der entpackte Klient startet nicht: ${clientSaid(proof)}`));
  say(t(`Client fetched and checked: ${oneLine(proof.stdout.split("\n")[0], 80)}, in ${CLIENT_FETCHED}. Nothing was installed; deleting ${CLIENT_HOME} takes it back.`, `Klient geholt und geprüft: ${oneLine(proof.stdout.split("\n")[0], 80)}, in ${CLIENT_FETCHED}. Installiert wurde nichts; ${CLIENT_HOME} zu löschen nimmt ihn zurück.`));
  return CLIENT_FETCHED;
}

/**
 * The client, and when it is missing, the offer to fetch it: with --fetch-client at once, at a
 * terminal after a question, otherwise one sentence with the way. `need` false only offers.
 */
async function ensureClient(args, { need = true } = {}) {
  const found = findClient(args);
  if (found) return found;
  if (args.flags["fetch-client"]) return fetchClient();
  if (IS_MAC && interactive()) {
    const answer = await visibleLine(t(
      `The client of the file service, ${SERVICE.client}, is not on this computer, and sync needs it. Fetch it now from the vendor's releases, checked against its checksum, into ${CLIENT_HOME}? [y/N] `,
      `Der Klient des Dateidienstes, ${SERVICE.client}, ist nicht auf diesem Rechner, und sync braucht ihn. Jetzt aus den Veröffentlichungen des Herstellers holen, geprüft an seiner Prüfsumme, nach ${CLIENT_HOME}? [j/N] `
    ));
    if (/^(y|yes|j|ja)$/i.test((answer || "").trim())) return fetchClient();
  }
  if (need) stop(clientMissing());
  say(clientMissing());
  return null;
}

/**
 * What the device says about the company folder.
 *
 * `503` means there is no file service on this device, and that is not the same answer as an
 * empty list of folders: the first says nothing about this tree, the second would be a reason to
 * empty it.
 */
async function askFolders(device) {
  const answer = await ask(device.entry, { path: DEVICE.folders, token: device.entry.token, timeout: 30_000 });
  if (answer.status === 503) {
    return { service: false, reason: oneLine(jsonOf(answer)?.error?.message || t("There is no company folder on this device.", "Auf diesem Gerät gibt es keinen Firmenordner."), 300) };
  }
  refused(answer, device.name, device.entry);
  if (answer.status === 404) {
    stop(t(
      `${device.name} does not know ${DEVICE.folders}. This file assumes that route as of 2026-09-22, the device says otherwise.`,
      `${device.name} kennt ${DEVICE.folders} nicht. Diese Datei nimmt den Weg Stand 22.09.2026 an, das Gerät sagt etwas anderes.`
    ));
  }
  if (answer.status < 200 || answer.status >= 300) {
    stop(t(`${device.name} answers ${DEVICE.folders} with status ${answer.status}.`, `${device.name} antwortet auf ${DEVICE.folders} mit Status ${answer.status}.`));
  }
  const data = inner(jsonOf(answer));
  if (!data || typeof data !== "object") stop(t(`${device.name} answers ${DEVICE.folders} with something this file cannot read.`, `${device.name} antwortet auf ${DEVICE.folders} mit etwas, das diese Datei nicht lesen kann.`));
  const folders = [];
  const refusedFolders = [];
  for (const raw of Array.isArray(data.ordner) ? data.ordner : []) {
    const id = String(raw?.kennung ?? "");
    const parent = raw?.eltern === null || raw?.eltern === undefined ? null : String(raw.eltern);
    const level = Number(raw?.ebene);
    // The root of the device is level 0 with the kind `wurzel`, and it lies at the top of this
    // folder, not in a folder below it. Level 0 with another kind is a shape this file does not know.
    const root = isRootRoom(level, raw?.art);
    if (!FOLDER_ID.test(id) || !(root || level === 1 || level === 2) || (level === 2 && !FOLDER_ID.test(parent || ""))) {
      refusedFolders.push({ line: oneLine(JSON.stringify(raw), 120), why: t("the device names it in a shape this file does not know", "das Gerät nennt ihn in einer Form, die diese Datei nicht kennt") });
      continue;
    }
    if (level === 1 && ROOT_OWN.includes(id)) {
      refusedFolders.push({ line: id, why: t(`a root carries its own ${id} here`, `eine Wurzel trägt hier ihr eigenes ${id}`) });
      continue;
    }
    folders.push({
      id,
      level,
      root,
      parent: level === 2 ? parent : null,
      name: oneLine(raw?.name || id, 80),
      right: oneLine(String(raw?.recht ?? ""), 20),
      path: root ? "." : level === 1 ? id : `${parent}/${id}`,
      space: spaceOf(raw?.platz),
    });
  }
  const address = oneLine(String(data.adresse ?? ""), 200);
  // Since 2026-09-27 the device names every address of its file service it knows, the one to take
  // first; this file tries them in that order when the first does not answer from here.
  const addresses = [...new Set([address, ...(Array.isArray(data.adressen) ? data.adressen : []).map((item) => oneLine(String(item ?? ""), 200))].filter((item) => /^https?:\/\/[^\s/]+/i.test(item)))];
  return {
    service: true,
    address,
    named: address,
    addresses,
    reachable: data.erreichbar !== false,
    user: oneLine(String(data.benutzer ?? ""), 80),
    folders,
    gone: goneFolders(folders, addresses.length ? addresses : [address]),
    refused: refusedFolders,
    notes: (Array.isArray(data.nicht_abgeglichen) ? data.nicht_abgeglichen : []).map((note) => oneLine(note?.text, 300)).filter(Boolean),
  };
}

function readFolderState() {
  const data = readJson(FOLDER_STATE, null);
  return data && typeof data === "object" && data.roots && typeof data.roots === "object" ? data : { version: 1, roots: {} };
}

function writeFolderState(data) {
  ensureConfigDir();
  const temporary = join(CONFIG_DIR, `.firmenordner-${process.pid}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, FOLDER_STATE);
}

/**
 * What lies in a synced folder that a human has to look at: files the client could not merge, and
 * links it did not follow. Counted out of the tree and not out of the client's report, because
 * both can also come into being between two syncs.
 */
function inspectFolder(dir, skipAtTop = new Set(), excludes = []) {
  // What the list keeps home the client never looks at: a link in a clone of a place is not its.
  const tests = excludes.map(excludeTest);
  const conflicts = [];
  const links = [];
  const walk = (at, deep) => {
    if (deep > 40) return;
    let entries;
    try {
      entries = readdirSync(at, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      // For the root: the rooms at its top are folders of their own, counted on their own.
      if (deep === 0 && skipAtTop.has(entry.name)) continue;
      const path = join(at, entry.name);
      if (tests.length && tests.some((test) => test(slashed(relative(dir, path))))) continue;
      if (entry.isSymbolicLink()) {
        links.push(relative(ROOT, path));
        continue;
      }
      if (entry.isDirectory()) {
        if (!NOT_WALKED.has(entry.name)) walk(path, deep + 1);
        continue;
      }
      if (CONFLICT_MARK.test(entry.name)) conflicts.push(relative(ROOT, path));
    }
  };
  walk(dir, 0);
  return { conflicts, links };
}

/**
 * Which folders of level 1 the house has written down.
 *
 * A folder at the top that stands in no table grows over, and the root's own check script says so
 * at the next run. `sync` makes such folders: a shared folder of level 1, and the chain above one
 * of level 2. It does not write the line itself, because the column next to the name says what
 * belongs in the folder, and that is a sentence of the house and not of a file service.
 */
function writtenDown() {
  const rules = join(ROOT, ".claude", "CLAUDE.md");
  if (!existsSync(rules)) return null;
  const section = readFileSync(rules, "utf8").split(/^## (?:Where new things go|Wohin Neues gehört)/m)[1] || "";
  return (name) => section.includes(`\`${name}/`);
}

/** Where a folder of the device lies in this tree, and nowhere else. */
function placeOf(folder) {
  const local = resolve(join(ROOT, ...folder.path.split("/")));
  if (local !== ROOT && !local.startsWith(`${ROOT}/`)) {
    stop(t(`${folder.path} would lie outside of ${ROOT}. Nothing was synced.`, `${folder.path} läge außerhalb von ${ROOT}. Es wurde nichts abgeglichen.`));
  }
  return local;
}

/**
 * Did the client lose the service on the way? Measured on 2026-09-27 with a restart of the device
 * in the middle of a sync: `Fatal: Failed to resolve "<address>" Error: "Connection timed out"`,
 * and "Connection refused" for the next folder. That is a device away, not a finding.
 */
const clientLostDevice = (run) => /Connection (timed out|refused|closed)|Host (is )?unreachable|Network is unreachable|Could not resolve host|Host not found/i.test(`${run.stderr || ""}\n${run.stdout || ""}`);

/** The last lines the client wrote, as the reason for a run that did not work out. */
function clientSaid(run) {
  const text = `${run.stderr || ""}\n${run.stdout || ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    // The Mac's proxy lookup that fails in every network without one, measured on 2026-09-27: noise.
    .filter((line) => line && !/^Warning: Execution of PAC script/.test(line));
  return oneLine(text.slice(-3).join(" / ") || (run.error ? run.error.message : t("no output", "keine Ausgabe")), 300);
}

/**
 * Why a run of the client did not work out: its last lines, and one sentence more where the line
 * is known. `Fatal: Authentication` (measured on 2026-09-22 with a password the service did not
 * know) means the file service has no password for this person. The device mirrors a password
 * into the service when the password is set, so an account whose password was set before the
 * company folder was switched on has none there, and gets in after a password change.
 */
function clientFailed(run) {
  if (clientLostDevice(run)) {
    return t(
      `The file service did not answer during the sync (${clientSaid(run)}). The device restarts or is off the network; the next sync takes up what is open.`,
      `Der Dateidienst hat während des Abgleichs nicht geantwortet (${clientSaid(run)}). Das Gerät startet neu oder ist nicht im Netz; der nächste Abgleich nimmt auf, was offen ist.`
    );
  }
  const said = clientSaid(run);
  if (!/Fatal: Authentication/i.test(`${run.stderr || ""}\n${run.stdout || ""}`)) return said;
  return `${said} ${t(
    "The file service does not know this password: the device mirrors a password into the service when it is set, so an account whose password was set before the company folder was switched on gets in only after a password change.",
    "Der Dateidienst kennt dieses Passwort nicht: das Gerät spiegelt ein Passwort beim Setzen in den Dienst, ein Konto, dessen Passwort vor dem Einschalten des Firmenordners gesetzt wurde, kommt also erst nach einem Passwortwechsel hinein."
  )}`;
}

/**
 * The password for the file service. It is the one of the device, because the device mirrors it
 * there: asked for at every run, at the terminal or with --password-stdin, and stored nowhere.
 * The one exception is the sync in the background, which nobody is there to type for: it takes the
 * password out of the keychain (on Windows out of the private file) where `sync --install` put it.
 */
async function askPassword(args, plan, device) {
  if (args.flags.background) return accessPassword(plan, device);
  const password = args.flags["password-stdin"]
    ? (await readAllStdin()).split(/\r?\n/)[0].trim()
    : await secretLine(t(`Password of ${plan.user} on ${device.name} (the file service takes the same one): `, `Passwort von ${plan.user} auf ${device.name} (der Dateidienst nimmt dasselbe): `));
  if (!password) {
    stop(t(
      "The client of the file service logs in with name and password. The password comes from the terminal, or with --password-stdin from the first line of the input. It is never taken from an argument and never stored.",
      "Der Klient des Dateidienstes meldet sich mit Name und Passwort an. Das Passwort kommt vom Terminal, oder mit --password-stdin aus der ersten Zeile der Eingabe. Aus einem Argument wird es nie genommen und abgelegt wird es nie."
    ), 2);
  }
  return password;
}

/** The lists for the client, one per folder, as files in a throwaway folder. */
function excludeFiles() {
  const workspace = mkdtempSync(join(tmpdir(), "ara-firmenordner-"));
  let count = 0;
  return {
    workspace,
    write(lines) {
      count += 1;
      const file = join(workspace, `ausschluss-${count}.lst`);
      writeFileSync(file, `${lines.join("\n")}\n`, { mode: 0o600 });
      return file;
    },
    remove: () => rmSync(workspace, { recursive: true, force: true }),
  };
}

/**
 * One run of the client for one folder. The room of the root and a folder of level 1 are rooms
 * named by their id, a folder of level 2 hangs in the room of what is shared and is reached with
 * --remote-folder. The password goes in the environment, never as an argument.
 */
function runClient({ client, plan, folder, local, excludes, password }) {
  const call = [
    plan.address,
    folder.root || folder.level === 1 ? folder.id : SERVICE.shared,
    local,
    "--user", plan.user,
    "--trust",
    "--non-interactive",
    "--sync-hidden-files",
    "--exclude", excludes,
  ];
  if (folder.level === 2) call.push("--remote-folder", folder.id);
  return spawnSync(client, call, {
    encoding: "utf8",
    env: { ...process.env, [SERVICE.password]: password },
    timeout: 30 * 60_000,
    windowsHide: true,
  });
}

/** The label of a folder in the output: the root says that it is the root. */
const labelOf = (folder) => (folder.root ? `${folder.id} (${t("this root, at the top", "diese Wurzel, oben")})` : folder.path);

/** The names at the top of the root that are folders of their own, and not the root's. */
function topNames(plan) {
  return new Set([
    "apps",
    ...plan.folders.filter((folder) => !folder.root).map((folder) => folder.path.split("/")[0]),
    ...(plan.gone || []).filter((item) => item.top).map((item) => item.path),
  ]);
}

// --- Withdrawn and thrown away: what the device no longer names stays out of the root -----------
// A folder of level 1 or 2 lies in this tree at its place, and the root's own sync leaves its name
// out because the device names it. Measured on 2026-09-27 at a device: once the folder was thrown
// away in the front end, or withdrawn from a person, the device named it no more, the name fell off
// the root's list, and the next sync of an administrator took gp-0927/gp-0927-geheim/geheim.md up
// into the root, which every account reads. A person who only reads the root got "no permission to
// add subfolders" at every run instead, and kept the withdrawn files. The front end promises that
// the folder goes on every computer that had it. So what this root once synced as a folder of its
// own and the device no longer names stays out of the root, and sync moves it next to the root,
// into a folder that is no part of any sync. Moved, not deleted: what was changed here and never
// went up is still there to be read.

/** The client's journal in a folder it syncs, measured on 2026-09-22: `.sync_<hash>.db`. */
const JOURNAL = /^\.sync_.*\.db$/;

/** Where withdrawn folders go: next to the root, in a folder named after it. */
const awayDir = () => join(dirname(ROOT), `${basename(ROOT)}-${t("withdrawn", "entzogen")}`);

/**
 * The folders this root synced on their own and the device no longer names.
 *
 * Two witnesses, and either one is enough: the state of the last syncs, which keeps every folder it
 * ever synced, and the client's journal, which lies in every folder the client synced, so that a
 * computer whose state was lost still knows. A folder of level 2 that goes while its parent still
 * holds another one goes alone; otherwise its whole chain at the top goes. What lies below a folder
 * of level 1 the person still has is that folder's, and its own sync takes care of it.
 */
function goneFolders(folders, addresses) {
  // An empty list says nothing about this tree, and a state of another file service nothing about this one.
  if (!folders.length) return [];
  const mine = readFolderState().roots[ROOT];
  if (mine?.address && !addresses.includes(mine.address)) return [];
  const now = new Set(folders.map((folder) => folder.path));
  const tops = new Set(folders.filter((folder) => !folder.root).map((folder) => folder.path.split("/")[0]));
  const levelOne = new Set(folders.filter((folder) => !folder.root && folder.level === 1).map((folder) => folder.path));
  const once = new Set(Object.keys(mine?.folders || {}).filter((path) => path !== "."));
  const journal = (dir) => entriesOf(dir).some((entry) => entry.isFile() && JOURNAL.test(entry.name));
  for (const top of entriesOf(ROOT)) {
    if (!top.isDirectory() || ROOT_OWN.includes(top.name) || NOT_WALKED.has(top.name) || levelOne.has(top.name)) continue;
    const dir = join(ROOT, top.name);
    if (journal(dir)) once.add(top.name);
    for (const below of entriesOf(dir)) if (below.isDirectory() && journal(join(dir, below.name))) once.add(`${top.name}/${below.name}`);
  }
  const gone = new Map();
  for (const path of [...once].sort()) {
    const top = path.split("/")[0];
    if (now.has(path) || levelOne.has(top) || ROOT_OWN.includes(top)) continue;
    const unit = tops.has(top) ? path : top;
    if (gone.has(unit) || [...gone.keys()].some((known) => unit.startsWith(`${known}/`))) continue;
    // What still is shared below it stays at its place.
    const keep = folders.filter((folder) => folder.path.startsWith(`${unit}/`)).map((folder) => folder.path.slice(unit.length + 1).split("/")[0]);
    gone.set(unit, { path: unit, top: unit === top, keep, local: join(ROOT, ...unit.split("/")) });
  }
  for (const item of gone.values()) {
    const files = existsSync(item.local) ? [...localTree(item.local, [...NEVER_SYNCED], { weighHome: false }).files.values()].filter((file) => !item.keep.includes(file.path.split("/")[0])) : [];
    item.here = existsSync(item.local);
    item.files = files.length;
    item.bytes = files.reduce((sum, file) => sum + file.size, 0);
  }
  return [...gone.values()];
}

/** One line on the folders the device no longer names, for the plan and the sync. */
function sayGone(gone, done) {
  const here = gone.filter((item) => item.here);
  if (!here.length) return;
  const list = here.map((item) => `${item.path}/ (${fileCount(item.files)}, ${sized(item.bytes)})`).join(", ");
  say(done
    ? `  ${t(`No longer shared with you or thrown away on the device: ${list}. Moved next to the root, not deleted: ${done}`, `Dir nicht mehr freigegeben oder am Gerät weggeworfen: ${list}. Neben die Wurzel verschoben, nicht gelöscht: ${done}`)}`
    : `  ${t(`No longer shared with you or thrown away on the device: ${list}. Stays out of the root; a sync moves it next to the root, into ${awayDir()}, and deletes nothing.`, `Dir nicht mehr freigegeben oder am Gerät weggeworfen: ${list}. Bleibt aus der Wurzel draußen; ein Abgleich verschiebt es neben die Wurzel, nach ${awayDir()}, und löscht nichts.`)}`);
}

/**
 * Move what the device no longer names next to the root, before any client runs.
 *
 * Into `<root>-entzogen/<time>/<path>`, next to the root. Where this computer cannot put it there,
 * a root on a volume of its own for instance, it goes into the root's own folder that is never
 * synced. A folder that cannot be moved at all stays where it is and stays out of the root's
 * sync, and the output says so. The state of the last sync forgets what went, and so does the
 * comparison of the plan: should the folder be shared again, it comes down as new.
 */
function setAside(plan) {
  const at = new Date().toISOString().replace(/[:.]/g, "-");
  const result = { moved: [], stuck: [], where: null };
  for (const item of plan.gone || []) {
    if (!item.here) {
      result.moved.push(item);
      continue;
    }
    const names = entriesOf(item.local).map((entry) => entry.name).filter((name) => !item.keep.includes(name));
    const into = (base) => {
      const target = join(base, at, ...item.path.split("/"));
      mkdirSync(item.keep.length ? target : dirname(target), { recursive: true });
      if (item.keep.length) for (const name of names) renameSync(join(item.local, name), join(target, name));
      else renameSync(item.local, target);
      return join(base, at);
    };
    try {
      result.where = into(awayDir());
    } catch {
      try {
        result.where = into(join(ROOT, TRASH_IN_ROOT, t("withdrawn", "entzogen")));
      } catch (error) {
        result.stuck.push({ ...item, why: oneLine(error.message, 160) });
        continue;
      }
    }
    result.moved.push(item);
  }
  if (result.stuck.length) {
    say(`  ${t(
      `Could not be moved next to the root, stays where it is and out of the root's sync: ${result.stuck.map((item) => `${item.path}/ (${item.why})`).join(", ")}`,
      `Ließ sich nicht neben die Wurzel verschieben, bleibt liegen und aus dem Abgleich der Wurzel draußen: ${result.stuck.map((item) => `${item.path}/ (${item.why})`).join(", ")}`
    )}`);
  }
  if (result.where) sayGone(result.moved, result.where);
  // The state forgets what went, and remembers where it went, for status.
  if (result.moved.length) {
    const state = readFolderState();
    const mine = state.roots[ROOT] || (state.roots[ROOT] = { folders: {} });
    mine.folders ||= {};
    for (const item of result.moved) {
      const went = [item.path, ...Object.keys(mine.folders).filter((path) => path.startsWith(`${item.path}/`))];
      for (const path of went) {
        delete mine.folders[path];
        rmSync(baseFile(join(ROOT, ...path.split("/"))), { force: true });
      }
    }
    if (result.where) {
      mine.setAside = { at: new Date().toISOString(), where: result.where, folders: result.moved.filter((item) => item.here).map((item) => ({ path: item.path, files: item.files })) };
    }
    writeFolderState(state);
  }
  return result;
}

/**
 * Sync every shared folder to its real place in this tree.
 *
 * The password is the one of the device: the file service carries the same one, because the
 * device mirrors it there. It is asked for at every sync and stored nowhere, and it goes to the
 * client in the environment variable the client names, never as an argument.
 */
/**
 * How much still fits into a folder, out of `platz` in the device's list, since 2026-09-28: `frei`
 * in bytes, up to the limit and never more than the disk has. A project of level 2 names `frei`
 * only, it shares its area's limit. Null when the device names no number, an older device or a
 * file service that does not answer: then the plan says nothing about a limit.
 */
function spaceOf(raw) {
  if (!raw || typeof raw !== "object") return null;
  const frei = Number(raw.frei);
  if (raw.frei === null || raw.frei === undefined || !Number.isFinite(frei) || frei < 0) return null;
  const count = (value) => (value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value));
  return { free: frei, used: count(raw.belegt), limit: count(raw.grenze), by: String(raw.begrenzt_durch ?? "") };
}

/** The room whose limit a folder's bytes count against: a project of level 2 lies in its area's. */
const roomOf = (folder) => (folder.root ? "" : folder.level === 1 ? folder.id : folder.parent);

/** The path the device names a folder by, the root the empty one. */
const pathOnDevice = (folder) => (folder.root ? "" : folder.path);

/**
 * The folders whose upload would go over what still fits, each with one sentence.
 *
 * `up` names per folder the bytes a sync would take up. Folders in one room add up: an area and
 * its project share one limit. A folder that takes nothing up is never stopped, whatever its room
 * holds. Where the numbers say it does not fit, the device is asked (`passt`), and its answer
 * decides: a 200 means it fits after all. A device without numbers is asked nothing.
 */
async function overLimit(device, plan, up) {
  const needs = new Map();
  // A project whose area is synced too lies in the area's tree here: its bytes count there already.
  const counted = new Set(plan.folders.filter((folder) => folder.level === 1).map((folder) => folder.id));
  for (const folder of plan.folders) {
    if (folder.level === 2 && counted.has(folder.parent)) continue;
    needs.set(roomOf(folder), (needs.get(roomOf(folder)) || 0) + (up.get(folder.path) || 0));
  }
  const over = new Map();
  for (const folder of plan.folders) {
    const bytes = needs.get(roomOf(folder)) || 0;
    if (!folder.space || !up.get(folder.path) || bytes <= folder.space.free) continue;
    const sentence = await limitSentence(device, folder, bytes);
    if (sentence) over.set(folder.path, sentence);
  }
  return over;
}

/**
 * The sentence for a folder that would go over its limit. The device's own, as it comes, in a German
 * root; in an English one built from its numbers, with the way in the interface out of its sentence.
 * Null when the device says it fits.
 */
async function limitSentence(device, folder, bytes) {
  let answer = null;
  try {
    answer = await ask(device.entry, { path: `${DEVICE.fits}?pfad=${encodeURIComponent(pathOnDevice(folder))}&bytes=${bytes}`, token: device.entry.token, timeout: 30_000 });
  } catch {
    // Not reached: the numbers of the list speak alone.
  }
  if (answer && answer.status >= 200 && answer.status < 300) return null;
  const error = answer?.status === 409 ? jsonOf(answer)?.error : null;
  const said = error?.code === "GRENZE_ERREICHT" ? oneLine(error.message, 400) : "";
  if (said && german) return said;
  const free = Number.isFinite(Number(error?.details?.frei)) ? Number(error.details.frei) : folder.space.free;
  const disk = folder.space.by === "platte" || /Auf dem Gerät ist nicht mehr genug Platz/.test(said);
  const way = said.match(/unter (.+?) anheben/)?.[1];
  const name = folder.root
    ? t("The root", "Die Wurzel")
    : folder.level === 2
      ? t(`The area "${folder.parent}", in which "${folder.path}" lies,`, `Der Bereich „${folder.parent}“, in dem „${folder.path}“ liegt,`)
      : t(`"${folder.path}"`, `„${folder.path}“`);
  if (disk) {
    return t(
      `There is not enough room left on the device: ${sized(free)} free, ${sized(bytes)} needed. Talk to whoever looks after the device.`,
      `Auf dem Gerät ist nicht mehr genug Platz: frei sind noch ${sized(free)}, gebraucht werden ${sized(bytes)}. Sprich mit dem, der das Gerät betreut.`
    );
  }
  return t(
    `${name} is too full: ${sized(free)} free, ${sized(bytes)} needed. An administrator raises the limit ${way ? `in the device's interface under ${way}` : "in the device's administration of the company folder"}.`,
    `${name} ist zu voll: frei sind noch ${sized(free)}, gebraucht werden ${sized(bytes)}. Ein Administrator hebt die Grenze ${way ? `in der Oberfläche des Geräts unter ${way}` : "in der Verwaltung des Firmenordners am Gerät"} an.`
  );
}

/**
 * What a sync would take up per folder, for the limit. Cheap first: when everything here fits into
 * what is free, nothing is listed on the device. Only a room where it might not fit is compared
 * file by file, as the plan does.
 */
async function upForLimit(service, plan, order) {
  const up = new Map();
  const rooms = new Map();
  for (const folder of order) {
    if (!folder.space) continue;
    // Nothing goes up from a folder that is only read, so nothing counts against its limit.
    if (readsOnly(folder)) {
      up.set(folder.path, 0);
      continue;
    }
    const local = placeOf(folder);
    const here = existsSync(local) ? localTree(local, excludesFor(plan, folder, local), { weighHome: false }) : { files: new Map() };
    const bytes = total([...here.files.values()]);
    up.set(folder.path, bytes);
    const room = roomOf(folder);
    if (folder.level === 2 && order.some((other) => other.level === 1 && other.id === folder.parent)) {
      rooms.set(room, { bytes: rooms.get(room)?.bytes || 0, free: Math.min(rooms.get(room)?.free ?? Infinity, folder.space.free), folders: [...(rooms.get(room)?.folders || []), { folder, here }] });
      continue;
    }
    rooms.set(room, { bytes: (rooms.get(room)?.bytes || 0) + bytes, free: Math.min(rooms.get(room)?.free ?? Infinity, folder.space.free), folders: [...(rooms.get(room)?.folders || []), { folder, here }] });
  }
  for (const room of rooms.values()) {
    if (room.bytes <= room.free) continue;
    for (const { folder, here } of room.folders) {
      const local = placeOf(folder);
      const excludes = excludesFor(plan, folder, local);
      const dav = davOf(service, folder);
      const there = dav ? await remoteTree(service, dav, excludes) : { files: new Map() };
      up.set(folder.path, total((await comparePlace(service, dav, folder, local, here, there, readBase(local))).up));
    }
  }
  return up;
}

async function syncFolders(args, device, apps = []) {
  const plan = await askFolders(device);
  const head = t("Company folder", "Firmenordner");
  if (!plan.service) {
    say(`${head}: ${plan.reason}`);
    return false;
  }
  say(`${head}: ${plan.address || t("the device names no address", "das Gerät nennt keine Adresse")}${plan.reachable ? "" : t(", the device cannot reach it right now", ", das Gerät erreicht ihn gerade nicht")}`);
  for (const item of plan.refused) say(`  ${t("Not synced", "Nicht abgeglichen")}: ${item.line}, ${item.why}`);
  // What the device no longer names goes next to the root before any client runs.
  setAside(plan);
  if (!plan.folders.length) {
    say(`  ${t("No folder is shared with you. Nothing was synced.", "Dir ist kein Ordner freigegeben. Es wurde nichts abgeglichen.")}`);
    sayView(await writeView(device, plan, [], apps));
    return !plan.refused.length;
  }
  if (!plan.address) stop(t("The device names no address of the file service. Nothing was synced.", "Das Gerät nennt keine Adresse des Dateidienstes. Es wurde nichts abgeglichen."));
  if (!plan.user) stop(t("The device names no user for the file service. Nothing was synced.", "Das Gerät nennt keinen Benutzer für den Dateidienst. Es wurde nichts abgeglichen."));
  const client = await ensureClient(args);
  const password = await askPassword(args, plan, device);

  // The root first, then level 1: the root is the folder everything lies in, and level 1 makes the
  // room that a folder of level 2 hangs under. The chain above a folder of level 2 is made here
  // even when the person has no right on it.
  const rank = (folder) => (folder.root ? 0 : folder.level);
  const order = [...plan.folders].sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path));
  const tops = topNames(plan);
  await pickAddress(plan, device);
  const service = await spacesOf(plan, device, password);
  await learnLanguage(service, plan);
  // A folder whose upload would go over its limit stops before its client runs, with the sentence
  // the plan says. The others are synced.
  let limits = new Map();
  try {
    limits = await overLimit(device, plan, await upForLimit(service, plan, order));
  } catch {
    // Without an answer about the limit the client runs as before and says it itself.
  }
  const lists = excludeFiles();
  const results = [];
  try {
    for (const folder of order) {
      if (limits.has(folder.path)) {
        results.push({ ...folder, ok: false, message: limits.get(folder.path), conflicts: [], links: [], trashed: [], trash: null, at: new Date().toISOString() });
        continue;
      }
      // One folder that fails, a file service that stops answering in the middle for instance, is
      // written down for this folder and named by status. The others are synced all the same.
      try {
        const local = placeOf(folder);
        mkdirSync(local, { recursive: true });
        const excludes = excludesFor(plan, folder, local);
        const rules = service ? await rootRules(service, folder, local, excludes) : { stop: [], bridge: null, foreign: [] };
        if (rules.stop.length && !args.flags["keep-mine"]) {
          results.push({ ...folder, ok: false, message: ruleStop(rules.stop), conflicts: [], links: [], trashed: [], trash: null, at: new Date().toISOString() });
          continue;
        }
        if (rules.bridge) await settleBridge(service, local, rules.bridge);
        if (args.flags["keep-mine"] && rules.foreign.length) sayMoved(await moveForeign(service, folder, rules.foreign, rules.there.files));
        const bootstrap = folder.root ? bootstrapBridge(rules.bridge?.way === "up") : null;
        // What a reader cannot put up stays home: the client would end with its own message and exit 1.
        let skipped = [];
        let held = [];
        let coming = [];
        let toClient = excludes;
        if (service && readsOnly(folder)) {
          const dav = davOf(service, folder);
          if (dav) {
            try {
              const here = localTree(local, excludes, { weighHome: false });
              const there = await remoteTree(service, dav, excludes);
              const compared = await comparePlace(service, dav, folder, local, here, there, readBase(local));
              skipped = compared.blocked;
              held = compared.held;
              coming = compared.down;
              // The client keeps a bare name out at every depth: a file at the top goes by its name.
              toClient = Object.assign([...excludes, ...skipped.map((item) => here.files.get(item.path)?.path || item.path)], { pinned: excludes.pinned });
            } catch {
              // Without the list the client runs as before and says what it has to say itself.
            }
          }
        }
        // The newer bridge of a reader stays here: the client would put the device's older one at its name.
        if (rules.bridge?.keep) toClient = Object.assign([...toClient, "arasul.mjs"], { pinned: toClient.pinned });
        const guard = guardDeletions(local, excludes);
        const run = runClient({ client, plan, folder, local, excludes: lists.write(toClient), password });
        if (bootstrap) bootstrap.settle();
        const trash = guard.settle();
        if (run.status === 0) {
          const dav = service ? davOf(service, folder) : null;
          const there = dav ? (await remoteTree(service, dav, excludes)).files : null;
          writeBase(local, localTree(local, excludes, { weighHome: false }).files, there);
        }
        // What the plan said would come down and did not: the client skips a folder whose state on the
        // device did not change since it last kept a file of it out (measured on 2026-10-01).
        const stuck = run.status === 0 ? coming.filter((item) => !existsSync(join(local, item.path))).map((item) => item.path) : [];
        const seen = inspectFolder(local, folder.root ? tops : new Set(), excludes);
        results.push({
          ...folder,
          ok: run.status === 0,
          message: run.status === 0 ? null : clientFailed(run),
          unreachable: run.status !== 0 && clientLostDevice(run),
          conflicts: seen.conflicts,
          links: seen.links,
          trashed: trash.gone,
          trash: trash.where,
          skipped,
          held,
          stuck,
          at: new Date().toISOString(),
        });
      } catch (error) {
        results.push({ ...folder, ok: false, message: oneLine(error.message, 400), unreachable: Boolean(error.unreachable), conflicts: [], links: [], trashed: [], trash: null, at: new Date().toISOString() });
      }
    }
  } finally {
    lists.remove();
  }

  recordSync(device, plan, results);
  const known = writtenDown();
  const unwritten = known
    ? [...new Set(order.filter((folder) => !folder.root).map((folder) => folder.path.split("/")[0]))].filter((name) => !known(name)).sort()
    : [];

  let clean = !plan.refused.length;
  for (const result of results) {
    say(`  ${labelOf(result)}   ${t("level", "Ebene")} ${result.level}${result.right ? `, ${result.right}` : ""}   ${result.ok ? t("synced", "abgeglichen") : t("not synced", "nicht abgeglichen")}`);
    if (!result.ok) {
      say(`      ${result.message}`);
      clean = false;
    }
    if (result.conflicts.length) {
      say(`      ${result.conflicts.length} ${t("conflicts, the client could not merge them and kept both", "Konflikte, der Klient konnte sie nicht zusammenführen und hat beides behalten")}: ${result.conflicts.slice(0, 5).join(", ")}${result.conflicts.length > 5 ? ", ..." : ""}`);
      clean = false;
    }
    if (result.skipped?.length) say(`      ${readOnlySentence(result.skipped)}`);
    if (result.held?.length) say(`      ${heldSentence(result.held)}`);
    if (result.stuck?.length) {
      say(`      ${t(
        `did not come down although nothing keeps it out any more: ${some(result.stuck.map((path) => ({ path })))}. The client looks into a folder again only when it changes on the device, so a file it once saw kept out waits until it is saved there anew.`,
        `kam nicht herunter, obwohl es nichts mehr draußen hält: ${some(result.stuck.map((path) => ({ path })))}. Der Klient sieht in einen Ordner erst wieder, wenn er sich am Gerät ändert, darum wartet eine Datei, die er einmal draußen sah, bis sie dort neu gespeichert wird.`
      )}`);
    }
    if (result.links.length) {
      say(`      ${result.links.length} ${t("symbolic links, the client does not sync them", "Symlinks, die gleicht der Klient nicht ab")}: ${result.links.slice(0, 5).join(", ")}${result.links.length > 5 ? ", ..." : ""}`);
      clean = false;
    }
    if (result.trashed.length) {
      say(`      ${t(
        `${fileCount(result.trashed.length)} deleted on the device and so here, kept in the trash: ${result.trash}`,
        `${fileCount(result.trashed.length)} am Gerät gelöscht und darum hier, aufbewahrt im Papierkorb: ${result.trash}`
      )}`);
      say(`        ${result.trashed.slice(0, 5).join(", ")}${result.trashed.length > 5 ? ", ..." : ""}`);
    }
  }
  if (unwritten.length) {
    say(`  ${t(
      `New at level 1 of this root: ${unwritten.map((name) => `${name}/`).join(", ")}. Give each one a line in the table 'Where new things go' of .claude/CLAUDE.md, otherwise the check script of the root reports it at every run.`,
      `Neu auf Ebene 1 dieser Wurzel: ${unwritten.map((name) => `${name}/`).join(", ")}. Gib jedem eine Zeile in der Tabelle 'Wohin Neues gehört' der .claude/CLAUDE.md, sonst meldet das Prüfskript der Wurzel es bei jedem Lauf.`
    )}`);
  }
  sayView(await writeView(device, plan, results, apps));
  return clean;
}

/**
 * The one file that bootstraps a root steps aside while the root comes down.
 *
 * Whoever is given the room of the root puts this file alone into an empty folder and syncs. The
 * room carries this file too, the one the house deployed, and the client cannot merge two
 * versions of it: measured on 2026-09-22, it kept both and named the second one a conflicted
 * copy. So in a folder that is not a root yet this file goes out of the way before the client
 * runs: Node holds it in memory already. The one from the room is the house's and wins, unless
 * this one is the newer version: then it went into the room before the client, and stays. Should
 * the room carry none, the file is put back as it was.
 */
function bootstrapBridge(newest = false) {
  // This bridge is newer than the room's and went up already: it stays, and both sides are equal.
  if (newest || existsSync(join(ROOT, ".claude", "root.json"))) return null;
  const self = fileURLToPath(import.meta.url);
  if (dirname(self) !== ROOT) return null;
  const source = readFileSync(self);
  rmSync(self, { force: true });
  return {
    settle() {
      if (!existsSync(self)) writeFileSync(self, source);
    },
  };
}

// --- In the background: launchd, the keychain, a notification ---------------------------------
// Working out of the company folder every day means the sync runs without anybody thinking of it:
// a command with a password per run is forgotten after three days. So on a Mac `sync --install`
// hands the sync of this root to launchd, as an agent of the person logged in, and the password of
// the file service to the keychain, never to a file. The agent runs `sync --background` at an
// interval, takes the password out of the keychain, and says a conflict or an error as a
// notification, once per state and not at every run. launchd starts it again at every login, so it
// outlives a logout. `sync --uninstall` takes the agent and the password back.
//
// The credential stays where it lies, in credentials.json, and it is asked first at every run: a
// credential revoked in the device's front end stops the sync before the client ever starts.

let inBackground = false;

const SECURITY = "/usr/bin/security";
const KEYCHAIN_SERVICE = "Arasul Firmenordner";
// A keychain file of its own instead of the login keychain, for a test. Never needed otherwise.
const KEYCHAIN_FILE = process.env.ARASUL_KEYCHAIN ? resolve(process.env.ARASUL_KEYCHAIN) : null;
const LAUNCH_AGENTS = process.env.ARASUL_LAUNCH_AGENTS ? resolve(process.env.ARASUL_LAUNCH_AGENTS) : join(homedir(), "Library", "LaunchAgents");
const LAUNCHCTL = process.env.ARASUL_LAUNCHCTL || "/bin/launchctl";
const BACKGROUND_DIR = join(CONFIG_DIR, "abgleich");
const EVERY_DEFAULT = 5;
/** How long an app token of the file service holds: a year, then `--install` issues the next. */
const APP_TOKEN_HOURS = 8760;
/** A device that does not answer is often one that restarts. Said only when it lasts this long. */
const QUIET_UNREACHABLE = 15 * 60_000;

/** One agent per root: its name carries the root's folder name and a checksum of its path. */
const AGENT_LABEL = `de.arasul.abgleich.${basename(ROOT).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "wurzel"}-${createHash("sha256").update(ROOT).digest("hex").slice(0, 8)}`;
const AGENT_PLIST = join(LAUNCH_AGENTS, `${AGENT_LABEL}.plist`);
const AGENT_LOG = join(BACKGROUND_DIR, `${AGENT_LABEL}.log`);
const AGENT_LOCK = join(BACKGROUND_DIR, `${AGENT_LABEL}.lock`);
// Windows has neither launchd nor a keychain this file may reach without a program of its own: the
// task scheduler holds the job (a task file, a launcher without a window, a note of what was set up)
// and the access lies in a file that only this Windows user may read.
const SCHTASKS = process.env.ARASUL_SCHTASKS || "schtasks";
const TASK_NAME = `Arasul\\${AGENT_LABEL}`;
const TASK_META = join(BACKGROUND_DIR, `${AGENT_LABEL}.task.json`);
const TASK_LAUNCHER = join(BACKGROUND_DIR, `${AGENT_LABEL}.vbs`);
const TASK_XML = join(BACKGROUND_DIR, `${AGENT_LABEL}.task.xml`);
const ACCESS_FILE = join(BACKGROUND_DIR, `${AGENT_LABEL}.zugang`);
const domain = () => `gui/${process.getuid()}`;

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** A value for the command line of `security -i`, which reads double quotes and backslashes. */
const quoted = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const inKeychain = () => (KEYCHAIN_FILE ? [KEYCHAIN_FILE] : []);

/**
 * What the keychain holds for this root, or null when it holds nothing.
 *
 * Kept in base64: `security` gives a value with a character beyond ASCII back as hex, and an ASCII
 * password could be read as hex just as well (measured on 2026-09-27 with an umlaut).
 */
function keychainRead() {
  const run = spawnSync(SECURITY, ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", AGENT_LABEL, "-w", ...inKeychain()], { encoding: "utf8", timeout: 30_000 });
  if (run.status === 44) return null;
  if (run.status !== 0) {
    stop(t(
      `The keychain did not hand out the password for the sync of this root: ${clientSaid(run)}. A locked keychain opens with the next login.`,
      `Der Schlüsselbund hat das Passwort für den Abgleich dieser Wurzel nicht herausgegeben: ${clientSaid(run)}. Ein gesperrter Schlüsselbund öffnet sich mit der nächsten Anmeldung.`
    ));
  }
  try {
    const entry = JSON.parse(Buffer.from(run.stdout.trim(), "base64").toString("utf8"));
    return entry && typeof entry.value === "string" ? entry : null;
  } catch {
    return null;
  }
}

/**
 * Into the keychain, through the input of `security` and never as an argument: the process list
 * shows arguments. One entry per root: what the access is (an app token of the file service or the
 * password), its value, until when it holds, and for whom.
 */
function keychainStore(entry) {
  const secret = JSON.stringify(entry);
  const line = [
    "add-generic-password", "-U",
    "-s", quoted(KEYCHAIN_SERVICE),
    "-a", quoted(AGENT_LABEL),
    "-l", quoted(`${KEYCHAIN_SERVICE} ${basename(ROOT)}`),
    "-j", quoted(t(`Access to the file service for the sync in the background of ${ROOT}. Taken back by node arasul.mjs sync --uninstall.`, `Zugang zum Dateidienst für den Abgleich im Hintergrund von ${ROOT}. Zurückgenommen mit node arasul.mjs sync --uninstall.`)),
    "-w", quoted(Buffer.from(secret, "utf8").toString("base64")),
    ...inKeychain().map(quoted),
  ].join(" ");
  const run = spawnSync(SECURITY, ["-i"], { input: `${line}\n`, encoding: "utf8", timeout: 30_000 });
  if (run.status !== 0 || JSON.stringify(keychainRead()) !== secret) {
    stop(t(`The keychain did not take the access: ${clientSaid(run)}. Nothing was set up.`, `Der Schlüsselbund hat den Zugang nicht angenommen: ${clientSaid(run)}. Nichts wurde eingerichtet.`));
  }
}

/** Take the password of this root out of the keychain. True when one lay there. */
function keychainForget() {
  return spawnSync(SECURITY, ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", AGENT_LABEL, ...inKeychain()], { encoding: "utf8", timeout: 30_000 }).status === 0;
}

/** The access of the sync in the background, out of the keychain and out of nothing else. */
function accessPassword() {
  if (!IS_MAC && !IS_WIN && !KEYCHAIN_FILE) stop(t("The sync in the background takes its access out of the keychain of a Mac or out of the private file of a Windows computer, and this is neither.", "Der Abgleich im Hintergrund nimmt seinen Zugang aus dem Schlüsselbund eines Mac oder aus der privaten Datei eines Windows-Rechners, und das hier ist keins von beiden."));
  const entry = accessRead();
  if (!entry) {
    stop(t(
      "No access for the sync in the background is stored. node arasul.mjs sync --install stores one, once.",
      "Für den Abgleich im Hintergrund ist kein Zugang abgelegt. node arasul.mjs sync --install legt einen ab, einmal."
    ));
  }
  return entry.value;
}

/** Does the access lie in the keychain? Otherwise in a file for this person alone. */
const inTheKeychain = () => IS_MAC || Boolean(KEYCHAIN_FILE);
const accessPlace = () => (inTheKeychain() ? t(`the keychain '${KEYCHAIN_SERVICE}'`, `dem Schlüsselbund '${KEYCHAIN_SERVICE}'`) : t(`${ACCESS_FILE}, a file only your Windows user can read`, `${ACCESS_FILE}, einer Datei, die nur dein Windows-Benutzer lesen kann`));

/** What the access of the sync holds for this root, or null. Out of the keychain, or out of the private file on Windows. */
function accessRead() {
  if (inTheKeychain()) return keychainRead();
  if (!existsSync(ACCESS_FILE)) return null;
  if (openToOthers(ACCESS_FILE)) ownerOnly(ACCESS_FILE);
  const entry = readJson(ACCESS_FILE, null);
  return entry && typeof entry.value === "string" ? entry : null;
}

function accessStore(entry) {
  if (inTheKeychain()) return keychainStore(entry);
  ensureConfigDir();
  mkdirSync(BACKGROUND_DIR, { recursive: true, mode: 0o700 });
  const temporary = join(BACKGROUND_DIR, `.zugang-${process.pid}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  // The file is private before it carries its name: the list of rules is cut first, then it is renamed.
  if (!ownerOnly(temporary)) {
    rmSync(temporary, { force: true });
    stop(t(
      `The access could not be restricted to your user (icacls), so it was not stored. Nothing was set up.`,
      `Der Zugang ließ sich nicht auf deinen Benutzer beschränken (icacls), darum wurde er nicht abgelegt. Nichts wurde eingerichtet.`
    ));
  }
  renameSync(temporary, ACCESS_FILE);
  if (JSON.stringify(accessRead()) !== JSON.stringify(entry)) stop(t("The access did not stay in its file. Nothing was set up.", "Der Zugang ist nicht in seiner Datei geblieben. Nichts wurde eingerichtet."));
}

/** Take the access of this root away. True when one lay there. */
function accessForget() {
  if (inTheKeychain()) return keychainForget();
  const had = existsSync(ACCESS_FILE);
  rmSync(ACCESS_FILE, { force: true });
  return had;
}

/**
 * An app token of the file service, issued with the password once, so that the password itself
 * lies nowhere. Measured on 2026-09-27 at a device: the service issues one for a year, takes it
 * wherever it takes the password, the client included, and refuses it after revoking. Null where
 * the service issues none; then the password is kept, and the output says so.
 */
async function issueAppToken(plan, device, password) {
  const target = { address: plan.address, ca: device.entry.ca };
  try {
    const answer = await send(target, { method: "POST", path: `${SERVICE.appTokens}?expiry=${APP_TOKEN_HOURS}h`, basic: { user: plan.user, password }, timeout: 30_000 });
    const body = jsonOf(answer);
    if (answer.status < 200 || answer.status >= 300 || typeof body?.token !== "string" || !body.token) return null;
    return { value: body.token, until: typeof body.expiration_date === "string" ? body.expiration_date.slice(0, 19) : null };
  } catch {
    return null;
  }
}

/** Revoke the app token at the file service, with itself. True when the service confirmed it. */
async function revokeAppToken(entry) {
  const device = readCredentials().devices[entry.device];
  try {
    const answer = await send({ address: entry.address, ca: device?.ca }, { method: "DELETE", path: `${SERVICE.appTokens}?token=${encodeURIComponent(entry.value)}`, basic: { user: entry.user, password: entry.value }, timeout: 30_000 });
    return answer.status >= 200 && answer.status < 300;
  } catch {
    return false;
  }
}

/**
 * Revoke the credential of this computer at one device, with itself: since J34 (2026-10-02) the device
 * takes `DELETE api/ausweise/<own number>` from the credential, for its own number only, and answers 204.
 * Returns what a human is told: done (revoked now, or it no longer counted), or the reason it is not.
 */
async function revokeCredential(name, entry) {
  if (entry.kind !== "issued" || !entry.credentialId) {
    return { done: false, why: t(
      "this computer did not get it issued by the device with a number this file knows, so it cannot revoke it. Revoke it in the device's front end under the credentials of your account",
      "der Ausweis wurde diesem Rechner nicht mit einer Nummer ausgestellt, die diese Datei kennt, sie kann ihn also nicht widerrufen. Widerrufe ihn in der Oberfläche des Geräts bei den Ausweisen deines Kontos"
    ) };
  }
  try {
    const answer = await send(entry, { method: "DELETE", path: `${DEVICE.credentials}/${entry.credentialId}`, token: entry.token, timeout: 30_000 });
    if (answer.status === 204 || answer.status === 200) return { done: true };
    if (answer.status === 401) return { done: true, already: true };
    if (answer.status === 404) {
      return { done: false, why: t(
        `${name} does not know this number as its own credential (404). Look at the credentials of your account in the device's front end`,
        `${name} kennt diese Nummer nicht als eigenen Ausweis (404). Sieh bei den Ausweisen deines Kontos in der Oberfläche des Geräts nach`
      ) };
    }
    return { done: false, why: t(`${name} refused (status ${answer.status}). Revoke it in the device's front end under the credentials of your account`, `${name} hat es abgewiesen (Status ${answer.status}). Widerrufe ihn in der Oberfläche des Geräts bei den Ausweisen deines Kontos`) };
  } catch (error) {
    return { done: false, why: t(`${explain(error, entry.address)} Revoke it later in the device's front end under the credentials of your account`, `${explain(error, entry.address)} Widerrufe ihn später in der Oberfläche des Geräts bei den Ausweisen deines Kontos`) };
  }
}

const launchctl = (args) => spawnSync(LAUNCHCTL, args, { encoding: "utf8", timeout: 30_000 });

/** The node the agent starts: the one on the path when it is this one, so that an update of node does not break it. */
function nodePath() {
  const real = realpathSync(process.execPath);
  for (const part of (process.env.PATH || "").split(delimiter)) {
    if (!part) continue;
    try {
      const name = IS_WIN ? "node.exe" : "node";
      if (realpathSync(join(part, name)) === real) return join(part, name);
    } catch {
      // Not there.
    }
  }
  return process.execPath;
}

const xml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The agent's file for launchd. No secret stands in it. Without an interval it runs once, at loading. */
function plistOf(program, every, env, label = AGENT_LABEL) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    `  <key>Label</key><string>${xml(label)}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    ...program.map((part) => `    <string>${xml(part)}</string>`),
    "  </array>",
    `  <key>WorkingDirectory</key><string>${xml(ROOT)}</string>`,
    ...(every ? [`  <key>StartInterval</key><integer>${every * 60}</integer>`] : []),
    "  <key>RunAtLoad</key><true/>",
    "  <key>ProcessType</key><string>Background</string>",
    `  <key>StandardOutPath</key><string>${xml(AGENT_LOG)}</string>`,
    `  <key>StandardErrorPath</key><string>${xml(AGENT_LOG)}</string>`,
    "  <key>EnvironmentVariables</key>",
    "  <dict>",
    ...Object.entries(env).map(([name, value]) => `    <key>${xml(name)}</key><string>${xml(value)}</string>`),
    "  </dict>",
    "</dict>",
    "</plist>",
    "",
  ].join("\n");
}

// --- The same job on Windows: the task scheduler -----------------------------------------------
// A task of the person logged in, no administrator. It starts a launcher without a window
// (wscript, //B) that sets the environment, goes into the root and starts node; node writes its own
// log (ARASUL_LOG_TO), because a launcher without a window has no console to redirect. The task
// file says: also on battery, also when a run was missed, one run at a time, again at every login.

const vbs = (value) => `"${String(value).replace(/"/g, '""')}"`;
/** One argument as the launcher passes it on: in quotes, and without a quote of its own (Windows paths have none). */
const quotedArg = (value) => `"${String(value).replace(/"/g, "")}"`;

/** The launcher, a VBScript. UTF-16 with a mark, because a user name with an umlaut is no ANSI. */
function launcherOf(program, env) {
  const lines = [
    'Set shell = CreateObject("WScript.Shell")',
    `shell.CurrentDirectory = ${vbs(ROOT)}`,
    'Set environment = shell.Environment("Process")',
    ...Object.entries({ ...env, ARASUL_LOG_TO: AGENT_LOG }).map(([name, value]) => `environment(${vbs(name)}) = ${vbs(value)}`),
    `shell.Run ${vbs(program.map(quotedArg).join(" "))}, 0, True`,
    "",
  ];
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lines.join("\r\n"), "utf16le")]);
}

/** An interval for the task file: PT1H30M. */
function isoInterval(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `PT${hours ? `${hours}H` : ""}${rest || !hours ? `${rest}M` : ""}`;
}

const localStart = () => {
  const now = new Date();
  const two = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}T${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;
};

/** The task file for the task scheduler, UTF-16 with a mark like the scheduler writes its own. */
function taskXmlOf(every) {
  const text = [
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    `  <RegistrationInfo><Description>${xml(t(`Sync of the company folder ${ROOT}. Taken back by node arasul.mjs sync --uninstall.`, `Abgleich des Firmenordners ${ROOT}. Zurückgenommen mit node arasul.mjs sync --uninstall.`))}</Description></RegistrationInfo>`,
    "  <Triggers>",
    `    <TimeTrigger><Repetition><Interval>${isoInterval(every)}</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>${localStart()}</StartBoundary><Enabled>true</Enabled></TimeTrigger>`,
    `    <LogonTrigger><Enabled>true</Enabled><UserId>${xml(windowsUser())}</UserId></LogonTrigger>`,
    "  </Triggers>",
    `  <Principals><Principal id="Author"><UserId>${xml(windowsUser())}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>`,
    "  <Settings>",
    "    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>",
    "    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>",
    "    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>",
    "    <StartWhenAvailable>true</StartWhenAvailable>",
    "    <AllowStartOnDemand>true</AllowStartOnDemand>",
    "    <Enabled>true</Enabled>",
    "    <Hidden>false</Hidden>",
    "    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>",
    "  </Settings>",
    '  <Actions Context="Author">',
    `    <Exec><Command>wscript.exe</Command><Arguments>//B //Nologo ${xml(quotedArg(TASK_LAUNCHER))}</Arguments></Exec>`,
    "  </Actions>",
    "</Task>",
    "",
  ].join("\r\n");
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
}

const schtasks = (args) => spawnSync(SCHTASKS, args, { encoding: "utf8", timeout: 60_000, windowsHide: true });

/** Set the job up at the task scheduler. The task file first; where the scheduler turns it down, the plain way with an interval alone. */
function taskCreate(program, every, env) {
  mkdirSync(BACKGROUND_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(TASK_LAUNCHER, launcherOf(program, env));
  writeFileSync(TASK_XML, taskXmlOf(every));
  writeFileSync(TASK_META, `${JSON.stringify({ every, program, label: AGENT_LABEL, task: TASK_NAME, launcher: TASK_LAUNCHER }, null, 2)}\n`);
  let run = schtasks(["/Create", "/TN", TASK_NAME, "/XML", TASK_XML, "/F"]);
  if (run.status !== 0) {
    run = schtasks(["/Create", "/TN", TASK_NAME, "/SC", "MINUTE", "/MO", String(every), "/TR", `wscript.exe //B //Nologo ${quotedArg(TASK_LAUNCHER)}`, "/F"]);
  }
  if (run.status === 0) schtasks(["/Run", "/TN", TASK_NAME]);
  return run;
}

/** Take the job away. True when the scheduler held it. */
function taskDelete() {
  const held = schtasks(["/Delete", "/TN", TASK_NAME, "/F"]).status === 0;
  for (const file of [TASK_LAUNCHER, TASK_XML, TASK_META]) rmSync(file, { force: true });
  return held;
}

/** What is set up for this root: the agent's file, its interval and program, and whether launchd holds it. */
function agentState() {
  if (IS_WIN) {
    const meta = readJson(TASK_META, null);
    if (!meta) return null;
    return { every: Number(meta.every) || 0, program: String(meta.program?.[0] || ""), loaded: schtasks(["/Query", "/TN", TASK_NAME]).status === 0 };
  }
  if (!existsSync(AGENT_PLIST)) return null;
  const text = readFileSync(AGENT_PLIST, "utf8");
  const every = Math.round(Number(text.match(/<key>StartInterval<\/key>\s*<integer>(\d+)</)?.[1] || 0) / 60);
  const program = text.match(/<key>ProgramArguments<\/key>\s*<array>\s*<string>([^<]*)</)?.[1]?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") || "";
  return { every, program, loaded: launchctl(["print", `${domain()}/${AGENT_LABEL}`]).status === 0 };
}

/**
 * One sync of this root at a time. The agent and a human at the terminal share the same lock: two
 * clients in one folder would each take the other's half-written files for changes.
 */
function takeLock() {
  mkdirSync(BACKGROUND_DIR, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(AGENT_LOCK, `${process.pid}\n`, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const holder = Number(readJson(AGENT_LOCK, 0));
    let alive = false;
    try {
      process.kill(holder, 0);
      alive = true;
    } catch (gone) {
      alive = gone.code === "EPERM";
    }
    if (alive && holder !== process.pid) return null;
    // Left by a run that was stopped: the process is gone.
    writeFileSync(AGENT_LOCK, `${process.pid}\n`, { mode: 0o600 });
  }
  return () => {
    if (Number(readJson(AGENT_LOCK, 0)) === process.pid) rmSync(AGENT_LOCK, { force: true });
  };
}

/** A notification of macOS or Windows, or of the program ARASUL_NOTIFY names. The text goes as an argument of the script, never into its source. */
function notify(title, message) {
  const text = oneLine(message, 400);
  say(`${t("Notification", "Mitteilung")}: ${title}: ${text}`);
  const custom = process.env.ARASUL_NOTIFY;
  if (custom) return spawnSync(custom, [title, text], { timeout: 15_000, windowsHide: true });
  if (IS_WIN) {
    // The text goes in the environment of the script, never into its source.
    const script = [
      "[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]",
      "$content = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
      "$lines = $content.GetElementsByTagName('text')",
      "[void]$lines.Item(0).AppendChild($content.CreateTextNode($env:ARASUL_NOTE_TITLE))",
      "[void]$lines.Item(1).AppendChild($content.CreateTextNode($env:ARASUL_NOTE_TEXT))",
      "$toast = [Windows.UI.Notifications.ToastNotification]::new($content)",
      "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($toast)",
    ].join("\n");
    return spawnSync(process.env.ARASUL_POWERSHELL || "powershell.exe", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
      env: { ...process.env, ARASUL_NOTE_TITLE: title, ARASUL_NOTE_TEXT: text },
      timeout: 30_000,
      windowsHide: true,
    });
  }
  if (!IS_MAC) return null;
  return spawnSync("/usr/bin/osascript", ["-e", "on run argv", "-e", "display notification (item 2 of argv) with title (item 1 of argv)", "-e", "end run", title, text], { timeout: 15_000 });
}

/** The log of the agent stays small: past a megabyte it starts again. */
function trimLog() {
  try {
    if (statSync(AGENT_LOG).size > 1024 * 1024) writeFileSync(AGENT_LOG, "");
  } catch {
    // No log yet.
  }
}

/**
 * What a run in the background leaves behind, next to the state of the sync, and the one
 * notification that belongs to it. A problem is said once, when it comes about or changes, and its
 * end once more, when it was said. A device that does not answer is said only after a quarter of
 * an hour: a restart takes a few minutes and is no problem.
 */
function noteBackground(problem) {
  const state = readFolderState();
  const mine = state.roots[ROOT] || (state.roots[ROOT] = { folders: {} });
  const before = mine.background || {};
  const now = new Date();
  const entry = { at: now.toISOString() };
  if (!problem) {
    if (before.problem && before.notified) notify(t("Company folder synced again", "Firmenordner wieder abgeglichen"), t(`${basename(ROOT)} is synced again.`, `${basename(ROOT)} ist wieder abgeglichen.`));
  } else {
    // A device that does not answer says it with another code now and then, and stays the same problem.
    const same = problem.kind === "unreachable" ? before.problem?.kind === "unreachable" : before.problem?.text === problem.text;
    Object.assign(entry, { problem, since: same && before.since ? before.since : entry.at, notified: Boolean(same && before.notified) });
    const lasting = now.getTime() - Date.parse(entry.since) >= QUIET_UNREACHABLE;
    if (!entry.notified && (problem.kind !== "unreachable" || lasting)) {
      const title = problem.kind === "conflict" ? t("Conflict in the company folder", "Konflikt im Firmenordner") : t("Company folder not synced", "Firmenordner nicht abgeglichen");
      notify(title, problem.text);
      entry.notified = true;
    }
  }
  mine.background = entry;
  writeFolderState(state);
}

/** `sync --background`: what the agent runs. The password comes from the keychain, the result goes to the state and, when it is a problem, to a notification. */
async function doBackground(args) {
  inBackground = true;
  trimLog();
  const started = new Date().toISOString();
  say(`--- ${started} ${t("sync in the background", "Abgleich im Hintergrund")}`);
  let problem = null;
  try {
    await runSync(args);
    const fresh = Object.entries(readFolderState().roots[ROOT]?.folders || {}).filter(([, folder]) => folder.at >= started);
    const failed = fresh.filter(([, folder]) => folder.result === "error");
    const conflicts = fresh.reduce((sum, [, folder]) => sum + (folder.conflicts || 0), 0);
    if (failed.length && failed.every(([, folder]) => folder.unreachable)) {
      problem = { kind: "unreachable", text: t(`The file service stopped answering during the sync of ${basename(ROOT)}. The device restarts or is off the network; the next sync takes up what is open.`, `Der Dateidienst hat während des Abgleichs von ${basename(ROOT)} nicht mehr geantwortet. Das Gerät startet neu oder ist nicht im Netz; der nächste Abgleich nimmt auf, was offen ist.`) };
    } else if (failed.length) problem = { kind: "error", text: failed.map(([path, folder]) => `${path === "." ? folder.id : path}: ${folder.message}`).join(" ") };
    else if (conflicts) {
      problem = {
        kind: "conflict",
        text: t(
          `${conflicts} ${conflicts === 1 ? "file differs" : "files differ"} on both sides in ${basename(ROOT)}, the client kept both versions. node arasul.mjs status says where.`,
          `${conflicts} ${conflicts === 1 ? "Datei ist" : "Dateien sind"} in ${basename(ROOT)} auf beiden Seiten verschieden, der Klient hat beide Fassungen behalten. node arasul.mjs status sagt, wo.`
        ),
      };
    }
  } catch (error) {
    problem = { kind: error.unreachable ? "unreachable" : "error", text: oneLine(error.message, 400) };
    warn(error.message);
  }
  noteBackground(problem);
  return !problem;
}

/** A place a program in the background reaches only with the approval of macOS. */
function guardedByMacos(path) {
  const home = homedir();
  return ["Desktop", "Documents", "Downloads", join("Library", "Mobile Documents")].some((part) => path === join(home, part) || path.startsWith(`${join(home, part)}/`));
}

// --- Seen from the background: what launchd's node reaches ----------------------------------
// Measured on 2026-09-27 at a Mac with macOS 15: node started by launchd did not reach the device
// under its LAN address, EHOSTUNREACH, while the same node reached it from the terminal and reached
// the device's Tailscale address from launchd as well. macOS lets a program into the local network
// only with the approval Local Network, and a node without a window started by launchd never gets
// asked. It showed only in the agent's log. So --install asks launchd itself before it sets up.

const PROBE_LABEL = `${AGENT_LABEL}.pruefung`;
const PROBE_PLIST = join(LAUNCH_AGENTS, `${PROBE_LABEL}.plist`);
const PROBE_FILE = join(BACKGROUND_DIR, `${PROBE_LABEL}.json`);
const PROBE_WAIT = Number(process.env.ARASUL_PROBE_WAIT || 30_000);

/** `sync --reach`: what launchd runs once for --install. Which addresses answer from the background, and nothing more. */
async function doReach(args) {
  const device = chooseDevice(args);
  const list = [device.entry.address, ...(process.env.ARASUL_REACH || "").split(/\s+/).filter(Boolean)];
  const results = [];
  for (const address of [...new Set(list)]) results.push(await reaches(address, device.entry.ca));
  mkdirSync(BACKGROUND_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(PROBE_FILE, `${JSON.stringify({ at: new Date().toISOString(), results })}\n`, { mode: 0o600 });
  return true;
}

/**
 * Let launchd run `sync --reach` once, as an agent of this person like the real one, and read what
 * it saw: the device's address and every address of the file service, and each host of those on
 * the port of the device, as a way to log in instead. Null when launchd said nothing in time.
 */
function probeFromBackground(device, plan, env) {
  const hosts = plan.addresses.map((address) => {
    const url = new URL(address);
    return `${url.protocol}//${url.host.replace(/:\d+$/, "")}${new URL(device.entry.address).port ? `:${new URL(device.entry.address).port}` : ""}`;
  });
  const list = [...new Set([...plan.addresses, ...hosts])].filter((address) => address !== device.entry.address);
  const program = [nodePath(), fileURLToPath(import.meta.url), "sync", "--reach", "--device", device.name];
  mkdirSync(BACKGROUND_DIR, { recursive: true, mode: 0o700 });
  mkdirSync(LAUNCH_AGENTS, { recursive: true });
  rmSync(PROBE_FILE, { force: true });
  writeFileSync(PROBE_PLIST, plistOf(program, 0, { ...env, ARASUL_REACH: list.join(" ") }, PROBE_LABEL), { mode: 0o644 });
  launchctl(["bootout", `${domain()}/${PROBE_LABEL}`]);
  const run = launchctl(["bootstrap", domain(), PROBE_PLIST]);
  let seen = null;
  const until = Date.now() + PROBE_WAIT;
  while (run.status === 0 && Date.now() < until) {
    seen = readJson(PROBE_FILE, null);
    if (seen) break;
    pause(250);
  }
  launchctl(["bootout", `${domain()}/${PROBE_LABEL}`]);
  rmSync(PROBE_PLIST, { force: true });
  rmSync(PROBE_FILE, { force: true });
  return seen && Array.isArray(seen.results) ? { seen: new Map(seen.results.map((item) => [item.address, item])), hosts } : null;
}

/** Why the background does not get there, in one line with the cause and the way out. */
function backgroundStop(failed, device, instead) {
  const local = ["EHOSTUNREACH", "ENETUNREACH"].includes(failed.code);
  const user = device.entry.user ? ` --user ${device.entry.user}` : "";
  const way = instead
    ? t(`log in under ${instead}, which answers from the background: node arasul.mjs login ${instead}${user}, then sync --install again`, `melde dich unter ${instead} an, das aus dem Hintergrund antwortet: node arasul.mjs login ${instead}${user}, dann sync --install noch einmal`)
    : t("log in under an address of the device outside the local network, its Tailscale name for instance, then sync --install again", "melde dich unter einer Adresse des Geräts außerhalb des lokalen Netzes an, etwa seinem Tailscale-Namen, dann sync --install noch einmal");
  return local
    ? t(
        `From the background node does not reach ${failed.address} (${failed.code}): macOS lets a program started by launchd into the local network only with the approval Local Network, and node does not get it. Way out: ${way}. Nothing was set up.`,
        `Aus dem Hintergrund erreicht node ${failed.address} nicht (${failed.code}): macOS lässt ein von launchd gestartetes Programm nur mit der Freigabe Lokales Netzwerk ins lokale Netz, und node bekommt sie nicht. Ausweg: ${way}. Nichts wurde eingerichtet.`
      )
    : t(
        `From the background node does not reach ${failed.address} (${failed.code}), from this terminal it does. Way out: ${way}. Nothing was set up.`,
        `Aus dem Hintergrund erreicht node ${failed.address} nicht (${failed.code}), aus diesem Terminal schon. Ausweg: ${way}. Nichts wurde eingerichtet.`
      );
}

/** `sync --install`: the password into the keychain, proven first, and an agent to launchd. */
async function doInstall(args) {
  if (!IS_MAC && !IS_WIN && !process.env.ARASUL_LAUNCH_AGENTS) {
    stop(t(
      "The sync in the background is built on launchd and the keychain of a Mac, and on the task scheduler of Windows. Here: node arasul.mjs sync, by hand or out of a timer of this computer.",
      "Der Abgleich im Hintergrund baut auf launchd und den Schlüsselbund eines Mac und auf die Aufgabenplanung von Windows. Hier: node arasul.mjs sync, von Hand oder aus einem Zeitgeber dieses Rechners."
    ), 2);
  }
  const every = Number(one(args, "every") ?? EVERY_DEFAULT);
  if (!Number.isInteger(every) || every < 1 || every > 1440) stop(t("--every takes minutes, a whole number from 1 to 1440.", "--every nimmt Minuten, eine ganze Zahl von 1 bis 1440."), 2);
  const device = chooseDevice(args);
  const plan = await askFolders(device);
  if (!plan.service) stop(`${plan.reason} ${t("Nothing was set up.", "Nichts wurde eingerichtet.")}`);
  if (!plan.folders.length) stop(t("No folder is shared with you: a sync in the background would have nothing to do. Nothing was set up.", "Dir ist kein Ordner freigegeben: ein Abgleich im Hintergrund hätte nichts zu tun. Nichts wurde eingerichtet."));
  if (!plan.address || !plan.user) stop(t("The device names no address or no user of the file service. Nothing was set up.", "Das Gerät nennt keine Adresse oder keinen Benutzer des Dateidienstes. Nichts wurde eingerichtet."));
  const client = await ensureClient(args);
  const password = await askPassword({ ...args, flags: { ...args.flags, background: false } }, plan, device);
  // Proven before it is stored: a password the service does not take would fail at every run.
  await pickAddress(plan, device);
  await spacesOf(plan, device, password);
  // On Windows the task keeps the environment of the person; on a Mac launchd starts with almost none.
  const env = IS_WIN ? {} : { PATH: "/usr/bin:/bin:/usr/sbin:/sbin" };
  for (const name of ["ARASUL_CONFIG_DIR", "ARASUL_KEYCHAIN", "ARASUL_NOTIFY", "ARASUL_LANGUAGE", "ARASUL_PLATFORM", "ARASUL_ICACLS", "ARASUL_SCHTASKS", "LANG"]) if (process.env[name]) env[name] = name === "ARASUL_CONFIG_DIR" ? CONFIG_DIR : process.env[name];
  // Proven from where it will run: launchd's node does not reach what this terminal reaches.
  // Windows has no such barrier: a program of the task scheduler reaches the network like this terminal does.
  const probe = IS_WIN ? null : probeFromBackground(device, plan, env);
  if (IS_WIN) {
    say(t(`Not checked from the background: on Windows the task scheduler starts the sync with your own access to the network. status says after the first run whether it got through.`, `Nicht aus dem Hintergrund geprüft: unter Windows startet die Aufgabenplanung den Abgleich mit deinem eigenen Netzzugang. status sagt nach dem ersten Lauf, ob er durchkam.`));
  } else if (probe) {
    const { seen, hosts } = probe;
    const there = seen.get(device.entry.address);
    const service = plan.addresses.filter((address) => seen.get(address)?.ok);
    const instead = hosts.find((address) => address !== device.entry.address && seen.get(address)?.ok);
    if (!there?.ok) stop(backgroundStop(there || { address: device.entry.address, code: "?" }, device, instead));
    if (!service.length) stop(backgroundStop(seen.get(plan.address) || { address: plan.address, code: "?" }, device, null));
    say(t(`Checked from the background: ${device.entry.address} answers, the file service under ${service[0]}.`, `Aus dem Hintergrund geprüft: ${device.entry.address} antwortet, der Dateidienst unter ${service[0]}.`));
  } else {
    say(t(`launchd did not report the check from the background within ${Math.round(PROBE_WAIT / 1000)} seconds. Set up anyway; status says after the first run whether it got through.`, `launchd hat die Prüfung aus dem Hintergrund nicht binnen ${Math.round(PROBE_WAIT / 1000)} Sekunden gemeldet. Trotzdem eingerichtet; status sagt nach dem ersten Lauf, ob er durchkam.`));
  }
  const token = await issueAppToken(plan, device, password);
  if (token) await spacesOf(plan, device, token.value);
  const before = accessRead();
  accessStore({ kind: token ? "token" : "password", value: token ? token.value : password, ...(token?.until ? { until: token.until } : {}), device: device.name, address: plan.address, user: plan.user });
  // An earlier install of this root issued a token of its own; it goes now, not in a year.
  if (before?.kind === "token" && before.value !== token?.value) await revokeAppToken(before);

  mkdirSync(BACKGROUND_DIR, { recursive: true, mode: 0o700 });
  // This very file, by its path: whoever installs runs the bridge they mean, and a root that is still
  // to become one carries the house's arasul.mjs after its first sync.
  const program = [nodePath(), fileURLToPath(import.meta.url), "sync", "--background", "--device", device.name, "--client", client];
  if (IS_WIN) {
    const run = taskCreate(program, every, env);
    if (run.status !== 0) {
      stop(t(
        `The task scheduler did not take the task: ${clientSaid(run)}. The access lies in ${ACCESS_FILE}: node arasul.mjs sync --uninstall takes it back.`,
        `Die Aufgabenplanung hat die Aufgabe nicht angenommen: ${clientSaid(run)}. Der Zugang liegt in ${ACCESS_FILE}: node arasul.mjs sync --uninstall nimmt ihn zurück.`
      ));
    }
  } else {
    mkdirSync(LAUNCH_AGENTS, { recursive: true });
    writeFileSync(AGENT_PLIST, plistOf(program, every, env), { mode: 0o644 });
    launchctl(["bootout", `${domain()}/${AGENT_LABEL}`]);
    let run;
    // launchd lets go of an agent a moment after bootout, and refuses it until then.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      run = launchctl(["bootstrap", domain(), AGENT_PLIST]);
      if (run.status === 0) break;
      pause(1000);
    }
    if (run.status !== 0) {
      stop(t(
        `launchd did not take the agent: ${clientSaid(run)}. The password lies in the keychain and the agent at ${AGENT_PLIST}: node arasul.mjs sync --uninstall takes both back.`,
        `launchd hat den Agenten nicht angenommen: ${clientSaid(run)}. Das Passwort liegt im Schlüsselbund und der Agent unter ${AGENT_PLIST}: node arasul.mjs sync --uninstall nimmt beides zurück.`
      ));
    }
  }
  say(t(`Sync in the background set up: ${plan.user} on ${device.name}, every ${every} minutes, starting now.`, `Abgleich im Hintergrund eingerichtet: ${plan.user} auf ${device.name}, alle ${every} Minuten, ab jetzt.`));
  say(IS_WIN
    ? `  ${t("Task", "Aufgabe")}: ${TASK_NAME} ${t("in the task scheduler, started again at every login. Open it in the Windows search as 'Task Scheduler'", "in der Aufgabenplanung, bei jeder Anmeldung neu gestartet. Du findest sie in der Windows-Suche unter 'Aufgabenplanung'")}`
    : `  ${t("Agent", "Agent")}: ${AGENT_PLIST} (${AGENT_LABEL}), ${t("started again by launchd at every login", "von launchd bei jeder Anmeldung neu gestartet")}`);
  say(`  ${t("Access", "Zugang")}: ${token
    ? t(`an app token of the file service for this computer, holds until ${token.until ? token.until.slice(0, 10) : "?"}, in ${accessPlace()}. Your password is stored nowhere.`, `ein App-Token des Dateidienstes für diesen Rechner, gilt bis ${token.until ? token.until.slice(0, 10) : "?"}, in ${accessPlace()}. Dein Passwort liegt nirgends.`)
    : t(`the file service issues no app token, so your password lies in ${accessPlace()}, checked against the service.${inTheKeychain() ? " In no file." : ""}`, `der Dateidienst stellt kein App-Token aus, darum liegt dein Passwort in ${accessPlace()}, am Dienst geprüft.${inTheKeychain() ? " In keiner Datei." : ""}`)}`);
  say(`  ${t("Log", "Protokoll")}: ${AGENT_LOG}`);
  say(`  ${t(
    "A conflict or an error comes as a notification. node arasul.mjs status says in one line how things stand. Revoking the credential in the device's front end stops the sync at its next run.",
    "Ein Konflikt oder ein Fehler kommt als Mitteilung. node arasul.mjs status sagt in einer Zeile, wie es steht. Wird der Ausweis in der Oberfläche des Geräts widerrufen, hält der Abgleich beim nächsten Lauf an."
  )}`);
  // macOS shows what osascript says as a notification of the Script Editor, and only when the Script
  // Editor may notify: on 2026-09-27 at a Mac it could not, and every notification went nowhere
  // without a sign. So one comes now, and the output says where it is allowed.
  notify(t("Company folder in the background", "Firmenordner im Hintergrund"), t(`${basename(ROOT)} is synced every ${every} minutes from now on.`, `${basename(ROOT)} wird ab jetzt alle ${every} Minuten abgeglichen.`));
  say(`  ${IS_WIN
    ? t(
        "A notification went out just now. If none appeared: Settings, System, Notifications, allow notifications from 'Windows PowerShell', and switch Focus assist off. Without it a conflict stays silent and only status says it.",
        "Eben ging eine Mitteilung hinaus. Ist keine erschienen: Einstellungen, System, Benachrichtigungen, Benachrichtigungen von 'Windows PowerShell' erlauben und die Fokussierungshilfe ausschalten. Ohne das bleibt ein Konflikt still, und nur status sagt ihn."
      )
    : t(
        "A notification went out just now. If none appeared: System Settings, Notifications, Script Editor, allow notifications. Without it a conflict stays silent and only status says it.",
        "Eben ging eine Mitteilung hinaus. Ist keine erschienen: Systemeinstellungen, Mitteilungen, Skripteditor, Mitteilungen erlauben. Ohne das bleibt ein Konflikt still, und nur status sagt ihn."
      )}`);
  if (IS_MAC && guardedByMacos(ROOT)) {
    say(`  ${t(
      `${ROOT} lies in a folder macOS guards: a program in the background gets in only when node has full disk access in the system settings, under privacy and security. Without it every run ends with 'Operation not permitted'.`,
      `${ROOT} liegt in einem Ordner, den macOS bewacht: ein Programm im Hintergrund kommt nur hinein, wenn node in den Systemeinstellungen unter Datenschutz und Sicherheit vollen Festplattenzugriff hat. Ohne ihn endet jeder Lauf mit 'Operation not permitted'.`
    )}`);
  }
  return true;
}

/** `sync --uninstall`: the agent out of launchd, its file away, the token and the credential of this computer revoked, the access out of the keychain. */
async function doUninstall() {
  const had = IS_WIN ? existsSync(TASK_META) : existsSync(AGENT_PLIST);
  const loaded = IS_WIN ? taskDelete() : launchctl(["bootout", `${domain()}/${AGENT_LABEL}`]).status === 0;
  rmSync(AGENT_PLIST, { force: true });
  const entry = IS_MAC || IS_WIN || KEYCHAIN_FILE ? accessRead() : null;
  const revoked = entry?.kind === "token" ? await revokeAppToken(entry) : null;
  const forgot = IS_MAC || IS_WIN || KEYCHAIN_FILE ? accessForget() : false;
  // The credential of this computer goes last of the things that need the device: whoever hands a computer on
  // and logs out expects that it opens nothing afterwards. A revoked one is taken out of the list too, a dead one
  // helps nobody; one that could not be revoked stays, so the human can still see which it is.
  const credentialLines = [];
  const credentials = readCredentials();
  let changed = false;
  for (const [name, entry] of Object.entries(credentials.devices)) {
    const result = await revokeCredential(name, entry);
    if (result.done) {
      delete credentials.devices[name];
      if (credentials.default === name) delete credentials.default;
      changed = true;
      credentialLines.push(result.already
        ? t(`the credential of this computer for ${name} no longer counted at the device. It is taken out of this computer.`, `der Ausweis dieses Rechners für ${name} galt am Gerät schon nicht mehr. Er ist aus diesem Rechner genommen.`)
        : t(`the credential of this computer for ${name} is revoked at the device and opens nothing any more. It is taken out of this computer.`, `der Ausweis dieses Rechners für ${name} ist am Gerät widerrufen und öffnet nichts mehr. Er ist aus diesem Rechner genommen.`));
    } else {
      credentialLines.push(t(`the credential of this computer for ${name} still counts: ${result.why}.`, `der Ausweis dieses Rechners für ${name} gilt noch: ${result.why}.`));
    }
  }
  if (changed) writeCredentials(credentials);
  const state = readFolderState();
  if (state.roots[ROOT]?.background) {
    delete state.roots[ROOT].background;
    writeFolderState(state);
  }
  if (!loaded && !had && !forgot) {
    if (credentialLines.length) {
      say(t("No sync in the background was set up for this root.", "Für diese Wurzel war kein Abgleich im Hintergrund eingerichtet."));
      for (const line of credentialLines) say(`  ${t("Credential", "Ausweis")}: ${line}`);
    } else {
      say(t("No sync in the background was set up for this root. Nothing was changed.", "Für diese Wurzel war kein Abgleich im Hintergrund eingerichtet. Nichts wurde geändert."));
    }
    return true;
  }
  say(t("Sync in the background taken back:", "Abgleich im Hintergrund zurückgenommen:"));
  if (IS_WIN) say(`  ${t("Task", "Aufgabe")}: ${loaded ? t("taken out of the task scheduler", "aus der Aufgabenplanung genommen") : t("was not held by the task scheduler", "die Aufgabenplanung hielt sie nicht")}${had ? t(", its files deleted", ", ihre Dateien gelöscht") : ""}`);
  else say(`  ${t("Agent", "Agent")}: ${loaded ? t("taken out of launchd", "aus launchd genommen") : t("was not loaded", "war nicht geladen")}${had ? t(`, ${AGENT_PLIST} deleted`, `, ${AGENT_PLIST} gelöscht`) : ""}`);
  const where = inTheKeychain() ? t("the keychain", "dem Schlüsselbund") : t("its private file", "seiner privaten Datei");
  say(`  ${t("Access", "Zugang")}: ${forgot ? t(`taken out of ${where}`, `aus ${where} genommen`) : t(`none lay in ${where}`, `in ${where} lag keiner`)}${
    revoked === true ? t(", the app token revoked at the file service", ", das App-Token am Dateidienst widerrufen")
    : revoked === false ? t(`, the app token could not be revoked at the file service now: it ends on ${entry.until?.slice(0, 10) || "?"}, or revoke it in the file service's front end`, `, das App-Token ließ sich am Dateidienst gerade nicht widerrufen: es endet am ${entry.until?.slice(0, 10) || "?"}, oder widerrufe es in der Oberfläche des Dateidienstes`)
    : ""}`);
  // The credential of this computer is not the app token: a credential may not list or revoke credentials at the device,
  // so this file cannot take it back. It says so and names the place instead of leaving the human to think it is gone.
  const lines = credentialLines;
  for (const line of lines) say(`  ${t("Credential", "Ausweis")}: ${line}`);
  say(`  ${t("What was synced stays here. The log stays for reading", "Was abgeglichen wurde, bleibt hier. Das Protokoll bleibt zum Lesen")}: ${AGENT_LOG}`);
  return true;
}

/** What changed here since the last sync, out of this tree and the state, without asking anybody. */
function openHere(here, base) {
  let count = 0;
  for (const [path, file] of here) {
    if (CONFLICT_MARK.test(path.split("/").pop())) continue;
    const was = base.get(path);
    if (!was || !alike(file, was)) count += 1;
  }
  for (const path of base.keys()) if (!here.has(path)) count += 1;
  return count;
}

/**
 * The one line of `status`: when the last sync went through, how much is open here, how many
 * conflicts lie in the tree, and whether it runs in the background. Out of this computer alone, so
 * it also stands when the device does not answer. Open counts what changed here since the last
 * sync; what changed on the device only the next sync sees.
 */
function syncLine() {
  const head = t("Sync", "Abgleich");
  const mine = readFolderState().roots[ROOT];
  const folders = Object.entries(mine?.folders || {}).map(([path, folder]) => ({ ...folder, path, root: Boolean(folder.root) }));
  const agent = agentState();
  const where = !agent
    ? t("not in the background (node arasul.mjs sync --install)", "nicht im Hintergrund (node arasul.mjs sync --install)")
    : !existsSync(agent.program)
      ? t(`in the background, but ${agent.program} is gone: node arasul.mjs sync --install again`, `im Hintergrund, aber ${agent.program} ist weg: node arasul.mjs sync --install noch einmal`)
      : agent.loaded
        ? t(`in the background every ${agent.every} minutes`, `im Hintergrund alle ${agent.every} Minuten`)
        : IS_WIN
          ? t(`set up every ${agent.every} minutes, but the task scheduler does not hold it: node arasul.mjs sync --install`, `alle ${agent.every} Minuten eingerichtet, aber die Aufgabenplanung hält es nicht: node arasul.mjs sync --install`)
          : t(`set up every ${agent.every} minutes, but launchd does not hold it: log in again or node arasul.mjs sync --install`, `alle ${agent.every} Minuten eingerichtet, aber launchd hält es nicht: neu anmelden oder node arasul.mjs sync --install`);
  const problem = mine?.background?.problem || null;
  // What went next to the root, in one sentence, as long as it lies there.
  const went = mine?.setAside;
  const aside = went && existsSync(went.where) && went.folders?.length
    ? t(
        `No longer shared or thrown away on the device, so moved out of this root and not deleted: ${went.folders.map((item) => `${item.path}/ (${fileCount(item.files)})`).join(", ")}, since ${stamp(went.at)} in ${went.where}.`,
        `Nicht mehr freigegeben oder am Gerät weggeworfen, darum aus dieser Wurzel verschoben und nicht gelöscht: ${went.folders.map((item) => `${item.path}/ (${fileCount(item.files)})`).join(", ")}, seit ${stamp(went.at)} in ${went.where}.`
      )
    : null;
  if (!folders.length) return { line: `${head}: ${t("never synced", "noch nie abgeglichen")}, ${where}`, problem, aside, fine: false };
  const plan = { folders };
  const tops = topNames(plan);
  let open = 0;
  let conflicts = 0;
  let unknown = false;
  const failed = [];
  for (const folder of folders) {
    if (folder.result !== "ok") failed.push(folder.path === "." ? folder.id : folder.path);
    const local = join(ROOT, ...folder.path.split("/"));
    if (!existsSync(local)) continue;
    const excludes = excludesFor(plan, folder, local);
    const base = readBase(local);
    if (base) open += openHere(localTree(local, excludes, { weighHome: false }).files, base);
    else unknown = true;
    conflicts += inspectFolder(local, folder.root ? tops : new Set(), excludes).conflicts.length;
  }
  const done = folders.filter((folder) => folder.result === "ok").map((folder) => folder.at).sort();
  const last = done.length ? `${t("last synced", "zuletzt abgeglichen")} ${stamp(done[done.length - 1])}` : t("never synced through", "noch nie durchgegangen");
  const parts = [last, `${t("open", "offen")} ${open}${unknown ? "+" : ""}`, `${t("conflicts", "Konflikte")} ${conflicts}`];
  if (failed.length) parts.push(`${t("not through", "nicht durch")}: ${failed.join(", ")}`);
  parts.push(where);
  return { line: `${head}: ${parts.join(", ")}`, problem, aside, fine: !conflicts && !failed.length && !problem };
}

/** The state of one sync, next to the credential. What was known about other folders stays. */
function recordSync(device, plan, results) {
  const state = readFolderState();
  const before = state.roots[ROOT]?.folders || {};
  const mine = { device: device.name, address: plan.named || plan.address, user: plan.user, at: new Date().toISOString(), folders: { ...before } };
  if (state.roots[ROOT]?.background) mine.background = state.roots[ROOT].background;
  if (state.roots[ROOT]?.setAside) mine.setAside = state.roots[ROOT].setAside;
  for (const result of results) {
    mine.folders[result.path] = {
      id: result.id,
      level: result.level,
      ...(result.root ? { root: true } : {}),
      right: result.right,
      at: result.at,
      result: result.ok ? "ok" : "error",
      ...(result.message ? { message: result.message } : {}),
      ...(result.unreachable ? { unreachable: true } : {}),
      conflicts: result.conflicts.length,
      links: result.links.length,
      ...(result.trashed?.length ? { trashed: result.trashed.length, trash: result.trash } : {}),
    };
  }
  state.roots[ROOT] = mine;
  writeFolderState(state);
}

// --- The view: sicht.md ----------------------------------------------------------------------
// What this person has on the device, as one sheet at the top of the root. The device is meant to
// deliver it one day; until it does, the sheet is written out of what the device says about
// folders and apps. Per person, so it never goes into the room of the root.

/** The day in the clock of this computer. At 01:30 in Berlin UTC still says the day before. */
function localDay(at = new Date()) {
  const two = (n) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
}

/** A time for a human: the clock of this computer, not UTC. At the Mac measured 13:15 UTC read as a quarter past one, and it was 15:15. */
function stamp(iso) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return String(iso);
  const two = (n) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`;
}

/** The view out of what the device says, in the language of the root. */
function ownView(device, plan, results, apps) {
  const today = localDay();
  const known = readFolderState().roots[ROOT]?.folders || {};
  const lines = [
    `# ${t("View", "Sicht")}: ${plan.user || "?"} ${t("on", "auf")} ${device.name}`,
    "",
    t(
      `<!-- Written by arasul.mjs sync on ${today} out of what the device says about folders and apps, because the device delivers no view of its own yet. Do not edit: the next sync overwrites it. Per person: it never goes into the company folder. -->`,
      `<!-- Geschrieben von arasul.mjs sync am ${today} aus dem, was das Gerät über Ordner und Apps sagt, weil das Gerät noch keine eigene Sicht liefert. Nicht bearbeiten: der nächste Abgleich überschreibt es. Je Mensch: es geht nie in den Firmenordner. -->`
    ),
    "",
    `${t("File service", "Dateidienst")}: ${plan.address || t("no address", "keine Adresse")}, ${t("reachable from the device", "vom Gerät aus erreichbar")}: ${plan.reachable ? t("yes", "ja") : t("no", "nein")}`,
    "",
    `## ${t("Folders", "Ordner")}`,
    "",
  ];
  const folders = [...plan.folders].sort((a, b) => (a.root ? 0 : a.level) - (b.root ? 0 : b.level) || a.path.localeCompare(b.path));
  if (!folders.length) lines.push(t("No folder is shared with you.", "Dir ist kein Ordner freigegeben."), "");
  else {
    lines.push(`| ${t("Folder", "Ordner")} | ${t("Level", "Ebene")} | ${t("Right", "Recht")} | ${t("Last sync", "Letzter Abgleich")} |`, "| --- | --- | --- | --- |");
    for (const folder of folders) {
      const result = results.find((entry) => entry.path === folder.path);
      const last = result ? { at: result.at, result: result.ok ? "ok" : "error" } : known[folder.path];
      const when = last
        ? `${last.result === "ok" ? t("synced", "abgeglichen") : t("did not work out", "ging nicht durch")} ${stamp(last.at)}`
        : t("never synced", "noch nie abgeglichen");
      const where = folder.root ? `${folder.id}, ${t("this root, at the top", "diese Wurzel, oben")}` : folder.path;
      lines.push(`| ${where} | ${folder.level} | ${folder.right || "?"} | ${when} |`);
    }
    lines.push("");
  }
  for (const item of plan.refused) lines.push(`${t("Not synced", "Nicht abgeglichen")}: ${item.line}, ${item.why}`, "");
  if (plan.notes.length) {
    lines.push(`${t("What passes the sync by, the device says", "Was am Abgleich vorbeigeht, sagt das Gerät")}:`, "");
    for (const note of plan.notes) lines.push(`- ${note}`);
    lines.push("");
  }
  lines.push(`## ${t("Apps", "Apps")}`, "");
  if (!apps.length) lines.push(t("No app is assigned to you.", "Dir ist keine App zugewiesen."), "");
  else {
    lines.push(`| ${t("App", "App")} | ${t("Version", "Version")} | ${t("State", "Stand")} |`, "| --- | --- | --- |");
    for (const app of apps) {
      const state = app.state === "ok"
        ? `${app.routes.length} ${t("routes", "Routen")}, apps/${app.id}/APP.md`
        : app.state === "test-only" ? t("only the test stand is shared", "nur der Teststand ist freigegeben")
        : app.state === "none" ? t("does not describe itself", "beschreibt sich nicht")
        : app.message || app.state;
      lines.push(`| ${app.id}${app.name && app.name !== app.id ? ` (${app.name})` : ""} | ${app.version || t("not stated", "nicht genannt")} | ${state} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Write the view: the device's own where it delivers one, else the one out of what it says.
 *
 * The device's answer is taken as it comes when it is text, and out of a field `sicht`, `markdown`
 * or `text` when it is JSON. The shape is not agreed yet (as of 2026-09-22): a device that answers
 * in another shape is treated like one that answers not at all, and the sheet says which it was.
 */
async function writeView(device, plan, results, apps) {
  const target = join(ROOT, VIEW_FILE);
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
    stop(t(`${VIEW_FILE} is a link. Nothing is written through a link.`, `${VIEW_FILE} ist ein Link. Durch einen Link wird nichts geschrieben.`));
  }
  let text = null;
  let from = "own";
  let status = 0;
  try {
    const answer = await send(device.entry, { path: DEVICE.view, token: device.entry.token, timeout: 30_000 });
    status = answer.status;
    if (answer.status === 200) {
      const type = String(answer.headers["content-type"] || "");
      if (/text\/(markdown|plain)/.test(type)) text = answer.body.toString("utf8");
      else {
        const data = inner(jsonOf(answer));
        const candidate = typeof data === "string" ? data : data?.sicht ?? data?.markdown ?? data?.text;
        if (typeof candidate === "string") text = candidate;
      }
      if (text !== null) from = "device";
    }
  } catch {
    status = 0;
  }
  if (text === null) text = ownView(device, plan, results, apps);
  writeFileSync(target, text.endsWith("\n") ? text : `${text}\n`);
  return { from, status };
}

function sayView({ from, status }) {
  say(from === "device"
    ? t(`  ${VIEW_FILE}: written, the device delivered it.`, `  ${VIEW_FILE}: geschrieben, das Gerät hat sie geliefert.`)
    : t(
        `  ${VIEW_FILE}: written out of what the device says about folders and apps. The device delivers no view of its own yet${status && status !== 404 ? ` (status ${status} on ${DEVICE.view})` : ""}.`,
        `  ${VIEW_FILE}: geschrieben aus dem, was das Gerät über Ordner und Apps sagt. Das Gerät liefert noch keine eigene Sicht${status && status !== 404 ? ` (Status ${status} auf ${DEVICE.view})` : ""}.`
      ));
}

/** What status says about the company folder. Reads only, and asks for no password. */
async function folderStatus(args, device) {
  const head = t("Company folder", "Firmenordner");
  let plan;
  try {
    plan = await askFolders(device);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    say(`${head}: ${error.message}`);
    return false;
  }
  if (!plan.service) {
    say(`${head}: ${plan.reason}`);
    return false;
  }
  say(`${head}: ${plan.address || t("no address", "keine Adresse")}, ${t("service reachable", "Dienst erreichbar")}: ${plan.reachable ? t("yes", "ja") : t("no, the device says so itself", "nein, das Gerät sagt es selbst")}`);
  for (const item of plan.refused) say(`  ${t("Not synced", "Nicht abgeglichen")}: ${item.line}, ${item.why}`);
  const known = readFolderState().roots[ROOT]?.folders || {};
  const tops = topNames(plan);
  let fine = plan.reachable && !plan.refused.length;
  if (!plan.folders.length) say(`  ${t("No folder is shared with you.", "Dir ist kein Ordner freigegeben.")}`);
  const rank = (folder) => (folder.root ? 0 : folder.level);
  for (const folder of [...plan.folders].sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path))) {
    const last = known[folder.path];
    const local = join(ROOT, ...folder.path.split("/"));
    const seen = existsSync(local) ? inspectFolder(local, folder.root ? tops : new Set(), excludesFor(plan, folder, local)) : { conflicts: [], links: [] };
    const when = last
      ? `${last.result === "ok" ? t("synced", "abgeglichen") : t("last sync did not work out", "der letzte Abgleich ging nicht durch")} ${stamp(last.at)}`
      : t("never synced", "noch nie abgeglichen");
    say(`  ${labelOf(folder)}   ${t("level", "Ebene")} ${folder.level}${folder.right ? `, ${folder.right}` : ""}   ${when}, ${seen.conflicts.length} ${t("conflicts", "Konflikte")}${seen.links.length ? `, ${seen.links.length} ${t("symbolic links not synced", "Symlinks nicht abgeglichen")}` : ""}`);
    if (last && last.result !== "ok" && last.message) say(`      ${last.message}`);
    if (!last || last.result !== "ok" || seen.conflicts.length || seen.links.length) fine = false;
  }
  for (const path of Object.keys(known).sort()) {
    if (plan.folders.some((folder) => folder.path === path)) continue;
    say(`  ${path === "." ? known[path].id || path : path}   ${path === "." ? t("not shared with you any more, what lies here stays", "dir nicht mehr freigegeben, was hier liegt, bleibt liegen") : t("not shared with you any more, stays out of the root, the next sync moves it next to the root", "dir nicht mehr freigegeben, bleibt aus der Wurzel draußen, der nächste Abgleich verschiebt es neben die Wurzel")}`);
  }
  const view = join(ROOT, VIEW_FILE);
  say(`  ${VIEW_FILE}: ${existsSync(view) ? t(`there, written ${stamp(statSync(view).mtime.toISOString())}`, `da, geschrieben ${stamp(statSync(view).mtime.toISOString())}`) : t("not written yet, sync writes it", "noch nicht geschrieben, sync schreibt sie")}`);
  return fine;
}

// --- deploy: this root onto the device ------------------------------------------------------
// The root lives on the device afterwards: whoever is given the room of the root gets the rules,
// the skills, the agents, the list of places, the proposal, the check script and this file with
// the next sync, at the top of their own tree. What is per computer or made by a machine stays
// home, and what the check script finds stops the deploy: what goes onto the device goes to
// everybody.

/** The check script of this root, before anything leaves it. */
function checkRoot() {
  const script = join(ROOT, ".claude", "scripts", "check.mjs");
  if (!existsSync(script)) {
    stop(t("This root has no check script (.claude/scripts/check.mjs). Nothing was deployed.", "Diese Wurzel hat kein Prüfskript (.claude/scripts/check.mjs). Nichts wurde ausgerollt."));
  }
  const run = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8" });
  if (run.status !== 0) {
    if ((run.stdout || "").trim()) say(run.stdout.trimEnd());
    if ((run.stderr || "").trim()) warn(run.stderr.trimEnd());
    stop(t(
      "The check script has a finding. Nothing was deployed: what goes onto the device goes to everybody.",
      "Das Prüfskript hat einen Befund. Nichts wurde ausgerollt: was aufs Gerät geht, geht an alle."
    ));
  }
  say(t("Check script: no finding.", "Prüfskript: kein Befund."));
}

/** What the device says about a refusal, in one line and without a secret. */
function reasonOf(answer) {
  const body = jsonOf(answer);
  return oneLine(body?.error?.message || body?.message || answer.body.toString("utf8"), 200) || t(`status ${answer.status}`, `Status ${answer.status}`);
}

/**
 * The root of the device, made as an administrator.
 *
 * The credential opens no administration, so this is the one place where the bridge logs in with
 * the password: the session lives for these requests and is ended afterwards, and nothing of it is
 * stored. The device carries exactly one root, level 0 with the kind `wurzel` (as of 2026-09-22):
 * every active person reads it, administrators write, by role, and no right per person is given
 * on it. So a root is made only when the device carries none. When it carries one and does not
 * list it for this person, that is said and nothing is made: a second root next to the device's
 * own is what this file must never make, and once it did, on 2026-09-22, before it knew level 0.
 */
async function makeRootRoom(device, plan, password) {
  const login = await ask(device.entry, { method: "POST", path: DEVICE.login, json: { [DEVICE.userField]: plan.user, [DEVICE.passwordField]: password } });
  if (login.status === 429) stop(t(`${device.name} counts the logins and refuses further ones for now (429). Wait, then again.`, `${device.name} zählt die Anmeldungen und weist weitere vorerst ab (429). Warte, dann noch einmal.`));
  if (login.status === 401 || login.status === 403) stop(t(`${device.name} refuses the login of ${plan.user} (${login.status}): the password does not fit. Nothing was deployed.`, `${device.name} weist die Anmeldung von ${plan.user} ab (${login.status}): das Passwort passt nicht. Nichts wurde ausgerollt.`));
  if (login.status < 200 || login.status >= 300) stop(t(`${device.name} did not accept the login (status ${login.status}). Nothing was deployed.`, `${device.name} hat die Anmeldung nicht angenommen (Status ${login.status}). Nichts wurde ausgerollt.`));
  const body = jsonOf(login);
  const session = tokenIn(body);
  if (!session) stop(t(`${device.name} accepted the login, but its answer holds nothing this file can use.`, `${device.name} hat die Anmeldung angenommen, in der Antwort steht aber nichts, das diese Datei brauchen kann.`));
  try {
    const all = await ask(device.entry, { path: DEVICE.rooms, token: session });
    if (all.status === 401 || all.status === 403) {
      stop(t(
        `${device.name} lists no root for you, and ${plan.user} is no administrator: only an administrator makes the root of the device. Ask one to make it in the device's front end. Nothing was deployed.`,
        `${device.name} führt für dich keine Wurzel, und ${plan.user} ist kein Administrator: nur ein Administrator legt die Wurzel des Geräts an. Bitte einen, sie in der Oberfläche des Geräts anzulegen. Nichts wurde ausgerollt.`
      ));
    }
    if (all.status < 200 || all.status >= 300) stop(t(`${device.name} answers ${DEVICE.rooms} with status ${all.status}: ${reasonOf(all)}`, `${device.name} antwortet auf ${DEVICE.rooms} mit Status ${all.status}: ${reasonOf(all)}`));
    const rooms = inner(jsonOf(all));
    const found = (Array.isArray(rooms) ? rooms : []).find((room) => isRootRoom(room?.ebene, room?.art));
    if (found) {
      stop(t(
        `${device.name} carries the root '${found.kennung}' and does not list it for ${plan.user}. A second root is never made. Nothing was deployed.`,
        `${device.name} führt die Wurzel '${found.kennung}' und nennt sie für ${plan.user} nicht. Eine zweite Wurzel wird nie angelegt. Nichts wurde ausgerollt.`
      ));
    }
    const made = await ask(device.entry, { method: "POST", path: DEVICE.rooms, token: session, json: { kennung: SERVICE.rootId, name: oneLine(META?.name || SERVICE.rootId, 80), ebene: 0, art: SERVICE.rootKind } });
    if (made.status === 409) stop(t(`${device.name} carries a root already and made no second one: ${reasonOf(made)}. Nothing was deployed.`, `${device.name} führt schon eine Wurzel und hat keine zweite angelegt: ${reasonOf(made)}. Nichts wurde ausgerollt.`));
    if (made.status === 400) {
      stop(t(
        `${device.name} does not take a root of the kind ${SERVICE.rootKind} (400): ${reasonOf(made)}. A device from before 2026-09-22 knows no root of its own, and a shared folder in its place would stand next to the root a newer device carries. Nothing was deployed.`,
        `${device.name} nimmt keine Wurzel der Art ${SERVICE.rootKind} an (400): ${reasonOf(made)}. Ein Gerät von vor dem 22.09.2026 kennt keine eigene Wurzel, und ein geteilter Ordner an ihrer Stelle stünde neben der Wurzel, die ein neueres Gerät führt. Nichts wurde ausgerollt.`
      ));
    }
    if (made.status < 200 || made.status >= 300) stop(t(`${device.name} did not make the root ${SERVICE.rootId} (status ${made.status}): ${reasonOf(made)}`, `${device.name} hat die Wurzel ${SERVICE.rootId} nicht angelegt (Status ${made.status}): ${reasonOf(made)}`));
    say(t(`Root ${SERVICE.rootId}: made on ${device.name}, level 0. Everybody active reads it, administrators write.`, `Wurzel ${SERVICE.rootId}: auf ${device.name} angelegt, Ebene 0. Jeder Aktive liest sie, Administratoren schreiben.`));
  } finally {
    // The session was borrowed for these requests. It ends here, whatever happened above.
    try {
      await send(device.entry, { method: "POST", path: DEVICE.logout, token: session, timeout: 10_000 });
    } catch {
      // A session that cannot be ended ends by itself.
    }
  }
}

/** A pattern of the client's list as a test: a name matches a segment, a path matches from the top. */
function excludeTest(pattern) {
  const regex = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]");
  return pattern.includes("/")
    ? (path) => new RegExp(`^(?:${regex})(?:$|/)`).test(path)
    : (path) => path.split("/").some((segment) => new RegExp(`^(?:${regex})$`).test(segment));
}

/** The files below a folder that the list lets through, relative and with `/`. */
function filesThrough(dir, excludes) {
  const tests = excludes.map(excludeTest);
  const out = [];
  const walk = (at, deep) => {
    if (deep > 40) return;
    let entries;
    try {
      entries = readdirSync(at, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(at, entry.name);
      const rel = slashed(relative(dir, path));
      if (entry.isSymbolicLink() || tests.some((test) => test(rel))) continue;
      if (entry.isDirectory()) walk(path, deep + 1);
      else out.push(rel);
    }
  };
  walk(dir, 0);
  return out.sort();
}

async function doDeploy(args) {
  checkRoot();
  const device = chooseDevice(args);
  let plan = await askFolders(device);
  if (!plan.service) stop(plan.reason);
  say(`${t("Company folder", "Firmenordner")}: ${plan.address || t("the device names no address", "das Gerät nennt keine Adresse")}`);
  if (!plan.address) stop(t("The device names no address of the file service. Nothing was deployed.", "Das Gerät nennt keine Adresse des Dateidienstes. Nichts wurde ausgerollt."));
  if (!plan.user) stop(t("The device names no user for the file service. Nothing was deployed.", "Das Gerät nennt keinen Benutzer für den Dateidienst. Nichts wurde ausgerollt."));
  const client = await ensureClient(args);
  const password = await askPassword(args, plan, device);

  // The root the device names, and only when it names none is one made. Its id is the device's.
  let room = plan.folders.find((folder) => folder.root);
  if (!room) {
    await makeRootRoom(device, plan, password);
    plan = await askFolders(device);
    room = plan.folders.find((folder) => folder.root);
    if (!room) stop(t(`${device.name} made the root and does not list it for ${plan.user}. Nothing was deployed.`, `${device.name} hat die Wurzel angelegt und führt sie für ${plan.user} nicht auf. Nichts wurde ausgerollt.`));
  } else {
    say(t(`Root ${room.id}: the device carries it, ${plan.user} has ${room.right}.`, `Wurzel ${room.id}: das Gerät führt sie, ${plan.user} hat ${room.right}.`));
  }
  if (room.right !== "schreiben") {
    stop(t(`${plan.user} has '${room.right}' on the root ${room.id}, and deploying needs 'schreiben': on the root that is the administrators' right, by role. Ask one. Nothing was deployed.`, `${plan.user} hat auf der Wurzel ${room.id} '${room.right}', und Ausrollen braucht 'schreiben': auf der Wurzel ist das das Recht der Administratoren, nach Rolle. Bitte einen. Nichts wurde ausgerollt.`));
  }

  setAside(plan);
  const excludes = excludesFor(plan, room, ROOT);
  await pickAddress(plan, device);
  const service = await spacesOf(plan, device, password);
  {
    const rules = await rootRules(service, room, ROOT, excludes, null, true);
    if (rules.stop.length && !args.flags["keep-mine"]) stop(`${ruleStop(rules.stop)} ${t("Nothing was deployed.", "Nichts wurde ausgerollt.")}`);
    if (rules.bridge) await settleBridge(service, ROOT, rules.bridge);
    if (args.flags["keep-mine"] && rules.foreign.length) sayMoved(await moveForeign(service, room, rules.foreign, rules.there.files));
  }
  const expected = filesThrough(ROOT, excludes);
  const lists = excludeFiles();
  const list = lists.write(excludes);
  let probe = null;
  let arrived = [];
  let up;
  let trash = { gone: [], where: null };
  try {
    const guard = guardDeletions(ROOT, excludes);
    up = runClient({ client, plan, folder: room, local: ROOT, excludes: list, password });
    trash = guard.settle();
    if (up.status !== 0) stop(t(`The client did not sync the root: ${clientFailed(up)}`, `Der Klient hat die Wurzel nicht abgeglichen: ${clientFailed(up)}`));
    const dav = davOf(service, room);
    writeBase(ROOT, localTree(ROOT, excludes, { weighHome: false }).files, dav ? (await remoteTree(service, dav, excludes)).files : null);
    // Seen, not believed: the room comes down into a throwaway folder, and what lies there counts.
    probe = mkdtempSync(join(tmpdir(), "ara-wurzel-probe-"));
    const down = runClient({ client, plan, folder: room, local: probe, excludes: list, password });
    if (down.status !== 0) stop(t(`Deployed, but the proof did not come about, the client says: ${clientSaid(down)}`, `Ausgerollt, aber der Beweis kam nicht zustande, der Klient sagt: ${clientSaid(down)}`));
    arrived = filesThrough(probe, excludes);
  } finally {
    lists.remove();
    if (probe) rmSync(probe, { recursive: true, force: true });
  }
  const missing = expected.filter((file) => !arrived.includes(file));
  const seen = inspectFolder(ROOT, topNames(plan), excludes);
  recordSync(device, plan, [{ ...room, ok: !missing.length, message: missing.length ? t(`${missing.length} files did not arrive`, `${missing.length} Dateien kamen nicht an`) : null, conflicts: seen.conflicts, links: seen.links, at: new Date().toISOString() }]);

  say(t(`Deployed: ${expected.length} files of this root into the root ${room.id} on ${plan.address}.`, `Ausgerollt: ${expected.length} Dateien dieser Wurzel in die Wurzel ${room.id} auf ${plan.address}.`));
  say(missing.length
    ? t(`  Checked against the room: ${missing.length} did not arrive: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", ..." : ""}`, `  Gegen den Raum geprüft: ${missing.length} kamen nicht an: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", ..." : ""}`)
    : t(`  Checked against the room: all ${expected.length} lie there, ${arrived.length} files in the room.`, `  Gegen den Raum geprüft: alle ${expected.length} liegen dort, ${arrived.length} Dateien im Raum.`));
  say(`  ${t("Kept home", "Bleibt zu Hause")}: ${excludes.join(", ")}`);
  if (trash.gone.length) say(`  ${t(`${fileCount(trash.gone.length)} deleted on the device and so here, kept in the trash: ${trash.where}`, `${fileCount(trash.gone.length)} am Gerät gelöscht und darum hier, aufbewahrt im Papierkorb: ${trash.where}`)}`);
  if (seen.conflicts.length) say(`  ${seen.conflicts.length} ${t("conflicts in this root, the client kept both versions", "Konflikte in dieser Wurzel, der Klient hat beide Fassungen behalten")}: ${seen.conflicts.slice(0, 5).join(", ")}`);
  if (seen.links.length) say(`  ${seen.links.length} ${t("symbolic links in this root, the client does not sync them", "Symlinks in dieser Wurzel, die gleicht der Klient nicht ab")}: ${seen.links.slice(0, 5).join(", ")}`);
  say(t(
    `  Everybody active on the device gets this root with the next sync, at the top of their own tree: they read it, administrators write.`,
    `  Jeder Aktive am Gerät bekommt diese Wurzel mit dem nächsten Abgleich, oben in seinem eigenen Baum: er liest sie, Administratoren schreiben.`
  ));
  return !missing.length && !seen.conflicts.length && !seen.links.length;
}

// --- login, status, sync -------------------------------------------------------------------

/**
 * Turn a session into a credential, and keep only the credential.
 *
 * The login with a password gives back a session: it has an end, and it carries everything the
 * human may do, an administrator's session included. A credential says "I am this person" and
 * opens exactly the ways this file walks. So the session is used for one request, the one that
 * issues the credential, and is then dropped: it is never written to the file.
 *
 * The device shows the value of a credential exactly once, in the answer to this request. Whoever
 * loses it issues a new one, nobody reads it back.
 */
async function issueCredential(target, session, machine) {
  const label = oneLine(String(machine || "").trim(), 60) || "arasul.mjs";
  const answer = await ask(target, { method: "POST", path: DEVICE.credentials, token: session, json: { name: label } });
  if (answer.status === 404) {
    stop(t(
      `${target.address} does not know ${DEVICE.credentials} and can issue no credential. This file assumes that route as of 2026-09-22. Nothing was stored, and the session was not kept.`,
      `${target.address} kennt ${DEVICE.credentials} nicht und kann keinen Ausweis ausstellen. Diese Datei nimmt den Weg Stand 22.09.2026 an. Nichts wurde abgelegt, und die Sitzung wurde nicht behalten.`
    ));
  }
  if (answer.status === 409) {
    stop(t(
      `${target.address} already carries a credential named '${label}'. Revoke it in the device's front end, or give this one another name: --credential-name <name>. Nothing was stored.`,
      `${target.address} trägt schon einen Ausweis mit dem Namen '${label}'. Widerrufe ihn in der Oberfläche des Geräts, oder gib diesem einen anderen Namen: --credential-name <name>. Nichts wurde abgelegt.`
    ));
  }
  if (answer.status < 200 || answer.status >= 300) {
    stop(t(
      `${target.address} issued no credential (status ${answer.status}). Nothing was stored, and the session was not kept.`,
      `${target.address} hat keinen Ausweis ausgestellt (Status ${answer.status}). Nichts wurde abgelegt, und die Sitzung wurde nicht behalten.`
    ));
  }
  const issued = oneLine(String(inner(jsonOf(answer))?.ausweis || ""), 4096).trim();
  if (!issued) {
    stop(t(
      `${target.address} answered ${DEVICE.credentials}, but its answer holds no credential. Nothing was stored.`,
      `${target.address} hat auf ${DEVICE.credentials} geantwortet, in der Antwort steht aber kein Ausweis. Nichts wurde abgelegt.`
    ));
  }
  // The device has to know what it just issued. Without this question the file would store a
  // value nobody has ever seen work.
  const proof = await ask(target, { path: DEVICE.session, token: issued });
  const body = inner(jsonOf(proof));
  if (proof.status !== 200 || !(body?.authenticated ?? jsonOf(proof)?.authenticated)) {
    stop(t(
      `${target.address} issued a credential and does not accept it (status ${proof.status}). Nothing was stored.`,
      `${target.address} hat einen Ausweis ausgestellt und nimmt ihn nicht an (Status ${proof.status}). Nichts wurde abgelegt.`
    ));
  }
  // The number the device gave it: the only name under which the credential can later revoke itself.
  const number = Number(inner(jsonOf(answer))?.id);
  return { value: issued, id: Number.isSafeInteger(number) && number > 0 ? number : null };
}

async function doLogin(args) {
  const given = args._[1];
  if (given) {
    const address = baseOf(given);
    const name = one(args, "name") || new URL(address).hostname;
    let target = { address };

    let token;
    let kind;
    let credentialId = null;
    let user = one(args, "user") || null;
    if (args.flags["token-stdin"] && args.flags["password-stdin"]) stop(t("Either --token-stdin or --password-stdin, not both.", "Entweder --token-stdin oder --password-stdin, nicht beides."), 2);
    let secret = null;
    if (args.flags["token-stdin"] || args.flags["password-stdin"]) secret = (await readAllStdin()).split(/\r?\n/)[0].trim();

    // The first request decides about the certificate. A device with its own is pinned once, on
    // the human's word, and never switched off.
    const first = async (options) => {
      try {
        return await send(target, options);
      } catch (error) {
        if (!TLS_CODES.has(error.code)) stop(explain(error, address));
        if (!args.flags.insecure) stop(explain(error, address));
        let pinned;
        try {
          pinned = await fetchCertificate(address);
        } catch (inner2) {
          stop(explain(inner2, address));
        }
        target = { address, ca: pinned.pem };
        say(t(`Certificate pinned for ${name}: SHA-256 ${pinned.fingerprint}${pinned.subject ? `, ${pinned.subject}` : ""}. Compare it with the device if you are in doubt.`, `Zertifikat für ${name} festgehalten: SHA-256 ${pinned.fingerprint}${pinned.subject ? `, ${pinned.subject}` : ""}. Vergleiche es mit dem Gerät, wenn du im Zweifel bist.`));
        try {
          return await send(target, options);
        } catch (again) {
          stop(explain(again, address));
        }
      }
    };

    if (args.flags["token-stdin"]) {
      if (!secret) stop(t("--token-stdin reads the credential from the first line of the input, and there is none.", "--token-stdin liest den Ausweis aus der ersten Zeile der Eingabe, und da ist keiner."), 2);
      kind = "pasted";
      token = secret;
      const answer = await first({ path: DEVICE.session, token });
      const body = inner(jsonOf(answer));
      if (answer.status !== 200 || !(body?.authenticated ?? jsonOf(answer)?.authenticated)) {
        stop(t(`${address} does not accept this credential (status ${answer.status}). Nothing was stored.`, `${address} nimmt diesen Ausweis nicht an (Status ${answer.status}). Nichts wurde abgelegt.`));
      }
      user = oneLine((body?.user || jsonOf(answer)?.user)?.username || user || "", 80) || null;
    } else {
      if (!user) user = (await visibleLine(t("E-mail (or user name): ", "E-Mail (oder Benutzername): "))) || "";
      user = user.trim();
      if (!user) stop(t("An e-mail address or user name is needed: --user <e-mail>.", "Eine E-Mail-Adresse oder ein Benutzername wird gebraucht: --user <e-mail>."), 2);
      let password = secret ?? (await secretLine(t(`Password for ${user} on ${address}: `, `Passwort für ${user} auf ${address}: `)));
      if (!password) stop(`${t("The password comes from the terminal, or from the first line of the input with --password-stdin. It is never taken from an argument.", "Das Passwort kommt vom Terminal, oder mit --password-stdin aus der ersten Zeile der Eingabe. Aus einem Argument wird es nie genommen.")}${IS_WIN ? ` ${t("On Windows run this in PowerShell or in Windows Terminal itself: Git Bash and the terminal of an editor often pass no keyboard on to node.", "Unter Windows führe das in PowerShell oder im Windows-Terminal selbst aus: Git Bash und das Terminal eines Editors reichen die Tastatur oft nicht an node weiter.")}` : ""}`, 2);
      kind = "issued";
      const answer = await first({ method: "POST", path: DEVICE.login, json: { [DEVICE.userField]: user, [DEVICE.passwordField]: password } });
      password = "";
      secret = null;
      if (answer.status === 429) stop(t(`${address} counts the logins and refuses further ones for now (429). Wait, then again.`, `${address} zählt die Anmeldungen und weist weitere vorerst ab (429). Warte, dann noch einmal.`));
      if (answer.status === 401 || answer.status === 403) stop(t(`${address} refuses the login (${answer.status}): name or password do not fit.`, `${address} weist die Anmeldung ab (${answer.status}): Name oder Passwort passen nicht.`));
      if (answer.status === 404) stop(t(`${address} does not know ${DEVICE.login}. This file assumes that route as of 2026-09-22, the device says otherwise.`, `${address} kennt ${DEVICE.login} nicht. Diese Datei nimmt den Weg Stand 22.09.2026 an, das Gerät sagt etwas anderes.`));
      if (answer.status < 200 || answer.status >= 300) stop(t(`${address} did not accept the login (status ${answer.status}).`, `${address} hat die Anmeldung nicht angenommen (Status ${answer.status}).`));
      const session = tokenIn(jsonOf(answer));
      if (!session) stop(t(`${address} accepted the login, but its answer holds nothing this file can use. Nothing was stored.`, `${address} hat die Anmeldung angenommen, in der Antwort steht aber nichts, das diese Datei brauchen kann. Nichts wurde abgelegt.`));
      const issued = await issueCredential(target, session, one(args, "credential-name") || hostname() || name);
      token = issued.value;
      credentialId = issued.id;
    }

    const data = readCredentials();
    data.devices[name] = { address, kind, ...(user ? { user } : {}), token, ...(credentialId ? { credentialId } : {}), since: localDay(), ...(target.ca ? { ca: target.ca } : {}) };
    // A second account on this computer must not change silently which device every call without
    // --device means: the default moves only when there is none, when this is the default itself
    // logging in again, or when the human asks for it with --default.
    const kept = data.default && data.default !== name && data.devices[data.default] ? data.default : null;
    if (!kept || args.flags.default) data.default = name;
    writeCredentials(data);
    const expires = expiryOf(token);
    say(t(`Logged in to ${address} as ${name}${user ? ` (${user})` : ""}. The credential lies in ${CREDENTIALS}, ${privateHint()}.`, `Angemeldet an ${address} als ${name}${user ? ` (${user})` : ""}. Der Ausweis liegt in ${CREDENTIALS}, ${privateHint()}.`));
    if (kept && !args.flags.default) {
      say(t(
        `${kept} stays the default device. Calls without --device mean ${kept}; ${name} is addressed with --device ${name}, or becomes the default with: node arasul.mjs login ${address} --default`,
        `${kept} bleibt das Standardgerät. Aufrufe ohne --device meinen ${kept}; ${name} sprichst du mit --device ${name} an, oder es wird Standard mit: node arasul.mjs login ${address} --default`
      ));
    }
    if (kind === "issued") {
      say(t(
        "The device issued it for this computer and showed its value once. The session of the login was not kept: a credential has no end and opens no administration.",
        "Das Gerät hat ihn für diesen Rechner ausgestellt und seinen Wert einmal gezeigt. Die Sitzung der Anmeldung wurde nicht behalten: ein Ausweis läuft nicht ab und öffnet keine Verwaltung."
      ));
    } else if (expires) {
      say(t(`What you pasted in is a session, and it holds until ${stamp(expires)}. A credential out of the device's front end has no end.`, `Was du eingefügt hast, ist eine Sitzung, und sie hält bis ${stamp(expires)}. Ein Ausweis aus der Oberfläche des Geräts läuft nicht ab.`));
    }
    say();
  } else if (!Object.keys(readCredentials().devices).length && !args.flags.withdraw && !args.flags.approve) {
    say(t("No device is logged in yet: node arasul.mjs login <address> --user <name>. The proposals and places follow.", "Noch ist kein Gerät angemeldet: node arasul.mjs login <adresse> --user <name>. Vorschläge und Orte folgen."));
    say();
  }
  const clean = await doProposals(args);
  if (!args.flags.withdraw) doPlaces();
  // sync needs the vendor's client: offered here, once, instead of found missing at the first sync.
  if (!args.flags.withdraw && !args.flags.approve && Object.keys(readCredentials().devices).length) {
    say();
    const client = await ensureClient(args, { need: false });
    if (client) say(`${t("Client of the file service", "Klient des Dateidienstes")}: ${client}`);
  }
  return clean;
}

/**
 * A device whose certificate no longer fits the one held is shown as two things, and status names
 * them apart: the certificate (the device carries a new one, since when, which fingerprint) and the
 * credential. The credential is never sent to find out: a bearer token goes only to a device whose
 * certificate is vouched for, and nobody has vouched for the new one. So the credential line says
 * "not checked, log in again first", except where the credential's own end date already answers it.
 * Returns the lines, or null when the certificate is the same one (it expired, then the plain
 * explanation holds).
 */
async function changedCertificate(name, entry) {
  let held;
  try {
    held = new X509Certificate(entry.ca);
  } catch {
    return null;
  }
  let now;
  try {
    now = await fetchCertificate(entry.address);
  } catch {
    return null;
  }
  if (now.fingerprint === held.fingerprint256) return null;
  const when = (text) => (Number.isNaN(new Date(text).getTime()) ? String(text) : stamp(new Date(text).toISOString()));
  const login = `node arasul.mjs login ${entry.address} ${entry.user ? `--user ${entry.user} ` : ""}--name ${name} --insecure`;
  const lines = [
    `  ${t("Certificate", "Zertifikat")}: ${t(
      `the device carries a new certificate authority since ${when(now.from)}, SHA-256 ${now.fingerprint}. Held here: the one of ${when(held.validFrom)}, SHA-256 ${held.fingerprint256}.`,
      `das Gerät trägt seit ${when(now.from)} eine neue CA, SHA-256 ${now.fingerprint}. Hier festgehalten: die vom ${when(held.validFrom)}, SHA-256 ${held.fingerprint256}.`
    )}`,
  ];
  const expires = expiryOf(entry.token);
  if (expires && expires < Date.now()) {
    lines.push(`  ${t("Credential", "Ausweis")}: ${t(`ended on ${stamp(expires)}`, `am ${stamp(expires)} zu Ende gegangen`)}.`);
  } else {
    lines.push(`  ${t("Credential", "Ausweis")}: ${t("not checked, log in again first", "nicht geprüft, erst neu anmelden")}.`);
  }
  lines.push(`  ${t("One command for both, compare the fingerprint with the device first", "Ein Befehl für beides, vergleiche vorher den Fingerabdruck mit dem Gerät")}: ${login}`);
  return lines;
}

async function doStatus(args) {
  const data = readCredentials();
  const names = Object.keys(data.devices);
  const summary = syncLine();
  const stale = new Set();
  say(summary.line);
  if (summary.problem) say(`  ${t("Last run in the background", "Letzter Lauf im Hintergrund")}: ${summary.problem.text}`);
  if (summary.aside) say(`  ${summary.aside}`);
  let fine = summary.fine;
  if (!names.length) {
    say(t("Device: none logged in.", "Gerät: keines angemeldet."));
    fine = false;
  }
  for (const name of names) {
    const entry = data.devices[name];
    const expires = expiryOf(entry.token);
    say(`${t("Device", "Gerät")}: ${name}${data.default === name ? ` (${t("default device", "Standardgerät")})` : ""}, ${entry.address}`);
    say(`  ${t("Credential", "Ausweis")}: ${entry.kind === "pasted" ? t("pasted in", "eingefügt") : t("issued by the device", "vom Gerät ausgestellt")}${entry.user ? `, ${entry.user}` : ""}, ${t("since", "seit")} ${entry.since}${expires ? `, ${expires < Date.now() ? t("ended", "zu Ende") : t("holds until", "hält bis")} ${stamp(expires)}` : ""}`);
    try {
      const answer = await send(entry, { path: DEVICE.session, token: entry.token, timeout: 10_000 });
      const body = inner(jsonOf(answer));
      const on = answer.status === 200 && (body?.authenticated ?? jsonOf(answer)?.authenticated);
      say(`  ${t("Device answers", "Gerät antwortet")}: ${t("yes", "ja")}, ${on ? t("the credential is accepted", "der Ausweis wird angenommen") : t("the credential is not accepted, log in again", "der Ausweis wird nicht angenommen, melde dich neu an")}`);
      if (!on) fine = false;
    } catch (error) {
      fine = false;
      const changed = TLS_CODES.has(error.code) && entry.ca ? await changedCertificate(name, entry) : null;
      if (changed) {
        for (const line of changed) say(line);
        stale.add(name);
      } else say(`  ${t("Device answers", "Gerät antwortet")}: ${t("no", "nein")}, ${explain(error, entry.address)}`);
    }
  }
  if (names.length) {
    const device = chooseDevice(args);
    if (stale.has(device.name)) say(`${t("Company folder", "Firmenordner")}: ${t("not asked, the certificate of the device comes first", "nicht gefragt, zuerst muss das Zertifikat des Geräts stimmen")}`);
    else if (!(await folderStatus(args, device))) fine = false;
  }
  const settingsPath = settingsFile(args);
  const items = proposalFolders().map(loadProposal);
  const counts = { current: 0, none: 0, changed: 0, broken: 0, invalid: 0 };
  for (const item of items) counts[item.problems.length ? "invalid" : stateOf(item, settingsPath).state] += 1;
  say(`${t("Proposals", "Vorschläge")}: ${items.length}, ${t("approved", "freigegeben")} ${counts.current}, ${t("not approved", "nicht freigegeben")} ${counts.none}${counts.changed ? `, ${t("changed since approval", "seit der Freigabe geändert")} ${counts.changed}` : ""}${counts.broken ? `, ${t("broken", "beschädigt")} ${counts.broken}` : ""}${counts.invalid ? `, ${t("cannot be approved", "nicht freigebbar")} ${counts.invalid}` : ""}`);
  return fine;
}

/**
 * Bring this tree up to date against the device: the shared folders, and what the assigned apps
 * say about themselves.
 *
 * The apps go first, because they cost one request and no password. Whoever has no folder shared
 * with them is never asked for one.
 */
async function doSync(args) {
  const modes = ["plan", "install", "uninstall", "background", "reach"].filter((mode) => args.flags[mode]);
  if (modes.length > 1) stop(t(`${modes.map((mode) => `--${mode}`).join(" and ")} do not go together.`, `${modes.map((mode) => `--${mode}`).join(" und ")} gehen nicht zusammen.`), 2);
  if (args.flags.every && !args.flags.install) stop(t("--every belongs to --install.", "--every gehört zu --install."), 2);
  if (args.flags.plan) return doPlan(args);
  if (args.flags.reach) return doReach(args);
  if (args.flags.install) return doInstall(args);
  if (args.flags.uninstall) return await doUninstall();
  const release = takeLock();
  if (!release) {
    say(t("A sync of this root is running already, in the background or at another terminal. Nothing was started.", "Ein Abgleich dieser Wurzel läuft schon, im Hintergrund oder an einem anderen Terminal. Nichts wurde gestartet."));
    return Boolean(args.flags.background);
  }
  try {
    return args.flags.background ? await doBackground(args) : await runSync(args);
  } finally {
    release();
  }
}

/** One sync: the apps first, then the folders. */
async function runSync(args) {
  const device = chooseDevice(args);
  const infos = await doApps(args, { write: true, quiet: true });
  const written = infos.filter((info) => info.state === "ok");
  say(t(`APP.md written for ${written.length} of ${infos.length} assigned apps${written.length ? `: ${written.map((info) => `apps/${info.id}/APP.md`).join(", ")}` : ""}.`, `APP.md geschrieben für ${written.length} von ${infos.length} zugewiesenen Apps${written.length ? `: ${written.map((info) => `apps/${info.id}/APP.md`).join(", ")}` : ""}.`));
  for (const info of infos.filter((entry) => entry.state !== "ok")) say(`  ${info.id}: ${info.state === "test-only" ? t("only the test stand is shared", "nur der Teststand ist freigegeben") : info.state === "none" ? t("does not describe itself", "beschreibt sich nicht") : info.message}`);
  say();
  return syncFolders(args, device, infos);
}

function usage() {
  say(t(
    [
      `node arasul.mjs <command>   (bridge ${BRIDGE})`,
      "",
      "  login [<address>] [--user <name>] [--token-stdin | --password-stdin] [--insecure] [--name <label>]",
      "        log in, then show the proposals for hooks and rules and the places on this computer",
      "        [--credential-name <name>]     the name the device files the credential under",
      "        [--default]                    make this device the default; else the first one stays it, and a second login says so",
      "  login --approve <checksum>     approve one proposal, once per proposal",
      "  login --withdraw               take back what approving entered",
      "  status                         one line on the sync, then device, credential, company folder, proposals",
      "  sync [--client <path>]         sync the company folder, write apps/<id>/APP.md and sicht.md",
      "  sync --plan                    what a sync would move up and down, with count and size, writing nothing",
      "  sync --keep-mine               the device's version of what differs, at the first sync of what only it has, into .claude/device-old/ there",
      "  --fetch-client                 with login, sync or sync --install: fetch the file service's client when it is missing",
      "  sync --install [--every <min>] sync in the background (Mac: launchd, keychain; Windows: task scheduler, private file), every 5 minutes",
      "  sync --uninstall               take the agent back and revoke the token",
      "  deploy [--client <path>]       put this root into the room of the root on the device, the check script first",
      "  apps [--json]                  the assigned apps with their routes, writes APP.md",
      "  call <app> <route> [name=value ...] [--write] [--method <verb>]",
      "",
      "  --device <name>  another device than the default   --settings <file>  another settings file",
      "  --language de|en  the language of the output, before the root's .claude/root.json has one",
    ].join("\n"),
    [
      `node arasul.mjs <befehl>   (Brücke ${BRIDGE})`,
      "",
      "  login [<adresse>] [--user <name>] [--token-stdin | --password-stdin] [--insecure] [--name <bezeichnung>]",
      "        anmelden, danach die Vorschläge für Hooks und Regeln und die Orte auf diesem Rechner zeigen",
      "        [--credential-name <name>]     unter welchem Namen das Gerät den Ausweis führt",
      "        [--default]                    dieses Gerät zum Standard machen; sonst bleibt das erste es, und ein zweites login sagt das",
      "  login --approve <prüfsumme>    einen Vorschlag freigeben, einmal je Vorschlag",
      "  login --withdraw               zurücknehmen, was das Freigeben eintrug",
      "  status                         eine Zeile zum Abgleich, dann Gerät, Ausweis, Firmenordner, Vorschläge",
      "  sync [--client <pfad>]         den Firmenordner abgleichen, apps/<id>/APP.md und sicht.md schreiben",
      "  sync --plan                    was ein Abgleich hoch und runter bewegte, mit Anzahl und Größe, ohne zu schreiben",
      "  sync --keep-mine               die Fassung des Geräts von allem, was verschieden ist, beim ersten Abgleich auch was nur es hat, dort nach .claude/geraet-alt/",
      "  --fetch-client                 mit login, sync oder sync --install: den Klienten des Dateidienstes holen, wenn er fehlt",
      "  sync --install [--every <min>] Abgleich im Hintergrund (Mac: launchd, Schlüsselbund; Windows: Aufgabenplanung, private Datei), alle 5 Minuten",
      "  sync --uninstall               Agent zurücknehmen und Token widerrufen",
      "  deploy [--client <pfad>]       diese Wurzel in den Raum der Wurzel am Gerät legen, zuerst das Prüfskript",
      "  apps [--json]                  die zugewiesenen Apps mit ihren Routen, schreibt APP.md",
      "  call <app> <route> [name=wert ...] [--write] [--method <verb>]",
      "",
      "  --device <name>  ein anderes Gerät als das Standard   --settings <datei>  eine andere Einstellungsdatei",
      "  --language de|en  die Sprache der Ausgabe, solange .claude/root.json der Wurzel keine nennt",
    ].join("\n")
  ));
}

/**
 * The language, when the root does not say it yet.
 *
 * In run 3 on 26.09.2026 an employee put this file alone into an empty folder, and `login` spoke
 * English on a computer with LANG=en_US although the house speaks German; the first `sync` brought
 * root.json and German with it. The order now: --language, ARASUL_LANGUAGE, root.json, the
 * language this computer remembered from the last root it synced, and only then LANG.
 */
let languageGiven = "";
function chooseLanguage(args) {
  const given = one(args, "language") || process.env.ARASUL_LANGUAGE || "";
  if (given && !["de", "en"].includes(given)) stop(t(`--language takes de or en, not '${given}'.`, `--language nimmt de oder en, nicht '${given}'.`), 2);
  languageGiven = given;
  if (given) return speak(given);
  if (META?.language) return;
  const remembered = readJson(CREDENTIALS, null)?.language;
  if (["de", "en"].includes(remembered)) speak(remembered);
}

/**
 * This computer remembers a language for the next empty folder: the root's, once it is here, and
 * before that the one given by hand. Measured on 2026-09-28 with a configuration of its own:
 * `login --language de` spoke German and the first `sync --plan` after it English again.
 */
function rememberLanguage(language = readJson(join(ROOT, ".claude", "root.json"), null)?.language || languageGiven) {
  if (!["de", "en"].includes(language) || !existsSync(CREDENTIALS)) return;
  const data = readJson(CREDENTIALS, null);
  if (!data || typeof data.devices !== "object" || data.language === language) return;
  writeCredentials({ ...data, language });
}

/**
 * The language of the house before its root.json lies here: out of the root.json in the room of
 * the root, when this person may read it. What was given by hand holds over it.
 */
async function learnLanguage(service, plan) {
  if (META?.language || languageGiven) return;
  const root = plan.folders.find((folder) => folder.root);
  const dav = root ? davOf(service, root) : null;
  if (!dav) return;
  const answer = await ask(service.target, { path: `${dav}/.claude/root.json`, basic: service.basic, timeout: 30_000 });
  if (answer.status !== 200) return;
  let language = null;
  try {
    language = JSON.parse(String(answer.body)).language;
  } catch {
    return;
  }
  if (!["de", "en"].includes(language)) return;
  speak(language);
  rememberLanguage(language);
}

/** The task scheduler's launcher has no console, so the output goes to the log by itself. */
function logToFile(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const write = (stream) => {
    stream.write = (chunk, encoding, done) => {
      try {
        appendFileSync(path, typeof chunk === "string" ? chunk : Buffer.from(chunk));
      } catch {
        // A log that cannot be written must not stop the sync.
      }
      if (typeof encoding === "function") encoding();
      else if (typeof done === "function") done();
      return true;
    };
  };
  write(process.stdout);
  write(process.stderr);
}

async function main() {
  if (process.env.ARASUL_LOG_TO) logToFile(process.env.ARASUL_LOG_TO);
  const args = parseArgs(process.argv.slice(2));
  chooseLanguage(args);
  const command = args._[0];
  if (!command || args.flags.help || command === "help") {
    usage();
    return command || args.flags.help ? 0 : 2;
  }
  if (!existsSync(join(ROOT, ".claude", "root.json"))) {
    // A root can come down from the device: whoever is given its room puts this one file into an
    // empty folder, logs in and syncs, and the root lies there afterwards. So login, status and sync
    // run in a folder that holds nothing but this file and what this file makes. Everything else
    // wants a root, and a folder with other things in it is not one that is still to become one.
    const own = (name) => name === basename(fileURLToPath(import.meta.url)) || name === "apps" || name === VIEW_FILE || /^\.?_?sync_.*\.db/.test(name) || name === ".DS_Store";
    const bare = ["login", "status", "sync"].includes(command) && readdirSync(ROOT).every(own);
    if (!bare) {
      stop(t(
        `${ROOT} is not a root: .claude/root.json is missing. This file belongs in the root folder of a house. An empty folder with this file alone becomes one with login and sync, when the device shares the room of the root.`,
        `${ROOT} ist keine Wurzel: .claude/root.json fehlt. Diese Datei gehört in den Wurzelordner eines Hauses. Ein leerer Ordner mit dieser Datei allein wird mit login und sync eine, wenn das Gerät den Raum der Wurzel freigibt.`
      ));
    }
  }
  const extra = args._.length - 1;
  if (command !== "call" && command !== "login" && extra > 0) stop(t(`${command} takes no argument: ${args._.slice(1).join(" ")}`, `${command} nimmt kein Argument: ${args._.slice(1).join(" ")}`), 2);
  switch (command) {
    case "login": {
      const ok = await doLogin(args);
      rememberLanguage();
      return ok ? 0 : 1;
    }
    case "status":
      return (await doStatus(args)) ? 0 : 1;
    case "sync": {
      const ok = await doSync(args);
      rememberLanguage();
      return ok ? 0 : 1;
    }
    case "deploy":
      return (await doDeploy(args)) ? 0 : 1;
    case "apps":
      await doApps(args);
      return 0;
    case "call":
      return (await doCall(args)) ? 0 : 1;
    default:
      stop(t(`Unknown command '${command}'. Known: login, status, sync, deploy, apps, call.`, `Unbekannter Befehl '${command}'. Bekannt: login, status, sync, deploy, apps, call.`), 2);
  }
  return 0;
}

// Imported by the kit's check for the shape of the field, it runs nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof Stop) {
        warn(error.message);
        process.exit(error.code);
      }
      warn(t(`Unexpected: ${error.message}`, `Unerwartet: ${error.message}`));
      process.exit(1);
    }
  );
}
