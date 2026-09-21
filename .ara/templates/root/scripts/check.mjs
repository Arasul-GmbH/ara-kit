#!/usr/bin/env node
/**
 * Finds contradictions in this root. Exit code 0 means: none found.
 *
 * Every check stands for something that went wrong in a root like this one, not for a
 * textbook rule. The most important rule for this script: no check is switched on that
 * gives a false alarm on a well kept root. An alarm that is regularly wrong stops
 * working. Whoever adds a check first counts how many hits it gives today.
 *
 *   node .claude/scripts/check.mjs
 *   node .claude/scripts/check.mjs --only 8
 *   node .claude/scripts/check.mjs --quiet
 *
 * === deutsch ===
 *
 * Findet Widersprüche in dieser Wurzel. Rückgabe 0 heißt: keiner gefunden.
 *
 * Jede Prüfung steht für etwas, das in einer solchen Wurzel schiefging, nicht für eine
 * Regel aus dem Lehrbuch. Die wichtigste Regel für dieses Skript: keine Prüfung wird
 * scharf geschaltet, die auf einem gepflegten Stand einen Fehlalarm liefert. Ein Alarm,
 * der regelmäßig falsch liegt, hört auf zu wirken. Wer eine Prüfung ergänzt, zählt
 * zuerst, wie viele Treffer sie heute liefert.
 *
 *   node .claude/scripts/check.mjs
 *   node .claude/scripts/check.mjs --only 8
 *   node .claude/scripts/check.mjs --quiet
 */

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

const META = readJson(join(ROOT, ".claude", "root.json"), {});
const GERMAN = META.language === "de";
const t = (en, de) => (GERMAN ? de : en);

const pad = (n) => String(n).padStart(2, "0");
// The day the human sees, not the one in UTC.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86_400_000);
}

// Frozen: looked things up in, never kept. A check on frozen stock only gives
// findings nobody is allowed to fix.
const FROZEN = "archive";
const KNOWLEDGE = ["company", "roadmap"];
const COLUMNS = ["new", "ready", "running", "done"];
const EXTENSIONS = [".md", ".mjs", ".js", ".json", ".html", ".sh", ".py", ".yml", ".csv"];

const findings = [];
const report = (nr, file, text) => findings.push({ nr, file: String(file), text });
const rel = (path) => relative(ROOT, path).split(sep).join("/");
const read = (path) => readFileSync(path, "utf8");
const lines = (path) => read(path).split(/\r?\n/);

/** Every file below the given folders, without foreign trees. */
function files(folders, { ext = ".md", deep = true } = {}) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (deep) walk(path);
        continue;
      }
      if (!ext || entry.name.endsWith(ext)) out.push(path);
    }
  };
  for (const folder of [].concat(folders)) walk(join(ROOT, folder));
  return out;
}

function places() {
  const list = readJson(join(ROOT, ".claude", "places.json"), null);
  return Array.isArray(list?.places) ? list.places : [];
}

function expand(path) {
  if (!path) return "";
  if (path === "~" || path.startsWith("~/")) return join(homedir(), path.slice(1));
  return isAbsolute(path) ? path : resolve(ROOT, path);
}

/** A path the way a permission rule of the proposal writes it. {root} is this folder. */
function rulePath(path) {
  if (path.startsWith("~/")) return path;
  if (isAbsolute(path)) return `/${path}`;
  return `{root}/${path.replace(/^\.\//, "")}`;
}

function frontmatter(text) {
  const head = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = {};
  if (!head) return fields;
  for (const line of head[1].split(/\r?\n/)) {
    const pair = line.match(/^([a-z_]+)\s*:\s*(.*)$/);
    if (pair) fields[pair[1]] = pair[2].trim();
  }
  return fields;
}

// --- 1 Paths in backticks exist ---------------------------------------------
// A rule that points at a file that is gone gets followed into nothing. Checked
// is only what has a slash AND a known ending: commands, repository names and
// addresses stand in backticks too and are no paths.
function c1() {
  const top = new Set(readdirSync(ROOT));
  const sheets = [...files([...KNOWLEDGE, "customers", "experiments", "templates"]), ...files(".claude")];
  for (const file of sheets) {
    for (const match of new Set([...read(file).matchAll(/`([^`\s]+)`/g)].map((m) => m[1]))) {
      if (!match.includes("/") || !EXTENSIONS.some((e) => match.endsWith(e))) continue;
      if (/^(\/|http|~)/.test(match) || /[<*{]/.test(match)) continue;
      if (/^[a-z0-9-]+\.[a-z]{2,}\//.test(match)) continue;
      if (existsSync(join(dirname(file), match)) || existsSync(join(ROOT, match))) continue;
      // What starts with a segment that does not exist at the top of this root
      // is a path inside a place, not one in here.
      const first = match.split("/")[0];
      if (!top.has(first) && first !== "." && first !== "..") continue;
      report(1, rel(file), t(`path does not exist: ${match}`, `Pfad existiert nicht: ${match}`));
    }
  }
}

// --- 2 No knowledge file over 300 lines ---------------------------------------
function c2() {
  for (const file of files("company")) {
    const n = lines(file).length;
    if (n > 300) {
      report(2, rel(file), t(
        `${n} lines. Over 300 means: never read in full and never kept in full. Split it.`,
        `${n} Zeilen. Über 300 heißt: wird nie ganz gelesen und nie ganz gepflegt. Teilen.`
      ));
    }
  }
}

// --- 3 Every company file carries a date, not older than 60 days --------------
const AS_OF = /(?:As of|Stand)[^0-9\n]{0,12}(\d{4}-\d{2}-\d{2})/;
function c3() {
  for (const file of files("company")) {
    if (file.endsWith("README.md")) continue;
    const match = read(file).match(AS_OF);
    if (!match) {
      report(3, rel(file), t("no line 'As of: YYYY-MM-DD'", "keine Zeile 'Stand: JJJJ-MM-TT'"));
      continue;
    }
    const age = daysBetween(match[1], today());
    if (age > 60) {
      report(3, rel(file), t(
        `as of ${age} days ago. Derive the values anew.`,
        `Stand ist ${age} Tage alt. Werte neu herleiten.`
      ));
    }
  }
}

// --- 4 The registers keep their shape and stay narrow --------------------------
// follow-ups.md is read line by line, by scripts and at the start of a session.
// A line that does not fit the shape is a line nobody finds again.
const ROW = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|([^|]*)\|([^|]*)\|\s*([^|]*?)\s*\|$/;
const OPEN = ["open", "offen"];
const CLOSED = ["done", "erledigt"];
function c4() {
  const followUps = join(ROOT, "company", "follow-ups.md");
  if (existsSync(followUps)) {
    let open = 0;
    lines(followUps).forEach((line, index) => {
      if (!/^\|\s*\d{4}-/.test(line)) return;
      const row = line.match(ROW);
      if (!row) {
        report(4, "company/follow-ups.md", t(
          `line ${index + 1} does not fit '| YYYY-MM-DD | subject | finding | open or done |'`,
          `Zeile ${index + 1} passt nicht zu '| JJJJ-MM-TT | Betreff | Befund | offen oder erledigt |'`
        ));
        return;
      }
      const subject = row[2].trim();
      const status = row[4].trim();
      if (subject.length > 80) {
        report(4, "company/follow-ups.md", t(
          `line ${index + 1}: subject has ${subject.length} characters, allowed are 80`,
          `Zeile ${index + 1}: Betreff hat ${subject.length} Zeichen, erlaubt sind 80`
        ));
      }
      if (![...OPEN, ...CLOSED].includes(status)) {
        report(4, "company/follow-ups.md", t(
          `line ${index + 1}: status '${status}' is neither open nor done`,
          `Zeile ${index + 1}: Status '${status}' ist weder offen noch erledigt`
        ));
      }
      if (OPEN.includes(status)) open += 1;
    });
    if (open > 50) {
      report(4, "company/follow-ups.md", t(`${open} open lines, allowed are 50`, `${open} offene Zeilen, erlaubt sind 50`));
    }
  }
  const decisions = join(ROOT, "company", "decisions.md");
  if (existsSync(decisions)) {
    const n = lines(decisions).filter((line) => /^\|\s*\d{4}-/.test(line)).length;
    if (n > 100) {
      report(4, "company/decisions.md", t(
        `${n} decisions, allowed are 100. Whoever enters the next one strikes an outdated one first.`,
        `${n} Beschlüsse, erlaubt sind 100. Wer den nächsten einträgt, streicht zuerst einen überholten.`
      ));
    }
  }
}

// --- 5 No secrets in plain text -----------------------------------------------
// No entropy measure: commit hashes, run numbers and tax numbers look like
// secrets and are none. Only named fields with a colon and a real value.
const FIELD = /\b(Passwor\w*|Kennwort|Token|API[-_ ]?Key|Secret)\b\s*[:|]\s*`?([^\s`|]{6,})/gi;
const HARMLESS = /^(see|stands|in|from|via|comes|lies|is|the|a|an|not|no|none|keychain|siehe|steht|aus|nach|über|kommt|liegt|wird|ist|im|der|die|das|ein|eine|nicht|keine?|Schlüsselbund|<|\$|\{)/i;
function c5() {
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  const names = listed.status === 0 && listed.stdout
    ? listed.stdout.split("\0").filter(Boolean)
    : files(["."], { ext: "" }).map(rel);
  for (const name of names) {
    if (name.startsWith(`${FROZEN}/`) || name.startsWith(".claude/scripts/") || name.startsWith(".claude/proposal/")) continue;
    // The bridge is a program that handles a token and a password: the names stand in its code as
    // fields of its own, and never with a value. Markers of real secrets are still looked for by 15.
    if (name === "arasul.mjs") continue;
    if (![".md", ".json", ".sh", ".mjs", ".yml", ".csv"].includes(extname(name))) continue;
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    lines(path).forEach((line, index) => {
      for (const match of line.matchAll(FIELD)) {
        if (HARMLESS.test(match[2]) || new Set(match[2]).size < 4) continue;
        report(5, name, t(
          `line ${index + 1}: field '${match[1]}' carries a value in plain text. Values belong in the keychain or a password manager.`,
          `Zeile ${index + 1}: Feld '${match[1]}' trägt einen Wert im Klartext. Werte gehören in den Schlüsselbund oder einen Passwortmanager.`
        ));
      }
    });
  }
}

// --- 6 Every goal on the roadmap has a milestone and a deadline ------------------
const GOAL = /^\|\s*([A-Z]\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/;
function milestones() {
  const file = join(ROOT, "company", "goal.md");
  if (!existsSync(file)) return new Set();
  return new Set(lines(file).map((line) => line.match(/^\|\s*(M\d+)\s*\|/)?.[1]).filter(Boolean));
}
function goals() {
  const out = [];
  for (const file of files("roadmap", { deep: false })) {
    // The README shows the shape of a goal line as an example. An example is
    // no goal: the first run in a fresh root reported it as one without a deadline.
    if (file.endsWith("README.md")) continue;
    let fenced = false;
    lines(file).forEach((line, index) => {
      if (line.startsWith("```")) fenced = !fenced;
      if (fenced) return;
      const match = line.match(GOAL);
      if (match) out.push({ file, line, nr: index + 1, id: match[1], milestone: match[3].trim(), deadline: match[4].trim() });
    });
  }
  return out;
}
function c6() {
  const known = milestones();
  for (const goal of goals()) {
    const named = goal.milestone.match(/\bM\d+\b/g) || [];
    if (!named.length) {
      report(6, rel(goal.file), t(
        `line ${goal.nr}: goal ${goal.id} without a milestone. Without one it is an idea and belongs on a card.`,
        `Zeile ${goal.nr}: Ziel ${goal.id} ohne Meilenstein. Ohne den ist es eine Idee und gehört auf eine Karte.`
      ));
    }
    for (const name of named) {
      if (!known.has(name)) {
        report(6, rel(goal.file), t(
          `line ${goal.nr}: goal ${goal.id} names ${name}, company/goal.md does not know it`,
          `Zeile ${goal.nr}: Ziel ${goal.id} nennt ${name}, company/goal.md kennt ihn nicht`
        ));
      }
    }
    if (!/\d{4}-\d{2}-\d{2}/.test(goal.deadline)) {
      report(6, rel(goal.file), t(`line ${goal.nr}: goal ${goal.id} without a deadline`, `Zeile ${goal.nr}: Ziel ${goal.id} ohne Frist`));
    }
  }
}

// --- 7 A near deadline needs a line in the register ------------------------------
// The start of a session reads the register, not the roadmap.
function c7() {
  const file = join(ROOT, "company", "follow-ups.md");
  const register = existsSync(file) ? read(file) : "";
  for (const goal of goals()) {
    const date = goal.deadline.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!date || /\b(done|erledigt)\b/i.test(goal.line)) continue;
    const left = daysBetween(today(), date);
    if (left >= 0 && left <= 14 && !new RegExp(`\\b${goal.id}\\b`).test(register)) {
      report(7, rel(goal.file), t(
        `goal ${goal.id} is due on ${date} and does not stand in company/follow-ups.md`,
        `Ziel ${goal.id} ist am ${date} fällig und steht nicht in company/follow-ups.md`
      ));
    }
  }
}

// --- 8 The card stack: one list, the folder is the state --------------------------
function c8() {
  const stack = join(ROOT, "roadmap", "backlog");
  if (!existsSync(stack)) return;
  const known = new Set(["root", ...places().map((place) => place.name)]);
  const ranks = new Map();
  const running = new Map();
  for (const column of COLUMNS) {
    for (const file of files(`roadmap/backlog/${column}`, { deep: false })) {
      const text = read(file);
      const head = frontmatter(text);
      if (!head.title || !head.place) {
        report(8, rel(file), t("title or place missing in the head", "title oder place fehlt im Kopf"));
        continue;
      }
      if (!known.has(head.place)) {
        report(8, rel(file), t(
          `place '${head.place}' stands neither in .claude/places.json nor is it root`,
          `place '${head.place}' steht weder in .claude/places.json noch ist es root`
        ));
      }
      if (column === "ready" || column === "running") {
        for (const field of ["ref", "rank", "assumption", "done"]) {
          if (!head[field]) report(8, rel(file), t(`field ${field} is mandatory from ready on`, `Feld ${field} ist ab ready Pflicht`));
        }
      }
      if (column === "ready" && head.rank) {
        const key = `${head.place} ${head.rank}`;
        if (ranks.has(key)) {
          report(8, rel(file), t(
            `rank ${head.rank} in ${head.place} twice, also in ${ranks.get(key)}. Two cards cannot both be in front.`,
            `Rang ${head.rank} in ${head.place} doppelt, auch in ${ranks.get(key)}. Zwei Karten können nicht beide vorne sein.`
          ));
        }
        ranks.set(key, file.split(sep).pop());
      }
      if (column === "running") {
        if (running.has(head.place)) {
          report(8, rel(file), t(
            `second running card for ${head.place}, also ${running.get(head.place)}. One card per place at a time.`,
            `zweite laufende Karte für ${head.place}, auch ${running.get(head.place)}. Eine Karte je Ort gleichzeitig.`
          ));
        }
        running.set(head.place, file.split(sep).pop());
      }
      if (column === "done" && !/^Result: (green|red|dropped)\s*$/m.test(text.trimEnd().split(/\r?\n/).pop())) {
        report(8, rel(file), t(
          "last line is not 'Result: green', 'red' or 'dropped'",
          "letzte Zeile ist nicht 'Result: green', 'red' oder 'dropped'"
        ));
      }
    }
  }
  if (existsSync(join(ROOT, "roadmap", "plans"))) {
    report(8, "roadmap/plans/", t(
      "a second work list next to the card stack. A large undertaking is several cards with a common ref.",
      "eine zweite Arbeitsliste neben dem Kartenstapel. Ein großes Vorhaben sind mehrere Karten mit gemeinsamem ref."
    ));
  }
}

// --- 9 Experiments: one sheet each, no third level ----------------------------------
// A third level is the point from which nobody knows any more where something
// lies. Source trees are exempt, code has an order of its own.
const CODE = [".py", ".ts", ".tsx", ".js", ".mjs", ".sh", ".yaml", ".yml", ".toml"];
function isCodeTree(dir) {
  return files([rel(dir)], { ext: "" }).some((file) => CODE.includes(extname(file)) || file.endsWith("Dockerfile"));
}
function subfolders(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => join(dir, entry.name));
}
function c9() {
  const base = join(ROOT, "experiments");
  if (!existsSync(base)) return;
  for (const experiment of subfolders(base)) {
    if (!/^\d{3}-/.test(experiment.split(sep).pop())) continue;
    if (!existsSync(join(experiment, "experiment.md"))) {
      report(9, rel(experiment), t("experiment.md is missing", "experiment.md fehlt"));
    }
    for (const first of subfolders(experiment)) {
      if (isCodeTree(first)) continue;
      for (const second of subfolders(first)) {
        for (const third of subfolders(second)) {
          report(9, rel(third), t(
            "third sublevel. Allowed are two, and the second only as a shelf per matter.",
            "dritte Unterebene. Erlaubt sind zwei, und die zweite nur als Ablage je Sache."
          ));
        }
      }
    }
  }
}

// --- 10 No folder at the top without a line in the table -------------------------------
// A folder nobody wrote down grows over. One direction only: a table line
// without a folder is a segment of a deeper path and no finding. The house names
// its folders of level 1 when the root is laid out, and later by hand: a line here.
function c10() {
  const rules = join(ROOT, ".claude", "CLAUDE.md");
  if (!existsSync(rules)) {
    report(10, ".claude/CLAUDE.md", t("is missing", "fehlt"));
    return;
  }
  const section = read(rules).split(/^## (?:Where new things go|Wohin Neues gehört)/m)[1] || "";
  const embedded = new Set(places().map((place) => place.local).filter(Boolean).map((local) => rel(expand(local)).split("/")[0]));
  for (const folder of subfolders(ROOT)) {
    const name = folder.split(sep).pop();
    if (embedded.has(name) || name === "node_modules") continue;
    if (!section.includes(`\`${name}/`)) {
      report(10, `${name}/`, t(
        "folder at the top without a line in the table 'Where new things go' of .claude/CLAUDE.md. Enter it or dissolve it.",
        "Ordner auf oberster Ebene ohne Zeile in der Tabelle 'Wohin Neues gehört' der .claude/CLAUDE.md. Eintragen oder auflösen."
      ));
    }
  }
}

// --- 11 Embedded places: a reference, never a copy ------------------------------------
// The same file in two places is a mistake, not a backup. A place is named with
// where it lives, and what lies in this root of it is a link or a clone that
// version control leaves out.
const KINDS = ["github", "folder"];
function ignored(path) {
  const run = spawnSync("git", ["check-ignore", "-q", path], { cwd: ROOT });
  return run.status === 0;
}
function c11() {
  const file = join(ROOT, ".claude", "places.json");
  const list = readJson(file, null);
  if (!list || !Array.isArray(list.places)) {
    report(11, ".claude/places.json", t("is missing or carries no list 'places'", "fehlt oder trägt keine Liste 'places'"));
    return;
  }
  const proposal = readJson(join(ROOT, ".claude", "proposal", "proposal.json"), {});
  const deny = proposal.permissions?.deny || [];
  const allow = proposal.permissions?.allow || [];
  const seen = new Set();
  for (const place of list.places) {
    const name = place.name || "?";
    if (!/^[a-z0-9][a-z0-9-]*$/.test(place.name || "")) {
      report(11, ".claude/places.json", t(`place '${name}': name is not lower case with hyphens`, `Ort '${name}': Name ist nicht klein mit Bindestrichen`));
    }
    if (seen.has(name)) report(11, ".claude/places.json", t(`place '${name}' stands there twice`, `Ort '${name}' steht doppelt da`));
    seen.add(name);
    if (!KINDS.includes(place.kind)) {
      report(11, ".claude/places.json", t(`place '${name}': kind is neither github nor folder`, `Ort '${name}': kind ist weder github noch folder`));
    }
    for (const field of ["where", "purpose"]) {
      if (!place[field]) report(11, ".claude/places.json", t(`place '${name}': ${field} is missing`, `Ort '${name}': ${field} fehlt`));
    }
    if (!place.local) {
      // A reference only. A folder of the same name in this root is its copy.
      if (existsSync(join(ROOT, name)) && !lstatSync(join(ROOT, name)).isSymbolicLink()) {
        report(11, `${name}/`, t(
          `place '${name}' has no local path, so a folder of this name in this root is a copy of it`,
          `Ort '${name}' hat keinen lokalen Pfad, ein Ordner dieses Namens in dieser Wurzel ist also seine Kopie`
        ));
      }
      continue;
    }

    const local = expand(place.local);
    const rule = `(${rulePath(place.local)}/**)`;
    const writable = place.write === "yes";
    if (writable ? !allow.includes(`Edit${rule}`) : !deny.includes(`Edit${rule}`)) {
      report(11, ".claude/proposal/proposal.json", writable
        ? t(`place '${name}' may be written, but Edit${rule} does not stand under allow`, `Ort '${name}' darf beschrieben werden, aber Edit${rule} steht nicht unter allow`)
        : t(`place '${name}' is read only, but Edit${rule} does not stand under deny`, `Ort '${name}' ist nur zum Lesen, aber Edit${rule} steht nicht unter deny`));
    }
    const inside = !relative(ROOT, local).startsWith("..") && !isAbsolute(relative(ROOT, local));
    if (!inside || !existsSync(local)) continue;
    if (lstatSync(local).isSymbolicLink()) continue;
    const clone = existsSync(join(local, ".git"));
    if (!clone || !ignored(local)) {
      report(11, rel(local), t(
        `place '${name}' lies in this root as a copy. Allowed is a link, or a clone that .gitignore leaves out.`,
        `Ort '${name}' liegt als Kopie in dieser Wurzel. Erlaubt ist ein Link, oder ein Klon, den .gitignore auslässt.`
      ));
    }
  }
}

// --- 12 No empty sheet, no dead link ---------------------------------------------------
function c12() {
  const sheets = files([...KNOWLEDGE, "experiments", "customers", "templates"]);
  for (const file of sheets) {
    if (statSync(file).size === 0) {
      report(12, rel(file), t("0 bytes. An empty file promises knowledge that is not there.", "0 Byte. Eine leere Datei verspricht Wissen, das nicht da ist."));
      continue;
    }
    for (const target of new Set([...read(file).matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]))) {
      if (/^(https?:|mailto:|#|\/|<)/.test(target)) continue;
      const path = target.split("#")[0];
      if (!path || /[<{]/.test(path)) continue;
      if (!existsSync(join(dirname(file), path))) report(12, rel(file), t(`dead link: ${target}`, `toter Link: ${target}`));
    }
  }
}

// --- 13 The boundary holds ---------------------------------------------------------------
function c13() {
  const script = join(ROOT, ".claude", "proposal", "boundary-test.mjs");
  const run = spawnSync(process.execPath, [script], { encoding: "utf8" });
  if (run.status !== 0) {
    report(13, ".claude/proposal/boundary-test.mjs", t(
      `ends with ${run.status}: ${(run.stderr || run.stdout).trim().slice(0, 300)}`,
      `endet mit ${run.status}: ${(run.stderr || run.stdout).trim().slice(0, 300)}`
    ));
  }
}

// --- The tree as it lies: one walk for 14 and 17 ------------------------------------------
// A repository is not walked into: it has rules of its own, and what stands in it is not
// this root's business. A link is not followed, the frozen folder is not looked at.
const MANIFESTS = ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "composer.json", "Gemfile"];
const CODE_EXT = [".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".go", ".rs", ".java", ".rb", ".php", ".c", ".cpp", ".cs", ".swift", ".kt"];
let walked = null;
function tree() {
  if (walked) return walked;
  walked = { settings: [], repositories: [], sources: [] };
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const names = new Set(entries.map((entry) => entry.name));
    if (dir !== ROOT && names.has(".git")) {
      walked.repositories.push(dir);
      return;
    }
    const inClaude = rel(dir).split("/")[0] === ".claude";
    if (dir !== ROOT && !inClaude) {
      const manifest = MANIFESTS.find((name) => names.has(name)) || [...names].find((name) => /\.(csproj|sln)$/.test(name));
      const src = entries.find((entry) => entry.isDirectory() && entry.name === "src");
      const code = src && files([rel(join(dir, "src"))], { ext: "" }).some((file) => CODE_EXT.includes(extname(file)));
      if (manifest || code || names.has("node_modules")) {
        walked.sources.push({ dir, why: manifest || (code ? "src/" : "node_modules/") });
        return;
      }
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink() || entry.name === ".git" || entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (dir === ROOT && entry.name === FROZEN) continue;
        walk(path);
      } else if (/^settings(\.local)?\.json$/.test(entry.name) && dir.split(sep).pop() === ".claude") {
        walked.settings.push(path);
      }
    }
  };
  walk(ROOT);
  return walked;
}

// --- 14 No settings.json in the tree ------------------------------------------------------
// A settings.json in a folder that is cloned or shared is a decision taken for everybody who
// opens the folder, and a hook in it runs without anybody having agreed. What the house wants
// as boundary and rights lies in .claude/proposal/ and goes into the user's own settings after
// consent. Scripts are not touched by this: they are allowed everywhere.
function c14() {
  for (const file of tree().settings) {
    report(14, rel(file), t(
      "a settings file in the tree. Nothing here may be active by itself. Put what it says into .claude/proposal/proposal.json and enrol it, or delete it.",
      "eine Einstellungsdatei im Baum. Nichts hier darf von selbst wirken. Trag, was sie sagt, in .claude/proposal/proposal.json ein und melde es an, oder lösche sie."
    ));
  }
}

// --- 15 Confidential things by pattern in the root and in level 1 ---------------------------
// By file name and by markers that only a real secret carries. Only the two upper levels: deeper
// lies the house's own work, and a check that walks a shared drive is slow and wrong often.
// A file of the kind .env.example is the pattern of a file, no secret.
const SECRET_NAMES = [
  /^\.env(\..+)?$/, /\.(pem|key|p12|pfx|kdbx|keystore)$/, /^id_(rsa|dsa|ecdsa|ed25519)$/,
  /^credentials\.json$/, /^secrets?\.(json|ya?ml|env|txt)$/, /^\.netrc$/,
];
const SECRET_OK = /^\.env\.(example|sample|template|dist)$/;
const SECRET_MARKS = [
  [/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY/, t("private key", "privater Schlüssel")],
  [/\bAKIA[0-9A-Z]{16}\b/, t("AWS access key", "AWS-Zugangsschlüssel")],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, t("GitHub token", "GitHub-Token")],
  [/\bgithub_pat_[A-Za-z0-9_]{50,}\b/, t("GitHub token", "GitHub-Token")],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, t("API key", "API-Schlüssel")],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, t("Slack token", "Slack-Token")],
];
function c15() {
  const candidates = [];
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isFile()) candidates.push(join(ROOT, entry.name));
    else if (entry.isDirectory() && ![".git", ".claude", FROZEN, "node_modules"].includes(entry.name)) {
      for (const inner of readdirSync(join(ROOT, entry.name), { withFileTypes: true })) {
        if (inner.isFile() && !inner.isSymbolicLink()) candidates.push(join(ROOT, entry.name, inner.name));
      }
    }
  }
  for (const file of candidates) {
    const name = file.split(sep).pop();
    if (!SECRET_OK.test(name) && SECRET_NAMES.some((pattern) => pattern.test(name))) {
      report(15, rel(file), t(
        "a file of the kind that holds secrets, in the root or in level 1. It belongs in the keychain or a password manager, not in a folder that is shared.",
        "eine Datei von der Art, die Geheimnisse trägt, in der Wurzel oder in Ebene 1. Sie gehört in den Schlüsselbund oder einen Passwortmanager, nicht in einen Ordner, der geteilt wird."
      ));
      continue;
    }
    if (statSync(file).size > 500_000) continue;
    const text = read(file);
    if (text.includes("\0")) continue;
    const mark = SECRET_MARKS.find(([pattern]) => pattern.test(text));
    if (mark) report(15, rel(file), t(`carries a value in plain text: ${mark[1]}`, `trägt einen Wert im Klartext: ${mark[1]}`));
  }
}

// --- 16 References go up, never sideways and never down --------------------------------------
// A session that starts in a folder of level 1 loads this root's rules and its own. It can
// follow a reference to the root. A reference to a sibling makes two islands depend on each
// other, and a rule of the root that names something inside a folder writes down what is
// derived there and will be wrong the day after. Meant are the house's own folders: the
// folders of the method refer to each other by design.
// `apps` is where the bridge, arasul.mjs, writes what an app says about itself: no folder of the house.
const METHOD_TOP = ["company", "roadmap", "experiments", "customers", "templates", "archive", "apps"];
function houseFolders() {
  const embedded = new Set(places().map((place) => place.local).filter(Boolean).map((local) => rel(expand(local)).split("/")[0]));
  return subfolders(ROOT)
    .map((dir) => dir.split(sep).pop())
    .filter((name) => !METHOD_TOP.includes(name) && name !== "node_modules" && !embedded.has(name));
}
/** Where a reference in a file points: relative to the file first, then relative to the root. */
function references(file) {
  const text = read(file);
  const found = new Set();
  for (const m of text.matchAll(/\]\(([^)\s#]+)[^)]*\)/g)) if (!/^(https?:|mailto:|\/|<)/.test(m[1])) found.add(m[1]);
  for (const m of text.matchAll(/`([^`\s]+)`/g)) {
    if (m[1].includes("/") && !/^(\/|http|~)/.test(m[1]) && !/[<*{$]/.test(m[1])) found.add(m[1]);
  }
  return [...found].flatMap((target) => [resolve(dirname(file), target), resolve(ROOT, target)].map((path) => ({ target, path })));
}
function c16() {
  const house = houseFolders();
  const top = new Set(subfolders(ROOT).map((dir) => dir.split(sep).pop()));
  // Down: a rule of the root that names something inside a folder of the house.
  const rootDocs = [join(ROOT, "README.md"), ...files(".claude")].filter((file) => file.endsWith(".md") && existsSync(file));
  for (const file of rootDocs) {
    const seen = new Set();
    for (const { target, path } of references(file)) {
      const parts = relative(ROOT, path).split(sep);
      if (parts[0] === ".." || parts.length < 2 || !house.includes(parts[0]) || seen.has(target)) continue;
      seen.add(target);
      report(16, rel(file), t(
        `names ${target}, something inside '${parts[0]}/'. A rule of the root names the folder, not its contents.`,
        `nennt ${target}, etwas in '${parts[0]}/'. Eine Regel der Wurzel nennt den Ordner, nicht seinen Inhalt.`
      ));
    }
  }
  // Sideways: a document in a folder of the house that points at a sibling.
  for (const name of house) {
    for (const file of files([name], { deep: false })) {
      const seen = new Set();
      for (const { target, path } of references(file)) {
        const parts = relative(ROOT, path).split(sep);
        if (parts[0] === ".." || !top.has(parts[0]) || parts[0] === name || !existsSync(path) || seen.has(target)) continue;
        seen.add(target);
        report(16, rel(file), t(
          `points at ${target}, into '${parts[0]}/'. A folder of level 1 refers to the root and to nothing next to it.`,
          `verweist auf ${target}, in '${parts[0]}/'. Ein Ordner der Ebene 1 verweist auf die Wurzel und auf nichts neben sich.`
        ));
      }
    }
  }
}

// --- 17 No repository and no source tree in the tree ------------------------------------------
// Code lives in a place, a repository with rules of its own. A .git in here that
// .claude/places.json does not name is one nobody knows about, a source tree is a place
// that was copied in. A script is neither: single scripts are allowed everywhere.
function c17() {
  const named = new Set(places().map((place) => place.local && expand(place.local)).filter(Boolean));
  for (const dir of tree().repositories) {
    if (named.has(dir)) continue;
    report(17, `${rel(dir)}/`, t(
      "a repository in this root that .claude/places.json does not name. Name it there as a place, or take it out.",
      "ein Repository in dieser Wurzel, das .claude/places.json nicht nennt. Als Ort dort eintragen, oder herausnehmen."
    ));
  }
  for (const { dir, why } of tree().sources) {
    if (named.has(dir)) continue;
    report(17, `${rel(dir)}/`, t(
      `a source tree (${why}) in this root. Code belongs in a place. Single scripts are fine, a project is not.`,
      `ein Quelltextbaum (${why}) in dieser Wurzel. Code gehört in einen Ort. Einzelne Skripte sind in Ordnung, ein Projekt nicht.`
    ));
  }
}

const CHECKS = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17];

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? Number(argv[argv.indexOf("--only") + 1]) : null;
const quiet = argv.includes("--quiet");

CHECKS.forEach((fn, index) => {
  if (only && only !== index + 1) return;
  try {
    fn();
  } catch (error) {
    report(index + 1, "check.mjs", t(`check ${index + 1} failed itself: ${error.message}`, `Prüfung ${index + 1} ist selbst gescheitert: ${error.message}`));
  }
});

if (!findings.length) {
  if (!quiet) {
    const ran = only ? 1 : CHECKS.length;
    console.log(t(`${ran} checks, no finding.`, `${ran} Prüfungen, kein Befund.`));
  }
  process.exit(0);
}

const byNumber = new Map();
for (const finding of findings) byNumber.set(finding.nr, [...(byNumber.get(finding.nr) || []), finding]);
for (const nr of [...byNumber.keys()].sort((a, b) => a - b)) {
  console.log(t(`\nCheck ${nr}: ${byNumber.get(nr).length} findings`, `\nPrüfung ${nr}: ${byNumber.get(nr).length} Befunde`));
  for (const finding of byNumber.get(nr)) console.log(`  ${finding.file}: ${finding.text}`);
}
console.log(t(`\n${findings.length} findings in total.`, `\n${findings.length} Befunde insgesamt.`));
process.exit(1);
