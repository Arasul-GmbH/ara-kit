/**
 * Die Bibliothek des Designsystems, gelesen wie sie auf der Platte liegt.
 *
 * Sie besteht aus vier Sorten Datei, und alle vier stehen in demselben Ordner:
 *
 *   `fassung.ts`   die Fassung. Wer einen Baustein aendert, hebt sie
 *   `index.ts`     was die Bibliothek ausgibt
 *   `*.tsx`        die Bausteine
 *   `marken.css`   die Regeln, die sie benutzen
 *
 * Was hier steht, liest und rechnet, mehr nicht. Wer daraus einen Befund macht,
 * ist `marken.mjs`; wer sie in eine App legt, ist `app.mjs`. Beide brauchen
 * dieselbe Antwort auf die Frage, was zur Bibliothek gehoert, und darum steht
 * sie einmal hier.
 *
 * `browser.ts` gehoert ausdruecklich NICHT dazu. Es ist der Eingang fuer eine
 * App ohne Bau: es bringt React-DOM mit und haengt eine App an einen Knoten.
 * Eine App aus der Vorlage hat einen Bau und einen eigenen Einstieg, und das
 * Buendel dazu waere Quelltext, den niemand aufruft.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Was zur Bibliothek gehoert. Alles andere im Ordner ist etwas anderes. */
export const LIBRARY = /\.(ts|tsx|css)$/;

/** Was im Quellordner des Produkts liegt und trotzdem nicht mitkommt. */
export const NOT_MIRRORED = Object.freeze(["browser.ts"]);

/**
 * Die Bibliothek in einem Ordner, oder `null`.
 *
 * Der Inhalt jeder Datei kommt mit, denn jede Frage an sie ist eine an ihren
 * Text: der Hash, der Vergleich mit der Quelle, die Klassen darin. Es sind
 * neun kleine Dateien, das laedt sich in einem Zug.
 */
export function readLibrary(dir) {
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) return null;
  const files = new Map();
  for (const name of readdirSync(dir).sort()) {
    if (!LIBRARY.test(name) || NOT_MIRRORED.includes(name)) continue;
    const path = join(dir, name);
    if (!statSync(path).isFile()) continue;
    files.set(name, readFileSync(path, "utf8"));
  }
  if (!files.size) return null;
  const fassung = files.get("fassung.ts")?.match(/FASSUNG\s*=\s*['"]([^'"]+)['"]/)?.[1] || null;
  return { dir, files, fassung };
}

/** Wo die Bibliothek im Spiegel des Produkts liegt. */
export function libraryInMirror(mirror) {
  if (!mirror) return null;
  const dir = join(mirror, "packages", "marken", "src");
  return existsSync(join(dir, "fassung.ts")) ? dir : null;
}

/** Der Hash einer Datei, so wie er in der `mirror.json` steht. */
export const hashOf = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/**
 * Einen Spiegel neu schreiben: erst raeumen, dann legen, dann stempeln.
 *
 * Geraeumt wird, weil ein Spiegel ERSETZT wird und nicht fortgeschrieben: eine
 * Datei, die in der Quelle verschwunden ist, bliebe sonst liegen und wuerde
 * beim naechsten Bau noch uebersetzt. Der Stempel `mirror.json` ist das
 * Gedaechtnis des Waechters, ohne ihn kann niemand sagen, ob hier jemand von
 * Hand nachgebessert hat.
 */
export function writeLibrary(dir, library, { date, version = null }) {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    if (LIBRARY.test(entry) || entry === "mirror.json") rmSync(join(dir, entry), { force: true });
  }
  const dateien = {};
  for (const [name, text] of library.files) {
    writeFileSync(join(dir, name), text);
    dateien[name] = hashOf(text);
  }
  writeFileSync(
    join(dir, "mirror.json"),
    `${JSON.stringify(
      { fassung: library.fassung, quelle: "packages/marken/src", gespiegelt: date, produktversion: version, dateien },
      null,
      2
    )}\n`
  );
  return { dir, fassung: library.fassung, dateien: [...library.files.keys()] };
}

/** Der Stand eines Spiegels: aus welcher Fassung er kommt und mit welchen Hashes. */
export function stampOf(dir) {
  const path = join(dir, "mirror.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Die Bausteine: eine Datei je Baustein, `.tsx`. */
export function blocks(library) {
  return [...library.files.keys()].filter((name) => name.endsWith(".tsx"));
}

/** Was `index.ts` als Wert ausgibt. Reine Typen verschwinden beim Uebersetzen. */
export function exportsOf(library) {
  const text = library.files.get("index.ts") || "";
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (/^export\s+type\s/.test(line.trim())) continue;
    const group = line.match(/^export\s*\{([^}]*)\}/);
    if (!group) continue;
    for (const part of group[1].split(",")) {
      const name = part.trim();
      if (name && !name.startsWith("type ")) names.add(name.split(" as ").pop().trim());
    }
  }
  return [...names];
}

/**
 * Jede `ara-`Klasse, die ein Baustein benutzt und die in `marken.css` keine
 * Regel hat.
 *
 * Eine Klasse ohne Regel ist ein Baustein ohne Aussehen, und den sieht man
 * erst im Browser. Der Waechter des Produkts stellt dieselbe Frage an
 * derselben Stelle; hier steht sie noch einmal, weil eine App aus der Vorlage
 * ihre Kopie mitnimmt und ohne das Produkt niemand sie prueft.
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
