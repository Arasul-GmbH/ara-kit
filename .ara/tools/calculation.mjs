#!/usr/bin/env node
/**
 * Kalkulationsblatt: welche Zahl liegt vor, welche fehlt und was deshalb nicht geht.
 *
 * Ein vollständiges Angebot nach `.ara/knowledge/pricing.md` braucht zehn Zahlen.
 * Liegen sie in `business/company.md`, rechnet Ara ohne Rückfrage, und zwei Angebote
 * desselben Partners für denselben Gerätetyp kommen auf dieselben Zahlen. Fehlt eine,
 * wird sie sonst bei jedem Angebot neu geschätzt.
 *
 * Das Werkzeug liest nur. Eingetragen wird im Verfahren `/calculation`, damit jede
 * Zahl mit dem Datum hereinkommt, an dem sie bestätigt wurde.
 *
 *   node .ara/tools/calculation.mjs               was liegt vor, was fehlt
 *   node .ara/tools/calculation.mjs --json        maschinenlesbar
 *   node .ara/tools/calculation.mjs --file <pfad> ein anderes Blatt lesen. Der
 *                                                 Selbsttest nutzt das, im Alltag nicht.
 *
 * Rückgabecode 1, sobald eine Zahl fehlt, ohne die kein vollständiges Angebot
 * entsteht. Ein veralteter Stand ist ein Hinweis, kein Fehler.
 */

import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { BUSINESS, ROOT, daysUntil, helpOnly, parseArgs, readFrontmatter } from "./lib/kit.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();

// Die eigenen Sätze ändern sich höchstens einmal im Jahr, die Einkaufspreise sind
// Arasuls Zahlen und ändern sich häufiger. Darum zwei Fristen.
const RATES_STALE_DAYS = 365;
const PURCHASE_STALE_DAYS = 180;

/**
 * Die sieben eigenen Sätze. Der Partner kennt sie selbst, niemand muss sie
 * nachschlagen. "without" ist die Folge, die genannt wird, wenn die Zahl fehlt:
 * "ohne Stundensatz keine Kalkulation" ist brauchbar, "einiges fehlt" nicht.
 */
const RATES = [
  {
    key: "hourly_rate",
    label: "Stundensatz",
    unit: "Euro netto je Stunde",
    blocking: true,
    without: "keine Kalkulation, weder Einrichtung noch Betreuung",
  },
  {
    key: "setup_hours",
    label: "Stunden für eine Ersteinrichtung",
    unit: "Stunden",
    blocking: true,
    without:
      "die Einrichtung wird bei jedem Angebot neu geschätzt, und zwei Angebote " +
      "für denselben Gerätetyp kommen auf verschiedene Zahlen",
  },
  {
    key: "hardware_markup",
    label: "Aufschlag auf Hardware",
    unit: "Prozent",
    blocking: true,
    without: "kein Hardwarepreis",
  },
  {
    key: "care_yearly",
    label: "Eigene Betreuung",
    unit: "Euro netto je Jahr und Gerät",
    blocking: true,
    without: "kein laufender Posten, und der ist der Teil, der das Geschäft trägt",
  },
  {
    key: "payment_terms",
    label: "Zahlungsziel",
    unit: "Tage",
    blocking: true,
    without: "kein Angebot, das Zahlungsziel steht im Briefkopf",
  },
  {
    key: "travel",
    label: "Anfahrt",
    unit: "Euro netto je Fahrt",
    blocking: false,
    without: "die Anfahrt fällt beim Rechnen unter den Tisch",
  },
  {
    key: "minimum_fee",
    label: "Mindestpauschale",
    unit: "Euro netto je Auftrag",
    blocking: false,
    without: "kleine Aufträge gehen unter Wert raus",
  },
];

/** Die drei Einkaufspreise. Sie stehen im Partnerportal, nicht im Kopf des Partners. */
const PURCHASES = [
  {
    id: "license",
    match: /^lizenz/i,
    label: "Lizenz, einmalig",
    blocking: true,
    without: "keine Lizenzposition",
  },
  {
    id: "maintenance",
    match: /^wartung/i,
    label: "Wartung, jährlich",
    blocking: true,
    without: "keine Wartung, weder Jahr 1 noch ab Jahr 2",
  },
  {
    id: "hardware",
    match: /^hardware/i,
    label: "Hardware je Typ",
    blocking: true,
    many: true,
    without: "kein Hardwarepreis und keine Marge",
  },
];

const file = typeof arg.file === "string" ? resolve(arg.file) : join(BUSINESS, "company.md");
const shown = relative(ROOT, file);

if (!existsSync(file)) {
  console.error(
    `${shown} gibt es noch nicht, also gibt es kein Kalkulationsblatt.\n` +
      "Es entsteht im Onboarding: /init, Runde 5."
  );
  process.exit(1);
}

const { fields, body } = readFrontmatter(file);

/** Ein Platzhalter in geschweiften Klammern ist ein nicht gefülltes Feld, kein Wert. */
const isPlaceholder = (value) => /\{[^{}]*\}/.test(value);
const isSet = (value) => Boolean(value) && !isPlaceholder(value);

/** Alter in Tagen, oder null bei fehlendem oder unlesbarem Datum. */
function ageInDays(dateString) {
  const days = daysUntil(dateString);
  return days === null ? null : -days;
}

// --- Die eigenen Sätze ------------------------------------------------------

const ratesAsOf = fields.rates_asof || "";
const ratesAge = ageInDays(ratesAsOf);

const rates = RATES.map((rate) => ({
  group: "rates",
  key: rate.key,
  label: rate.label,
  unit: rate.unit,
  blocking: rate.blocking,
  without: rate.without,
  value: isSet(fields[rate.key]) ? fields[rate.key] : "",
  asof: ratesAsOf,
  age: ratesAge,
  dated: ratesAge !== null,
}));

// --- Die Einkaufspreise -----------------------------------------------------

/**
 * Die Zeilen der Tabelle unter "## Einkaufspreise". Kopf- und Trennzeile fallen
 * heraus, alles andere ist eine Position.
 */
function purchaseRows(text) {
  const rows = [];
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) {
      inside = /^##\s+Einkaufspreise\s*$/.test(line);
      continue;
    }
    if (!inside || !/^\s*\|/.test(line)) continue;
    const cells = line
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    if (/^[\s:-]+$/.test(cells[0])) continue;
    if (/^position$/i.test(cells[0])) continue;
    rows.push({ position: cells[0], value: cells[1] || "", asof: cells[2] || "" });
  }
  return rows;
}

const rows = purchaseRows(body);

const purchases = PURCHASES.map((entry) => {
  const matching = rows.filter((row) => entry.match.test(row.position));
  const filled = matching.filter((row) => isSet(row.value) && !isPlaceholder(row.position));
  const ages = filled.map((row) => ageInDays(row.asof)).filter((age) => age !== null);

  return {
    group: "purchase",
    key: entry.id,
    label: entry.label,
    unit: "Euro netto",
    blocking: entry.blocking,
    without: entry.without,
    value: filled.length
      ? entry.many
        ? filled
            .map((row) => `${row.position.replace(/^hardware,?\s*/i, "")} ${row.value}`)
            .join(", ")
        : filled[0].value
      : "",
    asof: filled.length ? filled.map((row) => row.asof).find(Boolean) || "" : "",
    // Bei mehreren Hardwarezeilen zählt die älteste, sonst deckt eine frische Zeile
    // eine alte zu.
    age: ages.length ? Math.max(...ages) : null,
    // Und eine Zeile ohne Datum macht die ganze Position undatiert, sonst deckt
    // die datierte Zeile daneben sie zu.
    dated: filled.length > 0 && ages.length === filled.length,
  };
});

// --- Auswertung -------------------------------------------------------------

const all = [...rates, ...purchases];
const missing = all.filter((item) => !item.value);
const blocking = missing.filter((item) => item.blocking);

const stale = all.filter((item) => {
  if (!item.value) return false;
  const limit = item.group === "rates" ? RATES_STALE_DAYS : PURCHASE_STALE_DAYS;
  return item.age !== null && item.age > limit;
});
const undated = all.filter((item) => item.value && !item.dated);

if (arg.json) {
  console.log(
    JSON.stringify(
      {
        file: shown,
        complete: missing.length === 0,
        can_quote: blocking.length === 0,
        numbers: all,
        missing: missing.map((item) => item.key),
        stale: stale.map((item) => item.key),
        undated: undated.map((item) => item.key),
      },
      null,
      2
    )
  );
  process.exit(blocking.length ? 1 : 0);
}

const out = [`Kalkulationsblatt: ${shown}`, ""];

function section(title, items) {
  out.push(title);
  for (const item of items) {
    if (!item.value) {
      // Die Folge steht weiter unten gesammelt, hier würde sie die Übersicht
      // zerreißen, die man mit einem Blick lesen können soll.
      out.push(`  fehlt  ${item.label}`);
      continue;
    }
    const notes = [];
    if (!item.dated) notes.push(item.asof ? `Stand ${item.asof}, eine Zeile ohne` : "ohne Stand");
    else notes.push(`Stand ${item.asof}`);
    const limit = item.group === "rates" ? RATES_STALE_DAYS : PURCHASE_STALE_DAYS;
    if (item.age !== null && item.age > limit) {
      notes.push(`${Math.round(item.age / 30)} Monate alt, nachsehen`);
    }
    out.push(`  liegt  ${item.label}: ${item.value} ${item.unit} (${notes.join(", ")})`);
  }
  out.push("");
}

section("Eigene Sätze, die kennst du selbst", rates);
section("Einkaufspreise, die stehen im Partnerportal", purchases);

if (missing.length === 0) {
  out.push("Alle zehn Zahlen liegen vor. Für ein Angebot muss nichts erfragt werden.");
} else {
  out.push(
    `Es fehlen ${missing.length} von ${all.length} Zahlen, ${blocking.length} davon blockieren:`
  );
  for (const item of blocking) out.push(`  ohne ${item.label}: ${item.without}`);
  const soft = missing.filter((item) => !item.blocking);
  if (soft.length) {
    out.push("Nicht blockierend, aber jedes Mal ein Streitpunkt:");
    for (const item of soft) out.push(`  ohne ${item.label}: ${item.without}`);
  }
  out.push("", "Nachtragen mit /kalkulation.");
}

if (stale.length) {
  out.push(
    "",
    `Veraltet: ${stale.map((item) => item.label).join(", ")}. ` +
      "Bestätigen, bevor daraus ein Angebot wird."
  );
}
if (undated.length) {
  out.push(
    "",
    `Ohne Stand-Datum: ${undated.map((item) => item.label).join(", ")}. ` +
      "Eine Zahl ohne Datum lässt sich nicht auf Aktualität prüfen."
  );
}

console.log(out.join("\n"));
process.exit(blocking.length ? 1 : 0);
