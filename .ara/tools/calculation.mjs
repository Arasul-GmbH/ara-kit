#!/usr/bin/env node
/**
 * Calculation sheet: which number is there, which is missing and what is therefore not possible.
 *
 * A complete offer along `.ara/knowledge/pricing.md` needs ten numbers. If they
 * stand in `business/company.md`, Ara calculates without asking, and two offers by
 * the same partner for the same device type land on the same numbers. If one is
 * missing, it otherwise gets estimated anew at every offer.
 *
 * The tool only reads. Entering happens in the procedure `/calculation`, so that
 * every number comes in with the date on which it was confirmed.
 *
 *   node .ara/tools/calculation.mjs               what is there, what is missing
 *   node .ara/tools/calculation.mjs --json        machine readable
 *   node .ara/tools/calculation.mjs --file <path> read a different sheet. The
 *                                                 self-test uses that, daily work does not.
 *
 * Return code 1 as soon as a number is missing without which no complete offer
 * comes into being. A stale as-of date is a hint, not an error.
 *
 * === deutsch ===
 *
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
import { t } from "./lib/i18n.mjs";
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
    label: t("Hourly rate", "Stundensatz"),
    unit: t("euro net per hour", "Euro netto je Stunde"),
    blocking: true,
    without: t(
      "no calculation, neither setup nor care",
      "keine Kalkulation, weder Einrichtung noch Betreuung"
    ),
  },
  {
    key: "setup_hours",
    label: t("Hours for a first setup", "Stunden für eine Ersteinrichtung"),
    unit: t("hours", "Stunden"),
    blocking: true,
    without: t(
      "the setup gets estimated anew at every offer, and two offers " +
        "for the same device type land on different numbers",
      "die Einrichtung wird bei jedem Angebot neu geschätzt, und zwei Angebote " +
        "für denselben Gerätetyp kommen auf verschiedene Zahlen"
    ),
  },
  {
    key: "hardware_markup",
    label: t("Markup on hardware", "Aufschlag auf Hardware"),
    unit: t("percent", "Prozent"),
    blocking: true,
    without: t("no hardware price", "kein Hardwarepreis"),
  },
  {
    key: "care_yearly",
    label: t("Own care", "Eigene Betreuung"),
    unit: t("euro net per year and device", "Euro netto je Jahr und Gerät"),
    blocking: true,
    without: t(
      "no recurring item, and that is the part that carries the business",
      "kein laufender Posten, und der ist der Teil, der das Geschäft trägt"
    ),
  },
  {
    key: "payment_terms",
    label: t("Payment terms", "Zahlungsziel"),
    unit: t("days", "Tage"),
    blocking: true,
    without: t(
      "no offer, the payment terms stand in the letterhead",
      "kein Angebot, das Zahlungsziel steht im Briefkopf"
    ),
  },
  {
    key: "travel",
    label: t("Travel", "Anfahrt"),
    unit: t("euro net per trip", "Euro netto je Fahrt"),
    blocking: false,
    without: t(
      "the travel falls off the table when calculating",
      "die Anfahrt fällt beim Rechnen unter den Tisch"
    ),
  },
  {
    key: "minimum_fee",
    label: t("Minimum fee", "Mindestpauschale"),
    unit: t("euro net per job", "Euro netto je Auftrag"),
    blocking: false,
    without: t("small jobs go out below value", "kleine Aufträge gehen unter Wert raus"),
  },
];

/**
 * Die drei Einkaufspreise. Sie stehen im Partnerportal, nicht im Kopf des Partners.
 *
 * Erkannt werden sie an der Zeile im Blatt, und das Blatt gibt es in beiden
 * Sprachen: ein Partner, der auf Englisch angefangen hat, schreibt "Licence" in
 * dieselbe Tabelle, in die ein anderer "Lizenz" schreibt.
 */
const PURCHASES = [
  {
    id: "license",
    match: /^(lizenz|licen[cs]e)/i,
    label: t("Licence, one-off", "Lizenz, einmalig"),
    blocking: true,
    without: t("no licence line item", "keine Lizenzposition"),
  },
  {
    id: "maintenance",
    match: /^(wartung|maintenance)/i,
    label: t("Maintenance, yearly", "Wartung, jährlich"),
    blocking: true,
    without: t(
      "no maintenance, neither year 1 nor from year 2",
      "keine Wartung, weder Jahr 1 noch ab Jahr 2"
    ),
  },
  {
    id: "hardware",
    match: /^hardware/i,
    label: t("Hardware per type", "Hardware je Typ"),
    blocking: true,
    many: true,
    without: t("no hardware price and no margin", "kein Hardwarepreis und keine Marge"),
  },
];

const file = typeof arg.file === "string" ? resolve(arg.file) : join(BUSINESS, "company.md");
const shown = relative(ROOT, file);

if (!existsSync(file)) {
  console.error(
    t(
      `${shown} does not exist yet, so there is no calculation sheet.\n` +
        "It comes into being in the onboarding: /init, round 5.",
      `${shown} gibt es noch nicht, also gibt es kein Kalkulationsblatt.\n` +
        "Es entsteht im Onboarding: /init, Runde 5."
    )
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
      // Die Ueberschrift heisst je Fassung des Blattes anders und meint dieselbe
      // Tabelle.
      inside = /^##\s+(Einkaufspreise|Purchase prices)\s*$/.test(line);
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
    if (/^(position|item)$/i.test(cells[0])) continue;
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
    unit: t("euro net", "Euro netto"),
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

const out = [t(`Calculation sheet: ${shown}`, `Kalkulationsblatt: ${shown}`), ""];

function section(title, items) {
  out.push(title);
  for (const item of items) {
    if (!item.value) {
      // Die Folge steht weiter unten gesammelt, hier würde sie die Übersicht
      // zerreißen, die man mit einem Blick lesen können soll.
      out.push(t(`  missing  ${item.label}`, `  fehlt  ${item.label}`));
      continue;
    }
    const notes = [];
    if (!item.dated) {
      notes.push(
        item.asof
          ? t(`as of ${item.asof}, one line without`, `Stand ${item.asof}, eine Zeile ohne`)
          : t("without an as-of date", "ohne Stand")
      );
    } else {
      notes.push(t(`as of ${item.asof}`, `Stand ${item.asof}`));
    }
    const limit = item.group === "rates" ? RATES_STALE_DAYS : PURCHASE_STALE_DAYS;
    if (item.age !== null && item.age > limit) {
      notes.push(
        t(`${Math.round(item.age / 30)} months old, look it up`, `${Math.round(item.age / 30)} Monate alt, nachsehen`)
      );
    }
    out.push(
      t(
        `  there    ${item.label}: ${item.value} ${item.unit} (${notes.join(", ")})`,
        `  liegt  ${item.label}: ${item.value} ${item.unit} (${notes.join(", ")})`
      )
    );
  }
  out.push("");
}

section(t("Your own rates, you know them yourself", "Eigene Sätze, die kennst du selbst"), rates);
section(
  t("Purchase prices, they stand in the partner portal", "Einkaufspreise, die stehen im Partnerportal"),
  purchases
);

if (missing.length === 0) {
  out.push(
    t(
      "All ten numbers are there. Nothing has to be asked for an offer.",
      "Alle zehn Zahlen liegen vor. Für ein Angebot muss nichts erfragt werden."
    )
  );
} else {
  out.push(
    t(
      `${missing.length} of ${all.length} numbers are missing, ${blocking.length} of them block:`,
      `Es fehlen ${missing.length} von ${all.length} Zahlen, ${blocking.length} davon blockieren:`
    )
  );
  for (const item of blocking) {
    out.push(t(`  without ${item.label}: ${item.without}`, `  ohne ${item.label}: ${item.without}`));
  }
  const soft = missing.filter((item) => !item.blocking);
  if (soft.length) {
    out.push(
      t("Not blocking, but a point of contention every time:", "Nicht blockierend, aber jedes Mal ein Streitpunkt:")
    );
    for (const item of soft) {
      out.push(t(`  without ${item.label}: ${item.without}`, `  ohne ${item.label}: ${item.without}`));
    }
  }
  out.push("", t("Add them with /calculation.", "Nachtragen mit /calculation."));
}

if (stale.length) {
  out.push(
    "",
    t(
      `Stale: ${stale.map((item) => item.label).join(", ")}. Confirm before an offer comes out of it.`,
      `Veraltet: ${stale.map((item) => item.label).join(", ")}. Bestätigen, bevor daraus ein Angebot wird.`
    )
  );
}
if (undated.length) {
  out.push(
    "",
    t(
      `Without an as-of date: ${undated.map((item) => item.label).join(", ")}. ` +
        "A number without a date cannot be checked for currency.",
      `Ohne Stand-Datum: ${undated.map((item) => item.label).join(", ")}. ` +
        "Eine Zahl ohne Datum lässt sich nicht auf Aktualität prüfen."
    )
  );
}

console.log(out.join("\n"));
process.exit(blocking.length ? 1 : 0);
