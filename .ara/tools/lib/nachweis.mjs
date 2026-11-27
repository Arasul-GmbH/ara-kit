/**
 * Der Nachweis: was ein Paket über seinen eigenen Bau sagt.
 *
 * Seit 20.11.2026 ist der App-Standard Pflicht. Das Gerät soll beim Ausrollen
 * prüfen können, ob eine App über den festen Ablauf des Kits entstanden ist
 * (Karte J45 im Gerät). Dafür hinterlässt der Ablauf im Paket eine Datei,
 * `nachweis.json` im Wurzelordner neben `app.json`. Das Format steht
 * ausführlich in `.ara/knowledge/nachweis.md`, hier steht, wie das Kit es
 * schreibt und liest.
 *
 * **Der Nachweis ist keine Behauptung, sondern an den Inhalt gebunden.** Er
 * trägt zwei Prüfsummen: `quelle` über den Quelltext der App (der Ordner
 * unter `apps/`, ohne Pläne, README, Bau) und `paket` über das, was im Paket
 * liegt. Wer danach von Hand an der App ändert, ändert die Prüfsumme, und der
 * Nachweis stimmt nicht mehr, bis der Ablauf wieder durchlief. Wer die Datei
 * in eine andere App kopiert, hat die falsche Kennung und die falschen
 * Prüfsummen. Ein Siegel über die Datei selbst zeigt, dass niemand an ihr
 * gedreht hat. **Es ist kein Schutz gegen Fälschung**: wer die Hashes selbst
 * rechnet, kann sie schreiben. Der Nachweis belegt den Ablauf und fängt
 * Versehen ab; wem das Gerät vertraut, bleibt die benannte Person der Firma.
 *
 * Reine Funktionen über das Dateisystem, ohne Netz, ohne Gerät.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, sep } from "node:path";
import { ROOT } from "./kit.mjs";
import { t } from "./i18n.mjs";
import { majorOf } from "./laufzeit.mjs";
import { readLibrary } from "./marken.mjs";
import { kitLibraryMajor } from "./standard.mjs";
import { SYMBOL_NAME } from "./symbole.mjs";

export const NACHWEIS_FILE = "nachweis.json";
export const NACHWEIS_SCHEMA = 1;

/** Die Schritte des Ablaufs, in der Reihenfolge, in der sie im Paket stehen müssen. */
export const SCHRITTE = Object.freeze(["interview", "bau", "test"]);

/** Der Schritt, den nur die Akte am Rechner trägt: das Paket kann sein eigenes Ausrollen nicht enthalten. */
export const SCHRITT_AUSROLLEN = "ausrollen-test";

/** Was nicht zum Quelltext zählt: das Paket hat es nicht, oder es ist Arbeit am Ding. */
const OUT_OF_SOURCE = new Set(["plans", "build", "README.md", "node_modules", NACHWEIS_FILE]);
const NESTED_SKIP = new Set(["node_modules", "dist"]);

const sha = (data) => createHash("sha256").update(data).digest("hex");
const junk = (name) => name.startsWith("._") || name === ".DS_Store";

/** Alle Dateien unter einem Ordner als relative Wege mit `/`, sortiert nach Code, nicht nach Sprache. */
function files(root, { top, nested }) {
  const out = [];
  const walk = (dir, depth) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (junk(entry.name)) continue;
      const full = join(dir, entry.name);
      if (depth === 0 ? top(entry) : nested(entry)) continue;
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.isFile()) out.push(relative(root, full).split(sep).join("/"));
    }
  };
  walk(root, 0);
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function digest(root, list) {
  const hash = createHash("sha256");
  for (const path of list) hash.update(`${path}\0${sha(readFileSync(join(root, path)))}\n`);
  return { pruefsumme: `sha256:${hash.digest("hex")}`, dateien: list.length };
}

/**
 * Die Prüfsumme des Quelltexts einer App: jede Datei, die der Bau ins Paket
 * nähme, ohne `node_modules` und `dist` und ohne die Nachweisdatei.
 */
export function sourceDigest(appDir) {
  const list = files(appDir, {
    top: (entry) => entry.name.startsWith(".") || OUT_OF_SOURCE.has(entry.name),
    nested: (entry) => NESTED_SKIP.has(entry.name),
  });
  return digest(appDir, list);
}

/**
 * Die Prüfsumme eines Pakets: jede Datei außer der Nachweisdatei im
 * Wurzelordner. Das Gerät rechnet sie genauso aus dem entpackten Paket.
 */
export function packageDigest(packageDir) {
  const list = files(packageDir, {
    top: (entry) => entry.isFile() && entry.name === NACHWEIS_FILE,
    nested: (entry) => entry.name === "node_modules",
  });
  return digest(packageDir, list);
}

/** Das Siegel: Prüfsumme über die Datei ohne das Siegel, Schlüssel sortiert. */
export function seal(document) {
  const { siegel: _ignored, ...rest } = document;
  return `sha256:${sha(canonical(rest))}`;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Die Prüfsumme einer einzelnen Datei, etwa des Plans. */
export function fileDigest(path) {
  return `sha256:${sha(readFileSync(path))}`;
}

export function readNachweis(dir) {
  const path = join(dir, NACHWEIS_FILE);
  if (!existsSync(path)) return { document: null, problem: null };
  try {
    const document = JSON.parse(readFileSync(path, "utf8"));
    if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("not an object");
    return { document, problem: null };
  } catch (error) {
    return { document: null, problem: error.message };
  }
}

export function writeNachweis(dir, document) {
  const sealed = { ...document, siegel: seal(document) };
  writeFileSync(join(dir, NACHWEIS_FILE), JSON.stringify(sealed, null, 2) + "\n");
  return sealed;
}

export function kitVersion() {
  try {
    return readFileSync(join(ROOT, ".ara", "VERSION"), "utf8").trim();
  } catch {
    return null;
  }
}

/** Die Fassung der Bibliothek, wie das Manifest sie nennt, und die der Kopie im Quelltext. */
export function libraryOf(appDir, manifest) {
  const copy = readLibrary(join(appDir, "frontend", "src", "marken"));
  return { marken: manifest?.marken ?? null, kopie: copy?.fassung ?? null };
}

// --- Tests -------------------------------------------------------------------

/** Ordner direkt unter der App, in denen Testdateien liegen (`*.test.mjs`, `.js`, `.cjs`). */
export function testFolders(appDir) {
  const found = new Map();
  for (const path of files(appDir, {
    top: (entry) => entry.name.startsWith(".") || OUT_OF_SOURCE.has(entry.name),
    nested: (entry) => NESTED_SKIP.has(entry.name),
  })) {
    if (!/\.test\.(mjs|js|cjs)$/.test(path)) continue;
    const folder = path.includes("/") ? path.split("/")[0] : ".";
    found.set(folder, (found.get(folder) || 0) + 1);
  }
  return found;
}

/**
 * Die Tests der App laufen lassen: `node --test` in jedem Ordner mit Testdateien.
 * Zurück kommt, was gezählt wurde. Ohne Testdatei ist `vorhanden` falsch, und
 * ein Lauf, der keinen Fall zählt, ist kein grüner.
 */
export function runTests(appDir) {
  const folders = testFolders(appDir);
  const result = { vorhanden: folders.size > 0, dateien: 0, faelle: 0, gruen: false, ausgabe: "" };
  if (!folders.size) return result;
  let failed = 0;
  let exited = 0;
  for (const [folder, count] of folders) {
    result.dateien += count;
    const run = spawnSync(process.execPath, ["--test", "--test-reporter=tap"], {
      cwd: folder === "." ? appDir : join(appDir, folder),
      encoding: "utf8",
      timeout: 5 * 60_000,
    });
    const out = `${run.stdout || ""}${run.stderr || ""}`;
    result.ausgabe += `${folder}:\n${out}\n`;
    result.faelle += Number(/^# tests (\d+)$/m.exec(out)?.[1] || 0);
    failed += Number(/^# fail (\d+)$/m.exec(out)?.[1] || 0);
    if (run.status !== 0) exited += 1;
  }
  result.gruen = result.faelle > 0 && failed === 0 && exited === 0;
  return result;
}

// --- Schreiben ---------------------------------------------------------------

function base(appDir, manifest, old) {
  return {
    schema: NACHWEIS_SCHEMA,
    app: manifest?.id ?? old?.app ?? null,
    version: manifest?.version ?? null,
    kit: { version: kitVersion() },
    bibliothek: libraryOf(appDir, manifest),
    // Das Bild der App in der Leiste des Geräts, wie das Manifest es nennt. Teil des Standards seit 21.11.2026.
    symbol: typeof manifest?.symbol === "string" ? manifest.symbol : null,
    schritte: old?.schritte ?? [],
  };
}

/**
 * Einen Schritt des Ablaufs in die Akte der App eintragen.
 *
 * `interview` beginnt einen neuen Durchlauf und verwirft, was nach ihm stand:
 * ein neuer Plan ist eine neue Änderung, Bau und Test davor gehören der alten.
 * Jeder andere Schritt ersetzt den gleichnamigen. `daten` kommen in den Schritt.
 */
export function recordStep(appDir, manifest, name, daten = {}, { time = new Date().toISOString() } = {}) {
  const old = readNachweis(appDir).document;
  const document = base(appDir, manifest, old);
  const keep = name === "interview" ? [] : document.schritte.filter((step) => step.name !== name);
  const source = sourceDigest(appDir);
  document.schritte = [...keep, { name, zeit: time, quelle: source.pruefsumme, ...daten }];
  if (name === "interview") {
    document.tests = undefined;
  }
  if (name === "test") {
    document.tests = {
      vorhanden: daten.vorhanden,
      dateien: daten.dateien,
      faelle: daten.faelle,
      lauf: { zeit: time, gruen: daten.gruen, quelle: source.pruefsumme },
    };
  }
  // Das Ausrollen sagt nichts über den Quelltext und darf die Prüfsumme nicht nachziehen.
  if (name !== SCHRITT_AUSROLLEN) document.inhalt = { quelle: source.pruefsumme, dateien: source.dateien };
  else if (old?.inhalt) document.inhalt = old.inhalt;
  if (!document.tests && old?.tests && name !== "interview") document.tests = old.tests;
  return writeNachweis(appDir, JSON.parse(JSON.stringify(document)));
}

/**
 * Der Nachweis für das Paket: die Akte der App, dazu die Prüfsumme dessen, was
 * im Paket liegt. Geschrieben wird er als letzter Schritt des Baus.
 */
export function stampPackage(appDir, packageDir, manifest) {
  const old = readNachweis(appDir).document;
  const document = base(appDir, manifest, old);
  const source = sourceDigest(appDir);
  document.inhalt = { quelle: source.pruefsumme, dateien: source.dateien, paket: packageDigest(packageDir).pruefsumme };
  if (old?.tests) document.tests = old.tests;
  // Das Paket trägt, was dem Ausrollen vorausgeht. Das Ausrollen selbst nicht.
  document.schritte = (old?.schritte ?? []).filter((step) => step.name !== SCHRITT_AUSROLLEN);
  return writeNachweis(packageDir, JSON.parse(JSON.stringify(document)));
}

/**
 * Nach dem einen Schritt, den das Kit beim Einspielen selbst am Paket tut: die
 * Vereinbarung des Geräts (`backend/arasul.json`) wird aus dessen Kontrakt
 * gefüllt, und erst dann gepackt. Ohne diese Zeile wiese ein Gerät, das den
 * Standard prüft, jedes Paket der Vorlage mit `paket-geaendert` ab (gefunden am
 * Orin am 21.11.2026, K31). Erneuert werden nur `inhalt.paket` und das Siegel,
 * und nur, wenn der Nachweis davor trug: aufgerufen wird es nach der Prüfung vor
 * dem Einspielen, nie an deren Stelle.
 */
export function restampPackage(packageDir) {
  const { document } = readNachweis(packageDir);
  if (!document?.inhalt?.paket) return null;
  const { siegel: _alt, ...rest } = document;
  return writeNachweis(packageDir, { ...rest, inhalt: { ...rest.inhalt, paket: packageDigest(packageDir).pruefsumme } });
}

// --- Prüfen ------------------------------------------------------------------

/**
 * Was am Nachweis fehlt oder nicht mehr stimmt. Eine Liste von Funden
 * `{ code, text }`, leer heißt gut. Die Codes sind Teil des Formats und stehen
 * in `.ara/knowledge/nachweis.md`.
 *
 *   `ort: "paket"`   ein Ordner, wie ihn das Gerät entpackt: gerechnet wird `paket`
 *   `ort: "akte"`    der App-Ordner am Rechner: gerechnet wird `quelle`
 */
export function verify(dir, { ort = "paket", manifest = null, ausgenommen = false } = {}) {
  if (ausgenommen) return { ok: true, ausgenommen: true, funde: [] };
  const funde = [];
  const add = (code, de, en) => funde.push({ code, text: t(en, de) });
  const { document, problem } = readNachweis(dir);

  if (problem) {
    add("unlesbar", `\`${NACHWEIS_FILE}\` ist kein lesbares JSON: ${problem}.`, `\`${NACHWEIS_FILE}\` is not readable JSON: ${problem}.`);
    return { ok: false, funde };
  }
  if (!document) {
    add(
      "fehlt",
      `Es gibt keine \`${NACHWEIS_FILE}\`: die App ist nicht über den Ablauf des Kits gebaut.`,
      `There is no \`${NACHWEIS_FILE}\`: the app was not built through the kit's flow.`
    );
    return { ok: false, funde };
  }
  if (document.schema !== NACHWEIS_SCHEMA) {
    add("schema", `Das Schema ${JSON.stringify(document.schema)} des Nachweises kennt dieses Kit nicht, erwartet wird ${NACHWEIS_SCHEMA}.`, `The kit does not know proof schema ${JSON.stringify(document.schema)}, ${NACHWEIS_SCHEMA} is expected.`);
    return { ok: false, funde };
  }
  if (document.siegel !== seal(document)) {
    add("siegel", "Das Siegel des Nachweises stimmt nicht: die Datei wurde von Hand verändert.", "The seal of the proof is wrong: the file was changed by hand.");
  }

  const app = manifest ?? readJson(join(dir, "app.json"));
  if (app?.id && document.app !== app.id) {
    add("kennung", `Der Nachweis gehört zu "${document.app}", die App heißt "${app.id}".`, `The proof belongs to "${document.app}", the app is called "${app.id}".`);
  }
  if (app?.version && document.version !== app.version) {
    add("version", `Der Nachweis stammt von Fassung ${document.version}, die App steht auf ${app.version}. Neu bauen.`, `The proof is from version ${document.version}, the app stands at ${app.version}. Build again.`);
  }

  const source = ort === "akte" ? sourceDigest(dir) : null;
  if (ort === "paket") {
    if (!document.inhalt?.paket) {
      add("paket-fehlt", "Der Nachweis nennt keine Prüfsumme des Pakets: er stammt nicht aus einem Bau.", "The proof names no package checksum: it does not come out of a build.");
    } else if (document.inhalt.paket !== packageDigest(dir).pruefsumme) {
      add("paket-geaendert", "Das Paket ist nach dem Bau verändert worden: seine Prüfsumme stimmt nicht mit dem Nachweis überein.", "The package was changed after the build: its checksum does not match the proof.");
    }
  } else if (document.inhalt?.quelle !== source.pruefsumme) {
    add("quelle-geaendert", "Der Quelltext ist nach dem letzten Bau und Test verändert worden. Noch einmal bauen.", "The source was changed after the last build and test. Build again.");
  }

  const steps = Array.isArray(document.schritte) ? document.schritte : [];
  const names = steps.map((step) => step?.name);
  const missing = SCHRITTE.filter((name) => !names.includes(name));
  if (missing.length) {
    add("schritt-fehlt", `Im Ablauf fehlt: ${missing.join(", ")}.`, `The flow is missing: ${missing.join(", ")}.`);
  } else {
    const order = SCHRITTE.map((name) => steps.find((step) => step.name === name));
    if (order.some((step, i) => i > 0 && !(Date.parse(step.zeit) >= Date.parse(order[i - 1].zeit)))) {
      add("reihenfolge", "Die Schritte des Ablaufs stehen nicht in der Reihenfolge Interview, Bau, Test.", "The steps of the flow are not in the order interview, build, test.");
    }
  }

  const tests = document.tests;
  if (!tests?.vorhanden || !(tests.faelle > 0)) {
    add("tests-fehlen", "Die App bringt keine Tests mit.", "The app brings no tests.");
  } else if (!tests.lauf?.gruen) {
    add("tests-rot", "Der letzte Testlauf war nicht grün.", "The last test run was not green.");
  } else if (ort === "akte" ? tests.lauf.quelle !== source.pruefsumme : tests.lauf.quelle !== document.inhalt?.quelle) {
    add("tests-veraltet", "Die Tests sind nicht gegen diesen Stand gelaufen. Noch einmal testen.", "The tests did not run against this state. Test again.");
  }

  const build = steps.find((step) => step?.name === "bau");
  if (build && document.inhalt?.quelle && build.quelle !== document.inhalt.quelle) {
    add("bau-veraltet", "Der Bau stammt von einem anderen Stand des Quelltexts als der Nachweis.", "The build comes from another state of the source than the proof.");
  }

  const lib = document.bibliothek;
  if (!lib || (app?.marken && lib.marken !== app.marken)) {
    add("bibliothek", `Die Fassung der Bibliothek im Nachweis (${lib?.marken ?? "keine"}) ist nicht die im Manifest (${app?.marken ?? "keine"}).`, `The library version in the proof (${lib?.marken ?? "none"}) is not the one in the manifest (${app?.marken ?? "none"}).`);
  }

  // Eine ältere Hauptzahl als die des Kits: das Gerät liefert nur die aktuelle aus (seit 27.11.2026 die 6)
  // und nimmt die App nicht an. Der Nachweis sagt es mit dem Weg, die Schritte stehen im Wissen.
  const kitHaupt = kitLibraryMajor();
  const nachweisHaupt = lib?.marken ? (/^\d+$/.test(lib.marken) ? lib.marken : majorOf(lib.marken)) : null;
  if (kitHaupt && nachweisHaupt && Number(nachweisHaupt) < Number(kitHaupt)) {
    add(
      "bibliothek-alt",
      `Der Nachweis nennt die Bibliothek ${lib.marken} (Hauptzahl ${nachweisHaupt}). Das Gerät liefert nur ${kitHaupt} aus und nimmt die App so nicht an. Nachziehen: node .ara/tools/marken.mjs --sync, neu bauen, jede Seite ansehen (.ara/knowledge/design-system-upgrade.de.md).`,
      `The proof names library ${lib.marken} (major number ${nachweisHaupt}). The device serves only ${kitHaupt} and does not accept the app like that. Pulling up: node .ara/tools/marken.mjs --sync, build again, look at every page (.ara/knowledge/design-system-upgrade.md).`
    );
  }

  // Das Symbol: das Manifest nennt eines in der Form, die das Gerät zeichnet, und der Nachweis nennt
  // dasselbe. Ob der Name im Bildersatz steht, prüft das Kit vor dem Bau; das Gerät prüft die Form.
  const symbol = app?.symbol;
  if (typeof symbol !== "string" || !SYMBOL_NAME.test(symbol)) {
    add("symbol", "Das Manifest nennt kein Symbol für die Seitenleiste (`symbol`, ein Name von lucide.dev).", "The manifest names no symbol for the sidebar (`symbol`, a name from lucide.dev).");
  } else if (document.symbol !== symbol) {
    add("symbol", `Das Symbol im Nachweis (${document.symbol ?? "keines"}) ist nicht das im Manifest (${symbol}). Neu bauen.`, `The symbol in the proof (${document.symbol ?? "none"}) is not the one in the manifest (${symbol}). Build again.`);
  }
  return { ok: funde.length === 0, funde };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Die Funde als Zeilen für den Menschen. */
export function lines(result, name) {
  if (result.ausgenommen) {
    return [t("Proof: not needed, a foreign container brings no source of its own.", "Nachweis: entfällt, ein fremder Container bringt keinen eigenen Quelltext mit.")];
  }
  if (result.ok) {
    return [t(`Proof of the flow: ${name} carries it, interview, build and test are on record and the checksums match.`, `Nachweis des Ablaufs: ${name} trägt ihn, Interview, Bau und Test sind eingetragen und die Prüfsummen stimmen.`)];
  }
  return [
    t(`${name} carries no valid proof of the flow:`, `${name} trägt keinen gültigen Nachweis des Ablaufs:`),
    ...result.funde.map((find) => `- ${find.text}`),
  ];
}
