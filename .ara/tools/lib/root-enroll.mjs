/**
 * Der Anmeldeschritt einer Firmenwurzel.
 *
 * Eine Wurzel bringt Grenz-Hook und Erlaubnisregeln nur als Vorschlag mit,
 * `.claude/proposal/`. Nichts davon wirkt, solange kein Mensch zugestimmt hat.
 * Dieser Schritt schreibt den Vorschlag nach der Zustimmung in die Einstellungen
 * des Nutzers, und nur dorthin: nie in den Baum, den andere klonen.
 *
 * Die Zustimmung haengt an einer Pruefsumme ueber `proposal.json` und
 * `boundary.mjs`. Wer die Summe nennt, die er gesehen hat, stimmt genau dem zu.
 * Der Hook, der laeuft, ist eine Kopie, die beim Anmelden neben die
 * Einstellungen gelegt wird, nicht die Datei im Baum: eine Aenderung im Baum,
 * etwa durch einen Pull, wirkt darum erst nach neuer Zustimmung. Bis dahin
 * laeuft, was zugestimmt war, und `status` sagt, dass der Vorschlag sich
 * geaendert hat.
 *
 * Das Anmelden gegen ein Geraet gehoert nicht hierher, das uebernimmt spaeter das
 * CLI der Wurzel. Dieser Schritt ist der lokale Freigabeschritt fuer
 * Vorschlaege und braucht kein Geraet und kein Netz.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { today } from "./kit.mjs";
import { t } from "./i18n.mjs";
import { PROPOSAL } from "./root.mjs";

const HOOK_SOURCE = join(".claude", "proposal", "boundary.mjs");
const SIDES = ["allow", "deny", "additionalDirectories"];

/** Die Einstellungen des Nutzers: `--settings`, sonst die des Agenten selbst. */
export function settingsFile(given) {
  if (given && given !== true) return resolve(String(given));
  return join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "settings.json");
}

/**
 * Die Wurzel, wie der Agent sie sieht. Eine Sitzung meldet den echten Pfad ihres
 * Ordners. Auf einem Rechner, auf dem /tmp oder ein abgeglichener Ordner ein Link
 * ist, nennte eine Regel mit dem anderen Pfad einen Ordner, in dem nie eine
 * Sitzung startet.
 */
const absolute = (root) => realpathSync(resolve(root));

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

/** Die Summe ueber alles, was zugestimmt wird: die Regeln und der Hook. */
export function checksum(root) {
  const hash = createHash("sha256");
  for (const file of [PROPOSAL, HOOK_SOURCE]) {
    hash.update(`${file}\n`);
    hash.update(readFileSync(join(root, file)));
    hash.update("\n");
  }
  return hash.digest("hex");
}

const short = (sum) => sum.slice(0, 16);

function ledgerDir(root, settings) {
  const name = String(readJson(join(root, ".claude", "root.json"), {}).name || "root")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "root";
  const id = createHash("sha256").update(absolute(root)).digest("hex").slice(0, 8);
  return join(resolve(settings, ".."), "ara-roots", `${name}-${id}`);
}

/** `{root}` wird der ausgeschriebene Pfad, in der Schreibweise, die die Regel verlangt. */
function resolved(proposal, root) {
  const rule = (text) => text.replaceAll("{root}", `/${absolute(root)}`);
  const dir = (text) => text.replaceAll("{root}", absolute(root));
  const permissions = proposal.permissions || {};
  return {
    allow: (permissions.allow || []).map(rule),
    deny: (permissions.deny || []).map(rule),
    additionalDirectories: (permissions.additionalDirectories || []).map(dir),
  };
}

/**
 * Was angemeldet wuerde, ohne etwas zu schreiben.
 *
 * Das ist der Text, dem ein Mensch zustimmt. Er nennt jede Zeile, die in seine
 * Einstellungen kaeme, den Hook mit seinem vollen Befehl, und die Summe.
 */
export function plan(root, settings) {
  const proposal = readJson(join(root, PROPOSAL), null);
  if (!proposal) throw new Error(t(`${PROPOSAL} is missing or not readable.`, `${PROPOSAL} fehlt oder lässt sich nicht lesen.`));
  const dir = ledgerDir(root, settings);
  const script = join(dir, "boundary.mjs");
  return {
    sum: checksum(root),
    settings,
    dir,
    script,
    command: `node "${script}" --root "${absolute(root)}"`,
    matcher: proposal.hook?.matcher || "Write|Edit|NotebookEdit|Bash",
    event: proposal.hook?.event || "PreToolUse",
    rules: resolved(proposal, root),
  };
}

function removeRecorded(settings, added) {
  for (const side of SIDES) {
    const list = settings.permissions?.[side];
    if (!Array.isArray(list)) continue;
    settings.permissions[side] = list.filter((entry) => !(added?.[side] || []).includes(entry));
    if (!settings.permissions[side].length) delete settings.permissions[side];
  }
  if (settings.permissions && !Object.keys(settings.permissions).length) delete settings.permissions;
  const event = added?.hook?.event;
  const list = settings.hooks?.[event];
  if (event && Array.isArray(list)) {
    settings.hooks[event] = list
      .map((entry) => ({ ...entry, hooks: (entry.hooks || []).filter((hook) => hook.command !== added.hook.command) }))
      .filter((entry) => entry.hooks.length);
    if (!settings.hooks[event].length) delete settings.hooks[event];
    if (!Object.keys(settings.hooks).length) delete settings.hooks;
  }
}

function writeSettings(file, settings) {
  if (existsSync(file)) copyFileSync(file, `${file}.ara-backup`);
  mkdirSync(resolve(file, ".."), { recursive: true });
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

function readSettings(file) {
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    // Nichts schreiben, was eine Datei zerstoert, die nicht gelesen werden konnte.
    throw new Error(t(`${file} is not valid JSON, nothing was written: ${error.message}`, `${file} ist kein gültiges JSON, nichts wurde geschrieben: ${error.message}`));
  }
}

/**
 * Meldet an. `consent` ist die Summe, die der Mensch gesehen hat, mindestens
 * 16 Zeichen davon. Stimmt sie nicht mit der heutigen, hat sich der Vorschlag
 * geaendert, seit er ihn sah, und es wird nichts geschrieben.
 */
export function enroll(root, settingsPath, consent) {
  const p = plan(root, settingsPath);
  const given = String(consent || "");
  if (given.length < 16 || !p.sum.startsWith(given)) {
    throw new Error(t(
      `The checksum does not match the proposal as it is now (${short(p.sum)}). Look at it again with --enroll and consent to that one.`,
      `Die Prüfsumme passt nicht zum Vorschlag, wie er jetzt ist (${short(p.sum)}). Sieh ihn mit --enroll noch einmal an und stimme diesem zu.`
    ));
  }
  const settings = readSettings(settingsPath);
  const ledgerFile = join(p.dir, "consent.json");
  const before = readJson(ledgerFile, null);
  // Eine neue Zustimmung ersetzt die alte ganz: erst weg, was sie eintrug.
  if (before) removeRecorded(settings, before.added);

  const added = { allow: [], deny: [], additionalDirectories: [], hook: { event: p.event, command: p.command } };
  settings.permissions ||= {};
  for (const side of SIDES) {
    const list = (settings.permissions[side] ||= []);
    for (const entry of p.rules[side]) {
      if (list.includes(entry)) continue;
      list.push(entry);
      added[side].push(entry);
    }
    if (!list.length) delete settings.permissions[side];
  }
  settings.hooks ||= {};
  (settings.hooks[p.event] ||= []).push({ matcher: p.matcher, hooks: [{ type: "command", command: p.command }] });

  mkdirSync(p.dir, { recursive: true });
  copyFileSync(join(root, HOOK_SOURCE), p.script);
  writeSettings(settingsPath, settings);
  writeFileSync(ledgerFile, `${JSON.stringify({ root: absolute(root), sum: p.sum, at: today(), settings: settingsPath, added }, null, 2)}\n`);
  return { ...p, added, renewed: Boolean(before) };
}

/** Nimmt zurueck, was die Anmeldung eintrug, und nur das. */
export function unenroll(root, settingsPath) {
  const dir = ledgerDir(root, settingsPath);
  const ledger = readJson(join(dir, "consent.json"), null);
  if (!ledger) return null;
  const settings = readSettings(settingsPath);
  removeRecorded(settings, ledger.added);
  writeSettings(settingsPath, settings);
  rmSync(dir, { recursive: true, force: true });
  return ledger;
}

/**
 * Wie es um die Anmeldung steht: `none`, `current`, `changed` oder `broken`.
 *
 * `changed`: der Vorschlag im Baum ist ein anderer als der, dem zugestimmt
 * wurde. Der zugestimmte Hook laeuft weiter, der neue nicht.
 * `broken`: die Zustimmung liegt vor, aber der Hook fehlt in den Einstellungen.
 */
export function status(root, settingsPath) {
  const dir = ledgerDir(root, settingsPath);
  const ledger = readJson(join(dir, "consent.json"), null);
  if (!ledger) return { state: "none", settings: settingsPath };
  const settings = readJson(settingsPath, {});
  const hooked = (settings.hooks?.[ledger.added?.hook?.event] || []).some((entry) =>
    (entry.hooks || []).some((hook) => hook.command === ledger.added.hook.command)
  );
  const now = checksum(root);
  const state = !hooked || !existsSync(join(dir, "boundary.mjs")) ? "broken" : now === ledger.sum ? "current" : "changed";
  return { state, settings: settingsPath, at: ledger.at, sum: ledger.sum, now };
}

export { short as shortSum };
