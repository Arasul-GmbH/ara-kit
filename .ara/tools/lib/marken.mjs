/**
 * Die Bibliothek des Designsystems, gelesen wie sie auf der Platte liegt.
 *
 * Sie kommt als **Paket** aus dem Produkt. Ein Paket ist ein Ordner mit einem
 * Stempel darin, und der Stempel ist die Antwort auf die Frage, was dazu
 * gehoert:
 *
 *   `marken.json`   die Fassung, die Abhaengigkeiten und JEDE Datei mit ihrem
 *                   sha256, rekursiv
 *   `src/`          die Quelle: `primitive/`, `muster/` und die Bausteine
 *   `browser/`      das Buendel fuer eine App OHNE Bau
 *
 * **Das Paket ist, was `marken.json` nennt.** Bis zum 29.08.2026 las das Kit
 * statt dessen einen flachen Ordner und nahm mit, was oben lag: sechs
 * Bausteine, kein `primitive/`, kein `muster/`. Die `index.ts` darin zeigte
 * auf zwei Ordner, die es im Spiegel nicht gab, und eine App aus der Vorlage
 * sah dem Geraet nur noch von weitem aehnlich.
 *
 * Der Spiegel im Kit ist derselbe Satz, eine Ebene flacher: was im Paket unter
 * `src/` liegt, liegt hier direkt im Ordner, denn `@marken` zeigt dort auf
 * `frontend/src/marken/`. Sein eigener Stempel heisst `mirror.json` und traegt
 * dieselben Hashes, dazu die Abhaengigkeiten, damit eine App nachsehen kann,
 * ob sie sie auch installiert hat.
 *
 * Was hier steht, liest und rechnet, mehr nicht. Wer daraus einen Befund macht,
 * ist `marken.mjs`; wer sie in eine App legt, ist `app.mjs`. Beide brauchen
 * dieselbe Antwort auf die Frage, was zur Bibliothek gehoert, und darum steht
 * sie einmal hier.
 *
 * `browser/marken.js` gehoert ausdruecklich NICHT in den Spiegel. Es ist das
 * Buendel fuer eine App ohne Bau: es bringt React-DOM mit und haengt eine App
 * an einen Knoten. Eine App aus der Vorlage hat einen Bau und einen eigenen
 * Einstieg, und das Buendel waere Quelltext, den niemand aufruft. Es steht
 * trotzdem im Stempel des Spiegels, unter `nicht_gespiegelt`, samt Grund:
 * „vollstaendig" heisst nicht „alles", sondern „alles, wovon gesagt ist,
 * warum es fehlt".
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";

/** Was zur Bibliothek gehoert. Alles andere im Ordner ist etwas anderes. */
export const LIBRARY = /\.(ts|tsx|css)$/;

/**
 * Was im Paket liegt und trotzdem nicht in den Spiegel kommt, mit dem Grund.
 * Der Grund geht in den Stempel: eine Luecke ohne Begruendung ist ein Fehler,
 * eine mit Begruendung eine Entscheidung.
 */
export const NOT_MIRRORED = Object.freeze({
  "browser/marken.js":
    "das Buendel fuer eine App OHNE Bau. Eine App aus der Vorlage hat einen Bau und einen eigenen Einstieg.",
});

/** Der Stempel eines Pakets aus dem Produkt. */
export const PACKAGE_STAMP = "marken.json";

/** Der Stempel eines Spiegels im Kit. */
export const MIRROR_STAMP = "mirror.json";

/** Wo im Paket die Quelle liegt. Im Spiegel liegt sie eine Ebene flacher. */
const SOURCE_DIR = "src";

/** Der Hash einer Datei, so wie er im Stempel steht. */
export const hashOf = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** Ein Pfad, wie er im Stempel steht: relativ, mit Schraegstrich, auf jedem System gleich. */
const asKey = (from, path) => relative(from, path).split(sep).join(posix.sep);

/** Jede Datei der Bibliothek in einem Ordner, rekursiv, als Pfad relativ zu ihm. */
function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(path, base));
      continue;
    }
    if (entry.isFile() && LIBRARY.test(entry.name)) out.push(asKey(base, path));
  }
  return out;
}

/** Die Fassung, wie `fassung.ts` sie nennt. */
const versionIn = (text) => text?.match(/FASSUNG\s*=\s*['"]([^'"]+)['"]/)?.[1] || null;

/** Einen Stempel lesen, oder `null`. Ein kaputter zaehlt wie keiner. */
function readStamp(path) {
  if (!existsSync(path)) return null;
  try {
    const stamp = JSON.parse(readFileSync(path, "utf8"));
    return stamp && typeof stamp === "object" ? stamp : null;
  } catch {
    return null;
  }
}

/**
 * Der Spiegel in einem Ordner, oder `null`.
 *
 * Der Inhalt jeder Datei kommt mit, denn jede Frage an sie ist eine an ihren
 * Text: der Hash, der Vergleich mit der Quelle, die Klassen darin, welche
 * Datei auf welche zeigt. Es sind siebzig Dateien, das laedt sich in einem
 * Zug, und die Alternative waere, jede von ihnen dreimal zu oeffnen.
 */
export function readLibrary(dir) {
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) return null;
  const files = new Map();
  for (const key of walk(dir)) files.set(key, readFileSync(join(dir, key), "utf8"));
  if (!files.size) return null;
  const stamp = readStamp(join(dir, MIRROR_STAMP));
  return {
    dir,
    files,
    fassung: versionIn(files.get("fassung.ts")),
    abhaengigkeiten: stamp?.abhaengigkeiten ?? null,
    gleichlauf: stamp?.gleichlauf ?? null,
    stamp,
  };
}

/**
 * Das Paket in einem Ordner, oder `null`.
 *
 * Gelesen wird, was der Stempel nennt, und nichts sonst: eine Datei, die
 * daneben liegt und nicht darin steht, gehoert nicht dazu (das Produkt legt
 * `__tests__/`, `browser.ts` und `vite.config.mjs` daneben). Was der Stempel
 * nennt und nicht daliegt, ist ein Befund und keine stille Auslassung, darum
 * kommt `befunde` mit zurueck.
 *
 * Zurueck kommt dieselbe Form wie bei einem Spiegel: die Wege unter `files`
 * haben ihren `src/` schon verloren, denn genau so liegt der Satz im Spiegel.
 */
export function readPackage(dir) {
  if (!dir) return null;
  const stamp = readStamp(join(dir, PACKAGE_STAMP));
  if (!stamp?.dateien || typeof stamp.dateien !== "object") return null;

  const files = new Map();
  const befunde = [];
  const skipped = {};
  for (const [rel, erwartet] of Object.entries(stamp.dateien)) {
    const path = join(dir, rel);
    if (!existsSync(path) || !statSync(path).isFile()) {
      befunde.push(`${rel} steht im Stempel und liegt nicht im Paket`);
      continue;
    }
    if (rel in NOT_MIRRORED) {
      skipped[rel] = NOT_MIRRORED[rel];
      continue;
    }
    if (!rel.startsWith(`${SOURCE_DIR}/`)) {
      skipped[rel] = "liegt nicht unter src/ und ist damit kein Quelltext dieser Bibliothek";
      continue;
    }
    const text = readFileSync(path, "utf8");
    if (hashOf(text) !== erwartet) befunde.push(`${rel} passt nicht zu ihrem Hash im Stempel`);
    files.set(rel.slice(SOURCE_DIR.length + 1), text);
  }
  if (!files.size) return null;
  return {
    dir,
    files,
    fassung: stamp.fassung || versionIn(files.get("fassung.ts")),
    abhaengigkeiten: stamp.abhaengigkeiten ?? null,
    gleichlauf: stamp.gleichlauf ?? null,
    nicht_gespiegelt: skipped,
    stamp,
    befunde,
  };
}

/**
 * Eine Quelle, wo auch immer sie herkommt: ein Paket, sonst ein Spiegel.
 *
 * Ein Paket zuerst, weil es die Frage „was gehoert dazu" beantwortet und ein
 * Spiegel sie nur wiederholt. Ein Spiegel als Quelle ist der Notfall: die
 * Vorlage des Kits, wenn kein Spiegel des Produkts da ist.
 */
export function readSource(dir) {
  return readPackage(dir) || readLibrary(dir);
}

/**
 * Wo die Bibliothek im Spiegel des Produkts liegt: der Ordner des Pakets.
 *
 * Das Auslieferungsartefakt traegt seit H6 den Stempel neben der Quelle
 * (`packages/marken/marken.json`). Ein aelteres Artefakt hat ihn nicht; dann
 * liegt dort nur `src/`, und daraus liest `readSource` einen Spiegel ohne
 * Abhaengigkeiten. Beides gibt eine Quelle, und die zweite sagt weniger.
 */
export function libraryInMirror(mirror) {
  if (!mirror) return null;
  const paket = join(mirror, "packages", "marken");
  if (existsSync(join(paket, PACKAGE_STAMP))) return paket;
  const quelle = join(paket, SOURCE_DIR);
  return existsSync(join(quelle, "fassung.ts")) ? quelle : null;
}

/** Jeden leeren Ordner unterhalb von `dir` wegraeumen, von unten nach oben. */
function pruneEmpty(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    pruneEmpty(path);
    if (!readdirSync(path).length) rmdirSync(path);
  }
}

/**
 * Einen Spiegel neu schreiben: erst raeumen, dann legen, dann stempeln.
 *
 * Geraeumt wird, weil ein Spiegel ERSETZT wird und nicht fortgeschrieben: eine
 * Datei, die in der Quelle verschwunden ist, bliebe sonst liegen und wuerde
 * beim naechsten Bau noch uebersetzt. Seit die Bibliothek Unterordner hat,
 * gilt das auch fuer die Ordner selbst: ein `muster/`, das leer zurueckbleibt,
 * ist eine `index.ts`, die auf nichts zeigt.
 *
 * Der Stempel `mirror.json` ist das Gedaechtnis des Waechters. Ohne ihn kann
 * niemand sagen, ob hier jemand von Hand nachgebessert hat, und ohne die
 * Abhaengigkeiten darin kann keine App sagen, ob sie hat, was diese Fassung
 * braucht.
 */
export function writeLibrary(dir, library, { date, version = null }) {
  mkdirSync(dir, { recursive: true });
  for (const key of walk(dir)) rmSync(join(dir, key), { force: true });
  rmSync(join(dir, MIRROR_STAMP), { force: true });
  pruneEmpty(dir);

  const dateien = {};
  for (const [key, text] of [...library.files].sort((a, b) => a[0].localeCompare(b[0]))) {
    const path = join(dir, key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    dateien[key] = hashOf(text);
  }
  writeFileSync(
    join(dir, MIRROR_STAMP),
    `${JSON.stringify(
      {
        fassung: library.fassung,
        quelle: `packages/marken/${SOURCE_DIR}`,
        gespiegelt: date,
        produktversion: version,
        abhaengigkeiten: library.abhaengigkeiten ?? null,
        gleichlauf: library.gleichlauf ?? null,
        nicht_gespiegelt: library.nicht_gespiegelt ?? NOT_MIRRORED,
        dateien,
      },
      null,
      2
    )}\n`
  );
  return { dir, fassung: library.fassung, dateien: [...library.files.keys()] };
}

/** Der Stand eines Spiegels: aus welcher Fassung er kommt und mit welchen Hashes. */
export function stampOf(dir) {
  return readStamp(join(dir, MIRROR_STAMP));
}

/** Die Bausteine: eine Datei je Baustein, `.tsx`, in jedem der drei Saetze. */
export function blocks(library) {
  return [...library.files.keys()].filter((name) => name.endsWith(".tsx"));
}

/** Die drei Saetze, gezaehlt: Primitive, Muster und die Bausteine ohne Bau. */
export function sets(library) {
  const of = (prefix) => blocks(library).filter((name) => name.startsWith(`${prefix}/`)).length;
  return {
    primitive: of("primitive"),
    muster: of("muster"),
    bausteine: blocks(library).filter((name) => !name.includes("/")).length,
  };
}

/** Was eine Datei relativ neben sich holt: `from './x'`, `from '../y/z'`. */
function relativeImports(text) {
  const out = [];
  for (const [, target] of text.matchAll(/from\s+['"](\.[^'"]*)['"]/g)) out.push(target);
  for (const [, target] of text.matchAll(/import\s+['"](\.[^'"]*)['"]/g)) out.push(target);
  return out;
}

/** Der Weg, den ein relativer Verweis meint, mit der Endung, die dazu passt. */
function resolveImport(from, target, files) {
  const base = posix.normalize(posix.join(posix.dirname(from), target));
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Jede Datei, zu der von `index.ts` aus kein Weg fuehrt.
 *
 * Die Frage von frueher war „gibt `index.ts` jeden Baustein aus", und sie
 * passte auf einen flachen Ordner mit sechs Dateien. Der volle Satz hat drei
 * Ebenen: `index.ts` gibt `./primitive` aus, das seinerseits sechsundvierzig
 * Dateien nennt. Gefragt wird deshalb nach dem Weg und nicht nach dem Namen:
 * eine Datei, auf die keiner zeigt, ist eine, die keine App findet, und der
 * Bau uebersetzt sie trotzdem mit.
 *
 * Stylesheets stehen nicht drin: sie werden nicht importiert, sondern in der
 * `stil.css` der App geladen.
 */
export function unreachable(library) {
  const files = library.files;
  if (!files.has("index.ts")) return [];
  const seen = new Set(["index.ts"]);
  const queue = ["index.ts"];
  while (queue.length) {
    const current = queue.shift();
    for (const target of relativeImports(files.get(current) || "")) {
      const found = resolveImport(current, target, files);
      if (found && !seen.has(found)) {
        seen.add(found);
        queue.push(found);
      }
    }
  }
  return [...files.keys()].filter((name) => !name.endsWith(".css") && !seen.has(name)).sort();
}

/**
 * Jede `ara-`Klasse, die ein Baustein benutzt und die in `marken.css` keine
 * Regel hat.
 *
 * Eine Klasse ohne Regel ist ein Baustein ohne Aussehen, und den sieht man
 * erst im Browser. Der Waechter des Produkts stellt dieselbe Frage an
 * derselben Stelle; hier steht sie noch einmal, weil eine App aus der Vorlage
 * ihre Kopie mitnimmt und ohne das Produkt niemand sie prueft.
 *
 * Sie trifft nur die sechs Bausteine: die Primitive und die Muster stehen auf
 * Tailwind und den Marken aus `theme.css`, und dort gibt es keine Klasse, die
 * eine eigene Regel braeuchte.
 */
export function classesWithoutRule(library) {
  const css = library.files.get("marken.css") || "";
  const out = [];
  for (const name of blocks(library)) {
    const text = library.files.get(name) || "";
    for (const klasse of [...new Set(text.match(/(?<=['"])ara-[\w-]+(?:__[\w-]+)?(?=['"])/g) || [])].sort()) {
      if (!css.includes(`.${klasse}`)) out.push(`${name}: ${klasse}`);
    }
  }
  return out;
}

/**
 * Was die Bibliothek braucht und das Frontend daneben nicht installiert.
 *
 * Die Bibliothek ist ein Pfad-Alias und kein npm-Paket: sie wird mit der App
 * uebersetzt, und ihre Abhaengigkeiten muss die App holen. Welche das sind,
 * sagt der Stempel, denn im Produkt stehen sie in der `package.json` der
 * Shell, die es hier nicht gibt. Ohne diese Pruefung faellt der Bau der App
 * erst an dem Import, der ins Leere zeigt, und die Meldung nennt dann ein
 * Primitiv und nicht das fehlende Paket.
 *
 * `gleichlauf` wird anders gefragt: React stellt die App, und zwei davon in
 * einem Baum sieht man erst an einem Hook. Da zaehlt nur, dass es sie gibt.
 */
export function dependencyFindings(library, packageJson) {
  const out = [];
  const noetig = library.abhaengigkeiten;
  if (!noetig || typeof noetig !== "object") return out;
  if (!packageJson) {
    return [`neben dem Spiegel liegt keine package.json: ${Object.keys(noetig).length} Abhaengigkeiten ungeprueft`];
  }
  const da = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  for (const [name, fassung] of Object.entries(noetig)) {
    if (!(name in da)) out.push(`die Bibliothek braucht \`${name}\` (${fassung}), die package.json kennt es nicht`);
  }
  for (const name of Object.keys(library.gleichlauf || {})) {
    if (!(name in da)) out.push(`\`${name}\` stellt die App selbst, und die package.json kennt es nicht`);
  }
  return out;
}

/**
 * In das Manifest einer App schreiben, auf welcher Fassung sie steht.
 *
 * Das Geraet liest `marken` seit Kontrakt 4 und meldet in der App-Verwaltung
 * eine Fassung, die aelter ist als seine eigene. Die Angabe ist freiwillig,
 * also faellt hier nichts um, wenn es kein Manifest gibt oder es unlesbar ist:
 * das sagt an anderer Stelle jemand deutlicher.
 *
 * Geschrieben wird an zwei Zeitpunkten, und beide sind die, an denen sich die
 * Fassung aendert: beim Anlegen der App und beim Nachziehen des Spiegels. Eine
 * Zahl, die beim Packen entstuende, stuende in der Akte anders als im Paket.
 *
 * Ohne Fassung faellt das Feld WEG und steht nicht leer da. Die Angabe ist
 * freiwillig, eine leere waere keine: das Geraet weist sie ab, und die App
 * kaeme wegen einer Auskunft nicht an, die sie gar nicht machen musste.
 */
export function noteVersion(appDir, fassung) {
  const path = join(appDir, "app.json");
  if (!existsSync(path)) return false;
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return false;
  }
  if (!manifest || typeof manifest !== "object") return false;
  if (fassung) {
    if (manifest.marken === fassung) return false;
    manifest.marken = fassung;
  } else {
    if (!("marken" in manifest)) return false;
    delete manifest.marken;
  }
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  return true;
}
