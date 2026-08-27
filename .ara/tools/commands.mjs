#!/usr/bin/env node
/**
 * Befehle anlegen und nachziehen.
 *
 * Die Quelle der Befehle liegt in .ara/commands/: `alle/` fuer jeden Zweig,
 * `partner/` nur fuer Partner. Claude Code liest Befehle aber nur aus
 * .claude/commands/. Dieses Werkzeug legt die passenden dorthin, und nach einem
 * Update sagt es, welche neu sind, welche im Kit neuer sind und welche der
 * Nutzer selbst angepasst hat.
 *
 *   node .ara/tools/commands.mjs                    Lage: was liegt, was fehlt, was abweicht
 *   node .ara/tools/commands.mjs --apply            fehlende anlegen, im Kit neuere ersetzen
 *   node .ara/tools/commands.mjs --replace <name>   einen angepassten Befehl trotzdem ersetzen
 *   node .ara/tools/commands.mjs --role partner     Zweig vorgeben, sonst aus business/profile.md
 *   node .ara/tools/commands.mjs --invoice yes      Rechnungsbefehl freigeben, sonst aus dem Profil
 *   node .ara/tools/commands.mjs --json             Lage als JSON
 *
 * Woran das Werkzeug erkennt, wer einen Befehl geaendert hat: beim Anlegen merkt
 * es sich den Hash der Quelle in .claude/commands/.sources.json. Weicht die
 * Kopie spaeter ab, gibt es vier Faelle:
 *
 *   Kopie == gemerkter Hash, Quelle neu     "neu im Kit"   wird mit --apply ersetzt
 *   Kopie != gemerkter Hash, Quelle gleich  "angepasst"    bleibt, nur --replace ersetzt
 *   beides anders                           "beides"       bleibt, nur --replace ersetzt
 *   kein gemerkter Hash                     "unklar"       wird mit --apply ersetzt, wie vor
 *                                                           der Einfuehrung des Merkers
 *
 * Ein Befehl, der im Kit umbenannt wurde, steht in lib/commands.mjs. Seine Kopie raeumt
 * --apply weg, aber nur, wenn sie unveraendert aus dem Kit stammt: sonst haette
 * der Partner den alten und den neuen nebeneinander, und der alte fuehrt durch
 * ein Verfahren, das es nicht mehr gibt.
 *
 * Getrackt ist nur init.md. Alles andere in .claude/commands/ ist erzeugt und im
 * .gitignore, damit ein Update es nicht ueberschreibt und ein Fork es nicht
 * mitschleppt. Was ein Nutzer dort selbst dazulegt, bleibt unangetastet.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RETIRED } from "./lib/commands.mjs";
import { BUSINESS, ROOT, fail, parseArgs, readFrontmatter } from "./lib/kit.mjs";

const SOURCE = join(ROOT, ".ara", "commands");
const TARGET = join(ROOT, ".claude", "commands");
const MANIFEST = join(TARGET, ".sources.json");
const ROLES = ["partner", "company"];

// Zweig zu Quellordner. `alle/` gilt immer.
const BRANCHES = { partner: ["alle", "partner"], company: ["alle"] };

// Befehle, die das Profil erst freigeben muss. Ein Partner, der seine Rechnungen
// weiter in der Buchhaltung schreibt oder es noch nicht entschieden hat, bekommt
// den Rechnungsbefehl nicht. Erst `invoice: yes` im Profil legt ihn an.
const OPT_IN = { invoice: (profile) => profile.invoice === "yes" };

const arg = parseArgs();

const profile = readFrontmatter(join(BUSINESS, "profile.md"));

function role() {
  if (arg.role) {
    if (!ROLES.includes(arg.role)) fail(`Unbekannter Zweig "${arg.role}". Es gibt: ${ROLES.join(", ")}.`);
    return arg.role;
  }
  if (!profile.exists) {
    fail(
      "Der Zweig steht noch nicht fest: business/profile.md fehlt. Entweder /init durchlaufen " +
        "oder den Zweig angeben: --role partner oder --role company."
    );
  }
  if (!ROLES.includes(profile.fields.role)) {
    fail(
      `business/profile.md nennt als Zweig "${profile.fields.role || ""}", erwartet wird ` +
        `${ROLES.join(" oder ")}. Im Profil berichtigen oder --role angeben.`
    );
  }
  return profile.fields.role;
}

function list(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".md")).sort();
}

function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readManifest() {
  if (!existsSync(MANIFEST)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

/** Zustand einer Kopie gegenueber ihrer Quelle, siehe Kopf der Datei. */
function state(from, to, remembered) {
  if (!existsSync(to)) return "missing";
  const source = hash(from);
  const copy = hash(to);
  if (source === copy) return "current";
  if (!remembered) return "unclear";
  const sourceChanged = source !== remembered;
  const copyChanged = copy !== remembered;
  if (sourceChanged && copyChanged) return "conflict";
  if (copyChanged) return "customized";
  return "updated";
}

/** Lage je Befehl. Dazu, was im Ziel liegt und nicht aus dem Kit stammt. */
function survey(branch) {
  const remembered = readManifest();
  // --invoice yes|no ueberstimmt das Profil, solange es noch keins gibt.
  const fields = { ...profile.fields, ...(arg.invoice ? { invoice: arg.invoice } : {}) };
  const expected = [];
  for (const group of BRANCHES[branch]) {
    for (const file of list(join(SOURCE, group))) {
      const name = file.replace(/\.md$/, "");
      if (OPT_IN[name] && !OPT_IN[name](fields)) continue;
      const from = join(SOURCE, group, file);
      const to = join(TARGET, file);
      expected.push({ name, group, from, to, state: state(from, to, remembered[name]) });
    }
  }
  // Abgeloeste Befehle, die noch im Ziel liegen. Unveraendert heisst: die Kopie
  // ist die, die das Kit einmal hingelegt hat, und dann darf sie weg.
  const retired = [];
  for (const [name, successor] of Object.entries(RETIRED)) {
    const to = join(TARGET, `${name}.md`);
    if (!existsSync(to)) continue;
    retired.push({ name, successor, to, untouched: remembered[name] === hash(to) });
  }

  const known = new Set(expected.map((e) => e.name));
  const retiredNames = new Set(retired.map((e) => e.name));
  const foreign = list(TARGET)
    .map((name) => name.replace(/\.md$/, ""))
    .filter((name) => name !== "init" && !known.has(name) && !retiredNames.has(name));
  return { role: branch, commands: expected, retired, foreign };
}

const branch = role();
const lage = survey(branch);
const by = (...states) => lage.commands.filter((c) => states.includes(c.state));

const replace = arg.replace ? String(arg.replace).split(",").map((s) => s.trim()) : [];
for (const name of replace) {
  if (!lage.commands.some((c) => c.name === name)) {
    fail(`--replace ${name}: diesen Befehl gibt es im Zweig ${branch} nicht.`);
  }
}

let placed = [];
if (arg.apply || replace.length) {
  const remembered = readManifest();
  const todo = arg.apply ? by("missing", "updated", "unclear") : [];
  for (const c of lage.commands) {
    if (replace.includes(c.name) && !todo.includes(c)) todo.push(c);
  }
  mkdirSync(TARGET, { recursive: true });
  for (const c of todo) {
    copyFileSync(c.from, c.to);
    remembered[c.name] = hash(c.from);
    c.placed = c.state;
    c.state = "current";
  }
  // Auch fuer Kopien, die schon aktuell sind, den Hash merken: so bekommt ein
  // Stand aus der Zeit vor dem Merker seinen Eintrag, ohne dass etwas kopiert wird.
  for (const c of by("current")) remembered[c.name] ??= hash(c.from);

  // Abgeloeste Befehle raeumt --apply mit weg, aber nur die unveraenderten.
  if (arg.apply) {
    for (const old of lage.retired) {
      if (!old.untouched) continue;
      rmSync(old.to);
      delete remembered[old.name];
      old.removed = true;
    }
  }

  writeFileSync(MANIFEST, JSON.stringify(remembered, null, 2) + "\n");
  placed = todo;
}

if (arg.json) {
  console.log(JSON.stringify({ ...lage, applied: Boolean(arg.apply), replaced: replace }, null, 2));
  process.exit(0);
}

const label = {
  missing: "fehlt      ",
  current: "aktuell    ",
  updated: "neu im Kit ",
  customized: "angepasst  ",
  conflict: "beides     ",
  unclear: "unklar     ",
};
console.log(`Zweig: ${branch === "partner" ? "Partner" : "Unternehmen"}`);
for (const c of lage.commands) console.log(`${label[c.state]} /${c.name}  (${c.group})`);
for (const old of lage.retired) {
  console.log(
    `${old.removed ? "entfernt   " : "abgeloest  "} /${old.name}  (heisst jetzt /${old.successor}` +
      `${old.untouched ? "" : ", von Hand geaendert"})`
  );
}
for (const name of lage.foreign) console.log(`eigener     /${name}  (nicht aus dem Kit, bleibt liegen)`);

if (arg.apply || replace.length) {
  const created = placed.filter((c) => c.placed === "missing").length;
  const replaced = placed.length - created;
  console.log(
    placed.length
      ? `\n${created} angelegt, ${replaced} ersetzt. Erkennt Claude Code einen Befehl noch nicht, hilft ein Neustart der Sitzung.`
      : "\nNichts zu tun, alle Befehle sind aktuell."
  );
  const kept = by("customized", "conflict");
  if (kept.length) {
    console.log(
      `Nicht angefasst, weil von Hand geaendert: ${kept.map((c) => `/${c.name}`).join(", ")}. ` +
        "Trotzdem ersetzen mit: node .ara/tools/commands.mjs --replace <name>"
    );
  }
  const geblieben = lage.retired.filter((old) => !old.removed);
  if (geblieben.length) {
    console.log(
      `Abgeloest und von Hand geaendert, darum liegen geblieben: ` +
        `${geblieben.map((old) => `/${old.name} (jetzt /${old.successor})`).join(", ")}. ` +
        "Vergleichen und selbst loeschen, sonst gibt es den Befehl zweimal."
    );
  }
} else {
  const open = by("missing", "updated", "unclear");
  const kept = by("customized", "conflict");
  if (open.length) {
    console.log(
      `\n${by("missing").length} fehlen, ${by("updated").length} sind im Kit neuer` +
        (by("unclear").length ? `, ${by("unclear").length} weichen ohne Merker ab` : "") +
        ". Anlegen und ersetzen mit: node .ara/tools/commands.mjs --apply"
    );
  }
  if (kept.length) {
    console.log(
      `${kept.length} von Hand geaendert (${kept.map((c) => `/${c.name}`).join(", ")}). ` +
        "Die bleiben bei --apply liegen. Wer die Kit-Fassung will: --replace <name>, " +
        "vorher mit diff vergleichen." +
        (by("conflict").length ? " Bei \"beides\" ist auch das Kit neuer, dann lohnt der Vergleich doppelt." : "")
    );
  }
  if (lage.retired.length) {
    console.log(
      `Abgeloest: ${lage.retired.map((old) => `/${old.name} heisst jetzt /${old.successor}`).join(", ")}. ` +
        "Die unveraenderten raeumt --apply weg, angepasste bleiben liegen."
    );
  }
}
