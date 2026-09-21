/**
 * Die Firmenwurzel: was aus dem Geruest unter `.ara/templates/root/` wird.
 *
 * Eine Wurzel ist ein Ordner AUSSERHALB des Kits. Sie sagt fuer ein ganzes Haus,
 * was stimmt, was ansteht und wo etwas liegt, und sie nennt die Orte, an denen
 * gearbeitet wird, ohne sie zu kopieren. Nach dem Anlegen braucht sie das Kit
 * nicht mehr: Pruefskript, Grenze und Kartenwerkzeug liegen in ihr und laufen
 * mit Node allein.
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
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { ROOT, day, today } from "./kit.mjs";
import { isVariant, t, variantOf } from "./i18n.mjs";

export const TEMPLATE = join(ROOT, ".ara", "templates", "root");
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
  [/^hooks\//, ".claude/hooks/"],
];
// Das Blatt je Ort entsteht je Ort und nicht einmal.
const PER_PLACE = "roadmap/place.md";

/** Die Ordner ganz oben in einer Wurzel, mit dem Recht, das sie tragen. */
export const FOLDERS = Object.freeze({
  company: "Edit",
  roadmap: "Edit",
  experiments: "Edit",
  customers: "Edit",
  templates: "Edit",
  archive: "Read",
});

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

/** Was in jeder frischen Wurzel liegt, als Pfade relativ zu ihr. */
export const ROOT_TARGETS = Object.freeze(
  new Set([
    ...sources(TEMPLATE).filter((source) => source !== PER_PLACE).map(targetOf),
    ".claude/settings.json",
    ".claude/root.json",
    ".claude/places.json",
  ])
);

/**
 * Fuellt die Platzhalter eines Blattes.
 *
 * `{{day+7}}` ist der Tag in sieben Tagen. Die Vorzeigefassung braucht das: mit
 * festen Daten waere sie nach sechzig Tagen ein Befund ihres eigenen Pruefskripts.
 */
export function fill(text, values) {
  return text
    .replace(/\{\{day([+-]\d+)\}\}/g, (_, offset) => day(Number(offset)))
    .replace(/\{\{year\}\}/g, today().slice(0, 4))
    .replace(/\{\{([a-z_]+)\}\}/g, (whole, key) => (key in values ? String(values[key]) : whole));
}

export function expandHome(path, base) {
  if (path === "~" || path.startsWith("~/")) return join(homedir(), path.slice(1));
  return isAbsolute(path) ? path : resolve(base, path);
}

/** Ein Pfad, wie ihn eine Rechteregel in settings.json schreibt. */
export function rulePath(local) {
  if (local.startsWith("~/")) return local;
  if (isAbsolute(local)) return `/${local}`;
  return `./${local.replace(/^\.\//, "")}`;
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

const HOOK = 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/boundary.mjs"';

function placeRules(place) {
  if (!place.local) return { allow: [], deny: [] };
  const rule = `(${rulePath(place.local)}/**)`;
  return place.write === "yes"
    ? { allow: [`Read${rule}`, `Edit${rule}`], deny: [] }
    : { allow: [`Read${rule}`], deny: [`Edit${rule}`] };
}

/**
 * Die Rechte einer frischen Wurzel: eine Zeile je Ordner, nach dem Vorbild des Kits.
 *
 * `defaultMode` bleibt `default`, und das ist der Punkt: nur dann sagt eine
 * Zeile `Edit(./company/**)` etwas. Im Modus acceptEdits waere jeder Ordner
 * offen und die Liste Schmuck.
 */
export function settingsFor(places, root) {
  const allow = ["Read(./**)"];
  const deny = [];
  for (const [folder, right] of Object.entries(FOLDERS)) {
    allow.push(`${right}(./${folder}/**)`);
    if (right === "Read") deny.push(`Edit(./${folder}/**)`);
  }
  allow.push(
    "Bash(node .claude/scripts/:*)",
    "Bash(git status:*)",
    "Bash(git log:*)",
    "Bash(git diff:*)",
    "Bash(git add:*)",
    "Bash(git commit:*)",
    "Bash(git mv:*)",
    "Bash(ls:*)",
    "Bash(gh repo view:*)",
    "Bash(gh pr list:*)",
    "Bash(gh issue list:*)"
  );
  deny.push(
    "Read(./.env)",
    "Read(./**/.env)",
    "Read(~/.ssh/id_*)",
    "Read(~/.aws/**)",
    "Read(~/.config/gcloud/**)",
    "Bash(env)",
    "Bash(printenv:*)",
    "Bash(git push --force:*)",
    "Bash(git push -f:*)"
  );
  const additional = [];
  for (const place of places) {
    const rules = placeRules(place);
    allow.push(...rules.allow);
    deny.push(...rules.deny);
    const outside = place.local && relative(root, expandHome(place.local, root)).startsWith("..");
    if (outside) additional.push(expandHome(place.local, root));
  }
  return {
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    permissions: {
      defaultMode: "default",
      allow,
      deny,
      ...(additional.length ? { additionalDirectories: additional } : {}),
    },
    hooks: {
      PreToolUse: [{ matcher: "Write|Edit|NotebookEdit|Bash", hooks: [{ type: "command", command: HOOK }] }],
    },
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
function layTree(base, root, language, values) {
  const written = [];
  for (const source of sources(base)) {
    if (source === PER_PLACE || source === "example.json") continue;
    const from = join(base, source);
    const german = variantOf(from, "de");
    const chosen = language === "de" && existsSync(german) ? german : from;
    const target = join(root, targetOf(source));
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
  const from = join(TEMPLATE, PER_PLACE);
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
 * Legt eine Wurzel an. `root` ist leer oder fehlt, das prueft der Aufrufer.
 */
export function layOut({ root, name, language, places, example = false, kitVersion }) {
  const values = { name, today: today(), kit_version: kitVersion };
  mkdirSync(root, { recursive: true });
  const written = layTree(TEMPLATE, root, language, values);
  if (example) written.push(...layTree(EXAMPLE, root, language, values));

  writeJson(join(root, ".claude", "root.json"), { name, language, created: today(), kit: kitVersion, example });
  writeJson(join(root, ".claude", "places.json"), { note: placesNote(language), places });
  writeJson(join(root, ".claude", "settings.json"), settingsFor(places, root));
  // Das Blatt fuer die Ziele der Wurzel selbst, in derselben Form wie die der Orte.
  placeSheet(root, {
    name: "root",
    where: t("this folder", "dieser Ordner", language),
    purpose: t("the business of the whole house", "das Geschäft des ganzen Hauses", language),
  }, language);
  for (const place of places) {
    placeSheet(root, place, language);
    ignoreLocal(root, place);
  }
  return [...new Set(written)].sort();
}

/** Traegt einen Ort in eine bestehende Wurzel ein: Liste, Rechte, Blatt. */
export function addPlace(root, place) {
  const meta = JSON.parse(readFileSync(join(root, ".claude", "root.json"), "utf8"));
  const listFile = join(root, ".claude", "places.json");
  const list = JSON.parse(readFileSync(listFile, "utf8"));
  if (list.places.some((entry) => entry.name === place.name)) {
    throw new Error(t(`The place '${place.name}' stands there already.`, `Der Ort '${place.name}' steht schon da.`));
  }
  list.places.push(place);
  writeJson(listFile, list);

  // Die Rechte werden ergaenzt, nicht neu geschrieben: was das Haus von Hand
  // eingetragen hat, bleibt.
  const settingsFile = join(root, ".claude", "settings.json");
  const settings = JSON.parse(readFileSync(settingsFile, "utf8"));
  settings.permissions ||= {};
  const rules = placeRules(place);
  for (const side of ["allow", "deny"]) {
    settings.permissions[side] ||= [];
    for (const rule of rules[side]) {
      if (!settings.permissions[side].includes(rule)) settings.permissions[side].push(rule);
    }
  }
  if (place.local && relative(root, expandHome(place.local, root)).startsWith("..")) {
    const dirs = (settings.permissions.additionalDirectories ||= []);
    const path = expandHome(place.local, root);
    if (!dirs.includes(path)) dirs.push(path);
  }
  writeJson(settingsFile, settings);
  placeSheet(root, place, meta.language);
  ignoreLocal(root, place);
  return meta;
}

/** Laesst das Pruefskript der Wurzel laufen, in ihr und mit ihrem Node. */
export function runCheck(root) {
  return spawnSync(process.execPath, [join(root, ".claude", "scripts", "check.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
}
