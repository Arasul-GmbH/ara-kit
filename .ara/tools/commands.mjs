#!/usr/bin/env node
/**
 * Create commands and keep them up to date.
 *
 * The source of the commands is .ara/commands/: `all/` for every branch,
 * `partner/` for partners only. Claude Code, however, reads commands only from
 * .claude/commands/. This tool puts the matching ones there, and after an update
 * it says which are new, which are newer in the kit and which the user has
 * adapted themselves.
 *
 *   node .ara/tools/commands.mjs                    state: what is there, missing, different
 *   node .ara/tools/commands.mjs --apply            create missing ones, replace ones newer in the kit
 *   node .ara/tools/commands.mjs --replace <name>   replace an adapted command anyway
 *   node .ara/tools/commands.mjs --role partner     set the branch, otherwise from business/profile.md
 *   node .ara/tools/commands.mjs --language de      set the language, otherwise from business/profile.md
 *   node .ara/tools/commands.mjs --invoice yes      allow the invoice command, otherwise from the profile
 *   node .ara/tools/commands.mjs --json             state as JSON
 *
 * Every command exists in both languages: `offer.md` is English, `offer.de.md`
 * is German. Which one is copied depends on `language` in the profile. What
 * lands in .claude/commands/ always keeps the plain name, because that name is
 * what the human types.
 *
 * How the tool knows who changed a command: when creating it, it remembers the
 * hash of the source in .claude/commands/.sources.json. If the copy differs
 * later, there are four cases:
 *
 *   copy == remembered hash, source new     "newer in kit"  --apply replaces it
 *   copy != remembered hash, source same    "adapted"       stays, only --replace replaces it
 *   both differ                             "both"          stays, only --replace replaces it
 *   no remembered hash                      "unclear"       --apply replaces it, as before
 *                                                            the marker was introduced
 *
 * A command that was renamed in the kit is listed in lib/commands.mjs. --apply
 * clears its copy away, but only if it came from the kit unchanged: otherwise the
 * partner would have the old and the new one side by side, and the old one leads
 * through a procedure that no longer exists.
 *
 * Codex knows no commands of its own, only skills. So the same tool writes every command a
 * second time as a skill, `.agents/skills/<name>/SKILL.md`, called `$<name>` there. The
 * skill is derived from the same source: its description from the command's frontmatter, its
 * body the command's body, with one line in front that says what `$1` means under Codex. It
 * carries `agents/openai.yaml` with `allow_implicit_invocation: false`, because a command is
 * something the human calls and not something Codex picks by itself. The skills keep their
 * own marker in .agents/skills/.sources.json and are judged by the same four cases.
 *
 * Only init.md is tracked, and for Codex .agents/skills/init/. Everything else in
 * .claude/commands/ and the skills made from commands are generated and in .gitignore, so an
 * update does not overwrite them and a fork does not carry them along. Whatever a user puts
 * there themselves stays untouched.
 *
 * === deutsch ===
 *
 * Befehle anlegen und nachziehen.
 *
 * Die Quelle der Befehle liegt in .ara/commands/: `all/` fuer jeden Zweig,
 * `partner/` nur fuer Partner. Claude Code liest Befehle aber nur aus
 * .claude/commands/. Dieses Werkzeug legt die passenden dorthin, und nach einem
 * Update sagt es, welche neu sind, welche im Kit neuer sind und welche der
 * Nutzer selbst angepasst hat.
 *
 *   node .ara/tools/commands.mjs                    Lage: was liegt, was fehlt, was abweicht
 *   node .ara/tools/commands.mjs --apply            fehlende anlegen, im Kit neuere ersetzen
 *   node .ara/tools/commands.mjs --replace <name>   einen angepassten Befehl trotzdem ersetzen
 *   node .ara/tools/commands.mjs --role partner     Zweig vorgeben, sonst aus business/profile.md
 *   node .ara/tools/commands.mjs --language de      Sprache vorgeben, sonst aus business/profile.md
 *   node .ara/tools/commands.mjs --invoice yes      Rechnungsbefehl freigeben, sonst aus dem Profil
 *   node .ara/tools/commands.mjs --json             Lage als JSON
 *
 * Jeden Befehl gibt es in beiden Sprachen: `offer.md` ist englisch, `offer.de.md`
 * ist deutsch. Welcher kopiert wird, entscheidet `language` im Profil. Was in
 * .claude/commands/ landet, behaelt immer den blanken Namen, denn diesen Namen
 * tippt der Mensch.
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
 * Codex kennt keine eigenen Befehle, nur Skills. Darum schreibt dasselbe Werkzeug jeden
 * Befehl ein zweites Mal als Skill, `.agents/skills/<name>/SKILL.md`, dort `$<name>`
 * gerufen. Der Skill stammt aus derselben Quelle: seine Beschreibung aus dem Frontmatter
 * des Befehls, sein Rumpf der des Befehls, mit einer Zeile davor, die sagt, was `$1` unter
 * Codex heisst. Er traegt `agents/openai.yaml` mit `allow_implicit_invocation: false`, denn
 * ein Befehl ist etwas, das der Mensch ruft, und nichts, das Codex von selbst waehlt. Die
 * Skills haben ihren eigenen Merker in .agents/skills/.sources.json und werden nach denselben
 * vier Faellen beurteilt.
 *
 * Getrackt ist nur init.md, und fuer Codex .agents/skills/init/. Alles andere in
 * .claude/commands/ und die Skills aus Befehlen sind erzeugt und im .gitignore, damit ein
 * Update sie nicht ueberschreibt und ein Fork sie nicht mitschleppt. Was ein Nutzer dort
 * selbst dazulegt, bleibt unangetastet.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BRANCHES, PARTNER_ONLY, RETIRED } from "./lib/commands.mjs";
import { LANGUAGES, isVariant, language, t, variantOf } from "./lib/i18n.mjs";
import { BUSINESS, ROOT, fail, helpOnly, parseArgs, readFrontmatter } from "./lib/kit.mjs";

const SOURCE = join(ROOT, ".ara", "commands");
const TARGET = join(ROOT, ".claude", "commands");
const MANIFEST = join(TARGET, ".sources.json");
const SKILLS = join(ROOT, ".agents", "skills");
const SKILL_MANIFEST = join(SKILLS, ".sources.json");
const ROLES = ["partner", "company"];

// Zweig zu Quellordner: BRANCHES in lib/commands.mjs. Daneben steht dort, was
// nur der Partner bekommt und ein Unternehmen bei --apply los wird.

// Befehle, die das Profil erst freigeben muss. Ein Partner, der seine Rechnungen
// weiter in der Buchhaltung schreibt oder es noch nicht entschieden hat, bekommt
// den Rechnungsbefehl nicht. Erst `invoice: yes` im Profil legt ihn an.
const OPT_IN = { invoice: (profile) => profile.invoice === "yes" };

helpOnly(import.meta.url);
const arg = parseArgs();

const profile = readFrontmatter(join(BUSINESS, "profile.md"));

function role() {
  if (arg.role) {
    if (!ROLES.includes(arg.role)) {
      fail(
        t(
          `Unknown branch "${arg.role}". There is: ${ROLES.join(", ")}.`,
          `Unbekannter Zweig "${arg.role}". Es gibt: ${ROLES.join(", ")}.`
        )
      );
    }
    return arg.role;
  }
  if (!profile.exists) {
    fail(
      t(
        "The branch is not decided yet: business/profile.md is missing. Either run /init " +
          "or name the branch: --role partner or --role company.",
        "Der Zweig steht noch nicht fest: business/profile.md fehlt. Entweder /init durchlaufen " +
          "oder den Zweig angeben: --role partner oder --role company."
      )
    );
  }
  if (!ROLES.includes(profile.fields.role)) {
    fail(
      t(
        `business/profile.md names "${profile.fields.role || ""}" as the branch, expected is ` +
          `${ROLES.join(" or ")}. Correct it in the profile or pass --role.`,
        `business/profile.md nennt als Zweig "${profile.fields.role || ""}", erwartet wird ` +
          `${ROLES.join(" oder ")}. Im Profil berichtigen oder --role angeben.`
      )
    );
  }
  return profile.fields.role;
}

/**
 * Die Sprache der Befehle. `--language` ueberstimmt das Profil: das braucht
 * `/init`, das die Befehle anlegt, bevor die Antwort im Profil steht.
 */
function tongue() {
  if (!arg.language) return language();
  if (!LANGUAGES.includes(arg.language)) {
    fail(
      t(
        `Unknown language "${arg.language}". There is: ${LANGUAGES.join(", ")}.`,
        `Unbekannte Sprache "${arg.language}". Es gibt: ${LANGUAGES.join(", ")}.`
      )
    );
  }
  return arg.language;
}

/**
 * Die Befehle eines Ordners, ohne die uebersetzten Fassungen. Ein Befehl heisst
 * `offer`, nicht `offer.de`, egal in welcher Sprache seine Datei geschrieben ist.
 */
function list(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !isVariant(name))
    .sort();
}

/** Ein Schreibverbot, wie es die Sandbox von Codex fuer .agents und .codex setzt. */
function blockedByCodex(error) {
  return error && (error.code === "EPERM" || error.code === "EACCES");
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readManifest(file = MANIFEST) {
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Der Skill, den Codex fuer einen Befehl liest. Er ist eine reine Funktion der Quelle und
 * der Sprache, darum laesst sich sein Zustand am Text ablesen, ohne ihn zu kopieren.
 */
function skillOf(name, from, lang) {
  const source = readFrontmatter(from);
  const description = source.fields.description || name;
  const hint = source.fields["argument-hint"];
  const preface =
    lang === "de"
      ? `Unter Codex heißt dieser Befehl \`$${name}\`. Wo unten \`$1\` steht, lies das erste Wort, ` +
        `das der Mensch hinter \`$${name}\` geschrieben hat` +
        `${hint ? ` (Form: ${hint})` : ""}. Ohne Wort ist es leer. Ein \`/${name}\` in den Blättern heißt hier \`$${name}\`.`
      : `Under Codex this command is called \`$${name}\`. Where \`$1\` stands below, read the first ` +
        `word the human wrote after \`$${name}\`${hint ? ` (form: ${hint})` : ""}. Without one it is empty. ` +
        `A \`/${name}\` in the sheets means \`$${name}\` here.`;
  const text =
    `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${preface}\n\n` +
    source.body.replace(/^\s+/, "");
  const policy =
    `interface:\n  display_name: ${JSON.stringify(name)}\n  short_description: ${JSON.stringify(description.slice(0, 120))}\n` +
    `policy:\n  allow_implicit_invocation: false\n`;
  return { text, policy };
}

/** Zustand einer Kopie gegenueber ihrer Quelle, siehe Kopf der Datei. */
function state(from, to, remembered, sourceText) {
  if (!existsSync(to)) return "missing";
  const source = sourceText === undefined ? hash(from) : hashText(sourceText);
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
function survey(branch, lang) {
  const remembered = readManifest();
  const skillRemembered = readManifest(SKILL_MANIFEST);
  // --invoice yes|no ueberstimmt das Profil, solange es noch keins gibt.
  const fields = { ...profile.fields, ...(arg.invoice ? { invoice: arg.invoice } : {}) };
  const expected = [];
  for (const group of BRANCHES[branch]) {
    for (const file of list(join(SOURCE, group))) {
      const name = file.replace(/\.md$/, "");
      if (OPT_IN[name] && !OPT_IN[name](fields)) continue;
      // Die Quelle traegt die Sprache im Namen, die Kopie nie: der Mensch tippt
      // /offer und nicht /offer.de.
      const variant = join(SOURCE, group, variantOf(file, lang));
      const from = existsSync(variant) ? variant : join(SOURCE, group, file);
      const to = join(TARGET, file);
      const skill = skillOf(name, from, lang);
      const skillTo = join(SKILLS, name, "SKILL.md");
      expected.push({
        name,
        group,
        from,
        to,
        state: state(from, to, remembered[name]),
        skill: { to: skillTo, ...skill, state: state(from, skillTo, skillRemembered[name], skill.text) },
      });
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
  return { role: branch, language: lang, commands: expected, retired, foreign };
}

const branch = role();
const lang = tongue();
const lage = survey(branch, lang);
const by = (...states) => lage.commands.filter((c) => states.includes(c.state));

const replace = arg.replace ? String(arg.replace).split(",").map((s) => s.trim()) : [];
for (const name of replace) {
  if (!lage.commands.some((c) => c.name === name)) {
    fail(
      t(
        `--replace ${name}: there is no such command in the ${branch} branch.`,
        `--replace ${name}: diesen Befehl gibt es im Zweig ${branch} nicht.`
      )
    );
  }
}

let placed = [];
let skillsPlaced = [];
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

  // Dieselben Befehle als Skills fuer Codex, nach denselben Regeln: fehlende und im Kit
  // neuere kommen hin, angepasste bleiben, nur --replace nimmt sie trotzdem.
  const skillRemembered = readManifest(SKILL_MANIFEST);
  const skillTodo = lage.commands.filter(
    (c) =>
      (arg.apply && ["missing", "updated", "unclear"].includes(c.skill.state)) ||
      (replace.includes(c.name) && c.skill.state !== "current")
  );
  try {
    mkdirSync(SKILLS, { recursive: true });
    for (const c of skillTodo) {
      mkdirSync(join(SKILLS, c.name, "agents"), { recursive: true });
      writeFileSync(c.skill.to, c.skill.text);
      writeFileSync(join(SKILLS, c.name, "agents", "openai.yaml"), c.skill.policy);
      skillRemembered[c.name] = hashText(c.skill.text);
      c.skill.placed = c.skill.state;
      c.skill.state = "current";
    }
    for (const c of lage.commands) if (c.skill.state === "current") skillRemembered[c.name] ??= hashText(c.skill.text);
    writeFileSync(SKILL_MANIFEST, JSON.stringify(skillRemembered, null, 2) + "\n");
  } catch (error) {
    if (!blockedByCodex(error)) throw error;
    console.error(
      t(
        "The skills for Codex could not be written: .agents/skills is read-only here, as it is inside the sandbox of Codex, which protects .agents and .codex. " +
          "The commands for Claude Code are in place. Run this call in your own terminal, or let Codex run it outside the sandbox: " +
          ".codex/rules/ara.rules allows exactly this call once the folder is trusted.",
        "Die Skills für Codex ließen sich nicht schreiben: .agents/skills ist hier schreibgeschützt, wie in der Sandbox von Codex, die .agents und .codex schützt. " +
          "Die Befehle für Claude Code liegen bereit. Ruf das in deinem eigenen Terminal auf, oder lass Codex es außerhalb der Sandbox ausführen: " +
          ".codex/rules/ara.rules erlaubt genau diesen Aufruf, sobald der Ordner vertraut ist."
      )
    );
    process.exit(1);
  }
  skillsPlaced = skillTodo;
}

/**
 * Ein Unternehmen bekommt keine Partnerware. Was der Klon davon mitbringt,
 * geht bei --apply weg: Skills, Vorlagen, Wissen aus PARTNER_ONLY, und der
 * Ordner customers/, wenn er leer ist. Einen Ordner mit Inhalt fasst das Kit
 * nie an, der gehoert dem Menschen, auch wenn er im falschen Zweig liegt.
 */
let cut = [];
if (arg.apply && branch === "company") {
  for (const rel of PARTNER_ONLY) {
    // Ohne den Schraegstrich am Ende: mit ihm folgt das Betriebssystem einem Symlink
    // (.claude/skills/<name> zeigt auf .agents/skills/<name>) und der Schnitt liefe durch
    // ihn in den Ordner dahinter. So geht der Link selbst weg, und der Ordner mit seiner
    // eigenen Zeile in PARTNER_ONLY danach.
    const path = join(ROOT, rel.replace(/\/$/, ""));
    if (!existsSync(path) && !isLink(path)) continue;
    rmSync(path, { recursive: true, force: true });
    cut.push(rel);
  }
  const customers = join(ROOT, "customers");
  if (existsSync(customers) && readdirSync(customers).length === 0) {
    rmSync(customers, { recursive: true });
    cut.push("customers/");
  }
}

/**
 * Was ein Unternehmen nicht hat, zählt Git nicht als gelöscht.
 *
 * Die Dateien aus PARTNER_ONLY sind im Kit-Repository verfolgt. Weggeräumt
 * zeigte `git status` danach 14 Löschungen, und der Klon war schmutzig, ohne
 * dass jemand etwas getan hätte: gefunden am 25.09.2026 in einem Fremdtest.
 * `skip-worktree` ist Gits eigenes Mittel für eine Datei, die im Arbeitsbaum
 * absichtlich fehlt; ein `git pull` zieht sie im Index weiter nach und legt sie
 * nicht wieder hin. Der Zweig Partner nimmt die Marke wieder ab, damit seine
 * Dateien wieder als das zählen, was sie sind. Ohne Git geschieht nichts.
 */
function markForGit(branchName) {
  const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: ROOT, encoding: "utf8" });
  if (inside.status !== 0 || inside.stdout.trim() !== "true") return 0;
  const tracked = spawnSync("git", ["ls-files", "-z", "--", ...PARTNER_ONLY.map((rel) => rel.replace(/\/$/, ""))], { cwd: ROOT, encoding: "utf8" });
  const files = (tracked.stdout || "").split("\0").filter(Boolean);
  if (!files.length) return 0;
  const flag = branchName === "company" ? "--skip-worktree" : "--no-skip-worktree";
  const marked = spawnSync("git", ["update-index", flag, "--", ...files], { cwd: ROOT, encoding: "utf8" });
  return marked.status === 0 ? files.length : 0;
}
const gitMarked = arg.apply ? markForGit(branch) : 0;

if (arg.json) {
  const commands = lage.commands.map(({ skill, ...c }) => ({ ...c, skill: { to: skill.to, state: skill.state, placed: skill.placed } }));
  console.log(JSON.stringify({ ...lage, commands, applied: Boolean(arg.apply), replaced: replace, cut, git_marked: gitMarked }, null, 2));
  process.exit(0);
}

const label = t(
  {
    missing: "missing     ",
    current: "current     ",
    updated: "newer in kit",
    customized: "adapted     ",
    conflict: "both        ",
    unclear: "unclear     ",
  },
  {
    missing: "fehlt      ",
    current: "aktuell    ",
    updated: "neu im Kit ",
    customized: "angepasst  ",
    conflict: "beides     ",
    unclear: "unklar     ",
  }
);
console.log(
  t(
    `Branch: ${branch === "partner" ? "partner" : "company"}, language: ${lang}`,
    `Zweig: ${branch === "partner" ? "Partner" : "Unternehmen"}, Sprache: ${lang}`
  )
);
for (const c of lage.commands) console.log(`${label[c.state]} /${c.name}  (${c.group})`);
const skillsOpen = lage.commands.filter((c) => c.skill.state !== "current");
if (skillsOpen.length) {
  console.log(
    t(
      `Codex skills not current: ${skillsOpen.map((c) => `$${c.name} (${c.skill.state})`).join(", ")}`,
      `Codex-Skills nicht aktuell: ${skillsOpen.map((c) => `$${c.name} (${c.skill.state})`).join(", ")}`
    )
  );
}
for (const old of lage.retired) {
  console.log(
    t(
      `${old.removed ? "removed     " : "retired     "} /${old.name}  (now called /${old.successor}` +
        `${old.untouched ? "" : ", changed by hand"})`,
      `${old.removed ? "entfernt   " : "abgelöst   "} /${old.name}  (heißt jetzt /${old.successor}` +
        `${old.untouched ? "" : ", von Hand geändert"})`
    )
  );
}
for (const name of lage.foreign) {
  console.log(
    t(`own          /${name}  (not from the kit, stays)`, `eigener     /${name}  (nicht aus dem Kit, bleibt liegen)`)
  );
}

if (arg.apply || replace.length) {
  const created = placed.filter((c) => c.placed === "missing").length;
  const replaced = placed.length - created;
  console.log(
    placed.length || skillsPlaced.length
      ? t(
          `\n${created} created, ${replaced} replaced` +
            `${skillsPlaced.length ? `, ${skillsPlaced.length} Codex skills written` : ""}. ` +
            "If Claude Code or Codex does not know a command yet, restarting the session helps.",
          `\n${created} angelegt, ${replaced} ersetzt` +
            `${skillsPlaced.length ? `, ${skillsPlaced.length} Codex-Skills geschrieben` : ""}. ` +
            "Erkennt Claude Code oder Codex einen Befehl noch nicht, hilft ein Neustart der Sitzung."
        )
      : t("\nNothing to do, every command is current.", "\nNichts zu tun, alle Befehle sind aktuell.")
  );
  const kept = by("customized", "conflict");
  if (kept.length) {
    console.log(
      t(
        `Left alone, because changed by hand: ${kept.map((c) => `/${c.name}`).join(", ")}. ` +
          "Replace anyway with: node .ara/tools/commands.mjs --replace <name>",
        `Nicht angefasst, weil von Hand geändert: ${kept.map((c) => `/${c.name}`).join(", ")}. ` +
          "Trotzdem ersetzen mit: node .ara/tools/commands.mjs --replace <name>"
      )
    );
  }
  if (cut.length) {
    console.log(
      t(
        `\nCompany branch, removed because it belongs to partners only: ${cut.join(", ")}. ` +
          "Should this become a partner one day: set role in the profile, then node .ara/tools/update.mjs brings it back.",
        `\nZweig Unternehmen, weggeräumt, weil es nur Partnern gehört: ${cut.join(", ")}. ` +
          "Wird daraus einmal ein Partner: role im Profil ändern, dann holt node .ara/tools/update.mjs es zurück."
      )
    );
  }
  if (gitMarked && branch === "company") {
    console.log(
      t(
        `Git counts these ${gitMarked} files as absent on purpose (skip-worktree): the clone stays clean.`,
        `Git zählt diese ${gitMarked} Dateien als absichtlich abwesend (skip-worktree): der Klon bleibt sauber.`
      )
    );
  }
  const geblieben = lage.retired.filter((old) => !old.removed);
  if (geblieben.length) {
    console.log(
      t(
        `Retired and changed by hand, therefore left lying: ` +
          `${geblieben.map((old) => `/${old.name} (now /${old.successor})`).join(", ")}. ` +
          "Compare and delete them yourself, otherwise the command exists twice.",
        `Abgelöst und von Hand geändert, darum liegen geblieben: ` +
          `${geblieben.map((old) => `/${old.name} (jetzt /${old.successor})`).join(", ")}. ` +
          "Vergleichen und selbst löschen, sonst gibt es den Befehl zweimal."
      )
    );
  }
} else {
  const open = [...by("missing", "updated", "unclear"), ...skillsOpen.filter((c) => !by("missing", "updated", "unclear").includes(c))];
  const kept = by("customized", "conflict");
  if (open.length) {
    console.log(
      t(
        `\n${by("missing").length} missing, ${by("updated").length} are newer in the kit` +
          (by("unclear").length ? `, ${by("unclear").length} differ without a marker` : "") +
          ". Create and replace with: node .ara/tools/commands.mjs --apply",
        `\n${by("missing").length} fehlen, ${by("updated").length} sind im Kit neuer` +
          (by("unclear").length ? `, ${by("unclear").length} weichen ohne Merker ab` : "") +
          ". Anlegen und ersetzen mit: node .ara/tools/commands.mjs --apply"
      )
    );
  }
  if (kept.length) {
    console.log(
      t(
        `${kept.length} changed by hand (${kept.map((c) => `/${c.name}`).join(", ")}). ` +
          "Those stay untouched under --apply. If you want the kit's version: --replace <name>, " +
          "compare with diff first." +
          (by("conflict").length ? " With \"both\" the kit is newer as well, then the comparison is worth twice as much." : ""),
        `${kept.length} von Hand geändert (${kept.map((c) => `/${c.name}`).join(", ")}). ` +
          "Die bleiben bei --apply liegen. Wer die Kit-Fassung will: --replace <name>, " +
          "vorher mit diff vergleichen." +
          (by("conflict").length ? " Bei \"beides\" ist auch das Kit neuer, dann lohnt der Vergleich doppelt." : "")
      )
    );
  }
  if (lage.retired.length) {
    console.log(
      t(
        `Retired: ${lage.retired.map((old) => `/${old.name} is now called /${old.successor}`).join(", ")}. ` +
          "--apply clears the unchanged ones away, adapted ones stay lying.",
        `Abgelöst: ${lage.retired.map((old) => `/${old.name} heißt jetzt /${old.successor}`).join(", ")}. ` +
          "Die unveränderten räumt --apply weg, angepasste bleiben liegen."
      )
    );
  }
}
