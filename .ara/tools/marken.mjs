#!/usr/bin/env node
/**
 * The guard over the design system: source and mirror stay together.
 *
 * The blocks an app is built from belong to the product. It ships them as a
 * package: `marken.json` says the version, the dependencies and every file
 * with its sha256. Here they lie twice over: once in the app scaffold, so that
 * a fresh clone can build an app that looks like the device, and once in every
 * app that was created from it. Two copies of a thing that keeps moving age
 * silently, and nothing about a running app would go red.
 *
 * That is what this guard is for. It knows four questions:
 *
 *   was a mirror edited by hand   every file against the hash in `mirror.json`
 *   is a mirror behind            its version against the source's version
 *   is a mirror complete          a file no path leads to, a class without a rule
 *   can it be built at all        every dependency of the library in the app's package.json
 *
 *   node .ara/tools/marken.mjs                 the picture, and 1 on a finding
 *   node .ara/tools/marken.mjs --check         the same, said out loud
 *   node .ara/tools/marken.mjs --sync          pull the apps up to the source
 *   node .ara/tools/marken.mjs --sync --scaffold   the scaffold too, for kit work
 *   node .ara/tools/marken.mjs --source <folder>   where the source lies
 *   node .ara/tools/marken.mjs --json          for evaluation
 *
 * The source is the package in the mirror of the product,
 * `.ara/mirror/packages/marken/`; without one, the kit's scaffold takes its place, because that is what `--new`
 * would have laid down. The scaffold is never its own source: a mirror that
 * measures itself always says yes. `--source` names a folder instead, which is
 * what kit work needs: the library moves in the product before it is in any
 * release.
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
 * Die Bausteine, aus denen eine App gebaut wird, gehoeren dem Produkt. Es
 * liefert sie als Paket aus: `marken.json` nennt die Fassung, die
 * Abhaengigkeiten und jede Datei mit ihrem sha256. Hier liegen sie doppelt:
 * einmal in der App-Vorlage, damit ein frischer Klon eine App bauen kann, die
 * aussieht wie das Geraet, und einmal in jeder App, die daraus entstanden ist.
 * Zwei Kopien von etwas, das weiterlaeuft, veralten lautlos, und nichts an
 * einer laufenden App wuerde davon rot.
 *
 * Dafuer gibt es diesen Waechter. Er kennt vier Fragen:
 *
 *   von Hand verstellt   jede Datei gegen ihren Hash in `mirror.json`
 *   veraltet             die Fassung des Spiegels gegen die der Quelle
 *   vollstaendig         eine Datei, zu der kein Weg fuehrt, eine Klasse ohne Regel
 *   baubar               jede Abhaengigkeit der Bibliothek in der package.json der App
 *
 *   node .ara/tools/marken.mjs                 die Lage, und 1 bei einem Befund
 *   node .ara/tools/marken.mjs --check         dasselbe, ausgesprochen
 *   node .ara/tools/marken.mjs --sync          die Apps an die Quelle nachziehen
 *   node .ara/tools/marken.mjs --sync --scaffold   die Vorlage dazu, fuer Kit-Arbeit
 *   node .ara/tools/marken.mjs --source <ordner>   wo die Quelle liegt
 *   node .ara/tools/marken.mjs --json          zur Auswertung
 *
 * Die Quelle ist das Paket im Spiegel des Produkts,
 * `.ara/mirror/packages/marken/`; ohne es tritt die Vorlage des Kits an seine Stelle, denn sie ist das, was
 * `--new` hingelegt haette. Ihre eigene Quelle ist die Vorlage nie: ein Spiegel,
 * der sich an sich selbst misst, sagt immer ja. `--source` nennt stattdessen
 * einen Ordner, und genau das braucht die Arbeit am Kit: die Bibliothek bewegt
 * sich im Produkt, bevor sie in einer Auslieferung steht.
 *
 * **Der Waechter repariert nichts von allein.** `--sync` schreibt, und nur
 * nach `apps/`. Die Vorlage gehoert dem Kit: sie liegt in der
 * Versionsverwaltung, und ein Werkzeug, das sie im Klon eines Partners
 * aenderte, liesse einen schmutzigen Arbeitsordner zurueck, ueber den das
 * naechste Update stolpert. `--sync --scaffold` ist fuer den, der am Kit selbst
 * arbeitet, und sagt das auch.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, fail, helpOnly, parseArgs, today } from "./lib/kit.mjs";
import { t } from "./lib/i18n.mjs";
import { mirrorState } from "./lib/install.mjs";
import {
  PACKAGE_STAMP,
  classesWithoutRule,
  dependencyFindings,
  hashOf,
  libraryInMirror,
  noteVersion,
  readLibrary,
  readSource,
  sets,
  stampOf,
  unreachable,
  writeLibrary,
} from "./lib/marken.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();

const SCAFFOLD = join(ROOT, ".ara", "templates", "app", "frontend", "src", "marken");
const MIRROR = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
const short = (path) => relative(ROOT, path) || ".";

/**
 * Wo die Quelle liegt: der genannte Ordner, sonst der Spiegel des Produkts,
 * sonst die Vorlage des Kits.
 *
 * Genannt wird das **Paket**, so wie `marken-paket.py --ausgabe` es hinlegt:
 * ein Ordner mit `marken.json` und `src/` darin. Ein blosser Quellordner tut
 * es auch, und er sagt weniger: ohne Stempel weiss niemand, welche
 * Abhaengigkeiten diese Fassung braucht.
 *
 * Die Vorlage ist die schwaechste der drei, und sie steht trotzdem da. Sie ist
 * selbst ein Spiegel, also kann sie ueber ihren eigenen Stand nichts sagen; ein
 * Spiegel, der sich an sich selbst misst, sagt immer ja. Fuer eine App ist sie
 * aber genau die richtige Auskunft: sie ist das, was `--new` hingelegt haette.
 * Ohne sie stuende der Waechter da, sagte "zieh nach", und `--sync` antwortete,
 * es gebe nichts, woraus. Genau das war am 29.08.2026 der Fall, denn die
 * Auslieferung 0.3.0 des Produkts traegt `packages/marken` noch nicht.
 */
function findSource() {
  const named = typeof arg.source === "string" ? arg.source : null;
  if (named) {
    const path = named.startsWith("/") ? named : join(process.cwd(), named);
    if (!existsSync(join(path, PACKAGE_STAMP)) && !existsSync(join(path, "fassung.ts"))) {
      fail(
        t(
          `${named} is neither a package nor a library: there is no ${PACKAGE_STAMP} in it and no fassung.ts.`,
          `${named} ist weder ein Paket noch eine Bibliothek: darin liegt keine ${PACKAGE_STAMP} und keine fassung.ts.`
        )
      );
    }
    return { dir: path, origin: "named" };
  }
  const inMirror = libraryInMirror(MIRROR);
  if (inMirror) return { dir: inMirror, origin: "mirror" };
  return existsSync(join(SCAFFOLD, "fassung.ts")) ? { dir: SCAFFOLD, origin: "scaffold" } : null;
}

/** Die `package.json` des Frontends, in dem dieser Spiegel liegt. */
function frontendPackage(dir) {
  const path = join(dir, "..", "..", "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
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

  // Eine Datei, zu der von index.ts aus kein Weg fuehrt, findet keine App, und
  // der Bau uebersetzt sie trotzdem mit.
  for (const name of unreachable(library)) {
    out.push(
      t(`no path leads from index.ts to ${name}`, `von der index.ts führt kein Weg zu ${name}`)
    );
  }

  // Die Bibliothek wird mit der App uebersetzt, also muss die App holen, was
  // sie braucht. Ohne diese Frage faellt der Bau erst an dem Import, der ins
  // Leere zeigt, und die Meldung nennt dann ein Primitiv statt des Pakets.
  for (const line of dependencyFindings(library, frontendPackage(target.dir))) out.push(line);

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
const read = source ? readSource(source.dir) : null;
if (source && !read) {
  fail(t(`${short(source.dir)} holds no library.`, `Unter ${short(source.dir)} liegt keine Bibliothek.`));
}
const library = source ? { ...source, ...read } : null;
if (source && !library.fassung) {
  fail(t(`${short(source.dir)} names no version.`, `${short(source.dir)} nennt keine Fassung.`));
}
// Ein Paket, das seinen eigenen Stempel nicht einhaelt, ist keine Quelle: was
// daraus in eine App ginge, waere nicht das, was ausgeliefert wurde.
for (const befund of library?.befunde || []) {
  fail(t(`${short(source.dir)}: ${befund}`, `${short(source.dir)}: ${befund}`));
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
        "Es gibt keine Quelle: der Spiegel trägt kein packages/marken.\n" +
          "  node .ara/tools/mirror.mjs --refresh   holt das Artefakt\n" +
          "  --source <ordner>                      nennt stattdessen einen Ordner"
      )
    );
  }
  const version = source.origin === "mirror" ? mirrorState()?.version || null : null;
  if (arg.scaffold && source.origin === "scaffold") {
    fail(
      t(
        "The scaffold cannot be its own source.\n" +
          "  node .ara/tools/mirror.mjs --refresh   fetches the artifact\n" +
          "  --source <folder>                      names a folder instead",
        "Die Vorlage kann nicht ihre eigene Quelle sein.\n" +
          "  node .ara/tools/mirror.mjs --refresh   holt das Artefakt\n" +
          "  --source <ordner>                      nennt stattdessen einen Ordner"
      )
    );
  }
  const written = [];
  for (const target of targets) {
    if (target.scaffold && !arg.scaffold) continue;
    if (target.dir === library.dir) continue;
    if (!findings(target, library).length) continue;
    writeLibrary(target.dir, library, { date: today(), version });
    // Das Manifest sagt, auf welcher Fassung die App steht (Kontrakt 4). Wer
    // den Spiegel nachzieht und die Zahl stehen laesst, hinterlaesst eine
    // Auskunft, die nicht mehr stimmt -- und zwar genau die, an der das Geraet
    // eine veraltete Kopie erkennen soll.
    if (target.app) noteVersion(join(ROOT, "apps", target.app), library.fassung);
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
                  "Die Vorlage liegt in der Versionsverwaltung: diese Änderung gehört in einen Commit des Kits."
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
        `Source: ${short(source.dir)}, version ${library.fassung}, ${library.files.size} files ` +
          `(${sets(library).primitive} primitives, ${sets(library).muster} patterns, ${sets(library).bausteine} blocks)` +
          `${library.abhaengigkeiten ? `, ${Object.keys(library.abhaengigkeiten).length} dependencies` : ", no stamp, so no dependencies"}`,
        `Quelle: ${short(source.dir)}, Fassung ${library.fassung}, ${library.files.size} Dateien ` +
          `(${sets(library).primitive} Primitive, ${sets(library).muster} Muster, ${sets(library).bausteine} Bausteine)` +
          `${library.abhaengigkeiten ? `, ${Object.keys(library.abhaengigkeiten).length} Abhängigkeiten` : ", ohne Stempel, also ohne Abhängigkeiten"}`
      )
    : t("Source: none, and no scaffold either.", "Quelle: keine, und auch keine Vorlage.")
);
if (source?.origin === "scaffold") {
  lines.push(
    t(
      "That is the scaffold of the kit: the mirror carries no packages/marken. Whether the\n" +
        "scaffold itself is current, only a mirror of the product says.\n" +
        "  node .ara/tools/mirror.mjs --refresh   fetches the artifact",
      "Das ist die Vorlage des Kits: der Spiegel trägt kein packages/marken. Ob die Vorlage\n" +
        "selbst aktuell ist, sagt nur ein Spiegel des Produkts.\n" +
        "  node .ara/tools/mirror.mjs --refresh   holt das Artefakt"
    )
  );
}
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
    : t(`${report.length} mirrors, all at the source.`, `${report.length} Spiegel, alle an der Quelle.`)
);
console.log(lines.join("\n"));
process.exit(bad.length ? 1 : 0);
