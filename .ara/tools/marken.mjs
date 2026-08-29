#!/usr/bin/env node
/**
 * The guard over the design system: source and mirror stay together.
 *
 * The blocks an app is built from belong to the product. They live there as
 * `packages/marken` and they lie here twice over: once in the app scaffold,
 * so that a fresh clone can build an app that looks like the device, and once
 * in every app that was created from it. Two copies of a thing that keeps
 * moving age silently, and nothing about a running app would go red.
 *
 * That is what this guard is for. It knows three questions:
 *
 *   was a mirror edited by hand   every file against the hash in `mirror.json`
 *   is a mirror behind            its version against the source's version
 *   is a mirror complete          a block without a rule, a rule without a block
 *
 *   node .ara/tools/marken.mjs                 the picture, and 1 on a finding
 *   node .ara/tools/marken.mjs --check         the same, said out loud
 *   node .ara/tools/marken.mjs --sync          pull the apps up to the source
 *   node .ara/tools/marken.mjs --sync --scaffold   the scaffold too, for kit work
 *   node .ara/tools/marken.mjs --source <folder>   where the source lies
 *   node .ara/tools/marken.mjs --json          for evaluation
 *
 * The source is the mirror of the product, `.ara/mirror/packages/marken/src/`.
 * Without one there is no source, and then the guard only asks the questions it
 * can answer here. `--source` names a folder instead, which is what kit work
 * needs: the library moves in the product before it is in any release.
 *
 * **The guard never repairs on its own.** `--sync` writes, and only into
 * `apps/`. The scaffold belongs to the kit: it is version controlled, and a
 * tool that changed it in a partner's clone would leave a dirty working folder
 * that the next update trips over. `--sync --scaffold` is for whoever works on
 * the kit itself, and it says so.
 *
 * === deutsch ===
 *
 * Der Waechter ueber das Designsystem: Quelle und Spiegel bleiben aneinander.
 *
 * Die Bausteine, aus denen eine App gebaut wird, gehoeren dem Produkt. Dort
 * heissen sie `packages/marken`, und hier liegen sie doppelt: einmal in der
 * App-Vorlage, damit ein frischer Klon eine App bauen kann, die aussieht wie
 * das Geraet, und einmal in jeder App, die daraus entstanden ist. Zwei Kopien
 * von etwas, das weiterlaeuft, veralten lautlos, und nichts an einer laufenden
 * App wuerde davon rot.
 *
 * Dafuer gibt es diesen Waechter. Er kennt drei Fragen:
 *
 *   von Hand verstellt   jede Datei gegen ihren Hash in `mirror.json`
 *   veraltet             die Fassung des Spiegels gegen die der Quelle
 *   vollstaendig         ein Baustein ohne Regel, eine Ausgabe ohne Baustein
 *
 *   node .ara/tools/marken.mjs                 die Lage, und 1 bei einem Befund
 *   node .ara/tools/marken.mjs --check         dasselbe, ausgesprochen
 *   node .ara/tools/marken.mjs --sync          die Apps an die Quelle nachziehen
 *   node .ara/tools/marken.mjs --sync --scaffold   die Vorlage dazu, fuer Kit-Arbeit
 *   node .ara/tools/marken.mjs --source <ordner>   wo die Quelle liegt
 *   node .ara/tools/marken.mjs --json          zur Auswertung
 *
 * Die Quelle ist der Spiegel des Produkts, `.ara/mirror/packages/marken/src/`.
 * Ohne ihn gibt es keine Quelle, und dann stellt der Waechter nur die Fragen,
 * die er hier beantworten kann. `--source` nennt stattdessen einen Ordner, und
 * genau das braucht die Arbeit am Kit: die Bibliothek bewegt sich im Produkt,
 * bevor sie in einer Auslieferung steht.
 *
 * **Der Waechter repariert nichts von allein.** `--sync` schreibt, und nur
 * nach `apps/`. Die Vorlage gehoert dem Kit: sie liegt in der
 * Versionsverwaltung, und ein Werkzeug, das sie im Klon eines Partners
 * aenderte, liesse einen schmutzigen Arbeitsordner zurueck, ueber den das
 * naechste Update stolpert. `--sync --scaffold` ist fuer den, der am Kit selbst
 * arbeitet, und sagt das auch.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, fail, helpOnly, parseArgs, today } from "./lib/kit.mjs";
import { t } from "./lib/i18n.mjs";
import { mirrorState } from "./lib/install.mjs";
import {
  blocks,
  classesWithoutRule,
  exportsOf,
  hashOf,
  libraryInMirror,
  readLibrary,
  stampOf,
  writeLibrary,
} from "./lib/marken.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();

const SCAFFOLD = join(ROOT, ".ara", "templates", "app", "frontend", "src", "marken");
const MIRROR = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
const short = (path) => relative(ROOT, path) || ".";

/**
 * Wo die Quelle liegt: der genannte Ordner, sonst der Spiegel des Produkts.
 *
 * Die Vorlage ist hier ausdruecklich keine Quelle. Sie ist selbst ein Spiegel,
 * und ein Spiegel, der sich an sich selbst misst, sagt immer ja.
 */
function findSource() {
  const named = typeof arg.source === "string" ? arg.source : null;
  if (named) {
    const path = named.startsWith("/") ? named : join(process.cwd(), named);
    if (!existsSync(join(path, "fassung.ts"))) {
      fail(
        t(
          `${named} is not a library: there is no fassung.ts in it.`,
          `${named} ist keine Bibliothek: darin liegt keine fassung.ts.`
        )
      );
    }
    return { dir: path, origin: "named" };
  }
  const inMirror = libraryInMirror(MIRROR);
  return inMirror ? { dir: inMirror, origin: "mirror" } : null;
}

/** Jede App, die eine Kopie der Bibliothek traegt. */
function appLibraries() {
  const apps = join(ROOT, "apps");
  if (!existsSync(apps)) return [];
  return readdirSync(apps, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({ app: entry.name, dir: join(apps, entry.name, "frontend", "src", "marken") }))
    .filter((entry) => existsSync(entry.dir) && statSync(entry.dir).isDirectory())
    .sort((a, b) => a.app.localeCompare(b.app));
}

/**
 * Was an einem Spiegel nicht stimmt. Eine Liste von Saetzen, leer heisst gut.
 *
 * Die Reihenfolge ist die der Schwere: eine verstellte Datei ist ein Eingriff,
 * eine veraltete Fassung ist nur Zeit.
 */
function findings(target, source) {
  const out = [];
  const library = readLibrary(target.dir);
  if (!library) {
    return [t(`${short(target.dir)} holds no library.`, `Unter ${short(target.dir)} liegt keine Bibliothek.`)];
  }
  const stamp = stampOf(target.dir);

  if (!stamp) {
    out.push(
      t(
        "there is no mirror.json: the mirror does not say which version it came from",
        "es gibt keine mirror.json: der Spiegel sagt nicht, aus welcher Fassung er kommt"
      )
    );
  } else {
    for (const [name, text] of library.files) {
      const noted = stamp.dateien?.[name];
      if (!noted) {
        out.push(t(`${name} is not in mirror.json`, `${name} steht nicht in der mirror.json`));
      } else if (noted !== hashOf(text)) {
        out.push(
          t(
            `${name} was edited by hand: it no longer matches its hash`,
            `${name} wurde von Hand verstellt: sie passt nicht mehr zu ihrem Hash`
          )
        );
      }
    }
    for (const name of Object.keys(stamp.dateien || {})) {
      if (!library.files.has(name)) {
        out.push(t(`${name} is gone from the mirror`, `${name} fehlt im Spiegel`));
      }
    }
    if (stamp.fassung !== library.fassung) {
      out.push(
        t(
          `mirror.json says version ${stamp.fassung}, fassung.ts says ${library.fassung}`,
          `die mirror.json nennt Fassung ${stamp.fassung}, die fassung.ts nennt ${library.fassung}`
        )
      );
    }
  }

  // Ein Baustein, der eine Klasse benutzt, die keine Regel hat, sieht nach
  // nichts aus, und das sieht man erst im Browser.
  for (const line of classesWithoutRule(library)) {
    out.push(t(`${line} has no rule in marken.css`, `${line} hat keine Regel in marken.css`));
  }

  // Ein Baustein, den index.ts nicht ausgibt, ist einer, den keine App findet.
  const given = exportsOf(library);
  for (const name of blocks(library)) {
    const block = name.replace(/\.tsx$/, "");
    if (!given.includes(block)) {
      out.push(t(`index.ts does not give out ${block}`, `die index.ts gibt ${block} nicht aus`));
    }
  }

  if (source && source.dir !== target.dir) {
    if (source.fassung !== library.fassung) {
      out.push(
        t(
          `the source stands at ${source.fassung}, this mirror at ${library.fassung}`,
          `die Quelle steht auf ${source.fassung}, dieser Spiegel auf ${library.fassung}`
        )
      );
    } else {
      for (const [name, text] of source.files) {
        const here = library.files.get(name);
        if (here === undefined) {
          out.push(t(`${name} is missing, the source has it`, `${name} fehlt, die Quelle hat sie`));
        } else if (here !== text) {
          out.push(
            t(
              `${name} differs from the source at the same version ${source.fassung}`,
              `${name} weicht bei gleicher Fassung ${source.fassung} von der Quelle ab`
            )
          );
        }
      }
    }
  }
  return out;
}

const source = findSource();
const library = source ? { ...source, ...readLibrary(source.dir) } : null;
if (source && !library.fassung) {
  fail(t(`${short(source.dir)} names no version.`, `${short(source.dir)} nennt keine Fassung.`));
}

const targets = [
  { label: t("scaffold", "Vorlage"), dir: SCAFFOLD, scaffold: true },
  ...appLibraries().map((entry) => ({ label: `apps/${entry.app}`, dir: entry.dir, app: entry.app })),
].filter((target) => existsSync(target.dir));

if (arg.sync) {
  if (!library) {
    fail(
      t(
        "There is no source: the mirror carries no packages/marken.\n" +
          "  node .ara/tools/mirror.mjs --refresh   fetches the artifact\n" +
          "  --source <folder>                      names a folder instead",
        "Es gibt keine Quelle: der Spiegel traegt kein packages/marken.\n" +
          "  node .ara/tools/mirror.mjs --refresh   holt das Artefakt\n" +
          "  --source <ordner>                      nennt stattdessen einen Ordner"
      )
    );
  }
  const version = source.origin === "mirror" ? mirrorState()?.version || null : null;
  const written = [];
  for (const target of targets) {
    if (target.scaffold && !arg.scaffold) continue;
    if (target.dir === library.dir) continue;
    if (!findings(target, library).length) continue;
    writeLibrary(target.dir, library, { date: today(), version });
    written.push(target.label);
  }
  console.log(
    written.length
      ? [
          t(
            `Pulled up to version ${library.fassung}: ${written.join(", ")}`,
            `Auf Fassung ${library.fassung} nachgezogen: ${written.join(", ")}`
          ),
          ...(written.includes(t("scaffold", "Vorlage"))
            ? [
                t(
                  "The scaffold is version controlled: that change belongs in a commit of the kit.",
                  "Die Vorlage liegt in der Versionsverwaltung: diese Aenderung gehoert in einen Commit des Kits."
                ),
              ]
            : []),
          t("Then build the app anew, the copy is only source.", "Danach die App neu bauen, die Kopie ist nur Quelltext."),
        ].join("\n")
      : t("Nothing to pull up: everything stands at the source.", "Nichts nachzuziehen: alles steht an der Quelle.")
  );
  process.exit(0);
}

const report = targets.map((target) => ({
  ziel: target.label,
  pfad: short(target.dir),
  fassung: readLibrary(target.dir)?.fassung || null,
  befunde: findings(target, library),
}));

if (arg.json) {
  console.log(
    JSON.stringify(
      {
        quelle: source ? { pfad: short(source.dir), herkunft: source.origin, fassung: library.fassung } : null,
        ziele: report,
      },
      null,
      2
    )
  );
  process.exit(report.some((entry) => entry.befunde.length) ? 1 : 0);
}

const lines = [t("Design system: source and mirrors", "Designsystem: Quelle und Spiegel"), ""];
lines.push(
  source
    ? t(
        `Source: ${short(source.dir)}, version ${library.fassung}, ${blocks(library).length} blocks`,
        `Quelle: ${short(source.dir)}, Fassung ${library.fassung}, ${blocks(library).length} Bausteine`
      )
    : t(
        "Source: none. The mirror carries no packages/marken, so only the mirrors themselves\n" +
          "are checked. node .ara/tools/mirror.mjs --refresh fetches the artifact.",
        "Quelle: keine. Der Spiegel traegt kein packages/marken, geprueft werden also nur die\n" +
          "Spiegel selbst. node .ara/tools/mirror.mjs --refresh holt das Artefakt."
      )
);
lines.push("");
for (const entry of report) {
  lines.push(`${entry.befunde.length ? "FEHL" : "ok  "}  ${entry.ziel}: ${t("version", "Fassung")} ${entry.fassung || "?"}`);
  for (const line of entry.befunde) lines.push(`        ${line}`);
}
const bad = report.filter((entry) => entry.befunde.length);
lines.push("");
lines.push(
  bad.length
    ? t(
        `${bad.length} of ${report.length} mirrors carry a finding.\n` +
          "  node .ara/tools/marken.mjs --sync   pulls the apps up",
        `${bad.length} von ${report.length} Spiegeln tragen einen Befund.\n` +
          "  node .ara/tools/marken.mjs --sync   zieht die Apps nach"
      )
    : source
      ? t(`${report.length} mirrors, all at the source.`, `${report.length} Spiegel, alle an der Quelle.`)
      : t(
          `${report.length} mirrors, none of them edited. Whether they are current, only a source says.`,
          `${report.length} Spiegel, keiner verstellt. Ob sie aktuell sind, sagt nur eine Quelle.`
        )
);
console.log(lines.join("\n"));
process.exit(bad.length ? 1 : 0);
