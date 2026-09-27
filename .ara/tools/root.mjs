#!/usr/bin/env node
/**
 * Root: lay out the root folder of a whole house, outside of the kit.
 *
 * A root says what is true and where things lie. Laid out without a switch it is a
 * scaffold: rules with a truth table, skills, agents, the list of embedded places, a check
 * script, and the folders of level 1 that the house names. Nothing in the tree runs by
 * itself: no settings.json, no active hook. The boundary hook and the permission rules lie
 * in .claude/proposal/ as a proposal, and the enrolment step writes them into the user's
 * own settings after consent. The method is an addition: company/, roadmap/ with a card
 * stack, experiments/, customers/, templates/, archive/ and the card tool.
 * A place is a GitHub repository or a foreign folder such as SharePoint. It is referred
 * to and never copied. After laying out the root runs without the kit, with Node alone.
 *
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme Ltd" --folders sales,product=what we build
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme Ltd" --method
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme Ltd" --places places.json
 *   node .ara/tools/root.mjs --path ~/acme --place api --kind github \
 *        --where https://github.com/acme/api --local ~/Code/acme/api --purpose "the product"
 *   node .ara/tools/root.mjs --path ~/acme --method
 *   node .ara/tools/root.mjs --path ~/acme --enroll
 *   node .ara/tools/root.mjs --path ~/acme --enroll --consent <checksum>
 *   node .ara/tools/root.mjs --path ~/acme --unenroll
 *   node .ara/tools/root.mjs --path ~/acme --deploy [--client <path>] [--password-stdin]
 *   node .ara/tools/root.mjs --path ~/showcase --example
 *   node .ara/tools/root.mjs --path ~/acme --check
 *   node .ara/tools/root.mjs --path ~/acme --show
 *   node .ara/tools/root.mjs --adopt ~/Code/acme [--name "Acme Ltd"]
 *
 * --folders names the folders of level 1: comma separated, `name` or `name=what for`. They
 * are named when laying out. Later a folder is made by hand, with a line in the table of
 * .claude/CLAUDE.md. --method lays the method out with the scaffold, or into an existing
 * root, and overwrites nothing. --places takes a file with a list: [{ "name", "kind",
 * "where", "local", "write", "purpose" }]. kind is github or folder, local and write may be
 * missing, write: yes opens a place for writing out of the root. --place with an existing
 * root adds one place: list, proposal and, with the method, its sheet under roadmap/.
 * --enroll shows what would go into the user's settings and writes nothing, --consent
 * with the checksum it printed writes it. A changed proposal has another checksum and
 * needs the consent anew. --settings names another settings file than the agent's own.
 * --unenroll takes back exactly what enrolling entered. --deploy puts the root onto the device
 * it is logged in to, through the root's own bridge: the check script runs first and a finding
 * stops it, the room of the root is made as an administrator when it is missing, settings.json,
 * hooks, .git and node_modules never go along. --language de|en overrides the profile.
 * --no-git leaves version control out. --example lays out the showcase, an invented company
 * with the method and filled sheets. An unknown switch is reported, not skipped. The target
 * has to be empty or missing, and it never lies inside the kit. --adopt takes a grown folder
 * over as a root instead: it writes .claude/root.json, .claude/places.json and arasul.mjs and
 * nothing else, stops when one of them lies there, enters the clones the .gitignore leaves out
 * as places and names the source trees and the .env files it finds, with a proposal each.
 *
 * === deutsch ===
 *
 * Wurzel: den Wurzelordner eines ganzen Hauses anlegen, außerhalb des Kits.
 *
 * Eine Wurzel sagt, was stimmt und wo etwas liegt. Ohne Schalter angelegt ist sie ein
 * Gerüst: Regeln mit einer Wahrheitstabelle, Skills, Agents, die Liste der eingebetteten
 * Orte, ein Prüfskript und die Ordner der Ebene 1, die das Haus nennt. Nichts im Baum läuft
 * von selbst: keine settings.json, kein scharfer Hook. Der Grenz-Hook und die
 * Erlaubnisregeln liegen in .claude/proposal/ als Vorschlag, und der Anmeldeschritt schreibt
 * sie nach Zustimmung in die eigenen Einstellungen des Nutzers. Die Methode ist ein Zusatz:
 * company/, roadmap/ mit Kartenstapel, experiments/, customers/, templates/, archive/ und
 * das Kartenwerkzeug. Ein Ort ist ein GitHub-Repository oder ein fremder Ordner wie
 * SharePoint. Auf ihn wird verwiesen, kopiert wird er nie. Nach dem Anlegen läuft die
 * Wurzel ohne das Kit, mit Node allein.
 *
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme GmbH" --folders vertrieb,produkt=was wir bauen
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme GmbH" --method
 *   node .ara/tools/root.mjs --path ~/acme --name "Acme GmbH" --places orte.json
 *   node .ara/tools/root.mjs --path ~/acme --place api --kind github \
 *        --where https://github.com/acme/api --local ~/Code/acme/api --purpose "das Produkt"
 *   node .ara/tools/root.mjs --path ~/acme --method
 *   node .ara/tools/root.mjs --path ~/acme --enroll
 *   node .ara/tools/root.mjs --path ~/acme --enroll --consent <Prüfsumme>
 *   node .ara/tools/root.mjs --path ~/acme --unenroll
 *   node .ara/tools/root.mjs --path ~/acme --deploy [--client <pfad>] [--password-stdin]
 *   node .ara/tools/root.mjs --path ~/vorzeigefassung --example
 *   node .ara/tools/root.mjs --path ~/acme --check
 *   node .ara/tools/root.mjs --path ~/acme --show
 *   node .ara/tools/root.mjs --adopt ~/Code/acme [--name "Acme GmbH"]
 *
 * --folders nennt die Ordner der Ebene 1: durch Kommas getrennt, `name` oder `name=wofür`.
 * Sie werden beim Anlegen genannt. Später entsteht ein Ordner von Hand, mit einer Zeile in
 * der Tabelle der .claude/CLAUDE.md. --method legt die Methode mit dem Gerüst an oder in
 * eine bestehende Wurzel und überschreibt nichts. --places nimmt eine Datei mit einer Liste:
 * [{ "name", "kind", "where", "local", "write", "purpose" }]. kind ist github oder folder,
 * local und write dürfen fehlen, write: yes öffnet einen Ort für das Schreiben aus der
 * Wurzel. --place mit einer bestehenden Wurzel trägt einen Ort nach: Liste, Vorschlag und,
 * mit der Methode, sein Blatt unter roadmap/. --enroll zeigt, was in die Einstellungen des
 * Nutzers käme, und schreibt nichts, --consent mit der Prüfsumme, die es nannte, schreibt es.
 * Ein geänderter Vorschlag hat eine andere Prüfsumme und braucht die Zustimmung neu.
 * --settings nennt eine andere Einstellungsdatei als die des Agenten selbst. --unenroll
 * nimmt genau zurück, was das Anmelden eintrug. --deploy legt die Wurzel auf das Gerät, an dem
 * sie angemeldet ist, über die Brücke der Wurzel selbst: zuerst läuft das Prüfskript, und ein
 * Befund hält an, fehlt der Raum der Wurzel, wird er als Administrator angelegt, settings.json,
 * Hooks, .git und node_modules gehen nie mit. --language de|en überstimmt das Profil.
 * --no-git lässt die Versionsverwaltung weg. --example legt die Vorzeigefassung aus, eine
 * erfundene Firma mit der Methode und gefüllten Blättern. Ein unbekannter Schalter wird
 * gemeldet, nicht überlesen. Das Ziel muss leer sein oder fehlen, und es liegt nie im Kit.
 * --adopt übernimmt stattdessen einen gewachsenen Ordner als Wurzel: es schreibt
 * .claude/root.json, .claude/places.json und arasul.mjs und sonst nichts, hält an, wenn eine
 * davon schon liegt, trägt die Klone, die die .gitignore auslässt, als Orte ein und nennt die
 * Quelltextbäume und .env-Dateien, die es findet, mit je einem Vorschlag.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative } from "node:path";
import { ROOT, fail, headerHelp, helpOnly, parseArgs } from "./lib/kit.mjs";
import { LANGUAGES, language, setLanguage, t } from "./lib/i18n.mjs";
import { ADOPT_TARGETS, TEMPLATE, addMethod, addPlace, adopt, expandHome, layOut, normalizeFolders, normalizePlace, readExample, runCheck } from "./lib/root.mjs";
import { enroll, plan, settingsFile, shortSum, status, unenroll } from "./lib/root-enroll.mjs";

// Every switch this tool knows. What is not here is reported: `--lang` used to be skipped, and
// the root came out in the language of the profile without anybody having chosen it.
const SWITCHES = [
  "path", "name", "folders", "method", "places", "place", "kind", "where", "local", "write", "purpose",
  "language", "no-git", "example", "check", "show", "enroll", "consent", "unenroll", "settings",
  "deploy", "client", "password-stdin", "device", "adopt",
];

helpOnly(import.meta.url);

const args = parseArgs();
const unknown = Object.keys(args).filter((key) => key !== "_" && key !== "help" && key !== "h" && !SWITCHES.includes(key));
if (unknown.length) {
  const near = (key) => SWITCHES.find((known) => known.startsWith(key) || key.startsWith(known));
  fail(unknown.map((key) => {
    const hint = near(key);
    return t(
      `Unknown switch --${key}${hint ? `, did you mean --${hint}?` : ""}`,
      `Unbekannter Schalter --${key}${hint ? `, meintest du --${hint}?` : ""}`
    );
  }).join("\n"));
}
if (args._.length) {
  fail(t(
    `Unexpected argument: ${args._.join(" ")}. A value with a space belongs in quotes, e.g. --folders "sales=what we sell".`,
    `Unerwartetes Argument: ${args._.join(" ")}. Ein Wert mit Leerzeichen gehört in Anführungszeichen, z. B. --folders "sales=was wir verkaufen".`
  ));
}
if (args.language !== undefined && !LANGUAGES.includes(args.language)) {
  fail(t(`--language takes ${LANGUAGES.join(" or ")}, not '${args.language}'.`, `--language nimmt ${LANGUAGES.join(" oder ")}, nicht '${args.language}'.`));
}
// `--adopt <path>` names the folder itself, `--path` stays the name of it everywhere else.
const given = args.adopt && args.adopt !== true ? args.adopt : args.path;
if (!given || given === true) {
  console.log(headerHelp(import.meta.url));
  process.exit(given === true || args.adopt === true ? 1 : 0);
}

const started = Date.now();
const root = expandHome(String(given), process.cwd());
const isRoot = existsSync(join(root, ".claude", "root.json"));
const meta = isRoot ? JSON.parse(readFileSync(join(root, ".claude", "root.json"), "utf8")) : null;
// An existing root speaks its own language, not the one of the kit next to it:
// its check script answers in it, and two languages in one output is none.
const lang = LANGUAGES.includes(args.language)
  ? args.language
  : LANGUAGES.includes(meta?.language) ? meta.language : language();
setLanguage(lang);

const insideKit = relative(ROOT, root);
if (insideKit === "" || (!insideKit.startsWith("..") && !isAbsolute(insideKit))) {
  fail(t(
    "The root never lies inside the kit. An update of the kit would not know it, and the kit is one of its places, not its home. Choose a folder next to it.",
    "Die Wurzel liegt nie im Kit. Ein Update des Kits kennte sie nicht, und das Kit ist einer ihrer Orte, nicht ihr Zuhause. Wähle einen Ordner daneben."
  ));
}

function checked(raw) {
  const { place, problems } = normalizePlace(raw, lang);
  if (problems.length) fail(t(`Place '${raw.name || "?"}': ${problems.join(", ")}.`, `Ort '${raw.name || "?"}': ${problems.join(", ")}.`));
  return place;
}

function singlePlace() {
  if (!args.place || args.place === true) return null;
  return checked({ name: args.place, kind: args.kind, where: args.where, local: args.local, write: args.write, purpose: args.purpose });
}

function sayCheck() {
  if (!existsSync(join(root, ".claude", "scripts", "check.mjs"))) {
    console.log(t(
      "No check script of the kit lies in this root: it was taken over, and taking over lays none, because it overwrites nothing of the house.",
      "In dieser Wurzel liegt kein Prüfskript des Kits: sie wurde übernommen, und Übernehmen legt keines, weil es nichts vom Haus überschreibt."
    ));
    return true;
  }
  const run = runCheck(root);
  console.log((run.stdout || "").trimEnd());
  if (run.stderr?.trim()) console.error(run.stderr.trimEnd());
  return run.status === 0;
}

function sayPlaces(places) {
  if (!places.length) {
    console.log(t("Embedded places: none yet.", "Eingebettete Orte: noch keiner."));
    return;
  }
  console.log(t("Embedded places:", "Eingebettete Orte:"));
  for (const place of places) {
    const local = place.local
      ? `${place.local}${existsSync(expandHome(place.local, root)) ? "" : t(" (not on this computer)", " (nicht auf diesem Rechner)")}`
      : t("reference only", "nur Verweis");
    const write = place.write === "yes" ? t("may be written", "darf beschrieben werden") : t("read only", "nur lesen");
    console.log(`  ${place.name.padEnd(18)} ${place.kind.padEnd(7)} ${place.where}`);
    console.log(`  ${"".padEnd(18)} ${local}, ${write}`);
  }
}

function sayEnrolment() {
  const now = status(root, settingsFile(args.settings));
  const say = {
    none: t("Boundary and rights: a proposal only, not enrolled. Nothing of it is active.", "Grenze und Rechte: nur ein Vorschlag, nicht angemeldet. Nichts davon wirkt."),
    current: t(`Boundary and rights: enrolled on ${now.at}, the proposal is the one that was consented to.`, `Grenze und Rechte: angemeldet am ${now.at}, der Vorschlag ist der, dem zugestimmt wurde.`),
    changed: t(
      "Boundary and rights: the proposal has changed since the consent. What was consented to keeps running, the new one does not. Look at it with --enroll and consent again.",
      "Grenze und Rechte: der Vorschlag hat sich seit der Zustimmung geändert. Was zugestimmt war, läuft weiter, der neue nicht. Sieh ihn mit --enroll an und stimme neu zu."
    ),
    broken: t(
      "Boundary and rights: consented to, but the hook is gone from the settings. Enrol again.",
      "Grenze und Rechte: zugestimmt, aber der Hook fehlt in den Einstellungen. Melde neu an."
    ),
  };
  console.log(say[now.state]);
  console.log(t(`  Settings: ${now.settings}`, `  Einstellungen: ${now.settings}`));
}

function listRules(list) {
  for (const entry of list) console.log(`    ${entry}`);
}

function doEnrol() {
  const target = settingsFile(args.settings);
  let proposal;
  try {
    proposal = plan(root, target);
  } catch (error) {
    fail(error.message);
  }
  if (args.consent === undefined) {
    console.log(t(`Enrolment of ${meta.name}. Nothing is written yet.`, `Anmeldung von ${meta.name}. Noch wird nichts geschrieben.`));
    console.log(t(`It would go into ${proposal.settings}:`, `In ${proposal.settings} käme:`));
    console.log(t(`  the hook, for ${proposal.event} on ${proposal.matcher}:`, `  der Hook, für ${proposal.event} auf ${proposal.matcher}:`));
    console.log(`    ${proposal.command}`);
    console.log(t("  a copy of the hook next to the settings, that is the one that runs:", "  eine Kopie des Hooks neben den Einstellungen, sie ist es, die läuft:"));
    console.log(`    ${proposal.script}`);
    for (const [side, label] of [["allow", "allow"], ["deny", "deny"], ["ask", "ask"], ["additionalDirectories", "additionalDirectories"]]) {
      if (!proposal.rules[side].length) continue;
      console.log(`  ${label}:`);
      listRules(proposal.rules[side]);
    }
    console.log(t(
      "The hook acts only in a session that started in this root, not in a place, not anywhere else.",
      "Der Hook wirkt nur in einer Sitzung, die in dieser Wurzel gestartet ist, nicht in einem Ort, nicht anderswo."
    ));
    console.log(t(`Checksum: ${proposal.sum}`, `Prüfsumme: ${proposal.sum}`));
    console.log(t(
      `To consent: --enroll --consent ${shortSum(proposal.sum)}. Taken back with --unenroll.`,
      `Zustimmen: --enroll --consent ${shortSum(proposal.sum)}. Zurück mit --unenroll.`
    ));
    return;
  }
  if (args.consent === true) fail(t("--consent needs the checksum that --enroll printed.", "--consent braucht die Prüfsumme, die --enroll nannte."));
  let done;
  try {
    done = enroll(root, target, String(args.consent));
  } catch (error) {
    fail(error.message);
  }
  console.log(done.renewed
    ? t(`Enrolled anew, checksum ${shortSum(done.sum)}. What the earlier consent entered was replaced.`, `Neu angemeldet, Prüfsumme ${shortSum(done.sum)}. Was die frühere Zustimmung eintrug, wurde ersetzt.`)
    : t(`Enrolled, checksum ${shortSum(done.sum)}.`, `Angemeldet, Prüfsumme ${shortSum(done.sum)}.`));
  console.log(t(`  Settings: ${done.settings}, the previous state next to it as .ara-backup`, `  Einstellungen: ${done.settings}, der Stand davor daneben als .ara-backup`));
  console.log(t(`  Hook: ${done.script}`, `  Hook: ${done.script}`));
  console.log(t("A running session reads its settings once: start the agent anew.", "Eine laufende Sitzung liest ihre Einstellungen einmal: starte den Agenten neu."));
}

function doUnenrol() {
  let ledger;
  try {
    ledger = unenroll(root, settingsFile(args.settings));
  } catch (error) {
    fail(error.message);
  }
  console.log(ledger
    ? t("Taken back: what enrolling entered is gone from the settings, the copy of the hook with it.", "Zurückgenommen: was das Anmelden eintrug, ist aus den Einstellungen, die Kopie des Hooks mit ihm.")
    : t("This root is not enrolled, nothing to take back.", "Diese Wurzel ist nicht angemeldet, nichts zurückzunehmen."));
}

/**
 * Deploying is the bridge's business: it holds the credential, speaks with the device and runs
 * the client. This tool only makes sure the bridge in the root is one that knows the command,
 * and hands over. A root laid out with an older kit carries an older bridge: it is a file of the
 * kit, not of the house, so the kit's own replaces it and says so.
 */
function doDeploy() {
  const bridge = join(root, "arasul.mjs");
  const current = join(TEMPLATE, "arasul.mjs");
  if (!existsSync(bridge) || !/case "deploy"/.test(readFileSync(bridge, "utf8"))) {
    copyFileSync(current, bridge);
    console.log(t(
      "The bridge arasul.mjs in this root was older than the kit's and knew no deploy: replaced by the kit's. It is a file of the kit, nothing of the house was in it.",
      "Die Brücke arasul.mjs in dieser Wurzel war älter als die des Kits und kannte kein deploy: durch die des Kits ersetzt. Sie ist eine Datei des Kits, nichts vom Haus stand darin."
    ));
  }
  const pass = [];
  if (args.client && args.client !== true) pass.push("--client", String(args.client));
  if (args["password-stdin"]) pass.push("--password-stdin");
  if (args.device && args.device !== true) pass.push("--device", String(args.device));
  const run = spawnSync(process.execPath, [bridge, "deploy", ...pass], { cwd: root, stdio: "inherit" });
  process.exit(run.status ?? 1);
}

/**
 * Take a grown folder over as a root. It writes three files and nothing else, and says what it
 * found: the clones it entered as places, the ones it could not, the source trees and the files
 * with secrets, each with what happens to it at a sync and what the house could do.
 */
function doAdopt() {
  if (isRoot) fail(t(`${root} is a root already. Look at it with --show.`, `${root} ist schon eine Wurzel. Sieh sie mit --show an.`));
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    fail(t(`${root} is not there. --adopt takes over a folder that exists, a new root is laid out with --path.`, `${root} ist nicht da. --adopt übernimmt einen Ordner, den es gibt, eine neue Wurzel entsteht mit --path.`));
  }
  if (!readdirSync(root).filter((entry) => entry !== ".DS_Store").length) {
    fail(t(`${root} is empty. An empty folder is laid out, not taken over: --path "${root}" --name <name>.`, `${root} ist leer. Ein leerer Ordner wird angelegt, nicht übernommen: --path "${root}" --name <name>.`));
  }
  const clash = ["method", "example", "folders", "places", "place", "no-git"].filter((key) => args[key] !== undefined);
  if (clash.length) {
    fail(t(
      `--adopt takes a folder over as it is and goes with ${clash.map((key) => `--${key}`).join(", ")} no way. Take it over first, then add.`,
      `--adopt übernimmt einen Ordner, wie er ist, und geht nicht mit ${clash.map((key) => `--${key}`).join(", ")}. Erst übernehmen, dann ergänzen.`
    ));
  }
  const there = ADOPT_TARGETS.filter((target) => existsSync(join(root, target)));
  if (there.length) {
    fail(t(
      `${there.join(", ")} lies there already and belongs to the house. Taking over overwrites nothing, nothing was written.`,
      `${there.join(", ")} liegt schon da und gehört dem Haus. Übernehmen überschreibt nichts, nichts wurde geschrieben.`
    ));
  }
  const name = args.name && args.name !== true ? String(args.name) : basename(root);
  const kitVersion = readFileSync(join(ROOT, ".ara", "VERSION"), "utf8").trim();
  const found = adopt({ root, name, language: lang, kitVersion });

  console.log(t(`Root of ${name} taken over: ${root}`, `Wurzel von ${name} übernommen: ${root}`));
  console.log(t(
    `Written, these three and nothing else: ${ADOPT_TARGETS.join(", ")}. Language ${lang}.`,
    `Geschrieben, diese drei und sonst nichts: ${ADOPT_TARGETS.join(", ")}. Sprache ${lang}.`
  ));
  if (!found.gitignore) {
    console.log(t(
      "There is no .gitignore at the top. What a sync leaves out is then only what never goes: what a machine makes, the settings of this computer, .env at every depth.",
      "Oben liegt keine .gitignore. Ein Abgleich lässt dann nur aus, was nie mitgeht: was eine Maschine macht, die Einstellungen dieses Rechners, .env in jeder Tiefe."
    ));
  }
  console.log("");
  sayPlaces(found.places);

  const open = found.clones.filter((clone) => !clone.ignored);
  if (open.length) {
    console.log("");
    console.log(t(
      "Not entered as a place, the .gitignore does not leave these clones out, so they would go into the company folder as a copy:",
      "Nicht als Ort eingetragen, die .gitignore lässt diese Klone nicht aus, sie gingen also als Kopie in den Firmenordner:"
    ));
    for (const clone of open) {
      console.log(`  ${clone.rel}/${clone.where ? `  ${clone.where}` : ""}`);
      console.log(t(
        `    Proposal: a line /${clone.rel}/ in .gitignore, then --path "${root}" --place <name> --kind ${clone.kind || "folder"} --where ${clone.where || `./${clone.rel}`} --local ./${clone.rel} --purpose "<what it is>"`,
        `    Vorschlag: eine Zeile /${clone.rel}/ in die .gitignore, dann --path "${root}" --place <name> --kind ${clone.kind || "folder"} --where ${clone.where || `./${clone.rel}`} --local ./${clone.rel} --purpose "<was es ist>"`
      ));
    }
  }
  const shared = found.sources.filter((source) => !source.ignored);
  const home = found.sources.filter((source) => source.ignored);
  if (found.sources.length) {
    console.log("");
    console.log(t("Source trees:", "Quelltextbäume:"));
    for (const source of shared) {
      console.log(`  ${source.rel}/ (${source.why})`);
      console.log(t(
        "    Goes into the company folder, without node_modules, .next, build, dist, .venv and .env. Proposal: if it is a project of its own, make it a repository and enter it as a place; if it is only for this computer, a line /" + source.rel + "/ in .gitignore keeps it home. Single scripts are fine as they are.",
        "    Geht in den Firmenordner, ohne node_modules, .next, build, dist, .venv und .env. Vorschlag: ist es ein eigenes Projekt, ein Repository daraus machen und als Ort eintragen; ist es nur für diesen Rechner, hält eine Zeile /" + source.rel + "/ in der .gitignore es zu Hause. Einzelne Skripte sind in Ordnung, wie sie sind."
      ));
    }
    for (const source of home) console.log(t(`  ${source.rel}/ (${source.why}): the .gitignore leaves it out, it stays home.`, `  ${source.rel}/ (${source.why}): die .gitignore lässt es aus, es bleibt zu Hause.`));
  }
  if (found.secrets.length) {
    console.log("");
    console.log(t(
      `Files of the kind .env: ${found.secrets.length}. They stay home at every depth, a sync never takes them along:`,
      `Dateien der Art .env: ${found.secrets.length}. Sie bleiben in jeder Tiefe zu Hause, ein Abgleich nimmt sie nie mit:`
    ));
    for (const secret of found.secrets.slice(0, 10)) console.log(`  ${secret.rel}`);
    if (found.secrets.length > 10) console.log(t(`  and ${found.secrets.length - 10} more`, `  und ${found.secrets.length - 10} weitere`));
  }
  const own = [".claude/CLAUDE.md", ".claude/settings.json", ".claude/skills", ".claude/hooks", ".gitignore", ".git"].filter((entry) => existsSync(join(root, entry)));
  if (own.length) {
    console.log("");
    console.log(t(`What the house has stays as it is: ${own.join(", ")}.`, `Was das Haus hat, bleibt, wie es ist: ${own.join(", ")}.`));
  }
  console.log("");
  console.log(t(`Took ${((Date.now() - started) / 1000).toFixed(1)} seconds.`, `Dauer: ${((Date.now() - started) / 1000).toFixed(1)} Sekunden.`));
  console.log(t("Next steps:", "Nächste Schritte:"));
  console.log(t(`  1. Log in there: cd "${root}" && node arasul.mjs login <address> --user <name>`, `  1. Dort anmelden: cd "${root}" && node arasul.mjs login <adresse> --user <name>`));
  console.log(t("  2. Look before anything moves: node arasul.mjs sync --plan", "  2. Ansehen, bevor sich etwas bewegt: node arasul.mjs sync --plan"));
  console.log(t("  3. Then sync: node arasul.mjs sync", "  3. Dann abgleichen: node arasul.mjs sync"));
  process.exit(0);
}

if (args.adopt !== undefined) doAdopt();

if (args.deploy) {
  if (!isRoot) fail(t(`${root} is no root: .claude/root.json is missing.`, `${root} ist keine Wurzel: .claude/root.json fehlt.`));
  doDeploy();
}

if (args.check || args.show || args.enroll || args.unenroll) {
  if (!isRoot) fail(t(`${root} is no root: .claude/root.json is missing.`, `${root} ist keine Wurzel: .claude/root.json fehlt.`));
  if (args.enroll) doEnrol();
  if (args.unenroll) doUnenrol();
  if (args.show) {
    console.log(`${meta.name}, ${meta.language}, ${t("laid out on", "angelegt am")} ${meta.created}, Kit ${meta.kit}`);
    console.log(meta.method
      ? t("Method: laid out.", "Methode: angelegt.")
      : t("Method: not laid out, the scaffold only. --method adds it.", "Methode: nicht angelegt, nur das Gerüst. --method legt sie dazu."));
    sayPlaces(JSON.parse(readFileSync(join(root, ".claude", "places.json"), "utf8")).places || []);
    sayEnrolment();
  }
  process.exit(!args.check || sayCheck() ? 0 : 1);
}

if (isRoot) {
  if (args.folders) {
    fail(t(
      "The folders of level 1 are named when laying out. Later make the folder by hand and put a line for it into the table 'Where new things go' of .claude/CLAUDE.md, the check says if that is missing.",
      "Die Ordner der Ebene 1 werden beim Anlegen genannt. Später legst du den Ordner von Hand an und trägst eine Zeile in die Tabelle 'Wohin Neues gehört' der .claude/CLAUDE.md ein, die Prüfung sagt, wenn sie fehlt."
    ));
  }
  const place = singlePlace();
  if (!place && !args.method) {
    fail(t(
      `${root} is a root already. Add a place with --place, the method with --method, look at it with --show, check it with --check, enrol its proposal with --enroll, put it onto the device with --deploy.`,
      `${root} ist schon eine Wurzel. Trage einen Ort mit --place nach, die Methode mit --method, sieh sie mit --show an, prüfe sie mit --check, melde ihren Vorschlag mit --enroll an, lege sie mit --deploy aufs Gerät.`
    ));
  }
  try {
    if (args.method) {
      const written = addMethod(root);
      console.log(t(
        `Method laid out: ${written.length} files, rules appended to .claude/CLAUDE.md, a sheet per place under roadmap/.`,
        `Methode angelegt: ${written.length} Dateien, Regeln an .claude/CLAUDE.md angehängt, ein Blatt je Ort unter roadmap/.`
      ));
      console.log(t(
        "The proposal changed (archive is frozen). If the root is enrolled, look at it with --enroll and consent anew.",
        "Der Vorschlag hat sich geändert (das Archiv ist eingefroren). Ist die Wurzel angemeldet, sieh ihn mit --enroll an und stimme neu zu."
      ));
    }
    if (place) {
      addPlace(root, place);
      console.log(t(
        `Place '${place.name}' entered: .claude/places.json, the proposal in .claude/proposal/${meta.method ? `, sheet roadmap/${place.name}.md` : ""}.`,
        `Ort '${place.name}' eingetragen: .claude/places.json, der Vorschlag in .claude/proposal/${meta.method ? `, Blatt roadmap/${place.name}.md` : ""}.`
      ));
    }
  } catch (error) {
    fail(error.message);
  }
  process.exit(sayCheck() ? 0 : 1);
}

if (existsSync(root) && readdirSync(root).filter((name) => name !== ".DS_Store").length) {
  fail(t(
    `${root} is not empty. A root is laid out into an empty folder, it overwrites nothing.`,
    `${root} ist nicht leer. Eine Wurzel wird in einen leeren Ordner gelegt, sie überschreibt nichts.`
  ));
}

const example = args.example ? readExample(lang) : null;
const name = example ? example.name : args.name;
if (!name || name === true) fail(t("--name is missing: what the house is called.", "--name fehlt: wie das Haus heißt."));

let places = [];
if (example) {
  places = example.places.map(checked);
} else {
  if (args.places && args.places !== true) {
    let list;
    try {
      list = JSON.parse(readFileSync(expandHome(String(args.places), process.cwd()), "utf8"));
    } catch (error) {
      fail(t(`--places cannot be read: ${error.message}`, `--places lässt sich nicht lesen: ${error.message}`));
    }
    places = (Array.isArray(list) ? list : list.places || []).map(checked);
  }
  const single = singlePlace();
  if (single) places.push(single);
}
let folders = [];
if (args.folders && args.folders !== true) {
  const named = normalizeFolders(String(args.folders), lang);
  if (named.problems.length) fail(named.problems.join("; ") + ".");
  folders = named.folders;
} else if (example) {
  folders = normalizeFolders(example.folders, lang).folders;
}
const names = places.map((place) => place.name);
const twice = names.find((entry, index) => names.indexOf(entry) !== index);
if (twice) fail(t(`The place '${twice}' stands there twice.`, `Der Ort '${twice}' steht doppelt da.`));

const kitVersion = readFileSync(join(ROOT, ".ara", "VERSION"), "utf8").trim();
const method = Boolean(args.method || example);
const written = layOut({ root, name, language: lang, places, folders, method, example: Boolean(example), kitVersion });

console.log(t(`Root of ${name} laid out: ${root}`, `Wurzel von ${name} angelegt: ${root}`));
console.log(t(
  `${written.length} files, language ${lang}, ${method ? "with the method" : "the scaffold only"}.`,
  `${written.length} Dateien, Sprache ${lang}, ${method ? "mit der Methode" : "nur das Gerüst"}.`
));
if (folders.length) console.log(t(`Folders of level 1: ${folders.map((folder) => folder.name).join(", ")}.`, `Ordner der Ebene 1: ${folders.map((folder) => folder.name).join(", ")}.`));
if (example) {
  console.log(t(
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
    ? t(
        `Version control: not complete, git says: ${(broken.stderr || broken.error?.message || "").trim().split("\n")[0]}`,
        `Versionsverwaltung: nicht vollständig, git sagt: ${(broken.stderr || broken.error?.message || "").trim().split("\n")[0]}`
      )
    : t("Version control: repository created, first commit made.", "Versionsverwaltung: Repository angelegt, erster Commit gemacht."));
}

console.log(t(`Took ${((Date.now() - started) / 1000).toFixed(1)} seconds.`, `Dauer: ${((Date.now() - started) / 1000).toFixed(1)} Sekunden.`));
console.log("");
console.log(t("Next steps:", "Nächste Schritte:"));
if (example) {
  console.log(t(`  Read it, starting with .claude/CLAUDE.md. Or start the agent there: cd "${root}" && claude`, `  Lies sie, angefangen bei .claude/CLAUDE.md. Oder starte den Agenten dort: cd "${root}" && claude`));
  process.exit(clean ? 0 : 1);
}
console.log(t(
  "  1. Replace the comment at the top of .claude/CLAUDE.md with three sentences about the house.",
  "  1. Den Kommentar oben in .claude/CLAUDE.md durch drei Sätze über das Haus ersetzen."
));
console.log(method
  ? t(
      "  2. Fill company/core.md and company/goal.md, one goal per place into its sheet under roadmap/, the first undertakings on cards.",
      "  2. company/core.md und company/goal.md füllen, je Ort ein Ziel in sein Blatt unter roadmap/, die ersten Vorhaben auf Karten."
    )
  : t(
      "  2. Enter the places that are still missing with --place. The method, if you want it, comes with --method.",
      "  2. Die Orte, die noch fehlen, mit --place eintragen. Die Methode, falls gewünscht, kommt mit --method."
    ));
console.log(t(
  `  3. Look at the proposal for boundary and rights: node .ara/tools/root.mjs --path "${root}" --enroll`,
  `  3. Den Vorschlag für Grenze und Rechte ansehen: node .ara/tools/root.mjs --path "${root}" --enroll`
));
console.log(t(`  4. Start the agent there: cd "${root}" && claude`, `  4. Den Agenten dort starten: cd "${root}" && claude`));
process.exit(clean ? 0 : 1);
