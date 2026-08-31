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
 * Only init.md is tracked. Everything else in .claude/commands/ is generated and
 * in .gitignore, so an update does not overwrite it and a fork does not carry it
 * along. Whatever a user puts there themselves stays untouched.
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
 * Getrackt ist nur init.md. Alles andere in .claude/commands/ ist erzeugt und im
 * .gitignore, damit ein Update es nicht ueberschreibt und ein Fork es nicht
 * mitschleppt. Was ein Nutzer dort selbst dazulegt, bleibt unangetastet.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BRANCHES, PARTNER_ONLY, RETIRED } from "./lib/commands.mjs";
import { LANGUAGES, isVariant, language, t, variantOf } from "./lib/i18n.mjs";
import { BUSINESS, ROOT, fail, helpOnly, parseArgs, readFrontmatter } from "./lib/kit.mjs";

const SOURCE = join(ROOT, ".ara", "commands");
const TARGET = join(ROOT, ".claude", "commands");
const MANIFEST = join(TARGET, ".sources.json");
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
function survey(branch, lang) {
  const remembered = readManifest();
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

/**
 * Ein Unternehmen bekommt keine Partnerware. Was der Klon davon mitbringt,
 * geht bei --apply weg: Skills, Vorlagen, Wissen aus PARTNER_ONLY, und der
 * Ordner customers/, wenn er leer ist. Einen Ordner mit Inhalt fasst das Kit
 * nie an, der gehoert dem Menschen, auch wenn er im falschen Zweig liegt.
 */
let cut = [];
if (arg.apply && branch === "company") {
  for (const rel of PARTNER_ONLY) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
    cut.push(rel);
  }
  const customers = join(ROOT, "customers");
  if (existsSync(customers) && readdirSync(customers).length === 0) {
    rmSync(customers, { recursive: true });
    cut.push("customers/");
  }
}

if (arg.json) {
  console.log(JSON.stringify({ ...lage, applied: Boolean(arg.apply), replaced: replace, cut }, null, 2));
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
    placed.length
      ? t(
          `\n${created} created, ${replaced} replaced. If Claude Code does not know a command yet, restarting the session helps.`,
          `\n${created} angelegt, ${replaced} ersetzt. Erkennt Claude Code einen Befehl noch nicht, hilft ein Neustart der Sitzung.`
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
  const open = by("missing", "updated", "unclear");
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
