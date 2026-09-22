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
 *   node arasul.mjs status                             device, credential, company folder, proposals
 *   node arasul.mjs sync                               sync the company folder, write apps/<id>/APP.md
 *   node arasul.mjs apps                               the assigned apps with their routes, writes APP.md
 *   node arasul.mjs call <app> <route> [name=value ...] [--write] [--method <verb>]
 *
 * The credential lies in ~/.config/arasul/credentials.json (0600), one entry per device with its
 * address and credential. Never in this folder, never in the keychain. The login takes a name and
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
 * asks for it and stores it nowhere. What a machine makes, what belongs to this computer and what
 * the client writes itself stays out. `sync` also writes sicht.md, the view of this person: from
 * the device as soon as it delivers one, until then out of what the device says about folders and
 * apps. The state of the last sync lies next to the credential, in firmenordner.json.
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
 *   node arasul.mjs status                             Gerät, Ausweis, Firmenordner, Vorschläge
 *   node arasul.mjs sync                               den Firmenordner abgleichen, apps/<id>/APP.md schreiben
 *   node arasul.mjs apps                               die zugewiesenen Apps mit ihren Routen, schreibt APP.md
 *   node arasul.mjs call <app> <route> [name=wert ...] [--write] [--method <verb>]
 *
 * Der Ausweis liegt in ~/.config/arasul/credentials.json (0600), je Gerät ein Eintrag mit Adresse
 * und Ausweis. Nie in diesem Ordner, nie im Schlüsselbund. Die Anmeldung nimmt Name und Passwort,
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
 * also fragt `sync` danach und legt es nirgends ab. Was eine Maschine macht, was zu diesem Rechner
 * gehört und was der Klient selbst schreibt, bleibt draußen. `sync` schreibt außerdem sicht.md,
 * die Sicht dieses Menschen: vom Gerät, sobald es eine liefert, bis dahin aus dem, was das Gerät
 * über Ordner und Apps sagt. Der Stand des letzten Abgleichs liegt neben dem Ausweis, in
 * firmenordner.json.
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
 * selbst, `--device <name>` ein anderes Gerät als das zuletzt angemeldete.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { homedir, hostname, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { connect as tlsConnect } from "node:tls";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// The root is where this file lies: `node arasul.mjs` works from every folder.
const ROOT = HERE;

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
let german = META ? META.language === "de" : /^de/i.test(process.env.LANG || "");
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

const FLAGS_WITH_VALUE = ["user", "name", "approve", "device", "method", "settings", "client", "credential-name"];
const FLAGS_ALONE = ["write", "insecure", "password-stdin", "token-stdin", "withdraw", "json", "help"];

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

const CONFIG_DIR = process.env.ARASUL_CONFIG_DIR ? resolve(process.env.ARASUL_CONFIG_DIR) : join(homedir(), ".config", "arasul");
const CREDENTIALS = join(CONFIG_DIR, "credentials.json");

function readCredentials() {
  if (!existsSync(CREDENTIALS)) return { version: 1, devices: {} };
  if (statSync(CREDENTIALS).mode & 0o077) {
    chmodSync(CREDENTIALS, 0o600);
    warn(t(`${CREDENTIALS} was readable by others. Set to 0600.`, `${CREDENTIALS} war für andere lesbar. Auf 0600 gesetzt.`));
  }
  const data = readJson(CREDENTIALS, null);
  if (!data || typeof data.devices !== "object") {
    stop(t(`${CREDENTIALS} is not readable. Nothing was changed. Look at it or delete it and log in again.`, `${CREDENTIALS} lässt sich nicht lesen. Nichts wurde geändert. Sieh sie an oder lösche sie und melde dich neu an.`));
  }
  return data;
}

function writeCredentials(data) {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const temporary = join(CONFIG_DIR, `.credentials-${process.pid}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, CREDENTIALS);
}

/** The device this call means: --device, else the one logged in to last, else the only one. */
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

function send({ address, ca }, { method = "GET", path, token, json, timeout = 30_000 }) {
  const url = new URL(path, address.endsWith("/") ? address : `${address}/`);
  const secure = url.protocol === "https:";
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = null;
  if (json !== undefined) {
    payload = Buffer.from(JSON.stringify(json));
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = payload.length;
  }
  const options = { method, headers };
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
        if (size > MAX_ANSWER) req.destroy(Object.assign(new Error("answer too large"), { code: "ETOOBIG" }));
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
    stop(explain(error, target.address));
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
      done({ pem: `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\n`, fingerprint: top.fingerprint256, subject: top.subject?.CN || "" });
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
  return {
    dir,
    label,
    problems,
    sum: hash.digest("hex"),
    hook: proposal.hook && !problems.length ? { event: proposal.hook.event || "PreToolUse", matcher: proposal.hook.matcher || "Write|Edit|NotebookEdit|Bash", script } : null,
    rules: Object.fromEntries(SIDES.map((side) => [side, list(permissions[side])])),
  };
}

/** `{root}` becomes the written-out path, in the way the rule wants it: a shell rule as it is typed. */
function resolved(item) {
  const abs = realDir(item.dir);
  const rule = (text) => text.replaceAll("{root}", text.startsWith("Bash(") ? abs : `/${abs}`);
  return {
    allow: item.rules.allow.map(rule),
    deny: item.rules.deny.map(rule),
    ask: item.rules.ask.map(rule),
    additionalDirectories: item.rules.additionalDirectories.map((text) => text.replaceAll("{root}", abs)),
  };
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
  if (before) removeRecorded(settings, before.added);

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
  const today = new Date().toISOString().slice(0, 10);
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
    rmSync(join(base, name), { recursive: true, force: true });
    taken.push(relative(here, ledger.root) || ".");
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
  say(`  ${t("Checksum", "Prüfsumme")}: ${item.sum}`);
  return state.state;
}

async function doProposals(args) {
  const settingsPath = settingsFile(args);
  const wanted = args.flags.approve || [];
  if (args.flags.withdraw) {
    const taken = withdrawAll(settingsPath);
    say(taken.length
      ? t(`Taken back: what approving entered for ${taken.join(", ")} is gone from ${settingsPath}, the copies of the hooks with it.`, `Zurückgenommen: was das Freigeben für ${taken.join(", ")} eintrug, ist aus ${settingsPath}, die Kopien der Hooks mit ihnen.`)
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

function appMd(info, device) {
  const lines = [
    `# ${info.name} (${info.id})`,
    "",
    t(
      `<!-- Written by arasul.mjs (apps, sync) on ${new Date().toISOString().slice(0, 10)} from what the app says about itself. Do not edit: the next run overwrites it. The text below comes from the app, not from this house. -->`,
      `<!-- Geschrieben von arasul.mjs (apps, sync) am ${new Date().toISOString().slice(0, 10)} aus dem, was die App über sich sagt. Nicht bearbeiten: der nächste Lauf überschreibt es. Der Text unten stammt von der App, nicht von diesem Haus. -->`
    ),
    "",
    `${t("Version", "Version")}: ${info.version || t("not stated", "nicht genannt")}`,
    `${t("Device", "Gerät")}: ${device.name}`,
    "",
    t(
      "Call a route with `node <root>/arasul.mjs call <app> <route> [name=value ...]`, `<root>` being the full path of the folder that holds `.claude/root.json`. A route that changes something needs `--write`. Only the routes below can be called.",
      "Eine Route rufst du mit `node <wurzel>/arasul.mjs call <app> <route> [name=wert ...]` auf, `<wurzel>` ist der volle Pfad des Ordners, in dem `.claude/root.json` liegt. Eine Route, die etwas ändert, braucht `--write`. Aufrufen lassen sich nur die Routen unten."
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

/** Where the vendor's client lies when nobody says otherwise. It runs unpacked, without installing. */
const CLIENT_PLACES = Object.freeze([
  "/Applications/OpenCloud.app/Contents/MacOS/opencloudcmd",
  join(homedir(), "Applications", "OpenCloud.app", "Contents", "MacOS", "opencloudcmd"),
]);

/** What the state of the last sync is written to. No secret lies in it. */
const FOLDER_STATE = join(CONFIG_DIR, "firmenordner.json");

const FOLDER_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** The furniture of a root. A folder of level 1 with one of these ids is not laid down. */
const ROOT_OWN = Object.freeze(["apps", "scripts", ".claude", ".git"]);

/**
 * What never goes into the company folder.
 *
 * Three kinds, and each one for its own reason. **What a machine makes**: `.git`, `node_modules`
 * and the build folders are made again out of what is there, and they are the bulk of every
 * tree. **What belongs to this computer**: the hooks and the settings of an agent say what it
 * may do here, and that is a decision per computer, not per house. Both patterns hold at every
 * depth of the tree, not only at its top. **What the client itself writes**: its journal lies in
 * the synced folder, and without this line it reports conflicts about itself.
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
  "dist",
  "build",
  ".next",
  ".claude/hooks",
  "*/.claude/hooks",
  "settings.json",
  ".sync_*.db",
  ".sync_*.db-*",
  ".sync_*.db.ctmp",
  ".DS_Store",
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
  return [...NEVER_SYNCED, ...[...names].sort()];
}

/** Folders the walk does not go into: they are not synced, so nothing of ours lies in them. */
const NOT_WALKED = new Set([".git", "node_modules", "dist", "build", ".next"]);

/**
 * The mark the client puts in the name of a file it could not merge. Two spellings: the one of the
 * client's family, `_conflict-`, and the one this client wrote on 2026-09-22 at a device, measured
 * with a file that differed on both sides: `name (conflicted copy 2026-09-22 201200).ext`.
 */
const CONFLICT_MARK = /_conflict-| \(conflicted copy /;

/** The client of the vendor: named, or where it lies after unpacking, or on the path. */
function clientPath(args) {
  const given = one(args, "client") || process.env.ARASUL_OPENCLOUD_CMD;
  if (given) {
    const path = resolve(given);
    if (!existsSync(path)) stop(t(`${path} is not there. --client names the client of the vendor.`, `${path} ist nicht da. --client nennt den Klienten des Herstellers.`), 2);
    return path;
  }
  for (const place of CLIENT_PLACES) if (existsSync(place)) return place;
  for (const part of (process.env.PATH || "").split(":")) {
    if (!part) continue;
    const path = join(part, SERVICE.client);
    if (existsSync(path)) return path;
  }
  stop(t(
    `The command line client ${SERVICE.client} is not on this computer. It lies in the desktop package of the file service and runs unpacked, without installing. Looked in: ${CLIENT_PLACES.join(", ")} and on the path. --client names another place.`,
    `Der Kommandozeilen-Klient ${SERVICE.client} ist nicht auf diesem Rechner. Er liegt im Desktop-Paket des Dateidienstes und läuft entpackt, ohne Installation. Gesucht in: ${CLIENT_PLACES.join(", ")} und auf dem Pfad. --client nennt eine andere Stelle.`
  ));
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
    });
  }
  return {
    service: true,
    address: oneLine(String(data.adresse ?? ""), 200),
    reachable: data.erreichbar !== false,
    user: oneLine(String(data.benutzer ?? ""), 80),
    folders,
    refused: refusedFolders,
    notes: (Array.isArray(data.nicht_abgeglichen) ? data.nicht_abgeglichen : []).map((note) => oneLine(note?.text, 300)).filter(Boolean),
  };
}

function readFolderState() {
  const data = readJson(FOLDER_STATE, null);
  return data && typeof data === "object" && data.roots && typeof data.roots === "object" ? data : { version: 1, roots: {} };
}

function writeFolderState(data) {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const temporary = join(CONFIG_DIR, `.firmenordner-${process.pid}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, FOLDER_STATE);
}

/**
 * What lies in a synced folder that a human has to look at: files the client could not merge, and
 * links it did not follow. Counted out of the tree and not out of the client's report, because
 * both can also come into being between two syncs.
 */
function inspectFolder(dir, skipAtTop = new Set()) {
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

/** The last lines the client wrote, as the reason for a run that did not work out. */
function clientSaid(run) {
  const text = `${run.stderr || ""}\n${run.stdout || ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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
 */
async function askPassword(args, plan, device) {
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

/** The two lists for the client, as files in a throwaway folder: the general one and the root's. */
function excludeFiles(plan) {
  const workspace = mkdtempSync(join(tmpdir(), "ara-firmenordner-"));
  const general = join(workspace, "ausschluss.lst");
  const root = join(workspace, "ausschluss-wurzel.lst");
  writeFileSync(general, `${NEVER_SYNCED.join("\n")}\n`, { mode: 0o600 });
  writeFileSync(root, `${rootExcludes(plan).join("\n")}\n`, { mode: 0o600 });
  return { workspace, general, root, remove: () => rmSync(workspace, { recursive: true, force: true }) };
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
  });
}

/** The label of a folder in the output: the root says that it is the root. */
const labelOf = (folder) => (folder.root ? `${folder.id} (${t("this root, at the top", "diese Wurzel, oben")})` : folder.path);

/** The names at the top of the root that are folders of their own, and not the root's. */
function topNames(plan) {
  return new Set(["apps", ...plan.folders.filter((folder) => !folder.root).map((folder) => folder.path.split("/")[0])]);
}

/**
 * Sync every shared folder to its real place in this tree.
 *
 * The password is the one of the device: the file service carries the same one, because the
 * device mirrors it there. It is asked for at every sync and stored nowhere, and it goes to the
 * client in the environment variable the client names, never as an argument.
 */
async function syncFolders(args, device, apps = []) {
  const plan = await askFolders(device);
  const head = t("Company folder", "Firmenordner");
  if (!plan.service) {
    say(`${head}: ${plan.reason}`);
    return false;
  }
  say(`${head}: ${plan.address || t("the device names no address", "das Gerät nennt keine Adresse")}${plan.reachable ? "" : t(", the device cannot reach it right now", ", das Gerät erreicht ihn gerade nicht")}`);
  for (const item of plan.refused) say(`  ${t("Not synced", "Nicht abgeglichen")}: ${item.line}, ${item.why}`);
  if (!plan.folders.length) {
    say(`  ${t("No folder is shared with you. Nothing was synced.", "Dir ist kein Ordner freigegeben. Es wurde nichts abgeglichen.")}`);
    sayView(await writeView(device, plan, [], apps));
    return !plan.refused.length;
  }
  if (!plan.address) stop(t("The device names no address of the file service. Nothing was synced.", "Das Gerät nennt keine Adresse des Dateidienstes. Es wurde nichts abgeglichen."));
  if (!plan.user) stop(t("The device names no user for the file service. Nothing was synced.", "Das Gerät nennt keinen Benutzer für den Dateidienst. Es wurde nichts abgeglichen."));
  const client = clientPath(args);
  const password = await askPassword(args, plan, device);

  // The root first, then level 1: the root is the folder everything lies in, and level 1 makes the
  // room that a folder of level 2 hangs under. The chain above a folder of level 2 is made here
  // even when the person has no right on it.
  const rank = (folder) => (folder.root ? 0 : folder.level);
  const order = [...plan.folders].sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path));
  const tops = topNames(plan);
  const lists = excludeFiles(plan);
  const results = [];
  try {
    for (const folder of order) {
      const local = placeOf(folder);
      mkdirSync(local, { recursive: true });
      const bootstrap = folder.root ? bootstrapBridge() : null;
      const run = runClient({ client, plan, folder, local, excludes: folder.root ? lists.root : lists.general, password });
      if (bootstrap) bootstrap.settle();
      const seen = inspectFolder(local, folder.root ? tops : new Set());
      results.push({
        ...folder,
        ok: run.status === 0,
        message: run.status === 0 ? null : clientFailed(run),
        conflicts: seen.conflicts,
        links: seen.links,
        at: new Date().toISOString(),
      });
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
    if (result.links.length) {
      say(`      ${result.links.length} ${t("symbolic links, the client does not sync them", "Symlinks, die gleicht der Klient nicht ab")}: ${result.links.slice(0, 5).join(", ")}${result.links.length > 5 ? ", ..." : ""}`);
      clean = false;
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
 * runs: Node holds it in memory already. The one from the room is the house's and wins. Should
 * the room carry none, the file is put back as it was.
 */
function bootstrapBridge() {
  if (existsSync(join(ROOT, ".claude", "root.json"))) return null;
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

/** The state of one sync, next to the credential. What was known about other folders stays. */
function recordSync(device, plan, results) {
  const state = readFolderState();
  const before = state.roots[ROOT]?.folders || {};
  const mine = { device: device.name, address: plan.address, user: plan.user, at: new Date().toISOString(), folders: { ...before } };
  for (const result of results) {
    mine.folders[result.path] = {
      id: result.id,
      level: result.level,
      ...(result.root ? { root: true } : {}),
      right: result.right,
      at: result.at,
      result: result.ok ? "ok" : "error",
      ...(result.message ? { message: result.message } : {}),
      conflicts: result.conflicts.length,
      links: result.links.length,
    };
  }
  state.roots[ROOT] = mine;
  writeFolderState(state);
}

// --- The view: sicht.md ----------------------------------------------------------------------
// What this person has on the device, as one sheet at the top of the root. The device is meant to
// deliver it one day; until it does, the sheet is written out of what the device says about
// folders and apps. Per person, so it never goes into the room of the root.

const stamp = (iso) => `${String(iso).slice(0, 16).replace("T", " ")} UTC`;

/** The view out of what the device says, in the language of the root. */
function ownView(device, plan, results, apps) {
  const today = new Date().toISOString().slice(0, 10);
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
    const seen = existsSync(local) ? inspectFolder(local, folder.root ? tops : new Set()) : { conflicts: [], links: [] };
    const when = last
      ? `${last.result === "ok" ? t("synced", "abgeglichen") : t("last sync did not work out", "der letzte Abgleich ging nicht durch")} ${stamp(last.at)}`
      : t("never synced", "noch nie abgeglichen");
    say(`  ${labelOf(folder)}   ${t("level", "Ebene")} ${folder.level}${folder.right ? `, ${folder.right}` : ""}   ${when}, ${seen.conflicts.length} ${t("conflicts", "Konflikte")}${seen.links.length ? `, ${seen.links.length} ${t("symbolic links not synced", "Symlinks nicht abgeglichen")}` : ""}`);
    if (last && last.result !== "ok" && last.message) say(`      ${last.message}`);
    if (!last || last.result !== "ok" || seen.conflicts.length || seen.links.length) fine = false;
  }
  for (const path of Object.keys(known).sort()) {
    if (plan.folders.some((folder) => folder.path === path)) continue;
    say(`  ${path === "." ? known[path].id || path : path}   ${t("not shared with you any more, what lies here stays", "dir nicht mehr freigegeben, was hier liegt, bleibt liegen")}`);
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
      const rel = relative(dir, path).split("/").join("/");
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
  const client = clientPath(args);
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

  const excludes = rootExcludes(plan);
  const expected = filesThrough(ROOT, excludes);
  const lists = excludeFiles(plan);
  let probe = null;
  let arrived = [];
  let up;
  try {
    up = runClient({ client, plan, folder: room, local: ROOT, excludes: lists.root, password });
    if (up.status !== 0) stop(t(`The client did not sync the root: ${clientFailed(up)}`, `Der Klient hat die Wurzel nicht abgeglichen: ${clientFailed(up)}`));
    // Seen, not believed: the room comes down into a throwaway folder, and what lies there counts.
    probe = mkdtempSync(join(tmpdir(), "ara-wurzel-probe-"));
    const down = runClient({ client, plan, folder: room, local: probe, excludes: lists.root, password });
    if (down.status !== 0) stop(t(`Deployed, but the proof did not come about, the client says: ${clientSaid(down)}`, `Ausgerollt, aber der Beweis kam nicht zustande, der Klient sagt: ${clientSaid(down)}`));
    arrived = filesThrough(probe, excludes);
  } finally {
    lists.remove();
    if (probe) rmSync(probe, { recursive: true, force: true });
  }
  const missing = expected.filter((file) => !arrived.includes(file));
  const seen = inspectFolder(ROOT, topNames(plan));
  recordSync(device, plan, [{ ...room, ok: !missing.length, message: missing.length ? t(`${missing.length} files did not arrive`, `${missing.length} Dateien kamen nicht an`) : null, conflicts: seen.conflicts, links: seen.links, at: new Date().toISOString() }]);

  say(t(`Deployed: ${expected.length} files of this root into the root ${room.id} on ${plan.address}.`, `Ausgerollt: ${expected.length} Dateien dieser Wurzel in die Wurzel ${room.id} auf ${plan.address}.`));
  say(missing.length
    ? t(`  Checked against the room: ${missing.length} did not arrive: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", ..." : ""}`, `  Gegen den Raum geprüft: ${missing.length} kamen nicht an: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", ..." : ""}`)
    : t(`  Checked against the room: all ${expected.length} lie there, ${arrived.length} files in the room.`, `  Gegen den Raum geprüft: alle ${expected.length} liegen dort, ${arrived.length} Dateien im Raum.`));
  say(`  ${t("Kept home", "Bleibt zu Hause")}: ${excludes.join(", ")}`);
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
  return issued;
}

async function doLogin(args) {
  const given = args._[1];
  if (given) {
    const address = baseOf(given);
    const name = one(args, "name") || new URL(address).hostname;
    let target = { address };

    let token;
    let kind;
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
      if (!user) user = (await visibleLine(t("User name: ", "Benutzername: "))) || "";
      user = user.trim();
      if (!user) stop(t("A user name is needed: --user <name>.", "Ein Benutzername wird gebraucht: --user <name>."), 2);
      let password = secret ?? (await secretLine(t(`Password for ${user} on ${address}: `, `Passwort für ${user} auf ${address}: `)));
      if (!password) stop(t("The password comes from the terminal, or from the first line of the input with --password-stdin. It is never taken from an argument.", "Das Passwort kommt vom Terminal, oder mit --password-stdin aus der ersten Zeile der Eingabe. Aus einem Argument wird es nie genommen."), 2);
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
      token = await issueCredential(target, session, one(args, "credential-name") || hostname() || name);
    }

    const data = readCredentials();
    data.devices[name] = { address, kind, ...(user ? { user } : {}), token, since: new Date().toISOString().slice(0, 10), ...(target.ca ? { ca: target.ca } : {}) };
    data.default = name;
    writeCredentials(data);
    const expires = expiryOf(token);
    say(t(`Logged in to ${address} as ${name}${user ? ` (${user})` : ""}. The credential lies in ${CREDENTIALS}, mode 0600.`, `Angemeldet an ${address} als ${name}${user ? ` (${user})` : ""}. Der Ausweis liegt in ${CREDENTIALS}, Rechte 0600.`));
    if (kind === "issued") {
      say(t(
        "The device issued it for this computer and showed its value once. The session of the login was not kept: a credential has no end and opens no administration.",
        "Das Gerät hat ihn für diesen Rechner ausgestellt und seinen Wert einmal gezeigt. Die Sitzung der Anmeldung wurde nicht behalten: ein Ausweis läuft nicht ab und öffnet keine Verwaltung."
      ));
    } else if (expires) {
      say(t(`What you pasted in is a session, and it holds until ${new Date(expires).toISOString().slice(0, 16).replace("T", " ")} UTC. A credential out of the device's front end has no end.`, `Was du eingefügt hast, ist eine Sitzung, und sie hält bis ${new Date(expires).toISOString().slice(0, 16).replace("T", " ")} UTC. Ein Ausweis aus der Oberfläche des Geräts läuft nicht ab.`));
    }
    say();
  } else if (!Object.keys(readCredentials().devices).length && !args.flags.withdraw && !args.flags.approve) {
    say(t("No device is logged in yet: node arasul.mjs login <address> --user <name>. The proposals and places follow.", "Noch ist kein Gerät angemeldet: node arasul.mjs login <adresse> --user <name>. Vorschläge und Orte folgen."));
    say();
  }
  const clean = await doProposals(args);
  if (!args.flags.withdraw) doPlaces();
  return clean;
}

async function doStatus(args) {
  const data = readCredentials();
  const names = Object.keys(data.devices);
  let fine = true;
  if (!names.length) {
    say(t("Device: none logged in.", "Gerät: keines angemeldet."));
    fine = false;
  }
  for (const name of names) {
    const entry = data.devices[name];
    const expires = expiryOf(entry.token);
    say(`${t("Device", "Gerät")}: ${name}${data.default === name ? ` (${t("last logged in", "zuletzt angemeldet")})` : ""}, ${entry.address}`);
    say(`  ${t("Credential", "Ausweis")}: ${entry.kind === "pasted" ? t("pasted in", "eingefügt") : t("issued by the device", "vom Gerät ausgestellt")}${entry.user ? `, ${entry.user}` : ""}, ${t("since", "seit")} ${entry.since}${expires ? `, ${expires < Date.now() ? t("ended", "zu Ende") : t("holds until", "hält bis")} ${new Date(expires).toISOString().slice(0, 16).replace("T", " ")} UTC` : ""}`);
    try {
      const answer = await send(entry, { path: DEVICE.session, token: entry.token, timeout: 10_000 });
      const body = inner(jsonOf(answer));
      const on = answer.status === 200 && (body?.authenticated ?? jsonOf(answer)?.authenticated);
      say(`  ${t("Device answers", "Gerät antwortet")}: ${t("yes", "ja")}, ${on ? t("the credential is accepted", "der Ausweis wird angenommen") : t("the credential is not accepted, log in again", "der Ausweis wird nicht angenommen, melde dich neu an")}`);
      if (!on) fine = false;
    } catch (error) {
      say(`  ${t("Device answers", "Gerät antwortet")}: ${t("no", "nein")}, ${explain(error, entry.address)}`);
      fine = false;
    }
  }
  if (names.length && !(await folderStatus(args, chooseDevice(args)))) fine = false;
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
      "node arasul.mjs <command>",
      "",
      "  login [<address>] [--user <name>] [--token-stdin | --password-stdin] [--insecure] [--name <label>]",
      "        log in, then show the proposals for hooks and rules and the places on this computer",
      "        [--credential-name <name>]     the name the device files the credential under",
      "  login --approve <checksum>     approve one proposal, once per proposal",
      "  login --withdraw               take back what approving entered",
      "  status                         device, credential, company folder, proposals",
      "  sync [--client <path>]         sync the company folder, write apps/<id>/APP.md and sicht.md",
      "  deploy [--client <path>]       put this root into the room of the root on the device, the check script first",
      "  apps [--json]                  the assigned apps with their routes, writes APP.md",
      "  call <app> <route> [name=value ...] [--write] [--method <verb>]",
      "",
      "  --device <name>  another device than the last one   --settings <file>  another settings file",
    ].join("\n"),
    [
      "node arasul.mjs <befehl>",
      "",
      "  login [<adresse>] [--user <name>] [--token-stdin | --password-stdin] [--insecure] [--name <bezeichnung>]",
      "        anmelden, danach die Vorschläge für Hooks und Regeln und die Orte auf diesem Rechner zeigen",
      "        [--credential-name <name>]     unter welchem Namen das Gerät den Ausweis führt",
      "  login --approve <prüfsumme>    einen Vorschlag freigeben, einmal je Vorschlag",
      "  login --withdraw               zurücknehmen, was das Freigeben eintrug",
      "  status                         Gerät, Ausweis, Firmenordner, Vorschläge",
      "  sync [--client <pfad>]         den Firmenordner abgleichen, apps/<id>/APP.md und sicht.md schreiben",
      "  deploy [--client <pfad>]       diese Wurzel in den Raum der Wurzel am Gerät legen, zuerst das Prüfskript",
      "  apps [--json]                  die zugewiesenen Apps mit ihren Routen, schreibt APP.md",
      "  call <app> <route> [name=wert ...] [--write] [--method <verb>]",
      "",
      "  --device <name>  ein anderes Gerät als das zuletzt angemeldete   --settings <datei>  eine andere Einstellungsdatei",
    ].join("\n")
  ));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
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
    case "login":
      return (await doLogin(args)) ? 0 : 1;
    case "status":
      return (await doStatus(args)) ? 0 : 1;
    case "sync":
      return (await doSync(args)) ? 0 : 1;
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
