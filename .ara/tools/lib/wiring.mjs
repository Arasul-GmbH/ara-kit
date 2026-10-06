/**
 * Ein Muster in eine App einhängen: `app.mjs --app <app> --add-pattern <muster>[,<muster>]`.
 *
 * Bis 0.77.0 war das Handarbeit nach den Köpfen der Dateien: Ordner kopieren, Migrationen
 * umnummerieren, rund 150 Zeilen in `server.mjs` und ein paar in der Oberfläche, in der richtigen
 * Reihenfolge. Im Fremdtest vom 06.10.2026 war das der größte Zeitfresser. Hier tut es ein
 * Werkzeug, nach einer Beschreibung, die neben jedem Muster liegt: `wiring.json`.
 *
 * **Was `wiring.json` sagt**:
 *
 *   `requires`   die Muster, ohne die dieses nicht geht. Fehlt eines, hängt das Werkzeug nichts ein
 *                und nennt den Aufruf mit allen
 *   `replaces`   Dateien anderer Muster oder der Vorlage, die dieses ersetzt, solange sie so sind,
 *                wie das Kit sie hingelegt hat
 *   `with`       Ordner, die nur mitkommen, wenn ein anderes Muster in der App ist (`with-extract/`)
 *   `edits`      Einsätze in Dateien der App, jeder mit einem Anker, der in der Vorlage steht
 *   `next`       was danach ein Mensch entscheidet, in einem Satz
 *
 * **Ein Einsatz** hat `file` und eine Art: `seam` (`imports` oder `setup` in `server.mjs`, vor
 * einer Markenzeile, die das Werkzeug beim ersten Mal setzt), `before` oder `after` (ein Anker oder
 * eine Liste, der erste, der steht, gilt; `@last-import` ist die letzte Zeile mit `import`),
 * `replace` mit `with`, oder `remove`. `within` sucht den Anker erst hinter diesem Text, `when`
 * (`clients`, `!receipts`) setzt ihn nur, wenn ein Muster in der App ist oder nicht. Jeder Einsatz
 * prüft vorher, ob er schon steht (`unless`, sonst seine längste Zeile): ein zweiter Lauf ändert
 * nichts. Findet er seinen Anker nicht, weil die Datei von Hand geändert ist, ändert er nichts und
 * sagt, was von Hand zu tun ist.
 *
 * **Jeder Lauf geht alle Muster der App durch**, in der Reihenfolge ihrer Voraussetzungen. So
 * kommt der Teil eines Musters, der ein anderes braucht (`with`, `when`), auch dann dazu, wenn das
 * andere erst später eingehängt wird.
 *
 * **Migrationen** behalten ihren Zehner (Dokumente 010, Auslesen 020, Mandanten 030, Belege 040,
 * Verlauf 050). Trägt die App schon eine Datei mit demselben Namen hinter der Nummer, etwa noch
 * die alte `002-dokumente.sql`, bleibt die und keine zweite kommt dazu. Ist die Nummer von einer
 * eigenen Migration der App belegt, nimmt das Werkzeug den nächsten freien Zehner hinter allen.
 *
 * Welche Muster in einer App stecken, steht in `patterns.json` neben ihrer `app.json`.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, sep, posix } from "node:path";
import { ROOT } from "./kit.mjs";
import { t } from "./i18n.mjs";

export const PATTERNS_DIR = join(ROOT, ".ara", "templates", "app-patterns");
const TEMPLATE_DIR = join(ROOT, ".ara", "templates", "app");
const MIGRATIONS = join("backend", "ablage", "migrationen");
export const PATTERNS_FILE = "patterns.json";

/** Die Markenzeilen in `server.mjs`: davor setzt das Werkzeug die Importe und den Aufbau der Muster. */
const SEAMS = {
  imports: {
    mark: "// Muster: Ende der Importe. app.mjs --add-pattern setzt darüber ein.",
    anchor: "@last-import",
  },
  setup: {
    mark: "// Muster: Ende des Aufbaus. app.mjs --add-pattern setzt darüber ein.",
    anchor: /^const vorgangsKern = kern\(\{[\s\S]*?^\}\);\n/m,
  },
};

/** Ohne sie meldet niemand, was geschieht (Muster Verlauf); eine App von vor 0.78.0 bekommt sie. */
const MELDEN_BLOCK = [
  "// Wer mitschreibt, was mit einem Vorgang geschieht: niemand, bis das Muster Verlauf sich hier",
  "// einträgt (`mitschreiber.push`). Kern und Abschluss melden jedes Ereignis an `melden`.",
  "const mitschreiber = [];",
  "const melden = async (ereignis) => {",
  "  for (const schreiben of mitschreiber) await schreiben(ereignis);",
  "};",
  "",
  "",
].join("\n");

const posixPath = (p) => p.split(sep).join(posix.sep);

/** Die Muster, die sich einhängen lassen: die mit einer `wiring.json`. */
export function wirablePatterns() {
  if (!existsSync(PATTERNS_DIR)) return [];
  return readdirSync(PATTERNS_DIR)
    .filter((name) => existsSync(join(PATTERNS_DIR, name, "wiring.json")))
    .sort();
}

/** Alle Muster, auch die ohne Beschreibung zum Einhängen (Post, fremde Schnittstelle, fremder Container). */
export function allPatterns() {
  if (!existsSync(PATTERNS_DIR)) return [];
  return readdirSync(PATTERNS_DIR).filter((name) => statSync(join(PATTERNS_DIR, name)).isDirectory()).sort();
}

export function readWiring(id) {
  return JSON.parse(readFileSync(join(PATTERNS_DIR, id, "wiring.json"), "utf8"));
}

/** Welche Muster in der App stecken, laut `patterns.json`. */
export function appliedPatterns(appDir) {
  const file = join(appDir, PATTERNS_FILE);
  if (!existsSync(file)) return [];
  try {
    const list = JSON.parse(readFileSync(file, "utf8")).patterns;
    return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Die Reihenfolge, in der die Muster eingehängt werden: jedes nach denen, die es voraussetzt, und
 * sonst nach seiner Nummer. Zurück kommt auch, was fehlt.
 */
export function plan(wanted, present) {
  const unknown = wanted.filter((id) => !wirablePatterns().includes(id));
  if (unknown.length) return { unknown, order: [], missing: [] };
  const all = [...new Set([...present.filter((id) => wirablePatterns().includes(id)), ...wanted])];
  const wiring = Object.fromEntries(all.map((id) => [id, readWiring(id)]));
  const missing = [];
  for (const id of wanted) {
    for (const need of wiring[id].requires ?? []) {
      if (!all.includes(need)) missing.push({ pattern: id, needs: need });
    }
  }
  const order = [];
  const visit = (id, path = []) => {
    if (order.includes(id) || path.includes(id)) return;
    for (const need of wiring[id]?.requires ?? []) if (all.includes(need)) visit(need, [...path, id]);
    order.push(id);
  };
  for (const id of [...all].sort((a, b) => (wiring[a].number ?? 99) - (wiring[b].number ?? 99))) visit(id);
  return { unknown: [], order, missing, wiring };
}

/** Alle Dateien unter einem Ordner, als Pfade relativ zu ihm. */
function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { recursive: true })) {
    const path = join(dir, String(entry));
    if (statSync(path).isFile() && !/(^|[\\/])(node_modules|dist)([\\/]|$)/.test(String(entry))) out.push(String(entry));
  }
  return out.sort();
}

/** Die Ordner eines Musters, die in die App gehen: `backend`, `frontend`, und `with` nach Bedingung. */
function sourceRoots(id, wiring, present) {
  const roots = [join(PATTERNS_DIR, id)];
  for (const [other, folder] of Object.entries(wiring.with ?? {})) {
    if (present.includes(other)) roots.push(join(PATTERNS_DIR, id, folder));
  }
  return roots;
}

/** Was das Kit an dieser Stelle je hingelegt hat: die Datei der Vorlage und die jedes Musters. */
function kitVersions(rel) {
  const out = [];
  const fromTemplate = join(TEMPLATE_DIR, rel);
  if (existsSync(fromTemplate)) out.push(readFileSync(fromTemplate, "utf8"));
  for (const id of allPatterns()) {
    for (const base of [join(PATTERNS_DIR, id), ...readdirSync(join(PATTERNS_DIR, id)).filter((n) => n.startsWith("with-")).map((n) => join(PATTERNS_DIR, id, n))]) {
      const path = join(base, rel);
      if (existsSync(path)) out.push(readFileSync(path, "utf8"));
    }
  }
  return out;
}

/** Ein Text der Vorlage mit den Werten der App, wie `--new` ihn schrieb. */
function filled(text, values) {
  return text.replace(/\{\{([a-z]+)\}\}/g, (whole, key) => (key in values ? values[key] : whole));
}

/** Die Dateien eines Musters kopieren. Migrationen gehen ihren eigenen Weg. */
function copyFiles(appDir, id, wiring, present, fresh, values, report) {
  const replaces = new Set(wiring.replaces ?? []);
  for (const root of sourceRoots(id, wiring, present)) {
    for (const folder of ["backend", "frontend"]) {
      for (const rel0 of filesUnder(join(root, folder))) {
        const rel = join(folder, rel0);
        if (posixPath(rel).startsWith(posixPath(MIGRATIONS) + "/")) continue;
        const source = join(root, rel);
        const target = join(appDir, rel);
        const text = readFileSync(source, "utf8");
        if (!existsSync(target)) {
          mkdirSync(dirname(target), { recursive: true });
          cpSync(source, target);
          report.copied.push(posixPath(rel));
          continue;
        }
        const now = readFileSync(target, "utf8");
        if (now === text) continue;
        const asKitLeftIt = kitVersions(rel).some((version) => version === now || filled(version, values) === now);
        if (replaces.has(posixPath(rel)) && asKitLeftIt) {
          writeFileSync(target, text);
          report.replaced.push(posixPath(rel));
        } else if (fresh && !asKitLeftIt) {
          report.kept.push(posixPath(rel));
        }
      }
    }
  }
}

/** Die Migrationen eines Musters, mit ihrem Zehner. */
function copyMigrations(appDir, id, wiring, present, report) {
  const targetDir = join(appDir, MIGRATIONS);
  mkdirSync(targetDir, { recursive: true });
  for (const root of sourceRoots(id, wiring, present)) {
    const sourceDir = join(root, MIGRATIONS);
    if (!existsSync(sourceDir)) continue;
    for (const name of readdirSync(sourceDir).filter((n) => n.endsWith(".sql")).sort()) {
      const existing = readdirSync(targetDir).filter((n) => n.endsWith(".sql"));
      const suffix = name.replace(/^\d+-/, "");
      if (existing.some((n) => n.replace(/^\d+-/, "") === suffix)) continue;
      let target = name;
      const number = name.slice(0, 3);
      if (existing.some((n) => n.startsWith(`${number}-`))) {
        const highest = Math.max(...existing.map((n) => Number(n.slice(0, 3)) || 0));
        target = `${String((Math.floor(highest / 10) + 1) * 10).padStart(3, "0")}-${suffix}`;
        report.renumbered.push(`${name} → ${target}`);
      }
      cpSync(join(sourceDir, name), join(targetDir, target));
      report.migrations.push(target);
    }
  }
}

/** Ob die Bedingung eines Einsatzes gilt. */
function applies(edit, present) {
  if (!edit.when) return true;
  return String(edit.when)
    .split(",")
    .every((cond) => (cond.startsWith("!") ? !present.includes(cond.slice(1)) : present.includes(cond)));
}

/** Wo ein Anker steht, ab `from`. `@last-import` ist das Ende der letzten Zeile, die mit `import` beginnt. */
function find(text, anchor, from = 0) {
  if (anchor === "@last-import") {
    let end = -1;
    for (const match of text.matchAll(/^import [\s\S]*?;\n/gm)) end = match.index + match[0].length;
    return end < 0 ? null : { start: end, end };
  }
  if (anchor instanceof RegExp) {
    const match = anchor.exec(text.slice(from));
    return match ? { start: from + match.index, end: from + match.index + match[0].length } : null;
  }
  const at = text.indexOf(anchor, from);
  return at < 0 ? null : { start: at, end: at + anchor.length };
}

/** Eine Markenzeile in `server.mjs` setzen, wenn sie fehlt. */
function ensureSeam(text, seam) {
  const { mark, anchor } = SEAMS[seam];
  if (text.includes(mark)) return text;
  const at = find(text, anchor);
  if (!at) return null;
  return `${text.slice(0, at.end)}${mark}\n${text.slice(at.end)}`;
}

/**
 * Eine App von vor 0.78.0: `melden` fehlt in `server.mjs`. Der Block kommt vor die Vereinbarung,
 * und Kern und Abschluss bekommen ihn mit.
 */
function ensureMelden(text) {
  let out = text;
  if (!out.includes("const mitschreiber = [];")) {
    const at = out.indexOf("const vereinbarung = vereinbarungLesen();");
    if (at < 0) return null;
    out = `${out.slice(0, at)}${MELDEN_BLOCK}${out.slice(at)}`;
  }
  const kern = /^const vorgangsKern = kern\(\{[\s\S]*?^\}\);\n/m.exec(out);
  if (kern && !/^\s+melden,?$/m.test(kern[0])) {
    out = out.replace(kern[0], kern[0].replace(/\n\}\);\n$/, "\n  melden,\n});\n"));
  }
  const annahme = /^const abschlussAnnahme = abschlussKern\(\{[\s\S]*?^\}\);\n/m.exec(out);
  if (annahme && !/^\s+melden,?$/m.test(annahme[0])) {
    out = out.replace(annahme[0], annahme[0].replace(/\n\}\);\n$/, "\n  melden,\n});\n"));
  }
  return out;
}

/**
 * Woran ein Einsatz erkennt, dass er schon steht: seine längste Zeile. Ein ganzer Block taugt
 * nicht, denn ein späteres Muster wandelt ihn ab (Belege setzt `bereit` in die Zeilen der
 * Mandanten); eine kurze Zeile wie `{` steht in jeder Datei.
 */
function kennzeile(text) {
  return text.split("\n").reduce((lang, zeile) => (zeile.trim().length > lang.trim().length ? zeile : lang), "");
}

/** Ein Einsatz in einem Text. Zurück kommt der neue Text, oder `null`, wenn der Anker fehlt. */
function applyEdit(text, edit) {
  if (edit.remove !== undefined) {
    return text.includes(edit.remove) ? text.replace(edit.remove, "") : text;
  }
  if (edit.replace !== undefined) {
    if (text.includes(edit.with)) return text;
    return text.includes(edit.replace) ? text.replace(edit.replace, edit.with) : null;
  }
  if (text.includes(edit.unless ?? kennzeile(edit.text))) return text;
  const from = edit.within ? find(text, edit.within)?.start ?? -1 : 0;
  if (from < 0) return null;
  if (edit.seam) {
    const at = find(text, SEAMS[edit.seam].mark);
    return at ? `${text.slice(0, at.start)}${edit.text}${text.slice(at.start)}` : null;
  }
  for (const anchor of [].concat(edit.before ?? edit.after)) {
    const at = find(text, anchor, from);
    if (!at) continue;
    return edit.before !== undefined
      ? `${text.slice(0, at.start)}${edit.text}${text.slice(at.start)}`
      : `${text.slice(0, at.end)}${edit.text}${text.slice(at.end)}`;
  }
  return null;
}

/** Was ein Einsatz von Hand verlangt, wenn sein Anker fehlt. */
function handStep(edit) {
  if (edit.hand) return `${edit.file}: ${edit.hand}`;
  if (edit.replace !== undefined) return `${edit.file}: „${edit.replace.trim()}“ → „${edit.with.trim()}“`;
  const anchor = [].concat(edit.before ?? edit.after ?? edit.seam).map((a) => String(a).trim()).join(" | ");
  return t(
    `${edit.file}: ${edit.before !== undefined ? "before" : "after"} „${anchor}“ insert:\n${edit.text}`,
    `${edit.file}: ${edit.before !== undefined ? "vor" : "hinter"} „${anchor}“ einsetzen:\n${edit.text}`
  );
}

/** Die Einsätze eines Musters in die Dateien der App. */
function applyEdits(appDir, id, wiring, present, fresh, report) {
  const texts = new Map();
  const read = (file) => {
    if (!texts.has(file)) {
      const path = join(appDir, file);
      texts.set(file, existsSync(path) ? readFileSync(path, "utf8") : null);
    }
    return texts.get(file);
  };
  for (const edit of wiring.edits ?? []) {
    if (!applies(edit, present)) continue;
    let text = read(edit.file);
    if (text === null) {
      if (fresh && !edit.optional) report.hand.push(t(`${edit.file} is missing in the app.`, `${edit.file} fehlt in der App.`));
      continue;
    }
    if (edit.file === "backend/server.mjs") {
      for (const seam of Object.keys(SEAMS)) text = ensureSeam(text, seam) ?? text;
      text = ensureMelden(text) ?? text;
    }
    const next = applyEdit(text, edit);
    if (next === null) {
      if (edit.optional) {
        if (fresh && edit.hand) report.next.push(`${edit.file}: ${edit.hand}`);
      } else if (fresh) report.hand.push(handStep(edit));
      texts.set(edit.file, text);
      continue;
    }
    texts.set(edit.file, next);
  }
  for (const [file, text] of texts) {
    if (text === null) continue;
    const path = join(appDir, file);
    if (readFileSync(path, "utf8") !== text) {
      writeFileSync(path, text);
      if (!report.changed.includes(file)) report.changed.push(file);
    }
  }
}

/**
 * Muster in eine App einhängen. `wanted` sind die neuen, die übrigen der App laufen idempotent
 * mit. Zurück kommt ein Bericht; geschrieben ist danach, was ging.
 */
export function addPatterns(appDir, wanted, values = {}) {
  const present = appliedPatterns(appDir);
  const { unknown, order, missing } = plan(wanted, present);
  const report = { unknown, missing, order, added: [], copied: [], replaced: [], kept: [], migrations: [], renumbered: [], changed: [], hand: [], next: [] };
  if (unknown.length || missing.length) return report;
  for (const id of order) {
    const wiring = readWiring(id);
    const fresh = wanted.includes(id) && !present.includes(id);
    copyFiles(appDir, id, wiring, order, fresh, values, report);
    copyMigrations(appDir, id, wiring, order, report);
    applyEdits(appDir, id, wiring, order, fresh, report);
    if (fresh) {
      report.added.push(id);
      for (const sentence of wiring.next ?? []) report.next.push(t(sentence.en ?? sentence, sentence.de ?? sentence));
    }
  }
  writeFileSync(join(appDir, PATTERNS_FILE), `${JSON.stringify({ patterns: order }, null, 2)}\n`);
  return report;
}

/** Der Bericht für einen Menschen, kurz: was dazukam, was von Hand bleibt, was als Nächstes kommt. */
export function wiringLines(appName, report, wanted) {
  if (report.unknown.length) {
    return [
      t(
        `${report.unknown.join(", ")}: no pattern the tool wires. It wires: ${wirablePatterns().join(", ")}. The others (mail, foreign API, foreign container) stand in their sheet.`,
        `${report.unknown.join(", ")}: kein Muster, das das Werkzeug einhängt. Es hängt ein: ${wirablePatterns().join(", ")}. Die übrigen (Post, fremde Schnittstelle, fremder Container) stehen in ihrem Blatt.`
      ),
    ];
  }
  if (report.missing.length) {
    const all = [...new Set([...report.missing.map((m) => m.needs), ...wanted])];
    return [
      t("Nothing wired: a prerequisite is missing.", "Nichts eingehängt: eine Voraussetzung fehlt."),
      ...report.missing.map((m) => t(`- ${m.pattern} needs ${m.needs}`, `- ${m.pattern} braucht ${m.needs}`)),
      t(`All at once: node .ara/tools/app.mjs --app ${appName} --add-pattern ${all.join(",")}`, `Alle auf einmal: node .ara/tools/app.mjs --app ${appName} --add-pattern ${all.join(",")}`),
    ];
  }
  const lines = [
    report.added.length
      ? t(`Wired into ${appName}: ${report.added.join(", ")}. In the app now: ${report.order.join(", ")}.`, `Eingehängt in ${appName}: ${report.added.join(", ")}. In der App jetzt: ${report.order.join(", ")}.`)
      : t(`Already in ${appName}: ${report.order.join(", ")}. Nothing new.`, `Schon in ${appName}: ${report.order.join(", ")}. Nichts Neues.`),
  ];
  if (report.copied.length || report.replaced.length) {
    lines.push(t(`- Files: ${report.copied.length} new, ${report.replaced.length} replaced (${report.replaced.join(", ") || "none"})`, `- Dateien: ${report.copied.length} neu, ${report.replaced.length} ersetzt (${report.replaced.join(", ") || "keine"})`));
  }
  if (report.migrations.length) lines.push(t(`- Migrations: ${report.migrations.join(", ")}`, `- Migrationen: ${report.migrations.join(", ")}`));
  for (const moved of report.renumbered) lines.push(t(`- Migration renumbered, the number was taken: ${moved}`, `- Migration umbenannt, die Nummer war belegt: ${moved}`));
  if (report.changed.length) lines.push(t(`- Wired in: ${report.changed.join(", ")}`, `- Eingesetzt in: ${report.changed.join(", ")}`));
  for (const rel of report.kept) {
    lines.push(t(`- Left as it is, changed by hand: ${rel}. The pattern's version: .ara/templates/app-patterns/…/${rel}`, `- Stehen gelassen, von Hand geändert: ${rel}. Die Fassung des Musters: .ara/templates/app-patterns/…/${rel}`));
  }
  if (report.hand.length) {
    lines.push("", t(`By hand, the anchor was not found (${report.hand.length}):`, `Von Hand, der Anker stand nicht da (${report.hand.length}):`), ...report.hand.map((h) => `- ${h}`));
  }
  if (report.next.length) lines.push("", t("To decide:", "Zu entscheiden:"), ...report.next.map((n) => `- ${n}`));
  lines.push("", t(`Next: node .ara/tools/app.mjs --app ${appName} --build`, `Weiter: node .ara/tools/app.mjs --app ${appName} --build`));
  return lines;
}
