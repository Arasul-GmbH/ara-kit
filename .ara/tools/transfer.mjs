#!/usr/bin/env node
/**
 * Hand the kit over to a customer, and take it over.
 *
 *   node .ara/tools/transfer.mjs --prepare [--to <name>] [--repo <url>] [--yes]
 *                                        prepare the handover (without --yes: only the plan)
 *   node .ara/tools/transfer.mjs --status [--json]
 *                                        what the handover file says and where this copy stands
 *   node .ara/tools/transfer.mjs --accept [--device <device>] [--yes] [--no-passphrase] [--revoke-others]
 *                                        take over: own keys, put them on the device, revoke the old ones
 *   node .ara/tools/transfer.mjs --authorize <public key file> --device <device> [--yes]
 *                                        the one handing over puts the new person's public key on the device
 *   node .ara/tools/transfer.mjs --prove [--device <device>]
 *                                        the one who handed over shows that his keys no longer work
 *   node .ara/tools/transfer.mjs --help  this help, nothing else
 *
 * Prepare is for the company branch. It sets `versioned: business, devices, apps` in the
 * profile and the exceptions in .gitignore, so that these three folders travel with the
 * repository, it refuses while a file in them looks like it holds a secret, and it writes
 * business/handover.md: the sheet for the one who takes over, in plain words, plus what the
 * kit needs later (name of the login key's fingerprint, start of the kit key). None of that
 * is a secret, the device shows it in its own lists. Device files hold only the NAMES of
 * their secrets and never a value.
 *
 * Accept runs on the new person's computer, after /init noticed the handover. Per device it
 * makes an own SSH key (Ed25519, with a passphrase) in ~/.ssh, puts its public half on the
 * device, proves the login with it, lets the device issue an own kit key and stores that in
 * the secret store, and only then revokes the old kit key and removes the old login key.
 * Order matters: nothing is revoked before the new access was proven. Afterwards it counts
 * on the device what is still valid. Other valid kit keys (from the installation, for
 * instance) are listed and revoked only with --revoke-others.
 *
 * To put the first SSH key on the device, one way in that works today is needed: the
 * password of the login on the device, or the old key. If the device only accepts keys and
 * the new person has none yet, --accept stops after making the key and prints the public
 * half; the one handing over then runs --authorize with it.
 *
 * Everything that changes a device needs --yes. Without it you get the plan.
 *
 * === deutsch ===
 *
 * Das Kit an einen Kunden übergeben und übernehmen.
 *
 *   node .ara/tools/transfer.mjs --prepare [--to <Name>] [--repo <URL>] [--yes]
 *                                        die Übergabe vorbereiten (ohne --yes: nur der Plan)
 *   node .ara/tools/transfer.mjs --status [--json]
 *                                        was die Übergabedatei sagt und wo diese Kopie steht
 *   node .ara/tools/transfer.mjs --accept [--device <Gerät>] [--yes] [--no-passphrase] [--revoke-others]
 *                                        übernehmen: eigene Schlüssel, am Gerät ablegen, die alten widerrufen
 *   node .ara/tools/transfer.mjs --authorize <Datei mit öffentlichem Schlüssel> --device <Gerät> [--yes]
 *                                        der Übergebende legt den öffentlichen Schlüssel des Neuen am Gerät ab
 *   node .ara/tools/transfer.mjs --prove [--device <Gerät>]
 *                                        der Übergebende zeigt, dass seine Schlüssel nicht mehr gehen
 *   node .ara/tools/transfer.mjs --help  diese Hilfe, sonst nichts
 *
 * Vorbereiten gilt für den Zweig Unternehmen. Es setzt `versioned: business, devices, apps`
 * im Profil und die Ausnahmen in der .gitignore, damit diese drei Ordner mit dem Repository
 * gehen, es weigert sich, solange eine Datei darin nach einem Geheimnis aussieht, und es
 * schreibt business/handover.md: das Blatt für den, der übernimmt, in einfachen Worten, dazu
 * was das Kit später braucht (Fingerabdruck des Anmeldeschlüssels, Anfang des Kit-Schlüssels).
 * Nichts davon ist ein Geheimnis, das Gerät zeigt es in seinen eigenen Listen. Geräteakten
 * tragen nur die NAMEN ihrer Geheimnisse, nie einen Wert.
 *
 * Übernehmen läuft auf dem Rechner des Neuen, nachdem /init die Übergabe erkannt hat. Je
 * Gerät macht es einen eigenen SSH-Schlüssel (Ed25519, mit Passphrase) in ~/.ssh, legt dessen
 * öffentliche Hälfte am Gerät ab, beweist die Anmeldung damit, lässt das Gerät einen eigenen
 * Kit-Schlüssel ausstellen und legt ihn in der Geheimnis-Ablage ab, und widerruft erst dann
 * den alten Kit-Schlüssel und nimmt den alten Anmeldeschlüssel heraus. Die Reihenfolge ist
 * Absicht: widerrufen wird nichts, bevor der neue Zugang bewiesen ist. Danach zählt es am
 * Gerät nach, was noch gilt. Weitere gültige Kit-Schlüssel (etwa von der Installation)
 * werden aufgelistet und nur mit --revoke-others widerrufen.
 *
 * Für den ersten SSH-Schlüssel am Gerät braucht es einen Weg hinein, der heute noch geht:
 * das Passwort der Anmeldung am Gerät oder den alten Schlüssel. Nimmt das Gerät nur
 * Schlüssel und der Neue hat noch keinen, hört --accept nach dem Erzeugen auf und gibt die
 * öffentliche Hälfte aus; der Übergebende führt dann --authorize damit aus.
 *
 * Alles, was ein Gerät verändert, braucht --yes. Ohne bekommst du den Plan.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join, relative } from "node:path";
import { call, reason } from "./lib/arasul.mjs";
import { CONTRACT_PATH } from "./lib/contract.mjs";
import { deployKeyName, secretSlug } from "./lib/device.mjs";
import { t } from "./lib/i18n.mjs";
import { KEY_ONLY, createKey, keyLogin, listKeys, revokeKey, runRemote, validLine } from "./lib/install.mjs";
import {
  BUSINESS,
  ROOT,
  USER_FOLDERS,
  devicePath,
  fail,
  helpOnly,
  listDevices,
  now,
  parseArgs,
  readFrontmatter,
  today,
  writeFrontmatter,
} from "./lib/kit.mjs";
import { getSecret, setSecret } from "./lib/secrets.mjs";
import {
  FOLDERS,
  HANDOVER_FILE,
  addKeyCommand,
  forbiddenName,
  handoverState,
  ignoreAddition,
  listKeysCommand,
  parseFingerprints,
  removeKeyCommand,
  secretFindings,
  sheetBody,
  slugOf,
  validPublicKey,
} from "./lib/transfer.mjs";

helpOnly(import.meta.url);

const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);
const PROFILE = join(BUSINESS, "profile.md");
const HANDOVER = join(BUSINESS, HANDOVER_FILE);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const yes = Boolean(arg.yes);

const line = (...parts) => console.log(parts.join(""));

// --- gemeinsame Handgriffe ---------------------------------------------------------

function deviceFile(device) {
  return join(devicePath(null, device), "device.md");
}

/** Die Geräte, um die es geht: das genannte, sonst alle unter devices/. */
function targets() {
  const all = listDevices(null);
  const wanted = str(arg.device);
  if (wanted) {
    if (!all.includes(wanted)) {
      fail(
        t(
          `There is no device "${wanted}" under devices/. Known: ${all.join(", ") || "none"}.`,
          `Unter devices/ gibt es kein Gerät "${wanted}". Vorhanden: ${all.join(", ") || "keines"}.`
        )
      );
    }
    return [wanted];
  }
  return all;
}

/** Wie das Kit zu diesem Gerät findet. Bewusst ohne BatchMode: ein Passwort darf gefragt werden. */
function baseArgs(fields, { batch = false, key = null } = {}) {
  const host = fields.address || fields.hostname;
  if (!host) {
    throw new Error(
      t("The device file names no address.", "In der Geräteakte steht keine Adresse.")
    );
  }
  const user = fields.ssh_user || "arasul";
  const port = fields.ssh_port || "22";
  const args = ["-o", "ConnectTimeout=8", "-o", "StrictHostKeyChecking=accept-new", "-p", String(port)];
  if (batch) args.push("-o", "BatchMode=yes");
  const keyName = key || fields.ssh_key;
  if (keyName) {
    const path = keyName.startsWith("/") ? keyName : join(homedir(), ".ssh", keyName);
    if (existsSync(path)) args.push("-i", path);
  }
  args.push(`${user}@${host}`);
  return { args, host, label: `${user}@${host}:${port}` };
}

/**
 * Wie Befehle zum Gerät kommen: über SSH, und nur für `localhost` ersatzweise
 * lokal. Eine Adresse im Netz fällt nie auf die eigene Shell zurück.
 */
function transportOf(args, host, { keyOnly = false } = {}) {
  const probe = spawnSync("ssh", [...(keyOnly ? KEY_ONLY : []), ...args, "true"], { encoding: "utf8" });
  if (probe.status === 0) return { transport: "ssh", message: "" };
  const message = String(probe.stderr || "").trim().split("\n").slice(-1)[0] || "";
  return LOCAL_HOSTS.has(host) ? { transport: "local", message } : { transport: "none", message };
}

function fingerprintOf(publicKeyPath) {
  const run = spawnSync("ssh-keygen", ["-lf", publicKeyPath], { encoding: "utf8" });
  if (run.status !== 0) return "";
  return (run.stdout.match(/\bSHA256:[A-Za-z0-9+/=]+/) || [""])[0];
}

function ownerNames() {
  const company = readFrontmatter(join(BUSINESS, "company.md")).fields;
  const profile = readFrontmatter(PROFILE).fields;
  return { company, profile, keyName: deployKeyName(company, profile) };
}

// --- --status ----------------------------------------------------------------------

function showStatus() {
  const s = handoverState();
  if (arg.json) {
    console.log(JSON.stringify(s, null, 2));
    process.exit(0);
  }
  if (s.state === "none") {
    line(t("No handover prepared in this copy.", "In dieser Kopie ist keine Übergabe vorbereitet."));
    process.exit(0);
  }
  const wer = s.from ? t(` by ${s.from}`, ` von ${s.from}`) : "";
  line(
    s.state === "accepted"
      ? t(`Handover${wer}: taken over on every device.`, `Übergabe${wer}: auf jedem Gerät übernommen.`)
      : t(`Handover${wer}: prepared on ${s.prepared}, not taken over everywhere.`, `Übergabe${wer}: vorbereitet am ${s.prepared}, nicht überall übernommen.`)
  );
  for (const d of s.devices) {
    const where = d.done
      ? t(`taken over on ${d.done}`, `übernommen am ${d.done}`)
      : d.pending
        ? t("waits for the new person: no key of this copy yet", "wartet auf den Neuen: hier noch kein Schlüssel")
        : t("keys of the one handing over lie in this copy", "die Schlüssel des Übergebenden liegen in dieser Kopie");
    line(`  ${d.device}: ${where}`);
  }
  if (s.pending?.length) {
    line(
      t(
        `This copy is the receiving one for ${s.pending.map((d) => d.device).join(", ")}. Run: node .ara/tools/transfer.mjs --accept`,
        `Diese Kopie ist die übernehmende für ${s.pending.map((d) => d.device).join(", ")}. Aufruf: node .ara/tools/transfer.mjs --accept`
      )
    );
  }
  process.exit(0);
}

// --- --prepare ---------------------------------------------------------------------

/** Alle Dateien unter einem Ordner, ohne node_modules und ohne .git. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

function scan() {
  const problems = [];
  for (const folder of FOLDERS) {
    for (const path of walk(join(ROOT, folder))) {
      const rel = relative(ROOT, path);
      const name = path.split("/").pop();
      if (forbiddenName(name)) {
        problems.push({ file: rel, what: t("a file that holds secrets by its name", "eine Datei, die ihrem Namen nach Geheimnisse trägt") });
        continue;
      }
      if (name === HANDOVER_FILE || statSync(path).size > 2_000_000) continue;
      let text;
      try {
        text = readFileSync(path, "utf8");
      } catch {
        continue;
      }
      if (text.includes("\u0000")) continue;
      for (const f of secretFindings(text)) {
        problems.push({ file: `${rel}:${f.line}`, what: t(f.en, f.de) });
      }
    }
  }
  return problems;
}

async function prepare() {
  const profile = readFrontmatter(PROFILE);
  if (!profile.exists) {
    fail(t("There is no business/profile.md. Run /init first.", "Es gibt kein business/profile.md. Erst /init."));
  }
  if (profile.fields.role !== "company") {
    fail(
      t(
        "A handover is for the company branch: the repository goes to the one who runs the machines. " +
          "This profile says partner. Customer files never travel in a repository, so there is nothing to prepare here.",
        "Eine Übergabe gehört in den Zweig Unternehmen: das Repository geht an den, der die Maschinen betreibt. " +
          "Dieses Profil sagt Partner. Kundenakten gehen nie in einem Repository weiter, hier gibt es nichts vorzubereiten."
      )
    );
  }

  const problems = scan();
  if (problems.length) {
    line(t("Not ready. These places look like they hold a secret:", "Nicht bereit. Diese Stellen sehen aus, als trügen sie ein Geheimnis:"));
    for (const p of problems) line(`  ${p.file}: ${p.what}`);
    line(
      t(
        "Move the secret into the secret store (node .ara/tools/secrets.mjs) and leave only its name in the file. Nothing was changed.",
        "Das Geheimnis in die Ablage legen (node .ara/tools/secrets.mjs) und in der Datei nur seinen Namen lassen. Es wurde nichts geändert."
      )
    );
    process.exit(1);
  }

  const { company, keyName } = ownerNames();
  const from = company.name || company.company || profile.fields.company || profile.fields.name || userInfo().username;
  const to = str(arg.to) || "";
  const devices = [];
  const extra = {};
  for (const device of listDevices(null)) {
    const fields = readFrontmatter(deviceFile(device)).fields;
    const slug = slugOf(null, device);
    let sshFingerprint = "";
    if (fields.ssh_key) {
      const pub = (fields.ssh_key.startsWith("/") ? fields.ssh_key : join(homedir(), ".ssh", fields.ssh_key)) + ".pub";
      if (existsSync(pub)) sshFingerprint = fingerprintOf(pub);
    }
    let kitPrefix = "";
    const note = [];
    const key = fields.api_key_ref ? getSecret(fields.api_key_ref) : null;
    if (key && fields.address) {
      try {
        const { args, host } = baseArgs(fields, { batch: true });
        const { transport } = transportOf(args, host);
        if (transport !== "none") {
          const list = listKeys(args, transport, key);
          if (list.ok && list.mine) kitPrefix = list.mine.prefix;
        }
      } catch {
        /* ohne Verbindung bleibt der Präfix leer, und das wird unten gesagt */
      }
    }
    if (!sshFingerprint) note.push(t("no login key found", "kein Anmeldeschlüssel gefunden"));
    if (!kitPrefix) note.push(t("start of the kit key not readable", "Anfang des Kit-Schlüssels nicht lesbar"));
    devices.push({ place: device, slug, sshFingerprint, kitPrefix, note });
    extra[`old_ssh_${slug}`] = sshFingerprint;
    extra[`old_kit_${slug}`] = kitPrefix;
    extra[`done_${slug}`] = "";
  }

  line(t("Plan for the handover:", "Plan für die Übergabe:"));
  line("  - " + t("profile: versioned: business, devices, apps", "Profil: versioned: business, devices, apps"));
  line("  - " + t(".gitignore: exceptions for these three folders", ".gitignore: Ausnahmen für diese drei Ordner"));
  line("  - " + t(`${relative(ROOT, HANDOVER)}: the sheet for the one taking over`, `${relative(ROOT, HANDOVER)}: das Blatt für den Übernehmenden`));
  for (const d of devices) {
    line(
      `  - ${d.place}: ` +
        t("old login key", "alter Anmeldeschlüssel") + ` ${d.sshFingerprint || "-"}, ` +
        t("old kit key", "alter Kit-Schlüssel") + ` ${d.kitPrefix || "-"}` +
        (d.note.length ? ` (${d.note.join("; ")})` : "")
    );
  }
  if (!devices.length) line("  - " + t("no device under devices/ yet", "noch kein Gerät unter devices/"));
  line(t("The scan found no secret in business/, devices/ and apps/.", "Die Suche fand kein Geheimnis in business/, devices/ und apps/."));
  if (devices.some((d) => !d.kitPrefix)) {
    line(
      t(
        "Where the start of the kit key is missing, the new person cannot tell the old key from the others; they will be asked about it.",
        "Wo der Anfang des Kit-Schlüssels fehlt, kann der Neue den alten nicht von den anderen unterscheiden; er wird dann gefragt."
      )
    );
  }
  if (!yes) {
    line(t("\nNothing written. With --yes the kit writes exactly this.", "\nNichts geschrieben. Mit --yes schreibt das Kit genau das."));
    process.exit(0);
  }

  // Schreiben: nur Dateien dieser Kopie, nichts am Gerät.
  const owned = new Set((profile.fields.versioned || "").split(",").map((p) => p.trim().toLowerCase()));
  for (const f of FOLDERS) owned.add(f);
  writeFrontmatter(PROFILE, { versioned: USER_FOLDERS.filter((f) => owned.has(f)).join(", ") });

  const ignorePath = join(ROOT, ".gitignore");
  const current = existsSync(ignorePath) ? readFileSync(ignorePath, "utf8") : "";
  const add = ignoreAddition(current);
  if (add) writeFileSync(ignorePath, current.replace(/\n*$/, "\n") + add);

  mkdirSync(BUSINESS, { recursive: true });
  const head = [
    "---",
    "status: prepared",
    `prepared: ${today()}`,
    `from: ${from}`,
    `to: ${to}`,
    `repo: ${str(arg.repo) || ""}`,
    `key_name: ${keyName}`,
    ...Object.entries(extra).map(([k, v]) => (v ? `${k}: ${v}` : `${k}:`)),
    "---",
    "",
  ].join("\n");
  writeFileSync(HANDOVER, head + sheetBody({ from, to, devices, date: today(), repo: str(arg.repo) || "" }));

  line(t("\nPrepared. The handover sheet is business/handover.md.", "\nVorbereitet. Das Übergabeblatt ist business/handover.md."));
  line(
    t(
      "Next, by hand: commit the three folders and push to a private repository (for example with gh), then share it with the new person.\n" +
        "The new person clones it, opens it with Claude Code or Codex and types /init.",
      "Als Nächstes von Hand: die drei Ordner festschreiben und in ein privates Repository schieben (etwa mit gh), dann mit dem Neuen teilen.\n" +
        "Der Neue klont es, öffnet es mit Claude Code oder Codex und tippt /init."
    )
  );
  line(
    t(
      "When he has taken over, run --prove here: it shows that your keys no longer work.",
      "Hat er übernommen, hier --prove ausführen: es zeigt, dass deine Schlüssel nicht mehr gehen."
    )
  );
  process.exit(0);
}

// --- --accept ----------------------------------------------------------------------

function makeSshKey(name) {
  const path = join(homedir(), ".ssh", name);
  mkdirSync(join(homedir(), ".ssh"), { recursive: true, mode: 0o700 });
  if (existsSync(path) && existsSync(`${path}.pub`)) return { ok: true, path, reused: true };
  const { company, profile } = ownerNames();
  const owner = company.name || profile.company || profile.name || userInfo().username;
  const keygen = spawnSync(
    "ssh-keygen",
    ["-t", "ed25519", "-f", path, "-C", `ara-kit ${owner} ${name}`, ...(arg["no-passphrase"] ? ["-N", ""] : [])],
    { stdio: arg["no-passphrase"] ? ["ignore", "ignore", "pipe"] : "inherit" }
  );
  if (keygen.status !== 0) {
    return { ok: false, message: t("ssh-keygen did not create a key.", "ssh-keygen hat keinen Schlüssel angelegt.") };
  }
  return { ok: true, path, reused: false };
}

/** Widerruft jeden gültigen Kit-Schlüssel außer dem eigenen. Gibt die Zahl der Fehlschläge zurück. */
function revokeOthers(args, transport, key, step) {
  const list = listKeys(args, transport, key);
  let failed = 0;
  if (!list.ok || !list.mine) return 1;
  for (const k of list.keys.filter((k) => !k.mine && validLine(k.line))) {
    const gone = revokeKey(args, transport, k.prefix);
    if (!gone.ok) failed++;
    step(
      gone.ok
        ? t(`kit key ${k.prefix} revoked`, `Kit-Schlüssel ${k.prefix} widerrufen`)
        : t(`kit key ${k.prefix} not revoked: ${gone.message}`, `Kit-Schlüssel ${k.prefix} nicht widerrufen: ${gone.message}`)
    );
  }
  return failed;
}

function acceptDevice(device) {
  const file = deviceFile(device);
  const fields = readFrontmatter(file).fields;
  const hand = readFrontmatter(HANDOVER).fields;
  const slug = slugOf(null, device);
  const oldFingerprint = hand[`old_ssh_${slug}`] || "";
  const oldPrefix = hand[`old_kit_${slug}`] || "";
  const sshName = `ara-${device}`;
  const ref = fields.api_key_ref || `ARASUL_KEY_${secretSlug(null, device)}`;
  const { keyName } = ownerNames();
  const step = (text) => line(`  - ${text}`);

  line(`\n${t("Device", "Gerät")} ${device}`);
  if (hand[`done_${slug}`]) {
    step(t(`already taken over on ${hand[`done_${slug}`]}`, `schon übernommen am ${hand[`done_${slug}`]}`));
    if (!arg["revoke-others"]) return true;
    if (!yes) {
      step(t("with --yes it revokes every other valid kit key on the device", "mit --yes widerruft es jeden anderen gültigen Kit-Schlüssel am Gerät"));
      return true;
    }
    const own = baseArgs(fields, { batch: true, key: fields.ssh_key });
    const via = transportOf(own.args, own.host, { keyOnly: true });
    const stored = fields.api_key_ref ? getSecret(fields.api_key_ref) : null;
    if (via.transport === "none" || !stored) {
      step(t("no access with the keys of this copy", "kein Zugang mit den Schlüsseln dieser Kopie"));
      return false;
    }
    const list = listKeys(own.args, via.transport, stored);
    if (!list.ok || !list.mine) {
      step(t("the device does not list this copy's kit key, so the others are not touched", "das Gerät führt den Kit-Schlüssel dieser Kopie nicht, die anderen bleiben unberührt"));
      return false;
    }
    return revokeOthers(own.args, via.transport, stored, step) === 0;
  }

  if (!yes) {
    step(t(`makes the login key ~/.ssh/${sshName} (Ed25519${arg["no-passphrase"] ? ", no passphrase" : ", with a passphrase"})`, `macht den Anmeldeschlüssel ~/.ssh/${sshName} (Ed25519${arg["no-passphrase"] ? ", ohne Passphrase" : ", mit Passphrase"})`));
    step(t("puts its public half on the device and proves the login with it", "legt dessen öffentliche Hälfte am Gerät ab und beweist die Anmeldung damit"));
    step(t(`lets the device issue a kit key "${keyName}" and stores it as ${ref}`, `lässt das Gerät einen Kit-Schlüssel "${keyName}" ausstellen und legt ihn als ${ref} ab`));
    step(t(`then revokes the old kit key (${oldPrefix || "start unknown"}) and removes the old login key (${oldFingerprint || "fingerprint unknown"})`, `widerruft danach den alten Kit-Schlüssel (${oldPrefix || "Anfang unbekannt"}) und nimmt den alten Anmeldeschlüssel heraus (${oldFingerprint || "Fingerabdruck unbekannt"})`));
    return true;
  }

  const made = makeSshKey(sshName);
  if (!made.ok) {
    step(made.message);
    return false;
  }
  const publicKey = readFileSync(`${made.path}.pub`, "utf8").trim();
  const newFingerprint = fingerprintOf(`${made.path}.pub`);
  step(
    made.reused
      ? t(`login key ~/.ssh/${sshName} already exists, kept`, `Anmeldeschlüssel ~/.ssh/${sshName} gibt es schon, er bleibt`)
      : t(`login key ~/.ssh/${sshName} made`, `Anmeldeschlüssel ~/.ssh/${sshName} angelegt`)
  );
  if (oldFingerprint && oldFingerprint === newFingerprint) {
    step(t("the new login key is the old one: stopping", "der neue Anmeldeschlüssel ist der alte: Abbruch"));
    return false;
  }

  // 1. Der Weg hinein, den es heute gibt: der alte Schlüssel, sonst das Passwort.
  let way;
  try {
    way = baseArgs(fields);
  } catch (error) {
    step(error.message);
    return false;
  }
  const first = transportOf(way.args, way.host);
  if (first.transport === "none") {
    step(t(`no way into ${way.label} that works today (${first.message || "refused"}).`, `kein Weg nach ${way.label}, der heute geht (${first.message || "abgelehnt"}).`));
    line(
      t(
        "    The device may take keys only. Send the public half below to the one handing over, who runs\n" +
          `    node .ara/tools/transfer.mjs --authorize <file> --device ${device} --yes\n    Then run --accept again.`,
        "    Vielleicht nimmt das Gerät nur Schlüssel. Schick die öffentliche Hälfte unten dem Übergebenden, der führt\n" +
          `    node .ara/tools/transfer.mjs --authorize <Datei> --device ${device} --yes aus.\n    Danach --accept noch einmal.`
      )
    );
    line(`    ${publicKey}`);
    // Der neue Schlüssel kann schon dort liegen. Geht er, ist der Weg offen.
    const already = baseArgs(fields, { batch: true, key: sshName });
    if (transportOf(already.args, already.host, { keyOnly: true }).transport !== "ssh") return false;
    step(t("the new login key already works", "der neue Anmeldeschlüssel geht schon"));
  } else {
    const added = runRemote(way.args, first.transport, addKeyCommand(publicKey));
    if (added.status !== 0 || !/ok/.test(added.stdout)) {
      step(t(`the device did not take the public key: ${added.stderr.trim() || added.stdout.trim()}`, `das Gerät hat den öffentlichen Schlüssel nicht genommen: ${added.stderr.trim() || added.stdout.trim()}`));
      return false;
    }
    step(t("public key put on the device", "öffentlicher Schlüssel am Gerät abgelegt"));
  }

  // 2. Bewiesen, bevor etwas widerrufen wird.
  const mine = baseArgs(fields, { batch: true, key: sshName });
  const proof = transportOf(mine.args, mine.host, { keyOnly: true });
  if (proof.transport === "none") {
    step(t(`login with the new key failed (${proof.message}). Nothing revoked.`, `Anmeldung mit dem neuen Schlüssel gescheitert (${proof.message}). Nichts widerrufen.`));
    return false;
  }
  step(
    proof.transport === "ssh"
      ? t("login with the new key works, only the key is allowed", "Anmeldung mit dem neuen Schlüssel geht, nur der Schlüssel ist zugelassen")
      : t("tested locally (this computer is the device): the key stands in authorized_keys", "lokal geprüft (dieser Rechner ist das Gerät): der Schlüssel steht in authorized_keys")
  );
  const transport = proof.transport;

  // 3. Der eigene Kit-Schlüssel.
  const issued = createKey(mine.args, transport, keyName);
  if (!issued.ok) {
    step(t(`no kit key: ${issued.message}. Nothing revoked.`, `kein Kit-Schlüssel: ${issued.message}. Nichts widerrufen.`));
    return false;
  }
  try {
    setSecret(ref, issued.key);
  } catch (error) {
    step(t(`the kit key could not be stored: ${error.message}`, `der Kit-Schlüssel ließ sich nicht ablegen: ${error.message}`));
    return false;
  }
  step(t(`kit key "${keyName}" issued by the device and stored as ${ref}; its plain text is shown nowhere`, `Kit-Schlüssel "${keyName}" vom Gerät ausgestellt und als ${ref} abgelegt; sein Klartext wird nirgends gezeigt`));
  writeFrontmatter(file, { ssh_key: sshName, api_key_ref: ref, checked: now() });

  // 4. Erst jetzt die alten.
  let list = listKeys(mine.args, transport, issued.key);
  const myPrefix = list.ok && list.mine ? list.mine.prefix : "";
  if (oldPrefix && oldPrefix !== myPrefix && list.ok && list.keys.some((k) => k.prefix === oldPrefix)) {
    const gone = revokeKey(mine.args, transport, oldPrefix);
    step(gone.ok ? t(`old kit key ${oldPrefix} revoked`, `alter Kit-Schlüssel ${oldPrefix} widerrufen`) : t(`old kit key ${oldPrefix} not revoked: ${gone.message}`, `alter Kit-Schlüssel ${oldPrefix} nicht widerrufen: ${gone.message}`));
  } else if (oldPrefix) {
    step(t(`old kit key ${oldPrefix} is no longer on the device's list`, `alter Kit-Schlüssel ${oldPrefix} steht nicht mehr in der Liste des Geräts`));
  } else {
    step(t("start of the old kit key unknown: see the list below and decide", "Anfang des alten Kit-Schlüssels unbekannt: siehe die Liste unten und entscheide"));
  }
  if (oldFingerprint) {
    const removed = runRemote(mine.args, transport, removeKeyCommand(oldFingerprint));
    step(
      removed.status === 0
        ? t(`old login key removed (${(removed.stdout.match(/removed \d+/) || ["removed 0"])[0]})`, `alter Anmeldeschlüssel herausgenommen (${(removed.stdout.match(/removed \d+/) || ["removed 0"])[0]})`)
        : t(`old login key not removed: ${removed.stderr.trim()}`, `alter Anmeldeschlüssel nicht herausgenommen: ${removed.stderr.trim()}`)
    );
  } else {
    step(t("fingerprint of the old login key unknown: see the list below", "Fingerabdruck des alten Anmeldeschlüssels unbekannt: siehe die Liste unten"));
  }

  // 5. Die anderen gültigen, auf Wunsch.
  list = listKeys(mine.args, transport, issued.key);
  if (arg["revoke-others"] && list.ok) {
    revokeOthers(mine.args, transport, issued.key, step);
    list = listKeys(mine.args, transport, issued.key);
  }

  // 6. Nachgezählt am Gerät.
  const validKit = list.ok ? list.keys.filter((k) => validLine(k.line)) : [];
  const others = validKit.filter((k) => !k.mine);
  step(
    list.ok
      ? t(`counted on the device: ${validKit.length} valid kit key(s), yours is ${validKit.some((k) => k.mine) ? "among them" : "NOT among them"}`, `am Gerät nachgezählt: ${validKit.length} gültige Kit-Schlüssel, deiner ${validKit.some((k) => k.mine) ? "ist dabei" : "ist NICHT dabei"}`)
      : t(`kit keys not countable: ${list.message}`, `Kit-Schlüssel nicht zählbar: ${list.message}`)
  );
  for (const k of others) line(`      ${k.line}`);
  if (others.length) {
    step(t(`${others.length} other valid kit key(s) remain. Revoke them with --accept --revoke-others --yes if they are not yours.`, `${others.length} andere gültige Kit-Schlüssel bleiben. Mit --accept --revoke-others --yes widerrufen, wenn sie nicht deine sind.`));
  }
  const logins = parseFingerprints(runRemote(mine.args, transport, listKeysCommand()).stdout);
  const stillOld = oldFingerprint && logins.some((l) => l.fingerprint === oldFingerprint);
  step(t(`${logins.length} login key(s) on the device; the old one is ${stillOld ? "STILL THERE" : "gone"}`, `${logins.length} Anmeldeschlüssel am Gerät; der alte ist ${stillOld ? "NOCH DA" : "weg"}`));
  for (const l of logins.filter((l) => l.fingerprint !== newFingerprint)) {
    line(`      ${l.fingerprint} ${l.comment}`);
  }

  appendFileSync(
    file,
    `\n### ${now()} · Übergabe übernommen\n` +
      `Eigener Anmeldeschlüssel ${sshName} (${newFingerprint}) und eigener Kit-Schlüssel (Eintrag ${ref}) am Gerät. ` +
      `Alter Kit-Schlüssel ${oldPrefix || "unbekannt"} und alter Anmeldeschlüssel ${oldFingerprint || "unbekannt"} widerrufen beziehungsweise entfernt. ` +
      `Am Gerät nachgezählt: ${validKit.length} gültige Kit-Schlüssel, ${logins.length} Anmeldeschlüssel.\n`
  );
  writeFrontmatter(HANDOVER, { [`done_${slug}`]: today() });
  return !stillOld && validKit.some((k) => k.mine);
}

function accept() {
  if (!existsSync(HANDOVER)) {
    fail(t("There is no business/handover.md. This copy was not handed over.", "Es gibt kein business/handover.md. Diese Kopie wurde nicht übergeben."));
  }
  const devices = targets();
  if (!devices.length) fail(t("No device under devices/.", "Kein Gerät unter devices/."));
  if (!yes) line(t("Plan (nothing changes without --yes):", "Plan (ohne --yes ändert sich nichts):"));
  let allOk = true;
  for (const device of devices) {
    if (!acceptDevice(device)) allOk = false;
  }
  const s = handoverState();
  if (yes && s.state === "accepted") writeFrontmatter(HANDOVER, { status: "accepted", accepted: today() });
  if (!yes) line(t("\nWith --yes the kit does exactly this, device by device.", "\nMit --yes tut das Kit genau das, Gerät für Gerät."));
  process.exit(allOk ? 0 : 1);
}

// --- --authorize -------------------------------------------------------------------

function authorize() {
  const path = str(arg.authorize);
  if (!path || !existsSync(path)) {
    fail(t("Name the file with the public key: --authorize <file>.", "Nenne die Datei mit dem öffentlichen Schlüssel: --authorize <Datei>."));
  }
  const publicKey = readFileSync(path, "utf8").trim().split(/\r?\n/)[0];
  if (!validPublicKey(publicKey)) {
    fail(t("That is not a public key (it must start with ssh-ed25519, ssh-rsa or similar). A private key is never accepted here.", "Das ist kein öffentlicher Schlüssel (er beginnt mit ssh-ed25519, ssh-rsa oder ähnlich). Ein privater wird hier nie angenommen."));
  }
  const [device] = targets();
  if (!device || targets().length !== 1) fail(t("Name the device: --device <device>.", "Nenne das Gerät: --device <Gerät>."));
  const fields = readFrontmatter(deviceFile(device)).fields;
  const way = baseArgs(fields);
  line(t(`Puts this public key on ${device} (${way.label}): ${publicKey.split(/\s+/)[2] || publicKey.slice(0, 30)}`, `Legt diesen öffentlichen Schlüssel auf ${device} (${way.label}) ab: ${publicKey.split(/\s+/)[2] || publicKey.slice(0, 30)}`));
  if (!yes) {
    line(t("Nothing changed. With --yes it is done.", "Nichts geändert. Mit --yes wird es getan."));
    process.exit(0);
  }
  const { transport } = transportOf(way.args, way.host);
  if (transport === "none") fail(t(`No connection to ${way.label}.`, `Keine Verbindung zu ${way.label}.`));
  const done = runRemote(way.args, transport, addKeyCommand(publicKey));
  if (done.status !== 0 || !/ok/.test(done.stdout)) fail(done.stderr.trim() || t("The device refused.", "Das Gerät hat abgelehnt."));
  line(t("Done. The new person can now run --accept.", "Erledigt. Der Neue kann jetzt --accept ausführen."));
  process.exit(0);
}

// --- --prove -----------------------------------------------------------------------

async function prove() {
  let closed = true;
  let unclear = false;
  for (const device of targets()) {
    const fields = readFrontmatter(deviceFile(device)).fields;
    line(`\n${t("Device", "Gerät")} ${device}`);

    if (fields.ssh_key && existsSync(fields.ssh_key.startsWith("/") ? fields.ssh_key : join(homedir(), ".ssh", fields.ssh_key))) {
      const way = baseArgs(fields, { batch: true });
      const tried = keyLogin(way.args);
      if (tried.ok) {
        closed = false;
        line("  - " + t(`LOGIN STILL WORKS with the key ${fields.ssh_key}`, `ANMELDUNG GEHT NOCH mit dem Schlüssel ${fields.ssh_key}`));
      } else if (/timed out|refused|unreachable|resolve|No route/i.test(tried.message)) {
        unclear = true;
        line("  - " + t(`login not testable: ${tried.message}`, `Anmeldung nicht prüfbar: ${tried.message}`));
      } else {
        line("  - " + t(`login with the key ${fields.ssh_key} is refused: ${tried.message}`, `Anmeldung mit dem Schlüssel ${fields.ssh_key} wird abgewiesen: ${tried.message}`));
      }
    } else {
      line("  - " + t("no login key in this copy: nothing to test", "kein Anmeldeschlüssel in dieser Kopie: nichts zu prüfen"));
    }

    const key = fields.api_key_ref ? getSecret(fields.api_key_ref) : null;
    if (!key) {
      line("  - " + t("no kit key in this store: nothing to test", "kein Kit-Schlüssel in dieser Ablage: nichts zu prüfen"));
      continue;
    }
    const base = fields.api_base || (fields.address ? `https://${fields.address}` : "");
    if (!base) {
      unclear = true;
      line("  - " + t("no address in the device file", "keine Adresse in der Geräteakte"));
      continue;
    }
    let answer;
    try {
      answer = await call({
        base,
        key,
        method: "GET",
        path: CONTRACT_PATH,
        insecure: (fields.tls || "").toLowerCase() === "selfsigned",
      });
    } catch (error) {
      unclear = true;
      line("  - " + t(`kit key not testable: ${error.message}`, `Kit-Schlüssel nicht prüfbar: ${error.message}`));
      continue;
    }
    if (answer.status === 401 || answer.status === 403) {
      line("  - " + t(`the kit key is refused (${answer.status})`, `der Kit-Schlüssel wird abgewiesen (${answer.status})`));
    } else if (answer.ok) {
      closed = false;
      line("  - " + t("THE KIT KEY STILL WORKS", "DER KIT-SCHLÜSSEL GEHT NOCH"));
    } else {
      unclear = true;
      line("  - " + t(`kit key not testable: ${reason(answer)}`, `Kit-Schlüssel nicht prüfbar: ${reason(answer)}`));
    }
  }
  if (!closed) {
    line(t("\nNot closed. The handover is not finished.", "\nNicht geschlossen. Die Übergabe ist nicht abgeschlossen."));
    process.exit(1);
  }
  if (unclear) {
    line(t("\nNothing still works, but at least one test could not be made. That is not a proof.", "\nNichts geht mehr, aber mindestens eine Prüfung ließ sich nicht machen. Das ist kein Beweis."));
    process.exit(2);
  }
  line(t("\nClosed: neither the login key nor the kit key of this copy gets in any more.", "\nGeschlossen: weder der Anmeldeschlüssel noch der Kit-Schlüssel dieser Kopie kommt noch hinein."));
  line(
    t(
      "You may now forget the dead entries (node .ara/tools/secrets.mjs) and remove the key from ~/.ssh.",
      "Du kannst die toten Einträge jetzt vergessen (node .ara/tools/secrets.mjs) und den Schlüssel aus ~/.ssh nehmen."
    )
  );
  process.exit(0);
}

// --- Ablauf ------------------------------------------------------------------------

if (arg.prepare) await prepare();
else if (arg.accept) accept();
else if (arg.authorize) authorize();
else if (arg.prove) await prove();
else showStatus();
