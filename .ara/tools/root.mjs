#!/usr/bin/env node
/**
 * Root: lay out the root folder of a whole house, outside of the kit.
 *
 * A root says what is true, what is due and where things lie: rules with a truth table,
 * company/, roadmap/ with a card stack, experiments/, customers/, templates/, archive/, a
 * check script, a boundary hook, rights per folder and the list of embedded places.
 * A place is a GitHub repository or a foreign folder such as SharePoint. It is referred
 * to and never copied. After laying out the root runs without the kit, with Node alone.
 *
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme Ltd"
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme Ltd" --places places.json
 *   node .ara/tools/root.mjs --path ~/acme --place api --kind github \
 *        --where https://github.com/acme/api --local ~/Code/acme/api --purpose "the product"
 *   node .ara/tools/root.mjs --path ~/showcase --example
 *   node .ara/tools/root.mjs --path ~/acme --check
 *   node .ara/tools/root.mjs --path ~/acme --show
 *
 * --places takes a file with a list: [{ "name", "kind", "where", "local", "write",
 * "purpose" }]. kind is github or folder, local and write may be missing, write: yes
 * opens a place for writing out of the root. --place with an existing root adds one
 * place: list, rights and its sheet under roadmap/. --language de|en overrides the
 * profile. --no-git leaves version control out. --example lays out the showcase, an
 * invented company with filled sheets. The target has to be empty or missing, and it
 * never lies inside the kit.
 *
 * === deutsch ===
 *
 * Wurzel: den Wurzelordner eines ganzen Hauses anlegen, außerhalb des Kits.
 *
 * Eine Wurzel sagt, was stimmt, was ansteht und wo etwas liegt: Regeln mit einer
 * Wahrheitstabelle, company/, roadmap/ mit Kartenstapel, experiments/, customers/,
 * templates/, archive/, ein Prüfskript, ein Grenz-Hook, Rechte je Ordner und die Liste der
 * eingebetteten Orte. Ein Ort ist ein GitHub-Repository oder ein fremder Ordner wie
 * SharePoint. Auf ihn wird verwiesen, kopiert wird er nie. Nach dem Anlegen läuft die
 * Wurzel ohne das Kit, mit Node allein.
 *
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme GmbH"
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme GmbH" --places orte.json
 *   node .ara/tools/root.mjs --path ~/acme --place api --kind github \
 *        --where https://github.com/acme/api --local ~/Code/acme/api --purpose "das Produkt"
 *   node .ara/tools/root.mjs --path ~/vorzeigefassung --example
 *   node .ara/tools/root.mjs --path ~/acme --check
 *   node .ara/tools/root.mjs --path ~/acme --show
 *
 * --places nimmt eine Datei mit einer Liste: [{ "name", "kind", "where", "local", "write",
 * "purpose" }]. kind ist github oder folder, local und write dürfen fehlen, write: yes
 * öffnet einen Ort für das Schreiben aus der Wurzel. --place mit einer bestehenden Wurzel
 * trägt einen Ort nach: Liste, Rechte und sein Blatt unter roadmap/. --language de|en
 * überstimmt das Profil. --no-git lässt die Versionsverwaltung weg. --example legt die
 * Vorzeigefassung aus, eine erfundene Firma mit gefüllten Blättern. Das Ziel muss leer
 * sein oder fehlen, und es liegt nie im Kit.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { ROOT, fail, headerHelp, helpOnly, parseArgs } from "./lib/kit.mjs";
import { LANGUAGES, language, t } from "./lib/i18n.mjs";
import { addPlace, expandHome, layOut, normalizePlace, readExample, runCheck } from "./lib/root.mjs";

helpOnly(import.meta.url);

const args = parseArgs();
if (!args.path || args.path === true) {
  console.log(headerHelp(import.meta.url));
  process.exit(args.path === true ? 1 : 0);
}

const started = Date.now();
const root = expandHome(String(args.path), process.cwd());
const isRoot = existsSync(join(root, ".claude", "root.json"));
const meta = isRoot ? JSON.parse(readFileSync(join(root, ".claude", "root.json"), "utf8")) : null;
// An existing root speaks its own language, not the one of the kit next to it:
// its check script answers in it, and two languages in one output is none.
const lang = LANGUAGES.includes(args.language)
  ? args.language
  : LANGUAGES.includes(meta?.language) ? meta.language : language();
const say = (en, de) => t(en, de, lang);

const insideKit = relative(ROOT, root);
if (insideKit === "" || (!insideKit.startsWith("..") && !isAbsolute(insideKit))) {
  fail(say(
    "The root never lies inside the kit. An update of the kit would not know it, and the kit is one of its places, not its home. Choose a folder next to it.",
    "Die Wurzel liegt nie im Kit. Ein Update des Kits kennte sie nicht, und das Kit ist einer ihrer Orte, nicht ihr Zuhause. Wähle einen Ordner daneben."
  ));
}

function checked(raw) {
  const { place, problems } = normalizePlace(raw, lang);
  if (problems.length) fail(say(`Place '${raw.name || "?"}': ${problems.join(", ")}.`, `Ort '${raw.name || "?"}': ${problems.join(", ")}.`));
  return place;
}

function singlePlace() {
  if (!args.place || args.place === true) return null;
  return checked({ name: args.place, kind: args.kind, where: args.where, local: args.local, write: args.write, purpose: args.purpose });
}

function sayCheck() {
  const run = runCheck(root);
  console.log((run.stdout || "").trimEnd());
  if (run.stderr?.trim()) console.error(run.stderr.trimEnd());
  return run.status === 0;
}

function sayPlaces(places) {
  if (!places.length) {
    console.log(say("Embedded places: none yet.", "Eingebettete Orte: noch keiner."));
    return;
  }
  console.log(say("Embedded places:", "Eingebettete Orte:"));
  for (const place of places) {
    const local = place.local
      ? `${place.local}${existsSync(expandHome(place.local, root)) ? "" : say(" (not on this computer)", " (nicht auf diesem Rechner)")}`
      : say("reference only", "nur Verweis");
    const write = place.write === "yes" ? say("may be written", "darf beschrieben werden") : say("read only", "nur lesen");
    console.log(`  ${place.name.padEnd(18)} ${place.kind.padEnd(7)} ${place.where}`);
    console.log(`  ${"".padEnd(18)} ${local}, ${write}`);
  }
}

if (args.check || args.show) {
  if (!isRoot) fail(say(`${root} is no root: .claude/root.json is missing.`, `${root} ist keine Wurzel: .claude/root.json fehlt.`));
  if (args.show) {
    console.log(`${meta.name}, ${meta.language}, ${say("laid out on", "angelegt am")} ${meta.created}, Kit ${meta.kit}`);
    sayPlaces(JSON.parse(readFileSync(join(root, ".claude", "places.json"), "utf8")).places || []);
  }
  process.exit(!args.check || sayCheck() ? 0 : 1);
}

if (isRoot) {
  const place = singlePlace();
  if (!place) {
    fail(say(
      `${root} is a root already. Add a place with --place, look at it with --show, check it with --check.`,
      `${root} ist schon eine Wurzel. Trage einen Ort mit --place nach, sieh sie mit --show an, prüfe sie mit --check.`
    ));
  }
  try {
    addPlace(root, place);
  } catch (error) {
    fail(error.message);
  }
  console.log(say(
    `Place '${place.name}' entered: .claude/places.json, rights in .claude/settings.json, sheet roadmap/${place.name}.md.`,
    `Ort '${place.name}' eingetragen: .claude/places.json, Rechte in .claude/settings.json, Blatt roadmap/${place.name}.md.`
  ));
  process.exit(sayCheck() ? 0 : 1);
}

if (existsSync(root) && readdirSync(root).filter((name) => name !== ".DS_Store").length) {
  fail(say(
    `${root} is not empty. A root is laid out into an empty folder, it overwrites nothing.`,
    `${root} ist nicht leer. Eine Wurzel wird in einen leeren Ordner gelegt, sie überschreibt nichts.`
  ));
}

const example = args.example ? readExample(lang) : null;
const name = example ? example.name : args.name;
if (!name || name === true) fail(say("--name is missing: what the house is called.", "--name fehlt: wie das Haus heißt."));

let places = [];
if (example) {
  places = example.places.map(checked);
} else {
  if (args.places && args.places !== true) {
    let list;
    try {
      list = JSON.parse(readFileSync(expandHome(String(args.places), process.cwd()), "utf8"));
    } catch (error) {
      fail(say(`--places cannot be read: ${error.message}`, `--places lässt sich nicht lesen: ${error.message}`));
    }
    places = (Array.isArray(list) ? list : list.places || []).map(checked);
  }
  const single = singlePlace();
  if (single) places.push(single);
}
const names = places.map((place) => place.name);
const twice = names.find((entry, index) => names.indexOf(entry) !== index);
if (twice) fail(say(`The place '${twice}' stands there twice.`, `Der Ort '${twice}' steht doppelt da.`));

const kitVersion = readFileSync(join(ROOT, ".ara", "VERSION"), "utf8").trim();
const written = layOut({ root, name, language: lang, places, example: Boolean(example), kitVersion });

console.log(say(`Root of ${name} laid out: ${root}`, `Wurzel von ${name} angelegt: ${root}`));
console.log(say(`${written.length} files, language ${lang}.`, `${written.length} Dateien, Sprache ${lang}.`));
if (example) {
  console.log(say(
    "This is the showcase. The company is invented, its places do not exist.",
    "Das ist die Vorzeigefassung. Die Firma ist erfunden, ihre Orte gibt es nicht."
  ));
}
sayPlaces(places);

const clean = sayCheck();

if (!args["no-git"]) {
  const git = (...parts) => spawnSync("git", parts, { cwd: root, encoding: "utf8" });
  const steps = [["init", "-q"], ["add", "-A"], ["commit", "-q", "-m", `Root laid out with the Ara-Kit ${kitVersion}`]];
  const broken = steps.map((step) => git(...step)).find((run) => run.status !== 0);
  console.log(broken
    ? say(
        `Version control: not complete, git says: ${(broken.stderr || broken.error?.message || "").trim().split("\n")[0]}`,
        `Versionsverwaltung: nicht vollständig, git sagt: ${(broken.stderr || broken.error?.message || "").trim().split("\n")[0]}`
      )
    : say("Version control: repository created, first commit made.", "Versionsverwaltung: Repository angelegt, erster Commit gemacht."));
}

console.log(say(`Took ${((Date.now() - started) / 1000).toFixed(1)} seconds.`, `Dauer: ${((Date.now() - started) / 1000).toFixed(1)} Sekunden.`));
console.log("");
console.log(say("Next steps:", "Nächste Schritte:"));
if (example) {
  console.log(say(`  Read it, starting with .claude/CLAUDE.md. Or start the agent there: cd "${root}" && claude`, `  Lies sie, angefangen bei .claude/CLAUDE.md. Oder starte den Agenten dort: cd "${root}" && claude`));
  process.exit(clean ? 0 : 1);
}
console.log(say(
  "  1. Fill company/core.md and company/goal.md, the rest refers to them.",
  "  1. company/core.md und company/goal.md füllen, der Rest verweist darauf."
));
console.log(say(
  "  2. One goal per place into its sheet under roadmap/, the first undertakings on cards.",
  "  2. Je Ort ein Ziel in sein Blatt unter roadmap/, die ersten Vorhaben auf Karten."
));
console.log(say(`  3. Start the agent there: cd "${root}" && claude`, `  3. Den Agenten dort starten: cd "${root}" && claude`));
process.exit(clean ? 0 : 1);
