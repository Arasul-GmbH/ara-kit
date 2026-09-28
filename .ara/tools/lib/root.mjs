/**
 * Die Firmenwurzel: was aus dem Geruest unter `.ara/templates/root/` wird.
 *
 * Eine Wurzel ist ein Ordner AUSSERHALB des Kits. Sie sagt fuer ein ganzes Haus,
 * was stimmt und wo etwas liegt, und sie nennt die Orte, an denen gearbeitet
 * wird, ohne sie zu kopieren. Nach dem Anlegen braucht sie das Kit nicht mehr:
 * das Pruefskript liegt in ihr und laeuft mit Node allein.
 *
 * Zwei Schichten. Das Geruest (`.ara/templates/root/`) ist immer da: Regeln,
 * Skills, Agents, Liste der Orte, Pruefskript, die Ordner der Ebene 1, die das
 * Haus nennt. Die Methode (`.ara/templates/root-method/`) ist ein Zusatz: company,
 * roadmap mit Kartenstapel, experiments, customers, templates, archive. Nichts im
 * angelegten Baum wirkt von selbst: keine settings.json, kein scharfer Hook. Was
 * das Haus an Grenze und Rechten will, liegt als Vorschlag in
 * `.claude/proposal/`, und erst `root-enroll.mjs` schreibt es nach Zustimmung
 * in die Einstellungen des Nutzers.
 *
 * Hier stehen nur Daten und reine Funktionen plus das Auslegen selbst. Der
 * Selbsttest liest dieselbe Liste `ROOT_TARGETS`, gegen die er Verweise im
 * Wissen prueft: zwei Listen liefen auseinander.
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { ROOT, day, today } from "./kit.mjs";
import { isVariant, t, variantOf } from "./i18n.mjs";
import { ignoredBy, parseGitignore } from "../../templates/root/arasul.mjs";

export const TEMPLATE = join(ROOT, ".ara", "templates", "root");
export const METHOD = join(ROOT, ".ara", "templates", "root-method");
export const EXAMPLE = join(ROOT, ".ara", "templates", "root-example");

/**
 * Wie eine Datei des Geruests in der Wurzel heisst.
 *
 * Das Geruest traegt seine Regeln als `rules.md` und nicht als `CLAUDE.md`, und
 * das mit Absicht: eine `CLAUDE.md` in einem Unterordner laedt der Agent mit,
 * sobald er dort eine Datei liest. Wer am Geruest arbeitet, arbeitete dann nach
 * den Regeln einer fremden Wurzel.
 */
const RENAMES = [
  [/^rules\.md$/, ".claude/CLAUDE.md"],
  [/^readme\.md$/, "README.md"],
  [/^gitignore$/, ".gitignore"],
  [/^scripts\//, ".claude/scripts/"],
  [/^proposal\//, ".claude/proposal/"],
  [/^skills\//, ".claude/skills/"],
  [/^agents\//, ".claude/agents/"],
];
// Das Blatt je Ort entsteht je Ort und nicht einmal. Die Regeln der Methode
// werden an die Regeln des Geruests gehaengt, sie sind keine Datei fuer sich.
const PER_PLACE = "roadmap/place.md";
const METHOD_RULES = "rules-method.md";
const NOT_FILES = new Set([PER_PLACE, METHOD_RULES, "example.json"]);

/** Die Ordner der Methode. Ein Haus nennt keinen seiner Ordner der Ebene 1 so. */
export const METHOD_FOLDERS = Object.freeze(["company", "roadmap", "experiments", "customers", "templates", "archive"]);
// `apps` is where the bridge writes what an app says about itself, see `arasul.mjs` in the root.
const RESERVED_FOLDERS = new Set([...METHOD_FOLDERS, "apps", "node_modules"]);

export const PROPOSAL = join(".claude", "proposal", "proposal.json");

export const KINDS = Object.freeze(["github", "folder"]);

function targetOf(source) {
  for (const [pattern, target] of RENAMES) {
    if (pattern.test(source)) return source.replace(pattern, target);
  }
  return source;
}

/** Alle Dateien eines Baums, relativ, mit `/`, ohne die deutschen Fassungen. */
function sources(base) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (!isVariant(entry.name)) out.push(relative(base, path).split(sep).join("/"));
    }
  };
  if (existsSync(base)) walk(base);
  return out.sort();
}

const laid = (base) => sources(base).filter((source) => !NOT_FILES.has(source)).map(targetOf);
const ALWAYS = [".claude/root.json", ".claude/places.json", PROPOSAL.split(sep).join("/")];

/** Was in jeder frischen Wurzel liegt, als Pfade relativ zu ihr. */
export const ROOT_TARGETS = Object.freeze(new Set([...laid(TEMPLATE), ...ALWAYS]));

/** Was die Methode zusaetzlich bringt. */
export const METHOD_TARGETS = Object.freeze(new Set(laid(METHOD)));

/**
 * Fuellt die Platzhalter eines Blattes.
 *
 * `{{day+7}}` ist der Tag in sieben Tagen. Die Vorzeigefassung braucht das: mit
 * festen Daten waere sie nach sechzig Tagen ein Befund ihres eigenen Pruefskripts.
 */
export function fill(text, values) {
  return text
    // A row placeholder stands in the template as `| {{key}} | |`, so that the sheet itself is a
    // valid table for markdownlint. It gives way to the rows it stands for.
    .replace(/^\| \{\{([a-z_]+)\}\} \| \|$/gm, (whole, key) => (key in values ? `{{${key}}}` : whole))
    // A line that is only a placeholder and comes out empty disappears with its line break:
    // an empty line inside a table would end the table.
    .replace(/^\{\{([a-z_]+)\}\}\r?\n/gm, (whole, key) => (key in values && values[key] === "" ? "" : whole))
    .replace(/\{\{day([+-]\d+)\}\}/g, (_, offset) => day(Number(offset)))
    .replace(/\{\{year\}\}/g, today().slice(0, 4))
    .replace(/\{\{([a-z_]+)\}\}/g, (whole, key) => (key in values ? String(values[key]) : whole));
}

export function expandHome(path, base) {
  if (path === "~" || path.startsWith("~/")) return join(homedir(), path.slice(1));
  return isAbsolute(path) ? path : resolve(base, path);
}

/**
 * Ein Pfad, wie ihn eine Rechteregel im Vorschlag schreibt.
 *
 * `{root}` steht fuer die Wurzel. Eine Regel in den Einstellungen des Nutzers
 * gilt von jedem Ordner aus, ein `./` darin waere der Ordner der jeweiligen
 * Sitzung. Beim Anmelden wird `{root}` zum ausgeschriebenen Pfad.
 */
export function rulePath(local) {
  if (local.startsWith("~/")) return local;
  if (isAbsolute(local)) return `/${local}`;
  return `{root}/${local.replace(/^\.\//, "")}`;
}

/**
 * Prueft einen Ort und bringt ihn in die Form der Liste.
 *
 * `where` ist, wo der Ort lebt: eine Adresse oder ein Pfad. `local` ist, wo er
 * auf diesem Rechner liegt, falls er das tut: ein Klon, ein abgeglichener
 * Ordner. Ohne `local` ist der Ort ein reiner Verweis.
 */
export function normalizePlace(raw, lang) {
  const place = {
    name: String(raw.name || "").trim(),
    kind: String(raw.kind || "").trim(),
    where: String(raw.where || "").trim(),
  };
  if (raw.local) place.local = String(raw.local).trim().replace(/\/+$/, "");
  if (String(raw.write || "").trim() === "yes") place.write = "yes";
  place.purpose = String(raw.purpose || "").trim();

  const problems = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(place.name)) {
    problems.push(t(`name '${place.name}' is not lower case with hyphens`, `name '${place.name}' ist nicht klein mit Bindestrichen`, lang));
  }
  if (place.name === "root" || place.name === "place" || place.name === "readme") {
    problems.push(t(`name '${place.name}' is taken by the root itself`, `name '${place.name}' gehört der Wurzel selbst`, lang));
  }
  if (!KINDS.includes(place.kind)) problems.push(t(`kind is neither ${KINDS.join(" nor ")}`, `kind ist weder ${KINDS.join(" noch ")}`, lang));
  if (!place.where) problems.push(t("where is missing", "where fehlt", lang));
  if (!place.purpose) problems.push(t("purpose is missing", "purpose fehlt", lang));
  return { place, problems };
}

function placeRules(place) {
  if (!place.local) return { allow: [], deny: [] };
  const rule = `(${rulePath(place.local)}/**)`;
  return place.write === "yes"
    ? { allow: [`Read${rule}`, `Edit${rule}`], deny: [] }
    : { allow: [`Read${rule}`], deny: [`Edit${rule}`] };
}

const outside = (place, root) => place.local && relative(root, expandHome(place.local, root)).startsWith("..");

function proposalNote(language) {
  return t(
    "A proposal, not a setting. Nothing in this folder is active by itself. The kit's enrolment step writes it into the user's own settings after consent, with a checksum over this file and boundary.mjs. Whoever changes either needs the consent again. {root} stands for this folder.",
    "Ein Vorschlag, keine Einstellung. Nichts in diesem Ordner wirkt von selbst. Der Anmeldeschritt des Kits schreibt ihn nach Zustimmung in die eigenen Einstellungen des Nutzers, mit einer Prüfsumme über diese Datei und boundary.mjs. Wer eine von beiden ändert, braucht die Zustimmung neu. {root} steht für diesen Ordner.",
    language
  );
}

/**
 * Der Vorschlag: Grenz-Hook und Erlaubnisregeln, als Datei und nicht als
 * `settings.json`. Eine Datei dieses Namens im Baum haette ein Ordner der Ebene 1
 * oder ein Klon nicht zu fragen, und ein Hook darin liefe bei jedem, der den
 * Ordner oeffnet, ohne dass er es je erlaubt hat.
 *
 * Nur Regeln, die auch aus jedem Ordner gelten: alle tragen einen Pfad, keine
 * ein `./`. `additionalDirectories` bringt die Sitzung eine Ebene tiefer dazu,
 * die Wurzel und die Orte auf diesem Rechner zu lesen.
 */
export function proposalFor(places, { method = false, language }) {
  // The bridge: `apps` and the reading form of `call` run without asking. What changes something
  // needs `--write`, and the `ask` rule below hands exactly that form back to the human. A rule
  // of the kind `Bash(...:*)` alone would let `call ... --write` through as well.
  // Both forms of the bridge, as with an adopted root: the skill calls it as `node arasul.mjs` at the
  // top of the root, because the root goes to every computer of the house and names no path of this one.
  const allow = ["Read({root}/**)", "Bash(node {root}/.claude/scripts/:*)", ...BRIDGE_RULES.allow];
  const deny = ["Read({root}/.env)", "Read({root}/**/.env)"];
  const ask = [...BRIDGE_RULES.ask];
  if (method) deny.push("Edit({root}/archive/**)");
  const additional = ["{root}"];
  for (const place of places) {
    const rules = placeRules(place);
    allow.push(...rules.allow);
    deny.push(...rules.deny);
    // Der Pfad bleibt, wie das Haus ihn geschrieben hat: `~/...` gilt auf jedem Rechner.
    if (place.local && !additional.includes(place.local) && !place.local.startsWith("{root}")) {
      additional.push(place.local);
    }
  }
  return {
    note: proposalNote(language),
    permissions: { allow, deny, ask, additionalDirectories: additional },
    hook: { event: "PreToolUse", matcher: "Write|Edit|NotebookEdit|Bash", script: "boundary.mjs" },
  };
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function placesNote(language) {
  return t(
    "Embedded places: a reference, never a copy. where says where the place lives, local where it lies on this computer, write: yes opens it for writing out of this root.",
    "Eingebettete Orte: ein Verweis, nie eine Kopie. where sagt, wo der Ort lebt, local, wo er auf diesem Rechner liegt, write: yes öffnet ihn für das Schreiben aus dieser Wurzel.",
    language
  );
}

/** Legt einen Baum des Kits in die Wurzel, in der Sprache der Wurzel. */
function layTree(base, root, language, values, { keep = false } = {}) {
  const written = [];
  for (const source of sources(base)) {
    if (NOT_FILES.has(source)) continue;
    const from = join(base, source);
    const german = variantOf(from, "de");
    const chosen = language === "de" && existsSync(german) ? german : from;
    const target = join(root, targetOf(source));
    if (keep && existsSync(target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    if (/\.(md|json|csv)$/.test(source) || source === "gitignore") {
      writeFileSync(target, fill(readFileSync(chosen, "utf8"), values));
    } else {
      copyFileSync(chosen, target);
    }
    written.push(targetOf(source));
  }
  return written;
}

function placeSheet(root, place, language) {
  const target = join(root, "roadmap", `${place.name}.md`);
  if (existsSync(target)) return false;
  const from = join(METHOD, PER_PLACE);
  const german = variantOf(from, "de");
  const text = readFileSync(language === "de" && existsSync(german) ? german : from, "utf8");
  writeFileSync(target, fill(text, { place: place.name, where: place.where, purpose: place.purpose }));
  return true;
}

/** Ein Klon in der Wurzel ist ein Verweis, also laesst die Versionsverwaltung ihn aus. */
function ignoreLocal(root, place) {
  if (!place.local) return;
  const inside = relative(root, expandHome(place.local, root));
  if (inside.startsWith("..") || isAbsolute(inside)) return;
  const file = join(root, ".gitignore");
  const line = `/${inside.split(sep).join("/")}`;
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (!text.split(/\r?\n/).includes(line)) writeFileSync(file, `${text.replace(/\n*$/, "\n")}${line}\n`);
}

export function readExample(language) {
  const from = join(EXAMPLE, "example.json");
  const german = variantOf(from, "de");
  return JSON.parse(readFileSync(language === "de" && existsSync(german) ? german : from, "utf8"));
}

/**
 * Prueft die Ordner der Ebene 1, die das Haus nennt.
 *
 * `name` oder `name=wofuer`, durch Kommas getrennt, oder schon eine Liste aus
 * `{ name, purpose }`. Ein Ordner heisst wie ein Ort nur, wenn das Haus es so
 * will, das prueft nur das Pruefskript.
 */
export function normalizeFolders(raw, lang) {
  const list = typeof raw === "string"
    ? raw.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
        const cut = part.indexOf("=");
        return cut < 0 ? { name: part } : { name: part.slice(0, cut).trim(), purpose: part.slice(cut + 1).trim() };
      })
    : raw || [];
  const folders = [];
  const problems = [];
  for (const entry of list) {
    const name = String(entry.name || "").trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      problems.push(t(`folder '${name}' is not lower case with hyphens`, `Ordner '${name}' ist nicht klein mit Bindestrichen`, lang));
    } else if (RESERVED_FOLDERS.has(name)) {
      problems.push(t(`folder '${name}' is taken by the method or by the tools`, `Ordner '${name}' gehört der Methode oder den Werkzeugen`, lang));
    } else if (folders.some((known) => known.name === name)) {
      problems.push(t(`folder '${name}' stands there twice`, `Ordner '${name}' steht doppelt da`, lang));
    } else {
      folders.push({ name, purpose: String(entry.purpose || "").trim() });
    }
  }
  return { folders, problems };
}

/** Die Zeilen der Tabelle "Wohin Neues gehoert" fuer die Ordner der Ebene 1. */
function folderRows(folders, language) {
  return folders
    .map((folder) => `| ${folder.purpose || t(`what belongs to ${folder.name}`, `was zu ${folder.name} gehört`, language)} | \`${folder.name}/\` |`)
    .join("\n");
}

/** Die Regeln der Methode, gefuellt, zum Anhaengen an die Regeln des Geruests. */
function methodRules(language, values) {
  const from = join(METHOD, METHOD_RULES);
  const german = variantOf(from, "de");
  return fill(readFileSync(language === "de" && existsSync(german) ? german : from, "utf8"), values);
}

function appendMethodRules(root, language, values) {
  const file = join(root, ".claude", "CLAUDE.md");
  const text = readFileSync(file, "utf8").replace(/\n*$/, "\n");
  writeFileSync(file, `${text}\n${methodRules(language, values)}`);
}

function makeFolders(root, folders) {
  for (const folder of folders) {
    const dir = join(root, folder.name);
    mkdirSync(dir, { recursive: true });
    if (!readdirSync(dir).length) writeFileSync(join(dir, ".gitkeep"), "");
  }
}

/**
 * Legt eine Wurzel an. `root` ist leer oder fehlt, das prueft der Aufrufer.
 *
 * Ohne `method` entsteht nur das Geruest. Die Vorzeigefassung ist eine
 * erfundene Firma mit gefuellten Blaettern und braucht darum die Methode.
 */
export function layOut({ root, name, language, places, folders = [], method = false, example = false, kitVersion }) {
  const withMethod = method || example;
  const values = { name, today: today(), kit_version: kitVersion, folder_rows: folderRows(folders, language) };
  mkdirSync(root, { recursive: true });
  const written = layTree(TEMPLATE, root, language, values);
  if (withMethod) {
    written.push(...layTree(METHOD, root, language, values));
    appendMethodRules(root, language, values);
  }
  if (example) written.push(...layTree(EXAMPLE, root, language, values));
  makeFolders(root, folders);

  writeJson(join(root, ".claude", "root.json"), { name, language, created: today(), kit: kitVersion, method: withMethod, example });
  writeJson(join(root, ".claude", "places.json"), { note: placesNote(language), places });
  writeJson(join(root, PROPOSAL), proposalFor(places, { method: withMethod, language }));
  if (withMethod) {
    // Das Blatt fuer die Ziele der Wurzel selbst, in derselben Form wie die der Orte.
    placeSheet(root, {
      name: "root",
      where: t("this folder", "dieser Ordner", language),
      purpose: t("the business of the whole house", "das Geschäft des ganzen Hauses", language),
    }, language);
  }
  for (const place of places) {
    if (withMethod) placeSheet(root, place, language);
    ignoreLocal(root, place);
  }
  return [...new Set(written)].sort();
}

/**
 * Ergaenzt Regeln eines Vorschlags, ohne neu zu schreiben: was das Haus von Hand
 * eingetragen hat, bleibt.
 */
function mergeRules(root, ...changes) {
  const file = join(root, PROPOSAL);
  // A root without a proposal has settings of its own, and the house decides them.
  if (!existsSync(file)) return;
  const proposal = JSON.parse(readFileSync(file, "utf8"));
  proposal.permissions ||= {};
  for (const change of changes) {
    for (const side of ["allow", "deny", "ask", "additionalDirectories"]) {
      if (side === "ask" && !(change.ask || []).length && !proposal.permissions.ask) continue;
      proposal.permissions[side] ||= [];
      for (const rule of change[side] || []) {
        if (!proposal.permissions[side].includes(rule)) proposal.permissions[side].push(rule);
      }
    }
  }
  writeJson(file, proposal);
}

/** Traegt einen Ort in eine bestehende Wurzel ein: Liste, Vorschlag, bei der Methode das Blatt. */
export function addPlace(root, place) {
  const meta = JSON.parse(readFileSync(join(root, ".claude", "root.json"), "utf8"));
  const listFile = join(root, ".claude", "places.json");
  const list = JSON.parse(readFileSync(listFile, "utf8"));
  if (list.places.some((entry) => entry.name === place.name)) {
    throw new Error(t(`The place '${place.name}' stands there already.`, `Der Ort '${place.name}' steht schon da.`));
  }
  list.places.push(place);
  writeJson(listFile, list);

  const rules = placeRules(place);
  mergeRules(root, {
    ...rules,
    additionalDirectories: outside(place, root) && !place.local.startsWith("{root}") ? [place.local] : [],
  });
  if (meta.method) placeSheet(root, place, meta.language);
  ignoreLocal(root, place);
  return meta;
}

/**
 * Legt die Methode in eine bestehende Wurzel: Ordner, Kartenwerkzeug, Regeln,
 * ein Blatt je Ort. Ueberschrieben wird nichts. Liegt einer der Ordner schon da,
 * gehoert er dem Haus, und die Methode wartet, bis es ihn umbenannt hat.
 */
export function addMethod(root) {
  const metaFile = join(root, ".claude", "root.json");
  const meta = JSON.parse(readFileSync(metaFile, "utf8"));
  if (meta.method) throw new Error(t("The method lies in this root already.", "Die Methode liegt in dieser Wurzel schon."));
  const taken = METHOD_FOLDERS.filter((folder) => existsSync(join(root, folder)));
  if (taken.length) {
    throw new Error(t(
      `The folder ${taken.join(", ")} exists already and belongs to the house. Rename it first, the method brings its own.`,
      `Der Ordner ${taken.join(", ")} liegt schon da und gehört dem Haus. Benenne ihn zuerst um, die Methode bringt ihren eigenen mit.`
    ));
  }
  const values = { name: meta.name, today: today(), kit_version: meta.kit, folder_rows: "" };
  const written = layTree(METHOD, root, meta.language, values, { keep: true });
  appendMethodRules(root, meta.language, values);
  const places = JSON.parse(readFileSync(join(root, ".claude", "places.json"), "utf8")).places || [];
  placeSheet(root, {
    name: "root",
    where: t("this folder", "dieser Ordner", meta.language),
    purpose: t("the business of the whole house", "das Geschäft des ganzen Hauses", meta.language),
  }, meta.language);
  for (const place of places) placeSheet(root, place, meta.language);
  mergeRules(root, { deny: ["Edit({root}/archive/**)"] });
  writeJson(metaFile, { ...meta, method: true });
  return written;
}

/** Laesst das Pruefskript der Wurzel laufen, in ihr und mit ihrem Node. */
export function runCheck(root) {
  return spawnSync(process.execPath, [join(root, ".claude", "scripts", "check.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
}

// --- Adopting a grown folder ------------------------------------------------------------------

// The same marks of a source tree as the root's check script, check 17: a manifest, a src/ with
// code, a node_modules. Kept equal by hand, the check script runs without the kit.
const MANIFESTS = ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "composer.json", "Gemfile"];
const CODE_EXT = [".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".go", ".rs", ".java", ".rb", ".php", ".c", ".cpp", ".cs", ".swift", ".kt"];
const SECRET_FILE = /^\.env(\..+)?$/;
// What a machine makes: not looked into, a clone or a secret does not lie there.
const MADE = new Set([".git", "node_modules", ".next", ".venv", "__pycache__"]);
/** What adopting writes, and nothing else. */
export const ADOPT_TARGETS = Object.freeze([".claude/root.json", ".claude/places.json", "arasul.mjs", PROPOSAL.split(sep).join("/")]);

/**
 * Names of a folder of level 1 that look like data of customers or like the inside of a company.
 * Whatever lies at level 1 of a root goes to every account of the device: the root is read by
 * everybody who is active there (measured on 2026-09-27, a second account got the customers' folder
 * and company/core.md of an adopted root). These are the ones worth a word first; every other
 * folder of level 1 is named as well.
 */
const CUSTOMER_NAMES = /^(kunden?|customers?|clients?|klienten|mandant(en)?|auftraege|auftrage|orders?|projekte-kunden|crm|leads|partner)$/;
const INSIDE_NAMES = /^(company|firma|intern(al)?|internes|hr|personal|people|finanz(en)?|finance|buchhaltung|accounting|steuer(n)?|tax|vertraege|vertrage|contracts?|legal|recht|gehalt|gehaelter|salary|salaries|bank|verwaltung|admin|management|geschaeftsfuehrung|board|strategie|strategy)$/;
/** The id a device takes for a folder: lower case, digits and hyphens, 2 to 40 characters (as of 2026-09-27). */
const FOLDER_KEY = /^[a-z0-9][a-z0-9-]{1,39}$/;

/**
 * The folders at level 1 of a grown folder that a sync of the root would take along, and so show
 * to every account: not left out by the .gitignore, no clone, not the root's own furniture.
 */
function levelOne(root, rules, clones) {
  const own = new Set([".claude", "apps", ".git", "node_modules", ".arasul-papierkorb"]);
  const cloned = new Set(clones.filter((clone) => !clone.rel.includes("/")).map((clone) => clone.rel));
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || own.has(entry.name) || MADE.has(entry.name) || cloned.has(entry.name)) continue;
    if (ignoredBy(rules, entry.name, true)) continue;
    const key = entry.name.toLowerCase();
    const kind = CUSTOMER_NAMES.test(key) ? "customers" : INSIDE_NAMES.test(key) ? "inside" : null;
    out.push({ name: entry.name, kind, key: FOLDER_KEY.test(entry.name) });
  }
  const rank = (folder) => (folder.kind === "customers" ? 0 : folder.kind === "inside" ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/**
 * The two lines the proposal of an adopted root offers for the house's CLAUDE.md: where the view of
 * this person lies and where each app says what it can. A laid out root has both in its rules; a
 * grown folder has its own rules, and a new session would find neither without a word.
 *
 * The command stands as it is typed in this folder, `node arasul.mjs`, and the proposal allows
 * exactly that form. Measured on 2026-09-28: with a placeholder `<wurzel>` in the line, `claude -p`
 * tried the form without a path first, twice, and was refused each time. The CLAUDE.md goes to
 * every computer of the house, so it names no path of this one.
 */
export function adoptLines(language) {
  return [
    t(
      "- `sicht.md` at the top of this root says which folders and apps of the Arasul device you have; `node arasul.mjs sync` in this folder writes it anew, never by hand.",
      "- `sicht.md` oben in dieser Wurzel sagt, welche Ordner und Apps des Arasul-Geräts du hast; `node arasul.mjs sync` in diesem Ordner schreibt sie neu, nie von Hand.",
      language
    ),
    t(
      "- What an app can do stands in `apps/<id>/APP.md`: call only the routes named there, from this folder with `node arasul.mjs call <app> <route>`, `node arasul.mjs apps` lists the apps; a route that changes something needs `--write`.",
      "- Was eine App kann, steht in `apps/<id>/APP.md`: rufe nur die Routen, die dort stehen, aus diesem Ordner mit `node arasul.mjs call <app> <route>`, `node arasul.mjs apps` zählt die Apps auf; eine Route, die etwas ändert, braucht `--write`.",
      language
    ),
  ];
}

/**
 * The bridge's rules of an adopted root, in both forms: with the written-out path, which holds from
 * any folder, and as the command is typed in the root, `node arasul.mjs`. The bridge puts the form
 * without a path into the root's own settings.local.json, never into the user's.
 */
export const BRIDGE_RULES = Object.freeze({
  allow: ["Bash(node {root}/arasul.mjs apps:*)", "Bash(node {root}/arasul.mjs call:*)", "Bash(node arasul.mjs apps:*)", "Bash(node arasul.mjs call:*)"],
  ask: ["Bash(node {root}/arasul.mjs call*--write*)", "Bash(node arasul.mjs call*--write*)"],
});

/**
 * The proposal of an adopted root: the bridge's rules and the two lines for CLAUDE.md, no hook.
 * The house has its own settings and maybe hooks of its own; a boundary hook of the kit on top
 * would be a decision about how the house works, and that is not the kit's to propose here.
 */
export function adoptProposal(root, language) {
  const file = LANGUAGE_FILES.find((rel) => existsSync(join(root, rel))) || LANGUAGE_FILES[0];
  return {
    note: t(
      "A proposal, not a setting. Nothing in this folder is active by itself. node arasul.mjs login shows it, and approving it with its checksum writes the rules with {root} into the user's own settings, the ones without a path into this folder's .claude/settings.local.json, and the lines into the house's CLAUDE.md; login --withdraw takes all of it back. {root} stands for this folder.",
      "Ein Vorschlag, keine Einstellung. Nichts in diesem Ordner wirkt von selbst. node arasul.mjs login zeigt ihn, und wer ihn mit seiner Prüfsumme freigibt, schreibt die Regeln mit {root} in die eigenen Einstellungen, die ohne Pfad in .claude/settings.local.json dieses Ordners und die Zeilen in die CLAUDE.md des Hauses; login --withdraw nimmt alles zurück. {root} steht für diesen Ordner.",
      language
    ),
    permissions: {
      allow: [...BRIDGE_RULES.allow],
      deny: [],
      ask: [...BRIDGE_RULES.ask],
      additionalDirectories: [],
    },
    lines: { file, lines: adoptLines(language) },
  };
}

const posix = (path) => path.split(sep).join("/");

function hasCode(dir, deep = 0) {
  if (deep > 6) return false;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((entry) => {
    if (entry.isSymbolicLink() || entry.name === "node_modules") return false;
    if (entry.isDirectory()) return hasCode(join(dir, entry.name), deep + 1);
    return CODE_EXT.some((ext) => entry.name.endsWith(ext));
  });
}

/** Where a clone lives, out of its remote: a GitHub address as a page, anything else as it stands. */
function remoteOf(dir) {
  const run = spawnSync("git", ["-C", dir, "config", "--get", "remote.origin.url"], { encoding: "utf8" });
  const url = run.status === 0 ? run.stdout.trim() : "";
  const github = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (github) return { kind: "github", where: `https://github.com/${github[1]}/${github[2]}` };
  return url ? { kind: "folder", where: url } : null;
}

/** Whether the .gitignore at the top leaves a path out, by itself or by a folder above it. */
function leftOut(rules, rel, dir) {
  const parts = rel.split("/");
  for (let i = 1; i <= parts.length; i += 1) {
    if (ignoredBy(rules, parts.slice(0, i).join("/"), i < parts.length || dir)) return true;
  }
  return false;
}

// What never goes, whatever the house's .gitignore says: kept equal by hand with NEVER_SYNCED of the
// bridge, as far as it can lie in .claude.
const NEVER_IN_CLAUDE = (name) => MADE.has(name) || SECRET_FILE.test(name) || name === "settings.json" || name === "settings.local.json" || name === ".DS_Store" || /^\.sync_/.test(name);
// What a running program writes: logs, state, locks, databases, caches, the agents of launchd.
const RUNTIME_FILE = /\.(log|pid|lock|sock|db|sqlite3?|db-(wal|shm|journal)|tmp|bak|swp|cache)$|^(state|status|cache)\.json$|\.plist(\.[a-z]+)?$/i;
const RUNTIME_DIR = /^(state|cache|caches|tmp|temp|logs?|runs?)$/i;
const SCRIPT_FILE = /\.(py|sh|bash|zsh|mjs|cjs|js|ts|rb|pl|php|ps1|applescript|swift|go)$/i;
// The kit's own files of an adopted root, and the hooks, which never go.
const CLAUDE_OWN = new Set(["hooks", "proposal", "root.json", "places.json"]);

/**
 * What in `.claude/` a sync of the root would take along, and so show to every account: the scripts
 * and the runtime files, each by itself, and how many other files, rules, skills and agents, which
 * is what a root is for. Measured on 2026-09-28 at an adopted folder: every account read
 * `.claude/scripts/mail.py` and `.claude/app/serve.py`, and `--adopt` had named only level 1.
 */
export function insideClaude(root, rules) {
  const scripts = [];
  const runtime = [];
  let rest = 0;
  const walk = (dir, deep) => {
    if (deep > 12) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink() || NEVER_IN_CLAUDE(entry.name)) continue;
      const path = join(dir, entry.name);
      const rel = posix(relative(root, path));
      if (deep === 0 && CLAUDE_OWN.has(entry.name)) continue;
      if (leftOut(rules, rel, entry.isDirectory())) continue;
      if (entry.isDirectory()) {
        if (RUNTIME_DIR.test(entry.name)) runtime.push(`${rel}/`);
        else walk(path, deep + 1);
      } else if (RUNTIME_FILE.test(entry.name)) runtime.push(rel);
      else if (SCRIPT_FILE.test(entry.name) || (!entry.name.includes(".") && (statSync(path).mode & 0o111))) scripts.push(rel);
      else rest += 1;
    }
  };
  if (existsSync(join(root, ".claude"))) walk(join(root, ".claude"), 0);
  return { scripts, runtime, rest };
}

/**
 * What lies in a grown folder: the clones in it, the source trees, the files that hold secrets.
 *
 * A clone is a folder with its own .git below the top. Whether the .gitignore at the top leaves it
 * out decides what it is: left out, it is a place that lies here, and it is entered as one; not
 * left out, it would go into the company folder as a copy, and it is named instead. A source tree
 * is what check 17 of a laid out root calls one. Nothing is written here.
 */
export function survey(root, rules) {
  const clones = [];
  const sources = [];
  const secrets = [];
  const left = (rel, dir) => leftOut(rules, rel, dir);
  const walk = (dir, deep, inSource = false) => {
    if (deep > 30) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const names = new Set(entries.map((entry) => entry.name));
    const rel = posix(relative(root, dir));
    if (dir !== root && names.has(".git")) {
      clones.push({ rel, ignored: left(rel, true), ...(remoteOf(dir) || {}) });
      return;
    }
    let source = inSource;
    if (!inSource && dir !== root && rel.split("/")[0] !== ".claude") {
      const manifest = MANIFESTS.find((name) => names.has(name)) || [...names].find((name) => /\.(csproj|sln)$/.test(name));
      const code = names.has("src") && hasCode(join(dir, "src"));
      if (manifest || code || names.has("node_modules")) {
        sources.push({ rel, why: manifest || (code ? "src/" : "node_modules/"), ignored: left(rel, true) });
        source = true;
      }
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink() || MADE.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path, deep + 1, source);
      else if (SECRET_FILE.test(entry.name)) {
        const file = posix(relative(root, path));
        secrets.push({ rel: file, ignored: left(file, false) });
      }
    }
  };
  walk(root, 0);
  return { clones, sources, secrets };
}

/** A name for a place out of the name of its folder: lower case with hyphens, never one of the root's own. */
function placeName(folder, taken) {
  let name = folder.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-") || "place";
  if (!/^[a-z0-9]/.test(name)) name = `p-${name}`;
  if (["root", "place", "readme"].includes(name)) name = `${name}-repo`;
  let unique = name;
  for (let n = 2; taken.has(unique); n += 1) unique = `${name}-${n}`;
  taken.add(unique);
  return unique;
}

/**
 * Welche Sprache ein gewachsener Ordner spricht, aus seiner CLAUDE.md.
 *
 * Nachtrag zu K17, 27.09.2026: `--adopt` schrieb die Sprache aus dem Profil des
 * Kits in root.json, en, und die übernommene Wurzel war deutsch. Gezählt werden
 * kurze Wörter, die fast jeder Satz trägt, dazu die Umlaute; wer klar vorn
 * liegt, gewinnt. Unentschieden oder keine Datei: `null`, dann gilt das Profil.
 */
export const LANGUAGE_FILES = [".claude/CLAUDE.md", "CLAUDE.md"];
export function languageOf(root) {
  const file = LANGUAGE_FILES.map((rel) => join(root, rel)).find((path) => existsSync(path));
  if (!file) return null;
  const text = readFileSync(file, "utf8").toLowerCase();
  const count = (words) => (text.match(new RegExp(`\\b(${words})\\b`, "g")) || []).length;
  const de = count("und|der|die|das|nicht|ist|mit|für|ein|eine|wird|auf|den|zu") + (text.match(/[äöüß]/g) || []).length;
  const en = count("the|and|is|not|with|for|a|an|of|to|this|that|be|on");
  if (de >= 2 * en && de >= 5) return "de";
  if (en >= 2 * de && en >= 5) return "en";
  return null;
}

/**
 * Takes a grown folder over as a root, and overwrites nothing.
 *
 * Exactly four files come into being: `.claude/root.json`, `.claude/places.json`, the bridge
 * `arasul.mjs` and the proposal `.claude/proposal/proposal.json`, which is active only once
 * somebody approves it. Everything else stays as the house has it: its rules, its skills, its
 * settings, its .gitignore, its version control. The caller has checked that none of them lies there.
 */
export function adopt({ root, name, language, kitVersion }) {
  const file = join(root, ".gitignore");
  const rules = parseGitignore(existsSync(file) ? readFileSync(file, "utf8") : "");
  const found = survey(root, rules);
  const taken = new Set();
  const places = [];
  for (const clone of found.clones.filter((entry) => entry.ignored)) {
    const local = `./${clone.rel}`;
    const where = clone.where || local;
    places.push({
      name: placeName(clone.rel.split("/").pop(), taken),
      kind: clone.kind || "folder",
      where,
      local,
      purpose: t(`a repository of its own in this folder, taken over as a place on ${today()}`, `ein eigenes Repository in diesem Ordner, übernommen als Ort am ${today()}`, language),
    });
  }
  const folders = levelOne(root, rules, found.clones);
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeJson(join(root, ".claude", "root.json"), { name, language, created: today(), kit: kitVersion, method: false, example: false, adopted: today() });
  writeJson(join(root, ".claude", "places.json"), { note: placesNote(language), places });
  writeJson(join(root, PROPOSAL), adoptProposal(root, language));
  copyFileSync(join(TEMPLATE, "arasul.mjs"), join(root, "arasul.mjs"));
  return { places, ...found, folders, claude: insideClaude(root, rules), gitignore: existsSync(file) };
}
