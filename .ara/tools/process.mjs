#!/usr/bin/env node
/**
 * Process sheet: create one, check it, read off what an app can be built from it.
 *
 * A process sheet is the file in which `/process` writes down how the work of a house runs: who
 * does what, when, with which paper, where somebody decides. It stands under
 * `customers/<customer>/processes/<id>.md`, or without a customer under `business/processes/`.
 * `/app` reads it and does not ask again what stands there.
 *
 *   node .ara/tools/process.mjs --new leave-request [--customer mueller] [--title "Leave request"]
 *   node .ara/tools/process.mjs --list [--customer mueller]
 *   node .ara/tools/process.mjs --check leave-request [--customer mueller]
 *   node .ara/tools/process.mjs --derive leave-request [--customer mueller] [--json]
 *
 * `--check` says what is missing, in which place; it ends with a failure as long as an app cannot be
 * derived. `--derive` says which details `app.mjs --new --prozess` takes from the sheet. Neither
 * writes anything but `--new`, and none asks anything: the conversation is `/process`.
 *
 * === deutsch ===
 *
 * Prozessblatt: anlegen, prüfen, ablesen, was sich daraus für eine App ergibt.
 *
 * Ein Prozessblatt ist die Datei, in die `/process` aufschreibt, wie die Arbeit eines Hauses läuft:
 * wer tut was, wann, mit welchem Papier, wo jemand entscheidet. Es liegt unter
 * `customers/<kunde>/processes/<kennung>.md`, ohne Kunden unter `business/processes/`. `/app` liest
 * es und fragt nicht noch einmal, was dort steht.
 *
 *   node .ara/tools/process.mjs --new urlaubsantrag [--customer mueller] [--title "Urlaubsantrag"]
 *   node .ara/tools/process.mjs --list [--customer mueller]
 *   node .ara/tools/process.mjs --check urlaubsantrag [--customer mueller]
 *   node .ara/tools/process.mjs --derive urlaubsantrag [--customer mueller] [--json]
 *
 * `--check` sagt, was fehlt und an welcher Stelle; es endet mit einem Fehler, solange sich keine App
 * ableiten lässt. `--derive` sagt, welche Angaben `app.mjs --new --prozess` dem Blatt entnimmt. Nur
 * `--new` schreibt, und keines fragt: das Gespräch ist `/process`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { ROOT, customerPath, ensureDir, fail, helpOnly, parseArgs, today } from "./lib/kit.mjs";
import { localized, t } from "./lib/i18n.mjs";
import { validName } from "./lib/appfile.mjs";
import { checkSheet, deriveApp, findSheet, listSheets, parseSheet, sheetDir, sheetPath } from "./lib/process.mjs";
import { join } from "node:path";

helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);
const customer = str(arg.customer);

if (customer && !existsSync(customerPath(customer))) {
  fail(
    t(
      `The customer ${customer} does not exist yet. First /customer ${customer}.`,
      `Den Kunden ${customer} gibt es noch nicht. Zuerst /customer ${customer}.`
    )
  );
}
const where = relative(ROOT, sheetDir(customer));

/** Das Blatt, auf das sich der Aufruf bezieht, oder ein Abbruch mit dem Ort, an dem gesucht wurde. */
function sheetOrFail(ref) {
  if (!ref || ref === true) {
    fail(t("Name the sheet: --check <id>, the id is the file name without .md.", "Nenn das Blatt: --check <kennung>, die Kennung ist der Dateiname ohne .md."));
  }
  const path = findSheet(ref, customer);
  if (!path) {
    const known = listSheets(customer);
    fail(
      t(
        `No sheet "${ref}" under ${where}/. ${known.length ? `There are: ${known.join(", ")}.` : "There is none yet: --new <id>."}`,
        `Kein Blatt „${ref}“ unter ${where}/. ${known.length ? `Vorhanden: ${known.join(", ")}.` : "Es gibt noch keines: --new <kennung>."}`
      )
    );
  }
  return path;
}

if (arg.new !== undefined) {
  const id = str(arg.new);
  if (!validName(id)) {
    fail(
      t(
        "Name the new sheet: --new <id>, with lower case letters, digits and hyphens (leave-request).",
        "Nenn das neue Blatt: --new <kennung>, mit Kleinbuchstaben, Ziffern und Bindestrichen (urlaubsantrag)."
      )
    );
  }
  const path = sheetPath(id, customer);
  if (existsSync(path)) fail(t(`${relative(ROOT, path)} already exists. Open it instead.`, `${relative(ROOT, path)} gibt es schon. Öffne es stattdessen.`));
  const template = localized(join(ROOT, ".ara", "templates", "process.md"));
  const title = str(arg.title) || id;
  const text = readFileSync(template, "utf8").replace(/\{\{([a-z]+)\}\}/g, (whole, key) => ({ id, title, customer: customer ?? "", date: today() })[key] ?? whole);
  ensureDir(sheetDir(customer));
  writeFileSync(path, text);
  console.log(
    [
      t(`Process sheet created: ${relative(ROOT, path)}`, `Prozessblatt angelegt: ${relative(ROOT, path)}`),
      t("It is a scaffold with `<...>` places, not an answer. Fill it in during the interview, then:", "Es ist ein Gerüst mit `<...>`-Stellen, keine Antwort. Füll es im Interview aus, dann:"),
      `  node .ara/tools/process.mjs --check ${id}${customer ? ` --customer ${customer}` : ""}`,
    ].join("\n")
  );
  process.exit(0);
}

if (arg.list !== undefined) {
  const sheets = listSheets(customer);
  if (!sheets.length) {
    console.log(t(`No process sheet under ${where}/ yet.`, `Noch kein Prozessblatt unter ${where}/.`));
    process.exit(0);
  }
  console.log(t(`Process sheets under ${where}/:`, `Prozessblätter unter ${where}/:`));
  for (const id of sheets) {
    const sheet = parseSheet(sheetPath(id, customer));
    const errors = checkSheet(sheet).filter((f) => f.level === "error").length;
    console.log(
      `- ${id}: ${sheet.title}, ` +
        (errors ? t(`${errors} gaps, not ready for /app`, `${errors} Lücken, noch nicht bereit für /app`) : t("complete, /app can build from it", "vollständig, /app kann daraus bauen"))
    );
  }
  process.exit(0);
}

if (arg.check !== undefined) {
  const path = sheetOrFail(str(arg.check));
  const findings = checkSheet(parseSheet(path));
  const errors = findings.filter((f) => f.level === "error");
  if (arg.json) console.log(JSON.stringify({ file: relative(ROOT, path), ok: !errors.length, findings }, null, 2));
  else {
    for (const f of findings) console.log(`${f.level === "error" ? t("MISSING", "FEHLT") : t("NOTE", "HINWEIS")}  ${f.message}`);
    console.log(
      errors.length
        ? t(`\n${relative(ROOT, path)}: ${errors.length} gaps. /app cannot build from it yet.`, `\n${relative(ROOT, path)}: ${errors.length} Lücken. /app kann noch nicht daraus bauen.`)
        : t(`${relative(ROOT, path)}: complete. /app builds from it and asks nothing again that stands there.`, `${relative(ROOT, path)}: vollständig. /app baut daraus und fragt nichts noch einmal, was dort steht.`)
    );
  }
  process.exit(errors.length ? 1 : 0);
}

if (arg.derive !== undefined) {
  const path = sheetOrFail(str(arg.derive));
  const sheet = parseSheet(path);
  const errors = checkSheet(sheet).filter((f) => f.level === "error");
  if (errors.length) {
    fail(
      t(
        `${relative(ROOT, path)} has ${errors.length} gaps, nothing can be derived. First: node .ara/tools/process.mjs --check ${arg.derive}`,
        `${relative(ROOT, path)} hat ${errors.length} Lücken, daraus lässt sich nichts ableiten. Zuerst: node .ara/tools/process.mjs --check ${arg.derive}`
      )
    );
  }
  const derived = deriveApp(sheet);
  if (arg.json) console.log(JSON.stringify(derived, null, 2));
  else {
    for (const [k, v] of Object.entries(derived)) console.log(`--${k}: ${v}`);
    console.log(
      t(
        `\nThe build takes them itself: node .ara/tools/app.mjs --app <id> --new --prozess ${arg.derive}${customer ? ` --customer ${customer}` : ""}`,
        `\nDer Bau nimmt sie selbst: node .ara/tools/app.mjs --app <kennung> --new --prozess ${arg.derive}${customer ? ` --customer ${customer}` : ""}`
      )
    );
  }
  process.exit(0);
}

console.log(
  t(
    [
      "Process sheet: how the work of a house runs, before an app comes of it.",
      "",
      "  --new <id>                 create a sheet from the scaffold (--customer <customer>, --title \"<title>\")",
      "  --list                     the sheets of this place and whether /app can build from them",
      "  --check <id>               what is missing in a sheet, in which place",
      "  --derive <id>              which details of an app the sheet gives (--json)",
      "",
      `Place: ${where}/`,
    ].join("\n"),
    [
      "Prozessblatt: wie die Arbeit eines Hauses läuft, bevor daraus eine App wird.",
      "",
      "  --new <kennung>            ein Blatt aus der Vorlage anlegen (--customer <kunde>, --title \"<titel>\")",
      "  --list                     die Blätter dieses Ortes und ob /app daraus bauen kann",
      "  --check <kennung>          was in einem Blatt fehlt, an welcher Stelle",
      "  --derive <kennung>         welche Angaben einer App das Blatt liefert (--json)",
      "",
      `Ort: ${where}/`,
    ].join("\n")
  )
);
