#!/usr/bin/env node
/**
 * Bring a device to a new version of Arasul: say the duration and the way back first, ask
 * the device to update itself through its interface, watch it, measure before and after.
 *
 *   node .ara/tools/upgrade.mjs --device orin                      the plan, changes nothing
 *   node .ara/tools/upgrade.mjs --customer mueller --device werk2
 *   node .ara/tools/upgrade.mjs --device orin --apply --yes        update, watch, compare
 *   node .ara/tools/upgrade.mjs --device orin --back --yes         back to the previous version
 *
 * **The way is the device's interface, not SSH (K28).** The device fetches the package itself,
 * checks its checksum, backs up, builds and switches, and reports each step. The kit needs
 * a key with the scope system:update: the kit key if it carries it, else a key for this one
 * occasion that the kit creates with the administrator session and revokes at the end. No SSH
 * access is needed. The way over SSH (kit fetches the artifact, ships it, runs install.sh,
 * restarts the computer) stays as an explicit fallback: add --ssh to any call below.
 *
 *   node .ara/tools/upgrade.mjs --device orin --ssh --prepare --yes   snapshot and backup, nothing deployed (SSH only)
 *   node .ara/tools/upgrade.mjs --device orin --ssh --apply --yes     deploy over SSH, restart, compare
 *
 * Options:
 *   --ssh                   the explicit fallback: everything below except --back goes over SSH
 *   --back                  ask the device to go back to the previous version (interface only)
 *   --login-user <name> --password-ref <NAME>   the account for the administrator session
 *   --github                (SSH only) the artifact from the public release file with its checksum, as
 *                           an explicit choice. Without a customer token nothing else is
 *                           offered, and it is never taken silently
 *   --repo <owner/name>     (SSH only) where the release lies, when the mirror does not name it
 *   --version <x.y.z>       a particular release instead of the newest
 *   --no-reboot             (SSH only) leave out the restart (the report says so)
 *   --insecure              accept a self-signed certificate
 *
 * **The plan comes first, and it changes nothing.** It names the version on the device and
 * the new one, what happens, how long it takes (measured, with date and device) and the way
 * back. Where the product names no way back to the previous version, the plan says exactly
 * that, and says what the backup does restore.
 *
 * **Nothing is deployed that is not newer.** With the same or an older version the command
 * ends with one sentence, before it backs anything up.
 *
 * **The backup is checked, not assumed.** The tool asks the device for a backup, then lists
 * the backups and demands new ones. The administrator session comes from `device.mjs
 * --admin-login`: the kit key carries `app:deploy` and nothing else, and no key opens
 * the backup. The password is never shown.
 *
 * **The artifact comes the customer's way:** from `arasul.de/api/download` with the token from
 * the secret store, the checksum from the release file beside it. Without a token the tool
 * says so in one sentence and stops, unless `--github` was given.
 *
 * Afterwards the tool compares accounts, licence, apps with their data, flows, models and
 * company folders with the state before, restarts the device and compares once more. The
 * report lies with the device, the entry in its runsheet, for a customer also in `history/`.
 *
 * === deutsch ===
 *
 * Ein Gerät auf eine neue Fassung von Arasul bringen: vorher Dauer und Rückweg sagen, das Gerät
 * über seine Schnittstelle bitten, sich selbst zu aktualisieren, zusehen, vorher und nachher messen.
 *
 *   node .ara/tools/upgrade.mjs --device orin                      der Plan, ändert nichts
 *   node .ara/tools/upgrade.mjs --customer mueller --device werk2
 *   node .ara/tools/upgrade.mjs --device orin --apply --yes        aktualisieren, zusehen, vergleichen
 *   node .ara/tools/upgrade.mjs --device orin --back --yes         zurück auf die vorige Fassung
 *
 * **Der Weg ist die Schnittstelle des Geräts, nicht SSH (K28).** Das Gerät holt das Paket selbst,
 * prüft die Prüfsumme, sichert, baut und schaltet um und meldet jeden Schritt. Das Kit braucht einen
 * Schlüssel mit dem Bereich system:update: den Kit-Schlüssel, wenn er ihn trägt, sonst einen Schlüssel
 * für diesen einen Anlass, den das Kit mit der Sitzung als Administrator anlegt und am Ende widerruft.
 * Ein SSH-Zugang ist nicht nötig. Der Weg über SSH (das Kit holt das Artefakt, schiebt es hin, startet
 * install.sh, startet den Rechner neu) bleibt als ausdrücklicher Rückfall: --ssh zu jedem Aufruf unten.
 *
 *   node .ara/tools/upgrade.mjs --device orin --ssh --prepare --yes   Stand festhalten und sichern, nichts einspielen (nur SSH)
 *   node .ara/tools/upgrade.mjs --device orin --ssh --apply --yes     über SSH einspielen, neu starten, vergleichen
 *
 * Optionen:
 *   --ssh                   der ausdrückliche Rückfall: alles unten außer --back geht über SSH
 *   --back                  das Gerät bitten, auf die vorige Fassung zurückzugehen (nur Schnittstelle)
 *   --login-user <name> --password-ref <NAME>   das Konto für die Sitzung als Administrator
 *   --github                (nur SSH) das Artefakt aus der öffentlichen Release-Datei samt Prüfsumme, als
 *                           ausdrückliche Wahl. Ohne Kunden-Token wird nichts anderes angeboten,
 *                           und der Weg wird nie still genommen
 *   --repo <inhaber/name>   (nur SSH) wo das Release liegt, wenn der Spiegel es nicht nennt
 *   --version <x.y.z>       ein bestimmtes Release statt des neuesten
 *   --no-reboot             (nur SSH) den Neustart auslassen (der Bericht sagt es)
 *   --insecure              ein selbst ausgestelltes Zertifikat annehmen
 *
 * **Der Plan kommt zuerst, und er ändert nichts.** Er nennt die Fassung am Gerät und die
 * neue, was passiert, wie lange es dauert (gemessen, mit Datum und Gerät) und den Rückweg.
 * Nennt das Produkt keinen Weg zurück auf die vorige Fassung, sagt der Plan genau das und
 * sagt, was die Sicherung zurückbringt.
 *
 * **Eingespielt wird nur, was neuer ist.** Bei gleicher oder älterer Fassung endet der
 * Befehl mit einem Satz, bevor er etwas sichert.
 *
 * **Die Sicherung wird geprüft, nicht angenommen.** Das Werkzeug bittet das Gerät um eine
 * Sicherung, listet danach die Sicherungen und verlangt neue. Die Sitzung als Administrator
 * kommt aus `device.mjs --admin-login`: der Kit-Schlüssel trägt `app:deploy` und sonst
 * nichts, und keiner öffnet die Sicherung. Das Passwort wird nie angezeigt.
 *
 * **Das Artefakt kommt auf dem Kundenweg:** von `arasul.de/api/download` mit dem Token aus
 * der Geheimnis-Ablage, die Prüfsumme aus der Release-Datei daneben. Ohne Token sagt das
 * Werkzeug das in einem Satz und hält an, außer es wurde `--github` angegeben.
 *
 * Danach vergleicht das Werkzeug Konten, Lizenz, Apps mit Daten, Flows, Modelle und
 * Firmenordner mit dem Stand vorher, startet das Gerät neu und vergleicht noch einmal.
 * Der Bericht liegt beim Gerät, der Eintrag in seinem Laufzettel, bei einem Kunden auch
 * in `history/`.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, createWriteStream, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { t } from "./lib/i18n.mjs";
import { ROOT, customerPath, ensureDir, fail, helpOnly, now, parseArgs, readDevice, sshArgs, today } from "./lib/kit.mjs";
import { baseUrl, call, reason } from "./lib/arasul.mjs";
import { connect, withContract } from "./lib/link.mjs";
import { APPLEDOUBLE, installCommand, installTarget, installerEntry, packEnv, releaseData, releaseVersion, runInstaller, runRemote, ship } from "./lib/install.mjs";
import { portalBase } from "./lib/licence.mjs";
import { getSecret } from "./lib/secrets.mjs";
import { HEALTH_PROBE, parseHealth, readHealth } from "./lib/maintain.mjs";
import { TOPICS, INSTALLATION_PROBE, compareSnapshots, readTopic, durationSentence, githubRelease, installedVersion, lostAnything, minutes, parseFacts, parseSha256, repoFrom, routeListed, routeRows, sha256File, verdict, verdictSentence, versionIn, wayBackLines } from "./lib/upgrade.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();
// Die Schnittstelle von GitHub, umlenkbar für den Selbsttest wie ARA_MIRROR und ARASUL_BASIS.
const GITHUB_API = process.env.ARA_GITHUB_API || "https://api.github.com";
// Wohin der Spiegel gehört, bevor dieser Lauf ARA_MIRROR auf das ausgepackte Artefakt biegt.
const MIRROR_HOME = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
const str = (v) => (typeof v === "string" ? v : null);

if (!str(arg.device) && !str(arg.customer)) {
  console.log(
    t(
      [
        "Update a device through its interface: plan, update, watch, compare",
        "",
        "  --device <name>        which device",
        "  --customer <name>      for a customer device",
        "  (nothing more)         the plan, nothing is changed",
        "  --apply --yes          the device updates itself, the kit watches and compares",
        "  --back --yes           the device goes back to the previous version",
        "  --ssh                  the explicit fallback: over SSH, with --prepare or --apply",
        "  --login-user <name> --password-ref <NAME>   account of the administrator session",
        "  --github               (SSH) the public release file with its checksum, as an explicit choice",
        "  --repo <owner/name>    (SSH) where the release lies",
        "  --version <x.y.z>      a particular release",
        "  --no-reboot            (SSH) leave out the restart",
        "  --insecure             accept a self-signed certificate",
      ].join("\n"),
      [
        "Ein Gerät über seine Schnittstelle aktualisieren: Plan, Update, Zusehen, Vergleich",
        "",
        "  --device <name>        welches Gerät",
        "  --customer <name>      bei einem Kundengerät",
        "  (nichts weiter)        der Plan, es wird nichts geändert",
        "  --apply --yes          das Gerät aktualisiert sich selbst, das Kit sieht zu und vergleicht",
        "  --back --yes           das Gerät geht auf die vorige Fassung zurück",
        "  --ssh                  der ausdrückliche Rückfall: über SSH, mit --prepare oder --apply",
        "  --login-user <name> --password-ref <NAME>   Konto der Sitzung als Administrator",
        "  --github               (SSH) die öffentliche Release-Datei samt Prüfsumme, als ausdrückliche Wahl",
        "  --repo <inhaber/name>  (SSH) wo das Release liegt",
        "  --version <x.y.z>      ein bestimmtes Release",
        "  --no-reboot            (SSH) den Neustart auslassen",
        "  --insecure             ein selbst ausgestelltes Zertifikat annehmen",
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
const place = device.customer ? `${device.customer}/${device.device}` : device.device;
const mode = arg.back ? "back" : arg.apply ? "apply" : arg.prepare ? "prepare" : "plan";
const call_ = `node .ara/tools/upgrade.mjs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device}${arg.ssh ? " --ssh" : ""}`;

if (mode === "back" && arg.ssh) {
  fail(t("Going back exists only through the interface of the device, not over SSH.", "Der Rückweg gibt es nur über die Schnittstelle des Geräts, nicht über SSH."));
}

if (mode !== "plan" && !arg.yes) {
  fail(
    t(
      `${mode === "apply" ? "Deploying" : mode === "back" ? "Going back" : "Backing up"} changes ${place}. First the plan: ${call_}\n` +
        "When the human has confirmed intent, target and way back, add --yes.",
      `${mode === "apply" ? "Das Einspielen" : mode === "back" ? "Der Rückweg" : "Das Sichern"} ändert ${place}. Erst der Plan: ${call_}\n` +
        "Hat der Mensch Absicht, Ziel und Rückweg bestätigt, kommt --yes dazu."
    )
  );
}

// Der Weg ist die Schnittstelle des Geräts. SSH ist der ausdrückliche Rückfall (--ssh).
if (!arg.ssh) {
  const { runViaInterface } = await import("./lib/upgrade-api.mjs");
  process.exit(await runViaInterface({ device, arg, mode, place, call_ }));
}

/** Eine Zeile an den Menschen, mit Zeit, damit das Protokoll der Läufe lesbar bleibt. */
const say = (text) => console.log(text);
const step = (text) => say(`\n== ${text}`);

// --- Das Gerät ---------------------------------------------------------------

const address = String(device.fields.address || device.fields.hostname || "");
const local = ["localhost", "127.0.0.1", "::1"].includes(address);
const transport = local ? "local" : "ssh";
let ssh = { args: [], label: "local" };
if (!local) {
  try {
    ssh = sshArgs(device.fields, { batch: true });
  } catch (error) {
    fail(error.message);
  }
}
const sshInteractive = local ? { args: [], label: "local" } : sshArgs(device.fields);
const remote = (command, options = {}) => runRemote(ssh.args, transport, command, options);

/** Das Gerät antwortet auf SSH. Ohne das gibt es nichts zu messen und nichts einzuspielen. */
{
  const probe = remote("echo bereit");
  if (probe.status !== 0 || !/bereit/.test(probe.stdout)) {
    fail(
      t(
        `No SSH to ${place} (${ssh.label}): ${probe.stderr.trim().split("\n")[0] || `return code ${probe.status}`}.\n` +
          `node .ara/tools/remote.mjs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device} --check says more.`,
        `Kein SSH zu ${place} (${ssh.label}): ${probe.stderr.trim().split("\n")[0] || `Rückgabecode ${probe.status}`}.\n` +
          `node .ara/tools/remote.mjs${device.customer ? ` --customer ${device.customer}` : ""} --device ${device.device} --check sagt mehr.`
      )
    );
  }
}

const facts = parseFacts(remote(INSTALLATION_PROBE).stdout);
const docsDir = facts.dir || null;

/** Eine Anleitung vom Gerät, oder `null`. Die Fassung, die dort läuft. */
function deviceDoc(rel) {
  if (!docsDir) return null;
  const read = remote(`cat '${docsDir}/docs/${rel}'`, {});
  return read.status === 0 ? read.stdout : null;
}

const apiReference = deviceDoc("api/API_REFERENCE.md");
const routes = apiReference ? routeRows(apiReference) : [];

// --- Die Sitzung als Administrator -------------------------------------------

/**
 * Das Kit hat einen Schlüssel und keine Sitzung. Die Anmeldung geht durch
 * `device.mjs --admin-login`, damit es eine einzige Stelle gibt, die ein Passwort aus der
 * Ablage in eine Anmeldung verwandelt. Der Ausweis kommt über den Ausgabestrom dieses
 * Prozesses zurück und wird nie ausgegeben.
 */
function adminSession() {
  const run = spawnSync(
    "node",
    [
      join(ROOT, ".ara", "tools", "device.mjs"),
      ...(device.customer ? ["--customer", device.customer] : []),
      "--name",
      device.device,
      "--admin-login",
      "--token",
      ...(str(arg["login-user"]) ? ["--login-user", str(arg["login-user"])] : []),
      ...(str(arg["password-ref"]) ? ["--password-ref", str(arg["password-ref"])] : []),
      ...(arg.insecure ? ["--insecure"] : []),
    ],
    { encoding: "utf8" }
  );
  if (run.status !== 0 || !run.stdout.trim()) {
    return { ok: false, reason: (run.stderr || run.stdout || "").trim().split("\n").slice(0, 3).join(" ") };
  }
  return { ok: true, bearer: run.stdout.trim() };
}

let base;
try {
  base = baseUrl(device.fields.api_base || address);
} catch (error) {
  fail(error.message);
}
const insecure = Boolean(arg.insecure) || String(device.fields.tls || "").toLowerCase() === "selfsigned";
const session = adminSession();

/** Ein Aufruf mit der Sitzung. Fehler werden Antworten, keine Abstürze. */
async function admin(method, path, options = {}) {
  if (!session.ok) return { ok: false, status: 0, error: { message: session.reason }, data: null, body: null };
  try {
    return await call({ base, key: `Bearer ${session.bearer}`, keyHeader: "Authorization", method, path, insecure, ...options });
  } catch (error) {
    return { ok: false, status: 0, error: { message: error.message }, data: null, body: null };
  }
}

// --- Welche Fassung gilt, und welche ist die neueste -------------------------

async function contractVersion() {
  try {
    const link = await withContract(connect(device, { base: str(arg.base), insecure }), device);
    return link.contract?.arasul ?? null;
  } catch {
    return null;
  }
}

const status = session.ok ? await admin("GET", "/api/update/status") : null;
const installed = installedVersion({
  contract: await contractVersion(),
  installation: facts.installation,
  status: status?.ok ? status.body?.fassung?.version : null,
});

const token = getSecret("ARASUL_TOKEN");
const useGithub = Boolean(arg.github);
const wanted = str(arg.version) ? versionIn(str(arg.version)) : null;
const repoNamed = str(arg.repo)
  ? { repo: str(arg.repo), from: t("the call", "Aufruf") }
  : str(releaseData()?.repo)
    ? { repo: str(releaseData()?.repo), from: t("the mirror", "Spiegel") }
    : repoFrom(deviceDoc("ops/AUSLIEFERUNG.md"))
      ? { repo: repoFrom(deviceDoc("ops/AUSLIEFERUNG.md")), from: t("the delivery manual on the device", "Auslieferung am Gerät") }
      : { repo: null, from: null };
const repo = repoNamed.repo;

/** Die neueste Fassung und woher das Kit sie hat. Gelesen, nie geraten. */
async function newest() {
  const notes = [];
  if (token && !useGithub) {
    if (wanted) notes.push(t("--version names a release; the portal delivers only its current one, so it was ignored.", "--version nennt ein Release; das Portal liefert nur sein aktuelles, darum wurde es übergangen."));
    try {
      const url = new URL("/api/download", portalBase());
      url.searchParams.set("token", token);
      url.searchParams.set("pruefen", "1");
      const response = await fetch(url, { redirect: "follow" });
      const body = await response.json().catch(() => null);
      const number = versionIn(body?.fassung ?? body?.version ?? body?.tag);
      if (response.ok && number) return { version: number, source: `${portalBase()}/api/download`, via: "portal", notes };
      notes.push(
        t(
          `The portal did not name a version (status ${response.status}${body?.error ? `, ${body.error}` : ""}).`,
          `Das Portal nannte keine Fassung (Status ${response.status}${body?.error ? `, ${body.error}` : ""}).`
        )
      );
    } catch (error) {
      notes.push(t(`The portal did not answer: ${error.message}`, `Das Portal hat nicht geantwortet: ${error.message}`));
    }
  }
  if (!repo) {
    notes.push(
      t(
        "No release repository is named: neither the mirror nor the delivery manual on the device carries one, and --repo was not given.",
        "Kein Release-Repository ist genannt: weder der Spiegel noch die Auslieferung am Gerät trägt eines, und --repo wurde nicht angegeben."
      )
    );
    return { version: null, source: null, via: null, notes };
  }
  try {
    const path = wanted ? `tags/v${wanted}` : "latest";
    const response = await fetch(`${GITHUB_API}/repos/${repo}/releases/${path}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "ara-kit" },
    });
    const release = response.ok ? githubRelease(await response.json()) : null;
    if (release) return { version: release.version, source: `github.com/${repo}, ${t("repository named by", "Repository genannt von")}: ${repoNamed.from}`, via: "github", release, notes };
    notes.push(t(`GitHub names no release for ${repo} (status ${response.status}).`, `GitHub nennt für ${repo} kein Release (Status ${response.status}).`));
  } catch (error) {
    notes.push(t(`GitHub did not answer: ${error.message}`, `GitHub hat nicht geantwortet: ${error.message}`));
  }
  return { version: null, source: null, via: null, notes };
}

const latest = await newest();
const kind = verdict(installed.version, latest.version);

// --- Der Rückweg, wie das Produkt ihn nennt ----------------------------------

function wayBack() {
  const files = ["ops/AUSLIEFERUNG.md", "ops/BACKUP_SYSTEM.md"].map((rel) => ({ file: rel, text: deviceDoc(rel) }));
  const read = files.filter((f) => f.text !== null);
  const lines = wayBackLines(read);
  const restore = routeListed(routes, "POST", "/api/backup/wiederherstellung");
  return { read: read.map((f) => f.file), lines, restore };
}

const back = wayBack();

// --- Der Plan ----------------------------------------------------------------

function planLines() {
  const out = [t(`# Update plan for ${place}`, `# Plan für das Einspielen auf ${place}`), ""];
  out.push(t("## Versions", "## Fassungen"), "");
  out.push(
    installed.version
      ? t(
          `- On the device: ${installed.version} (${{ contract: "the contract", folder: "the installation folder", status: "the status route" }[installed.from]})`,
          `- Am Gerät: ${installed.version} (${{ contract: "der Kontrakt", folder: "der Installationsordner", status: "die Statusroute" }[installed.from]})`
        )
      : t("- On the device: not established", "- Am Gerät: nicht festgestellt")
  );
  if (installed.stamp) {
    out.push(
      t(
        `- What runs now is reported as ${installed.stamp}. That is a state, not a release number; only the number is compared.`,
        `- Was gerade läuft, meldet das Gerät als ${installed.stamp}. Das ist ein Stand und keine Release-Nummer; verglichen wird nur die Nummer.`
      )
    );
  }
  out.push(
    latest.version
      ? t(`- Newest: ${latest.version} (${latest.source})`, `- Neueste: ${latest.version} (${latest.source})`)
      : t("- Newest: not established", "- Neueste: nicht festgestellt")
  );
  for (const note of latest.notes) out.push(`- ${note}`);
  out.push("", verdictSentence(kind, installed.version, latest.version), "");

  out.push(t("## Where the artifact comes from", "## Woher das Artefakt kommt"), "");
  if (token && !useGithub) {
    out.push(
      t(
        "- The customer's way: the portal, with the token from the secret store. The checksum comes from the release file beside it.",
        "- Der Kundenweg: das Portal, mit dem Token aus der Geheimnis-Ablage. Die Prüfsumme kommt aus der Release-Datei daneben."
      )
    );
  } else if (useGithub) {
    out.push(
      t(
        `- The public release file${repo ? ` of ${repo}` : ""} with its checksum, because --github was given.`,
        `- Die öffentliche Release-Datei${repo ? ` von ${repo}` : ""} samt Prüfsumme, weil --github angegeben wurde.`
      )
    );
  } else {
    out.push(
      t(
        "- No customer token is stored (ARASUL_TOKEN), so the portal way is not open. The other way is the public release file with its checksum; it is taken only with --github, never silently.",
        "- Es ist kein Kunden-Token hinterlegt (ARASUL_TOKEN), der Weg über das Portal ist darum zu. Der andere Weg ist die öffentliche Release-Datei samt Prüfsumme; sie wird nur mit --github genommen, nie still."
      )
    );
  }

  out.push("", t("## What happens", "## Was passiert"), "");
  const steps = t(
    [
      "The kit notes the state: accounts, licence, apps with their data, flows, models, company folders.",
      "It fetches the artifact and checks its checksum. A wrong sum ends the run before anything on the device changes.",
      "It asks the device for a backup (POST /api/backup/sicherung) and checks that new backups lie in GET /api/backup/sicherungen.",
      "It puts the artifact onto the device and runs its install.sh there. You write no line of shell.",
      "The platform rebuilds and restarts; while it does, it is not reachable.",
      arg["no-reboot"] ? "No restart of the computer (--no-reboot), the report says so." : "It restarts the computer and waits until the containers are healthy again.",
      "It compares the state with the one before, files the report and the entry in the runsheet.",
    ],
    [
      "Das Kit hält den Stand fest: Konten, Lizenz, Apps mit Daten, Flows, Modelle, Firmenordner.",
      "Es holt das Artefakt und prüft die Prüfsumme. Eine falsche Summe beendet den Lauf, bevor sich am Gerät etwas ändert.",
      "Es bittet das Gerät um eine Sicherung (POST /api/backup/sicherung) und prüft, dass neue Sicherungen in GET /api/backup/sicherungen liegen.",
      "Es legt das Artefakt auf das Gerät und führt dort dessen install.sh aus. Du schreibst keine Zeile Shell.",
      "Die Plattform baut neu und startet neu; solange sie das tut, ist sie nicht erreichbar.",
      arg["no-reboot"] ? "Kein Neustart des Rechners (--no-reboot), der Bericht sagt es." : "Es startet den Rechner neu und wartet, bis die Container wieder gesund sind.",
      "Es vergleicht den Stand mit dem von vorher, legt den Bericht und den Eintrag im Laufzettel ab.",
    ]
  );
  steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));

  out.push("", t("## How long", "## Wie lange"), "", `- ${durationSentence()}`);

  out.push("", t("## The way back", "## Der Rückweg"), "");
  if (back.lines.length) {
    out.push(t("- The product's manuals name a way back; the lines, as they stand:", "- Die Anleitungen des Produkts nennen einen Weg zurück; die Zeilen, wie sie stehen:"));
    for (const hit of back.lines.slice(0, 6)) out.push(`  - ${hit.file}:${hit.line}: ${hit.text}`);
  } else {
    out.push(
      t(
        `- **The product names no way back to the previous version** (searched in ${back.read.join(", ") || "no manual, none could be read"} on the device). The kit invents none and does not count a restore of data as one.`,
        `- **Das Produkt nennt keinen Weg zurück auf die vorige Fassung** (gesucht in ${back.read.join(", ") || "keiner Anleitung, keine ließ sich lesen"} am Gerät). Das Kit erfindet keinen und zählt eine Wiederherstellung der Daten nicht als einen.`
      )
    );
  }
  out.push(
    back.restore
      ? t(
          "- What the backup brings back is the data, not the version: POST /api/backup/wiederherstellung puts the state of a backup back, as the API reference of the device lists it.",
          "- Was die Sicherung zurückbringt, sind die Daten und nicht die Fassung: POST /api/backup/wiederherstellung spielt den Stand einer Sicherung zurück, so wie die API-Referenz des Geräts es aufführt."
        )
      : t(
          "- The API reference of the device does not list a restore route, or could not be read. What a backup restores, the manual BACKUP_SYSTEM.md on the device says.",
          "- Die API-Referenz des Geräts führt keinen Weg zum Zurückspielen auf oder ließ sich nicht lesen. Was eine Sicherung zurückbringt, sagt die Anleitung BACKUP_SYSTEM.md am Gerät."
        )
  );
  if (!back.lines.length) {
    out.push(
      t(
        "- So tell the customer before: the update is a step forward. If the new version is bad, the way is a fixed release, not a step back.",
        "- Sag es dem Kunden also vorher: das Update ist ein Schritt nach vorn. Ist die neue Fassung schlecht, ist der Weg ein behobenes Release und kein Schritt zurück."
      )
    );
  }

  out.push("", t("## The session", "## Die Sitzung"), "");
  out.push(
    session.ok
      ? t("- Logged in as administrator; accounts, licence, apps and the backup can be read.", "- Als Administrator angemeldet; Konten, Lizenz, Apps und die Sicherung lassen sich lesen.")
      : t(
          `- No administrator session: ${session.reason}. Without it the backup and the comparison are not possible. Pass --login-user and --password-ref.`,
          `- Keine Sitzung als Administrator: ${session.reason}. Ohne sie gehen weder die Sicherung noch der Vergleich. --login-user und --password-ref angeben.`
        )
  );
  if (!apiReference) {
    out.push(
      t(
        "- The API reference of the device could not be read, so no route is called that it does not list.",
        "- Die API-Referenz des Geräts ließ sich nicht lesen, darum wird kein Weg gerufen, den sie nicht aufführt."
      )
    );
  }
  return out;
}

// --- Stand festhalten --------------------------------------------------------

async function snapshot() {
  const out = {};
  for (const topic of TOPICS) {
    out[topic.key] =
      !apiReference || !routeListed(routes, topic.verb, topic.path)
        ? { state: "kein-endpunkt", entries: [], text: t("the device's API reference does not list the route", "die API-Referenz des Geräts führt den Weg nicht auf") }
        : await readTopic(topic, admin, out);
  }
  return out;
}

function probeHealth() {
  const run = spawnSync(local ? "sh" : "ssh", local ? ["-s"] : [...ssh.args, "sh -s"], { input: HEALTH_PROBE, encoding: "utf8" });
  return run.status === 0 ? readHealth(parseHealth(run.stdout)) : null;
}

/** Container, die laufen und nicht erst anlaufen oder krank sind. */
const readyContainers = (health) =>
  (health?.containers || []).filter((c) => c.state === "running" && !/unhealthy|starting/i.test(c.status)).map((c) => c.name);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Wartet, bis wieder so viele Container bereit sind wie vorher. Zeit in Millisekunden. */
async function waitReady(expected, { limitMs = 15 * 60_000 } = {}) {
  const began = Date.now();
  let health = null;
  while (Date.now() - began < limitMs) {
    health = probeHealth();
    const ready = readyContainers(health);
    if (health && expected.every((name) => ready.includes(name))) return { ok: true, ms: Date.now() - began, health };
    await sleep(15_000);
  }
  return { ok: false, ms: Date.now() - began, health };
}

// --- Die Sicherung -----------------------------------------------------------

async function backUp() {
  const listed = (answer) => (Array.isArray(answer?.body?.data) ? answer.body.data : []);
  const listPath = "/api/backup/sicherungen";
  const makePath = "/api/backup/sicherung";
  for (const [verb, path] of [["GET", listPath], ["POST", makePath]]) {
    if (!routeListed(routes, verb, path)) {
      return { ok: false, text: t(`The device's API reference does not list ${verb} ${path}. No backup was made.`, `Die API-Referenz des Geräts führt ${verb} ${path} nicht auf. Es wurde nicht gesichert.`) };
    }
  }
  const before = await admin("GET", listPath);
  if (!before.ok) return { ok: false, text: t(`The list of backups could not be read: ${reason(before)}`, `Die Liste der Sicherungen ließ sich nicht lesen: ${reason(before)}`) };
  const known = new Set(listed(before).map((row) => row.name));
  const began = Date.now();
  // Die Sicherung antwortet erst, wenn sie fertig ist, und das dauert Minuten.
  const made = await admin("POST", makePath, { timeout: 30 * 60_000 });
  const ms = Date.now() - began;
  if (!made.ok) return { ok: false, ms, text: t(`The device refused the backup (status ${made.status}): ${reason(made)}`, `Das Gerät hat die Sicherung abgelehnt (Status ${made.status}): ${reason(made)}`) };
  const after = await admin("GET", listPath);
  if (!after.ok) return { ok: false, ms, text: t(`The list of backups could not be read afterwards: ${reason(after)}`, `Die Liste der Sicherungen ließ sich danach nicht lesen: ${reason(after)}`) };
  const fresh = listed(after).filter((row) => !known.has(row.name));
  if (!fresh.length) {
    return { ok: false, ms, text: t("The device answered the backup, but no new backup lies in the list. Nothing is deployed on that.", "Das Gerät hat die Sicherung beantwortet, in der Liste liegt aber keine neue. Darauf wird nichts eingespielt.") };
  }
  const bytes = fresh.reduce((sum, row) => sum + Number(row.bytes || 0), 0);
  return { ok: true, ms, fresh, bytes, count: fresh.length, before: known.size };
}

// --- Das Artefakt holen ------------------------------------------------------

async function download(url, file) {
  const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": "ara-kit" } });
  if (!response.ok || !response.body) {
    let text = "";
    try {
      text = (await response.text()).trim().slice(0, 300);
    } catch {
      /* ohne Text bleibt die Statusnummer */
    }
    throw new Error(text || t(`status ${response.status}`, `Status ${response.status}`));
  }
  const hash = createHash("sha256");
  let bytes = 0;
  const reader = Readable.fromWeb(response.body);
  reader.on("data", (chunk) => {
    hash.update(chunk);
    bytes += chunk.length;
  });
  await pipeline(reader, createWriteStream(file));
  return { sha256: hash.digest("hex"), bytes };
}

async function fetchArtifact(work) {
  const file = join(work, "artifact.tar.gz");
  let release = latest.release || null;
  if (!release && repo) {
    // Das Portal liefert die Datei, die Prüfsumme liegt am Release daneben.
    const response = await fetch(`${GITHUB_API}/repos/${repo}/releases/tags/v${latest.version}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "ara-kit" },
    }).catch(() => null);
    release = response?.ok ? githubRelease(await response.json()) : null;
  }
  if (!release?.sum) {
    throw new Error(
      t(
        "No checksum lies beside the release, so there is nothing to hold the file against. Nothing is deployed on an unchecked file.",
        "Neben dem Release liegt keine Prüfsumme, es gibt also nichts, wogegen die Datei zu halten wäre. Auf eine ungeprüfte Datei wird nichts eingespielt."
      )
    );
  }
  const expected = parseSha256(await (await fetch(release.sum.url, { redirect: "follow", headers: { "User-Agent": "ara-kit" } })).text());
  if (!expected) throw new Error(t(`${release.sum.name} holds no checksum.`, `${release.sum.name} enthält keine Prüfsumme.`));

  let got;
  let source;
  if (token && !useGithub) {
    const url = new URL("/api/download", portalBase());
    url.searchParams.set("token", token);
    got = await download(url, file);
    source = `${portalBase()}/api/download`;
  } else {
    got = await download(release.tarball.url, file);
    source = `github.com/${repo}, ${release.tarball.name}`;
  }
  if (got.sha256 !== expected) {
    throw new Error(
      t(
        `The checksum does not match: got ${got.sha256}, the release names ${expected}. The file was thrown away.`,
        `Die Prüfsumme stimmt nicht: bekommen ${got.sha256}, das Release nennt ${expected}. Die Datei wurde verworfen.`
      )
    );
  }
  return { file, sha256: got.sha256, bytes: got.bytes, source, release };
}

function unpack(file, dir) {
  mkdirSync(dir, { recursive: true });
  const run = spawnSync("tar", ["-xzf", file, "--exclude", APPLEDOUBLE, "-C", dir, "--strip-components=1"], { encoding: "utf8", env: packEnv() });
  if (run.status !== 0) throw new Error(t(`Unpacking failed: ${run.stderr.trim()}`, `Das Auspacken ist fehlgeschlagen: ${run.stderr.trim()}`));
}

// --- Ablauf ------------------------------------------------------------------

// Bei gleicher oder älterer Fassung endet das Einspielen mit einem Satz, ohne Plan und
// bevor etwas gesichert wird. Nur die Vorprüfung zeigt den Plan auch dann.
if (mode === "apply" && kind !== "update") {
  say(verdictSentence(kind, installed.version, latest.version));
  process.exit(0);
}

const plan = planLines();
say(plan.join("\n"));

if (mode === "plan") {
  say("\n" + t(`Nothing was changed. To deploy: ${call_} --apply --yes`, `Es wurde nichts geändert. Zum Einspielen: ${call_} --apply --yes`));
  process.exit(0);
}

if (!session.ok) fail(t("Without an administrator session there is no backup and no comparison. Nothing was changed.", "Ohne Sitzung als Administrator gibt es weder Sicherung noch Vergleich. Es wurde nichts geändert."));
if (!apiReference) fail(t("The API reference of the device could not be read. Nothing was changed.", "Die API-Referenz des Geräts ließ sich nicht lesen. Es wurde nichts geändert."));

const timeline = [];
const mark = (what, ok, detail = "") => {
  timeline.push({ at: now(), what, ok, detail });
  say(`${ok ? "ok" : "FEHLER"}  ${what}${detail ? `: ${detail}` : ""}`);
};

let work = null;
let artifactDir = null;
let artifact = null;
let outcome = "done";
let comparison = null;
let afterVersion = null;
let installMs = null;
let restartMs = null;
let backup = null;
let reboot = { done: false };

try {
  step(t("State before", "Stand vorher"));
  const healthBefore = probeHealth();
  const expectedContainers = readyContainers(healthBefore);
  const before = await snapshot();
  mark(
    t("State noted", "Stand festgehalten"),
    true,
    TOPICS.map((topic) => `${topic.label()} ${before[topic.key].state === "gelesen" ? before[topic.key].entries.length : t("unmeasured", "ungemessen")}`).join(", ")
  );
  mark(
    t("Containers ready before", "Container bereit vorher"),
    true,
    expectedContainers.length ? String(expectedContainers.length) : t("none (or no right to ask Docker); the wait afterwards has nothing to hold against", "keiner (oder kein Recht, Docker zu fragen); das Warten danach hat nichts, woran es sich hält")
  );

  if (mode === "apply") {
    step(t("Fetching the artifact", "Artefakt holen"));
    if (!token && !useGithub) {
      outcome = "stopped";
      mark(
        t("Artifact", "Artefakt"),
        false,
        t(
          "No customer token is stored (ARASUL_TOKEN). The public release file with its checksum would be the other way; say --github if you choose it.",
          "Es ist kein Kunden-Token hinterlegt (ARASUL_TOKEN). Der andere Weg wäre die öffentliche Release-Datei samt Prüfsumme; mit --github wählst du ihn."
        )
      );
      throw new Error("stop");
    }
    work = mkdtempSync(join(tmpdir(), "ara-upgrade-"));
    artifact = await fetchArtifact(work);
    mark(t("Artifact fetched, checksum holds", "Artefakt geholt, Prüfsumme stimmt"), true, `${artifact.source}, ${artifact.sha256.slice(0, 12)}…`);
    artifactDir = join(work, "artifact");
    unpack(artifact.file, artifactDir);
    process.env.ARA_MIRROR = artifactDir;
    const inside = releaseVersion(artifactDir);
    if (inside && inside !== latest.version) throw new Error(t(`The artifact says ${inside}, expected ${latest.version}.`, `Das Artefakt sagt ${inside}, erwartet war ${latest.version}.`));
    const entry = installerEntry();
    if (!entry.ok) throw new Error(entry.reason);
    artifact.entry = entry;
  }

  step(t("Backup", "Sicherung"));
  backup = await backUp();
  if (!backup.ok) {
    outcome = "stopped";
    mark(t("Backup", "Sicherung"), false, backup.text);
    throw new Error("stop");
  }
  mark(
    t("Backup made and checked", "Sicherung angelegt und geprüft"),
    true,
    t(
      `${backup.count} new entries in GET /api/backup/sicherungen (${backup.before} before), ${(backup.bytes / 1024 / 1024).toFixed(1)} MB, took ${minutes(backup.ms)}`,
      `${backup.count} neue Einträge in GET /api/backup/sicherungen (${backup.before} vorher), ${(backup.bytes / 1024 / 1024).toFixed(1)} MB, dauerte ${minutes(backup.ms)}`
    )
  );

  if (mode === "apply") {
    step(t("Deploying", "Einspielen"));
    const target = installTarget(latest.version);
    const shipped = await ship(ssh.args, transport, target, artifactDir);
    if (!shipped.ok) throw new Error(t(`The artifact did not reach the device: ${shipped.message}`, `Das Artefakt ist nicht am Gerät angekommen: ${shipped.message}`));
    mark(t("Artifact on the device", "Artefakt am Gerät"), true, target);
    const began = Date.now();
    const command = `cd ${target} && ${installCommand(artifact.entry, {}).command}`;
    const ran = await runInstaller(sshInteractive.args, transport, command);
    installMs = Date.now() - began;
    if (ran.status !== 0) {
      outcome = "failed";
      mark(t("install.sh", "install.sh"), false, t(`return code ${ran.status} after ${minutes(installMs)}`, `Rückgabecode ${ran.status} nach ${minutes(installMs)}`));
      throw new Error("stop");
    }
    mark(t("install.sh ran through", "install.sh ist durchgelaufen"), true, minutes(installMs));
    for (const trouble of ran.troubles || []) say(`  ! ${trouble}`);

    const ready = await waitReady(expectedContainers);
    mark(t("Containers healthy again", "Container wieder gesund"), ready.ok, `${readyContainers(ready.health).length} / ${expectedContainers.length}, ${minutes(ready.ms)}`);
    if (!ready.ok) {
      outcome = "failed";
      throw new Error("stop");
    }

    if (!arg["no-reboot"]) {
      step(t("Restart", "Neustart"));
      const bootBefore = parseFacts(remote(INSTALLATION_PROBE).stdout).boot;
      const began2 = Date.now();
      runRemote(sshInteractive.args, transport, "sudo reboot", { interactive: true });
      await sleep(20_000);
      let up = false;
      while (Date.now() - began2 < 10 * 60_000) {
        const probe = remote(INSTALLATION_PROBE);
        const boot = parseFacts(probe.stdout).boot;
        if (probe.status === 0 && boot && boot !== bootBefore) {
          up = true;
          break;
        }
        await sleep(10_000);
      }
      mark(t("Computer came back with a new boot", "Rechner ist mit neuem Start zurück"), up, minutes(Date.now() - began2));
      const again = up ? await waitReady(expectedContainers) : { ok: false, ms: 0 };
      restartMs = Date.now() - began2;
      reboot = { done: true, ok: up && again.ok };
      mark(t("Containers healthy after the restart", "Container gesund nach dem Neustart"), again.ok, minutes(restartMs));
      if (!reboot.ok) outcome = "failed";
    }
  }

  step(t("State after", "Stand nachher"));
  const nowFacts = parseFacts(remote(INSTALLATION_PROBE).stdout);
  const nowStatus = await admin("GET", "/api/update/status");
  afterVersion = installedVersion({ installation: nowFacts.installation, status: nowStatus.ok ? nowStatus.body?.fassung?.version : null });
  const after = await snapshot();
  comparison = compareSnapshots(before, after);
  for (const row of comparison) {
    const text = { same: t("unchanged", "unverändert"), changed: t("changed, see the report", "geändert, siehe Bericht"), lost: t("SOMETHING IS MISSING", "ETWAS FEHLT"), unmeasured: t("not measured", "nicht gemessen") }[row.verdict];
    mark(row.label, row.verdict === "same" || row.verdict === "changed", text);
  }
  if (lostAnything(comparison)) outcome = "failed";
  if (mode === "apply") {
    const reached = afterVersion.version === latest.version;
    mark(t("Version after", "Fassung danach"), reached, `${afterVersion.version ?? t("unknown", "unbekannt")} (${t("wanted", "gewollt")} ${latest.version})`);
    if (!reached) outcome = "failed";
  }
} catch (error) {
  if (error.message !== "stop") {
    outcome = "failed";
    mark(t("Run", "Lauf"), false, error.message);
  }
}

// --- Bericht und Verlauf -----------------------------------------------------

function report() {
  const out = [...plan, ""];
  out.push(t("## Run", "## Lauf"), "", t(`Recorded: ${now()}, mode: ${mode}`, `Aufgenommen: ${now()}, Art: ${mode}`), "");
  for (const row of timeline) out.push(`- ${row.ok ? "ok" : "**" + t("failed", "fehlgeschlagen") + "**"}: ${row.what}${row.detail ? `, ${row.detail}` : ""}`);
  if (backup?.ok) {
    out.push("", t("## Backup", "## Sicherung"), "");
    for (const row of backup.fresh) out.push(`- ${row.art}: ${row.name} (${row.bytes} Byte)`);
  }
  if (comparison) {
    out.push("", t("## Before and after", "## Vorher und nachher"), "");
    for (const row of comparison) {
      const head = { same: t("unchanged", "unverändert"), changed: t("changed", "geändert"), lost: t("**missing**", "**fehlt**"), unmeasured: t("not measured", "nicht gemessen") }[row.verdict];
      out.push(`### ${row.label}: ${head}`);
      if (row.verdict === "unmeasured") {
        out.push("", `- ${row.before?.text || row.after?.text || row.before?.state || ""}`);
      } else {
        out.push("", t(`- Before: ${row.before.entries.length} entries, after: ${row.after.entries.length}`, `- Vorher: ${row.before.entries.length} Einträge, nachher: ${row.after.entries.length}`));
        for (const e of row.diff.missing) out.push(t(`- Missing afterwards: ${e.key} (${e.before})`, `- Nachher nicht mehr da: ${e.key} (${e.before})`));
        for (const e of row.diff.changed) out.push(`- ${t("Changed", "Geändert")}: ${e.key}: ${e.before} -> ${e.after}`);
        for (const e of row.diff.added) out.push(`- ${t("New", "Neu")}: ${e.key} (${e.after})`);
      }
      out.push("");
    }
    out.push(
      t(
        "The contents of the app databases are not read row by row: the kit compares which databases the backup keeps for the apps, and the backup above holds them.",
        "Der Inhalt der App-Datenbanken wird nicht Zeile für Zeile gelesen: das Kit vergleicht, welche Datenbanken die Sicherung zu den Apps führt, und die Sicherung oben enthält sie."
      ),
      ""
    );
  }
  out.push(t("## Result", "## Ergebnis"), "");
  const result = {
    done: mode === "apply" ? t("Deployed and checked.", "Eingespielt und geprüft.") : t("Snapshot and backup done, nothing deployed.", "Stand festgehalten und gesichert, nichts eingespielt."),
    stopped: t("Stopped before the device was changed.", "Angehalten, bevor das Gerät geändert wurde."),
    failed: t("Not clean. See the lines marked as failed above.", "Nicht sauber. Siehe die als fehlgeschlagen markierten Zeilen oben."),
  }[outcome];
  out.push(result);
  if (mode === "apply" && outcome === "done") {
    out.push(
      t(
        `Fetched from ${artifact.source}; the checksum ${artifact.sha256} matches the release. Deploying took ${minutes(installMs)}${restartMs ? `, restart until healthy ${minutes(restartMs)}` : ", no restart (--no-reboot)"}.`,
        `Geholt von ${artifact.source}; die Prüfsumme ${artifact.sha256} stimmt mit dem Release überein. Das Einspielen dauerte ${minutes(installMs)}${restartMs ? `, Neustart bis gesund ${minutes(restartMs)}` : ", kein Neustart (--no-reboot)"}.`
      )
    );
  }
  out.push("");
  return out.join("\n");
}

const text = report();
const dir = ensureDir(join(device.path, "reports"));
let file = join(dir, `${today()}-${mode === "apply" ? "aktualisierung" : "vorpruefung"}.md`);
let n = 2;
while (existsSync(file)) file = join(dir, `${today()}-${mode === "apply" ? "aktualisierung" : "vorpruefung"}-${n++}.md`);
writeFileSync(file, text);
say("\n" + t(`Report filed: ${relative(ROOT, file)}`, `Bericht abgelegt: ${relative(ROOT, file)}`));

const summary = t(
  `${mode === "apply" ? "Update" : "Pre-check and backup"}: ${installed.version ?? "?"} to ${latest.version ?? "?"}, result ${outcome}. Report ${relative(ROOT, file)}.`,
  `${mode === "apply" ? "Update" : "Vorprüfung und Sicherung"}: ${installed.version ?? "?"} auf ${latest.version ?? "?"}, Ergebnis ${outcome}. Bericht ${relative(ROOT, file)}.`
);
const sheet = spawnSync(
  "node",
  [join(ROOT, ".ara", "tools", "runsheet.mjs"), ...(device.customer ? ["--customer", device.customer] : []), "--device", device.device, "--entry", summary],
  { encoding: "utf8" }
);
if (sheet.status !== 0) {
  say(t(`Note: the entry in the runsheet did not work (${(sheet.stderr || "").trim() || "no runsheet present"}).`, `Hinweis: Der Eintrag im Laufzettel hat nicht geklappt (${(sheet.stderr || "").trim() || "kein Laufzettel vorhanden"}).`));
}

if (device.customer) {
  const history = ensureDir(join(customerPath(device.customer), "history"));
  let entry = join(history, `${today()}-aktualisierung.md`);
  let m = 2;
  while (existsSync(entry)) entry = join(history, `${today()}-aktualisierung-${m++}.md`);
  writeFileSync(
    entry,
    [
      "---",
      `date: ${today()}`,
      "type: update",
      `device: ${device.device}`,
      "---",
      "",
      `# ${t("Update", "Update")} ${device.device}`,
      "",
      `## ${t("Occasion", "Anlass")}`,
      "",
      t(`New version ${latest.version ?? "?"} for ${installed.version ?? "?"}.`, `Neue Fassung ${latest.version ?? "?"} zu ${installed.version ?? "?"}.`),
      "",
      `## ${t("Done", "Getan")}`,
      "",
      summary,
      "",
      `## ${t("Evidence", "Nachweis")}`,
      "",
      t(`The report lies at ${relative(ROOT, file)}: backup checked in the list, state compared before and after.`, `Der Bericht liegt unter ${relative(ROOT, file)}: Sicherung in der Liste geprüft, Stand vorher und nachher verglichen.`),
      "",
    ].join("\n")
  );
  say(t(`History entry: ${relative(ROOT, entry)}`, `Verlaufseintrag: ${relative(ROOT, entry)}`));
}

// Das Artefakt wird erst nach einem sauberen Lauf zum neuen Spiegel: ein Spiegel, der neuer
// ist als das Gerät, sagt nicht mehr, womit installiert wurde.
if (mode === "apply" && outcome === "done" && artifactDir) {
  const mirror = MIRROR_HOME;
  rmSync(mirror, { recursive: true, force: true });
  mkdirSync(mirror, { recursive: true });
  cpSync(artifactDir, mirror, { recursive: true });
  writeFileSync(join(mirror, ".gitkeep"), "");
  writeFileSync(join(mirror, "STATE.json"), JSON.stringify({ fetched: new Date().toISOString(), source: artifact.source, version: latest.version }, null, 2) + "\n");
  say(t("The artifact is the mirror now (.ara/mirror/).", "Das Artefakt ist jetzt der Spiegel (.ara/mirror/)."));
}
if (work) rmSync(work, { recursive: true, force: true });

process.exit(outcome === "done" ? 0 : 1);
