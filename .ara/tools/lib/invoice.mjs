/**
 * Die Rechnung: Nummernkreis, Beleg lesen, Pflichtangaben nach § 14 UStG.
 *
 * Hier steht alles, was keine Datei druckt und kein XML schreibt: wie eine
 * Nummer vergeben wird, wie aus einem Rechnungsbeleg wieder Zahlen werden und
 * welche Angabe fehlt, damit die Rechnung keine ist.
 *
 * **Ein Beleg, eine Wahrheit.** Die Zahlen im XML werden aus derselben Tabelle
 * gelesen, die der Kunde im PDF sieht. Es gibt keinen zweiten Satz Daten
 * daneben, der auseinanderlaufen koennte.
 *
 * Betraege rechnet dieses Modul in ganzen Cent. Ein Rechnungsbetrag, der aus
 * Gleitkommazahlen entsteht, ist irgendwann einen Cent daneben, und der Cent
 * steht dann in der Buchhaltung des Kunden.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { localized, t } from "./i18n.mjs";
import { BUSINESS, ROOT, day, ensureDir, readFrontmatter, today, writeFrontmatter } from "./kit.mjs";

/** Der Nummernkreis. Gehoert dem Partner, liegt unter business/. */
export const LEDGER = join(BUSINESS, "invoices.md");

/**
 * Ueberschrift und Spalten der Nummernliste. Sie sind das Schema der Datei und
 * darum englisch wie jedes andere Feld, das ein Werkzeug liest, und nicht wie
 * der Fliesstext darum herum.
 *
 * Ein Nummernkreis, der vor Phase E10 angelegt wurde, traegt die deutschen
 * Namen. Gelesen werden beide, geschrieben wird in die Ueberschrift, die in der
 * Datei steht: eine bestehende Liste umzubenennen waere eine Aenderung an einem
 * Buchungsbeleg, und die macht kein Werkzeug ungefragt.
 */
const LEDGER_HEADING = "## Assigned numbers";
const LEDGER_HEADING_DE = "## Vergebene Nummern";
const LEDGER_COLUMNS = ["Number", "Date", "Customer", "Net", "Gross", "State", "Reason", "File"];
const LEDGER_COLUMNS_DE = ["Nummer", "Datum", "Kunde", "Netto", "Brutto", "Stand", "Grund", "Datei"];

/** Die Ueberschrift, die in dieser Datei wirklich steht. */
function headingOf(content) {
  return content.includes(LEDGER_HEADING_DE) ? LEDGER_HEADING_DE : LEDGER_HEADING;
}

/** Die Spalten, die zu dieser Ueberschrift gehoeren. */
function columnsOf(content) {
  return headingOf(content) === LEDGER_HEADING_DE ? LEDGER_COLUMNS_DE : LEDGER_COLUMNS;
}

/** Die Staende einer Rechnung. Ein vergebener Zettel verschwindet nie. */
export const STATES = {
  entwurf: "geschrieben, noch nicht gedruckt",
  gestellt: "gedruckt und beim Kunden",
  storniert: "zurueckgenommen, die Nummer bleibt vergeben",
};

/** Die Steuerfaelle, die dieses Werkzeug kennt. */
export const TAX_MODES = {
  standard: "Regelbesteuerung, Steuersatz auf jede Zeile",
  kleinunternehmer: "kein Steuerausweis nach § 19 UStG",
  reverse_charge: "Steuerschuldnerschaft des Leistungsempfaengers",
};

/** Text, der bei Steuerbefreiung auf der Rechnung und im XML stehen muss. */
export const EXEMPTION = {
  kleinunternehmer:
    "Kein Steuerausweis, Kleinunternehmer nach § 19 UStG.",
  reverse_charge:
    "Steuerschuldnerschaft des Leistungsempfaengers, § 13b UStG. Reverse Charge.",
};

// --- Zahlen ------------------------------------------------------------------

/**
 * Ein Betrag aus dem Papier in ganze Cent.
 *
 * Deutsche Schreibweise ist der Normalfall: 1.234,56. Ein Punkt allein ist
 * mehrdeutig, darum die Regel: genau zwei Ziffern dahinter heisst Dezimalpunkt,
 * alles andere heisst Tausenderpunkt. Wer es anders meint, schreibt das Komma.
 */
export function parseAmount(text) {
  if (typeof text === "number") return Math.round(text * 100);
  if (!text) return null;
  let clean = String(text)
    .replace(/(euro|eur|€)/gi, "")
    .replace(/\s| |'/g, "")
    .trim();
  if (!clean) return null;
  const negative = clean.startsWith("-");
  if (negative) clean = clean.slice(1);
  if (!/^[\d.,]+$/.test(clean)) return null;

  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");
  let normal;
  if (hasComma) {
    normal = clean.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const tail = clean.slice(clean.lastIndexOf(".") + 1);
    normal = clean.split(".").length === 2 && tail.length === 2 ? clean : clean.replace(/\./g, "");
  } else {
    normal = clean;
  }
  const value = Number(normal);
  if (!Number.isFinite(value)) return null;
  return (negative ? -1 : 1) * Math.round(value * 100);
}

/** Eine Menge aus dem Papier. Halbe Stunden kommen vor, halbe Cent nicht. */
export function parseQuantity(text) {
  if (typeof text === "number") return text;
  if (!text) return null;
  const clean = String(text).replace(/\s| /g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

/**
 * Ein Steuersatz aus dem Papier. Dort steht "19 Prozent", nicht "19": gelesen
 * wird dieselbe Spalte, die gedruckt wird, und die traegt ihre Einheit mit.
 */
export function parseRate(text) {
  if (typeof text === "number") return text;
  if (text === undefined || text === null || String(text).trim() === "") return null;
  return parseQuantity(String(text).replace(/prozent|%/gi, ""));
}

/** Cent als deutscher Betrag: 123456 wird zu "1.234,56". */
export function formatAmount(cents) {
  const negative = cents < 0;
  const digits = String(Math.abs(cents)).padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${whole},${digits.slice(-2)}`;
}

/** Eine Menge im Papier: ganze Zahlen ohne Nachkomma, sonst mit Komma. */
export function formatQuantity(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

/** Prozentsatz im Papier: 19 bleibt 19, 7,5 behaelt sein Komma. */
export function formatRate(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

/** Kaufmaennisch runden, auf ganze Cent. */
export function roundCents(value) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Datum plus Tage, als JJJJ-MM-TT. Gerechnet wird im Kalender vor Ort. */
export function addDays(date, days) {
  const base = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(base.getTime())) return "";
  return day(days, base);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (value) => DATE.test(String(value || "").trim());

// --- Nummernkreis ------------------------------------------------------------

/** Eine Nummer aus Jahr und laufender Zahl: 2026-0001. */
export function makeNumber(year, count) {
  return `${year}-${String(count).padStart(4, "0")}`;
}

/** Zerlegt eine Nummer wieder. Passt sie nicht ins Muster, kommt null. */
export function splitNumber(number) {
  const match = String(number || "").trim().match(/^(\d{4})-(\d{4})$/);
  return match ? { year: Number(match[1]), count: Number(match[2]) } : null;
}

/** Die Zeilen der Nummernliste aus dem Rumpf der Datei. */
function parseRows(body) {
  const section = body
    .split(/^## /m)
    .find((part) => part.startsWith("Assigned numbers") || part.startsWith("Vergebene Nummern"));
  if (!section) return [];
  const rows = [];
  for (const line of section.split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
    if (cells[0] === "Number" || cells[0] === "Nummer" || /^[-:\s]+$/.test(cells[0])) continue;
    if (!splitNumber(cells[0])) continue;
    const row = {};
    // Gelesen wird immer auf die englischen Schluessel, egal wie die Spalten in
    // der Datei heissen: sonst muesste jeder Aufrufer beide Namen kennen.
    LEDGER_COLUMNS.forEach((name, index) => (row[name] = cells[index] ?? ""));
    rows.push(row);
  }
  return rows;
}

/** Der Nummernkreis, so wie er auf der Platte liegt. */
export function readLedger() {
  const { fields, body, exists } = readFrontmatter(LEDGER);
  return {
    exists,
    file: LEDGER,
    year: Number(fields.year) || null,
    last: Number(fields.last) || 0,
    format: fields.format || "YYYY-NNNN",
    rows: exists ? parseRows(body) : [],
  };
}

/** Legt den Nummernkreis aus der Vorlage an, falls er fehlt. */
export function ensureLedger() {
  if (existsSync(LEDGER)) return false;
  ensureDir(BUSINESS);
  const template = localized(join(ROOT, ".ara", "templates", "invoices.md"));
  writeFileSync(LEDGER, readFileSync(template, "utf8"));
  writeFrontmatter(LEDGER, { year: "", last: 0, created: today() });
  return true;
}

/** Schreibt die Nummernliste neu, Frontmatter und Rumpf bleiben sonst stehen. */
function writeRows(rows) {
  const content = readFileSync(LEDGER, "utf8");
  const heading = headingOf(content);
  const columns = columnsOf(content);
  const head = `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |`;
  const table = rows.length
    ? `${head}\n${rows
        .map((row) => `| ${LEDGER_COLUMNS.map((name) => row[name] ?? "").join(" | ")} |`)
        .join("\n")}`
    : `${head}\n\n${t("No number assigned yet.", "Noch keine Nummer vergeben.")}`;

  const index = content.indexOf(heading);
  if (index < 0) {
    throw new Error(
      t(
        `${relative(ROOT, LEDGER)} has no section "${heading}".`,
        `In ${relative(ROOT, LEDGER)} fehlt der Abschnitt "${heading}".`
      )
    );
  }
  const rest = content.slice(index + heading.length);
  const nextHeading = rest.search(/^## /m);
  const tail = nextHeading < 0 ? "" : rest.slice(nextHeading);
  writeFileSync(LEDGER, `${content.slice(0, index)}${heading}\n\n${table}\n${tail ? `\n${tail}` : ""}`);
}

/**
 * Was am Nummernkreis nicht stimmt.
 *
 * Drei Dinge machen ihn wertlos: eine Luecke, eine doppelte Nummer und ein
 * Stand im Frontmatter, der hinter der Liste zurueckbleibt. Alle drei fallen
 * hier auf und nicht erst bei der Pruefung.
 */
export function auditLedger(ledger = readLedger()) {
  const problems = [];
  const byYear = new Map();
  for (const row of ledger.rows) {
    const parts = splitNumber(row.Number);
    if (!parts) continue;
    if (!byYear.has(parts.year)) byYear.set(parts.year, []);
    byYear.get(parts.year).push(parts.count);
  }
  for (const [year, counts] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...counts].sort((a, b) => a - b);
    const seen = new Set();
    for (const count of sorted) {
      if (seen.has(count)) problems.push(`${makeNumber(year, count)} steht zweimal in der Liste.`);
      seen.add(count);
    }
    for (let expected = 1; expected <= Math.max(...sorted); expected++) {
      if (!seen.has(expected)) problems.push(`${makeNumber(year, expected)} fehlt, der Kreis hat eine Lücke.`);
    }
  }
  if (ledger.year) {
    const highest = Math.max(0, ...(byYear.get(ledger.year) || []));
    if (highest > ledger.last) {
      problems.push(
        `Im Kopf steht last: ${ledger.last}, in der Liste steht ${makeNumber(ledger.year, highest)}. ` +
          "Der Kopf ist zurückgedreht worden."
      );
    }
  }
  for (const year of byYear.keys()) {
    if (ledger.year && year > ledger.year) {
      problems.push(`Die Liste kennt das Jahr ${year}, im Kopf steht ${ledger.year}.`);
    }
  }
  return problems;
}

/**
 * Die naechste freie Nummer fuer ein Datum. Vergibt nichts, sie sagt nur an.
 *
 * Jedes Jahr faengt bei 0001 an. Zurueck geht es nie: ein Beleg mit einem
 * Datum aus einem Jahr, das schon abgeschlossen ist, bekommt keine Nummer mehr,
 * weil sie sonst hinter einer laengst vergebenen einsortiert wuerde.
 */
export function peekNumber(date, ledger = readLedger()) {
  const year = Number(String(date).slice(0, 4));
  if (!year) {
    throw new Error(
      t(`"${date}" is not a date in the form YYYY-MM-DD.`, `"${date}" ist kein Datum in der Form JJJJ-MM-TT.`)
    );
  }
  const problems = auditLedger(ledger);
  if (problems.length) {
    throw new Error(
      t(
        `The number range in ${relative(ROOT, LEDGER)} is not in order:\n  `,
        `Der Nummernkreis in ${relative(ROOT, LEDGER)} ist nicht in Ordnung:\n  `
      ) +
        problems.join("\n  ") +
        t(
          "\nThat gets corrected by hand, not overwritten.",
          "\nDas wird von Hand berichtigt, nicht überschrieben."
        )
    );
  }
  if (ledger.year && year < ledger.year) {
    throw new Error(
      t(
        `Numbers for ${ledger.year} have already been assigned. An invoice dated ${year} ` +
          "would get a number behind an older one, and the range would no longer be sequential.",
        `Es sind schon Nummern für ${ledger.year} vergeben. Eine Rechnung mit Datum aus ${year} ` +
          "bekäme eine Nummer hinter einer älteren, und der Kreis wäre nicht mehr fortlaufend."
      )
    );
  }
  const count = ledger.year === year ? ledger.last + 1 : 1;
  return { number: makeNumber(year, count), year, count, first: count === 1 };
}

/**
 * Vergibt die naechste Nummer und schreibt sie in den Kreis.
 *
 * Vergeben wird beim Anlegen des Belegs, nicht beim Drucken: sonst haette ein
 * verworfener Entwurf keine Spur, und genau daraus entstehen die Luecken, die
 * ein Betriebspruefer sucht.
 */
export function claimNumber({ date, customer, file }) {
  ensureLedger();
  const ledger = readLedger();
  const next = peekNumber(date, ledger);
  const rows = [
    ...ledger.rows,
    {
      Number: next.number,
      Date: date,
      Customer: customer || "",
      Net: "",
      Gross: "",
      State: "entwurf",
      Reason: "",
      File: file || "",
    },
  ];
  writeRows(rows);
  writeFrontmatter(LEDGER, { year: next.year, last: next.count });
  return next.number;
}

/** Traegt Betraege, Stand oder Datei einer vergebenen Nummer nach. */
export function updateEntry(number, changes) {
  const ledger = readLedger();
  const rows = ledger.rows.map((row) => (row.Number === number ? { ...row, ...changes } : row));
  if (!rows.some((row) => row.Number === number)) {
    throw new Error(
      t(`The number ${number} does not stand in the number range.`, `Die Nummer ${number} steht nicht im Nummernkreis.`)
    );
  }
  writeRows(rows);
}

/** Der Eintrag zu einer Nummer, oder null. */
export function findEntry(number, ledger = readLedger()) {
  return ledger.rows.find((row) => row.Number === number) || null;
}

// --- Der Absender ------------------------------------------------------------

/**
 * Die Anschrift aus business/company.md, zerlegt in Strasse, PLZ und Ort.
 *
 * Das XML braucht die drei einzeln. Steht die Anschrift in einer Zeile, wird
 * an der letzten Komma-Stelle getrennt. Geht das nicht auf, wird nichts
 * geraten: dann bleibt die Zerlegung leer und die Pruefliste sagt es.
 */
export function splitAddress(address) {
  const text = String(address || "").trim();
  if (!text) return { street: "", postcode: "", city: "", ok: false };
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const place = parts[parts.length - 1].match(/^(\d{4,5})\s+(.+)$/);
    if (place) {
      return {
        street: parts.slice(0, -1).join(", "),
        postcode: place[1],
        city: place[2],
        ok: true,
      };
    }
  }
  const inline = text.match(/^(.*?)[,\s]+(\d{4,5})\s+([^,]+)$/);
  if (inline) {
    return { street: inline[1].trim(), postcode: inline[2], city: inline[3].trim(), ok: true };
  }
  return { street: text, postcode: "", city: "", ok: false };
}

/** Der Absender der Rechnung: der Partner, nie Arasul. */
export function readSeller() {
  const { fields, exists } = readFrontmatter(join(BUSINESS, "company.md"));
  const address = splitAddress(fields.address);
  return {
    exists,
    legal_name: fields.legal_name || "",
    address: fields.address || "",
    street: address.street,
    postcode: address.postcode,
    city: address.city,
    address_ok: address.ok,
    country: (fields.country || "DE").toUpperCase(),
    phone: fields.phone || "",
    email: fields.email || "",
    website: fields.website || "",
    tax_number: fields.tax_number || "",
    vat_id: fields.vat_id || "",
    iban: fields.iban || "",
    payment_terms: fields.payment_terms || "",
  };
}

// --- Der Beleg ---------------------------------------------------------------

/** Ueberschrift, unter der die Positionen stehen. */
const POSITIONS_HEADING = "Leistungen";

/** Spaltennamen der Positionstabelle, klein und ohne Zusatz. */
const COLUMN_KEYS = {
  pos: "pos",
  position: "pos",
  leistung: "text",
  bezeichnung: "text",
  menge: "quantity",
  einheit: "unit",
  einzelpreisnetto: "price",
  einzelpreis: "price",
  gesamtnetto: "total",
  gesamt: "total",
  steuersatz: "rate",
  ust: "rate",
};

const key = (head) =>
  COLUMN_KEYS[
    head
      .toLowerCase()
      .replace(/[^a-zäöüß]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
  ] || null;

/**
 * Die Positionstabelle unter einer Ueberschrift lesen.
 *
 * Gelesen wird die Tabelle, die im Papier steht. Damit kann das XML gar nicht
 * etwas anderes sagen als das gedruckte Blatt.
 */
export function parsePositions(markdown, heading = POSITIONS_HEADING) {
  const section = markdown
    .split(/^#{2,3} /m)
    .find((part) => part.toLowerCase().startsWith(heading.toLowerCase()));
  if (!section) return { rows: [], found: false };

  const lines = section.split(/\r?\n/).filter((line) => /^\s*\|/.test(line));
  if (lines.length < 2) return { rows: [], found: false };

  const cells = (line) =>
    line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
  const head = cells(lines[0]).map(key);
  const rows = [];
  for (const line of lines.slice(1)) {
    const values = cells(line);
    if (values.every((value) => /^[-:\s]*$/.test(value))) continue;
    const row = {};
    head.forEach((name, index) => {
      if (name) row[name] = values[index] ?? "";
    });
    // Die Summenzeile traegt keine Position und keine Menge, nur einen Betrag.
    const isSum = /summe|gesamtbetrag|zwischensumme/i.test(values.join(" ")) && !row.quantity;
    if (isSum) continue;
    if (!row.text) continue;
    rows.push(row);
  }
  return { rows, found: true };
}

/**
 * Aus den Tabellenzeilen werden gerechnete Positionen.
 *
 * Gerechnet wird immer neu: Menge mal Einzelpreis. Was in der Spalte "Gesamt"
 * steht, wird damit verglichen und nicht uebernommen. Eine Rechnung, in der
 * beides auseinanderlaeuft, ist falsch, egal welche der beiden Zahlen stimmt.
 */
export function computePositions(rows, defaultRate) {
  const positions = [];
  const problems = [];
  rows.forEach((row, index) => {
    const line = index + 1;
    const quantity = parseQuantity(row.quantity);
    const price = parseAmount(row.price);
    const rate = row.rate === undefined || String(row.rate).trim() === "" ? defaultRate : parseRate(row.rate);
    const text = (row.text || "").trim();

    if (quantity === null) problems.push(`Position ${line} hat keine lesbare Menge ("${row.quantity ?? ""}").`);
    if (price === null) problems.push(`Position ${line} hat keinen lesbaren Einzelpreis ("${row.price ?? ""}").`);
    if (rate === null || rate === undefined) problems.push(`Position ${line} hat keinen lesbaren Steuersatz.`);
    if (!text) problems.push(`Position ${line} hat keine Bezeichnung.`);
    const ok = quantity !== null && price !== null && Boolean(text);
    const total = ok ? roundCents(quantity * price) : null;
    const written = parseAmount(row.total);
    if (ok && written !== null && written !== total) {
      problems.push(
        `Position ${line}: in der Spalte Gesamt steht ${formatAmount(written)}, ` +
          `gerechnet ergibt ${formatQuantity(quantity)} mal ${formatAmount(price)} aber ${formatAmount(total)}.`
      );
    }
    // Auch eine unlesbare Zeile bleibt stehen. Sonst verschwaende sie aus dem
    // Beleg, und der Mensch saehe nicht, welche Zeile er noch fuellen muss.
    positions.push({
      line,
      text: text || (row.text || "").trim(),
      quantity,
      unit: (row.unit || "").trim(),
      price,
      rate: rate ?? 0,
      total,
      ok,
      raw: row,
    });
  });
  return { positions, problems };
}

/**
 * Die Steueraufstellung, je Steuersatz eine Zeile.
 *
 * Gerechnet wird je Gruppe auf die Summe, nicht je Zeile: sonst weicht die
 * Steuer bei vielen Positionen um Cents von der ab, die das Finanzamt rechnet.
 */
export function taxBreakdown(positions, mode) {
  const groups = new Map();
  for (const position of positions.filter((position) => position.ok)) {
    const rate = mode === "standard" ? position.rate : 0;
    if (!groups.has(rate)) groups.set(rate, { rate, basis: 0, tax: 0 });
    groups.get(rate).basis += position.total;
  }
  const category = { standard: "S", kleinunternehmer: "E", reverse_charge: "AE" }[mode] || "S";
  return [...groups.values()]
    .sort((a, b) => b.rate - a.rate)
    .map((group) => ({
      ...group,
      category: mode === "standard" && group.rate === 0 ? "Z" : category,
      tax: mode === "standard" ? roundCents((group.basis * group.rate) / 100) : 0,
      reason: mode === "standard" ? "" : EXEMPTION[mode] || "",
    }));
}

/** Die Summen unter der Tabelle. */
export function totals(positions, mode) {
  const taxes = taxBreakdown(positions, mode);
  const net = positions.filter((position) => position.ok).reduce((sum, position) => sum + position.total, 0);
  const tax = taxes.reduce((sum, group) => sum + group.tax, 0);
  return { net, tax, gross: net + tax, taxes };
}

/**
 * Einen Rechnungsbeleg lesen: Kopf, Positionen, Summen.
 *
 * Das Ergebnis ist die Grundlage fuer die Pruefliste und fuer das XML. Beide
 * sehen damit dasselbe Blatt.
 */
export function readInvoice(path) {
  if (!existsSync(path)) throw new Error(t(`${path} does not exist.`, `${path} gibt es nicht.`));
  const raw = readFileSync(path, "utf8");
  const { fields } = readFrontmatter(path);
  const mode = fields.tax_mode || "standard";
  if (!TAX_MODES[mode]) {
    throw new Error(
      t(
        `The tool does not know tax_mode "${mode}". There is: ${Object.keys(TAX_MODES).join(", ")}.`,
        `tax_mode "${mode}" kennt das Werkzeug nicht. Es gibt: ${Object.keys(TAX_MODES).join(", ")}.`
      )
    );
  }
  const defaultRate = fields.tax_rate === undefined || fields.tax_rate === "" ? null : parseQuantity(fields.tax_rate);
  const table = parsePositions(raw);
  const computed = computePositions(table.rows, mode === "standard" ? defaultRate : 0);
  const sums = totals(computed.positions, mode);

  return {
    path,
    file: relative(ROOT, path),
    raw,
    fields,
    mode,
    rate: defaultRate,
    positions: computed.positions,
    problems: [...(table.found ? [] : ["Im Beleg steht keine Tabelle unter der Ueberschrift \"Leistungen\"."]), ...computed.problems],
    ...sums,
  };
}

// --- Pflichtangaben nach § 14 UStG -------------------------------------------

/** Steht im Text noch ein ungefuellter Platzhalter? */
function placeholders(raw) {
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/<!--[\s\S]*?-->/g, "");
  return [...body.matchAll(/\{[^{}]+\}/g)].map((match) => match[0].replace(/\s+/g, " "));
}

/**
 * Die Pflichtangaben nach § 14 Abs. 4 UStG, als Liste mit Urteil.
 *
 * Eine Rechnung, der eine dieser Angaben fehlt, berechtigt den Kunden nicht zum
 * Vorsteuerabzug. Das faellt bei ihm auf, nicht beim Partner, und dann ist es
 * peinlich und teuer zugleich. Darum wird die Liste vor dem Druck rot, nicht
 * danach.
 *
 * Zurueck kommt je Punkt: der Paragraf, worum es geht, und was fehlt.
 */
export function checkVat14(invoice, seller = readSeller(), ledger = readLedger()) {
  const checks = [];
  const add = (nr, label, ok, hint = "") => checks.push({ nr, label, ok, hint });
  const f = invoice.fields;
  const has = (value) => Boolean(String(value || "").trim());

  add(
    "§ 14 Abs. 4 Nr. 1",
    "Vollstaendiger Name und Anschrift des leistenden Unternehmers",
    has(seller.legal_name) && has(seller.address),
    !has(seller.legal_name)
      ? "legal_name fehlt in business/company.md"
      : !has(seller.address)
        ? "address fehlt in business/company.md"
        : ""
  );
  add(
    "§ 14 Abs. 4 Nr. 1",
    "Vollstaendiger Name und Anschrift des Leistungsempfaengers",
    has(f.buyer_name) && has(f.buyer_street) && has(f.buyer_postcode) && has(f.buyer_city),
    [
      has(f.buyer_name) ? "" : "buyer_name",
      has(f.buyer_street) ? "" : "buyer_street",
      has(f.buyer_postcode) ? "" : "buyer_postcode",
      has(f.buyer_city) ? "" : "buyer_city",
    ]
      .filter(Boolean)
      .join(", ") + " fehlt im Kopf des Belegs"
  );
  add(
    "§ 14 Abs. 4 Nr. 2",
    "Steuernummer oder Umsatzsteuer-Identifikationsnummer des Leistenden",
    has(seller.tax_number) || has(seller.vat_id),
    "weder tax_number noch vat_id in business/company.md"
  );
  add(
    "§ 14 Abs. 4 Nr. 3",
    "Ausstellungsdatum",
    isDate(f.invoice_date),
    `invoice_date ist "${f.invoice_date || ""}", erwartet wird JJJJ-MM-TT`
  );

  const parts = splitNumber(f.invoice_number);
  const entry = parts ? findEntry(f.invoice_number, ledger) : null;
  add(
    "§ 14 Abs. 4 Nr. 4",
    "Fortlaufende, einmalig vergebene Rechnungsnummer",
    Boolean(parts && entry),
    !parts
      ? `invoice_number ist "${f.invoice_number || ""}", erwartet wird JJJJ-NNNN`
      : `${f.invoice_number} steht nicht im Nummernkreis unter ${relative(ROOT, LEDGER)}`
  );

  const named = invoice.positions.filter(
    (position) => position.ok && position.text.length >= 3 && !/\{.*\}/.test(position.text)
  );
  add(
    "§ 14 Abs. 4 Nr. 5",
    "Menge und Art der Lieferung oder Umfang und Art der Leistung",
    invoice.positions.length > 0 && named.length === invoice.positions.length,
    invoice.positions.length === 0
      ? "der Beleg hat keine Position"
      : `${invoice.positions.length - named.length} Position(en) ohne lesbare Menge, Preis oder Bezeichnung`
  );
  add(
    "§ 14 Abs. 4 Nr. 6",
    "Zeitpunkt der Lieferung oder Leistung",
    isDate(f.service_date) || (isDate(f.service_from) && isDate(f.service_to)),
    "weder service_date noch service_from und service_to sind gesetzt. " +
      "Der Zeitpunkt darf nicht mit dem Rechnungsdatum verwechselt werden"
  );
  add(
    "§ 14 Abs. 4 Nr. 7",
    "Entgelt, aufgeschluesselt nach Steuersaetzen",
    invoice.positions.length > 0 && invoice.taxes.length > 0 && invoice.problems.length === 0,
    invoice.problems.length ? invoice.problems.join(" ") : "es gibt keine Entgeltzeile"
  );

  if (invoice.mode === "standard") {
    const rated = invoice.taxes.every((group) => group.rate > 0);
    add(
      "§ 14 Abs. 4 Nr. 8",
      "Steuersatz und darauf entfallender Steuerbetrag",
      rated && invoice.tax > 0,
      "es ist kein Steuersatz groesser null ausgewiesen. Wer nicht der Regelbesteuerung " +
        "unterliegt, setzt tax_mode auf kleinunternehmer oder reverse_charge"
    );
  } else {
    const text = EXEMPTION[invoice.mode];
    const anchor = invoice.mode === "kleinunternehmer" ? /§\s*19\s*UStG/ : /§\s*13b\s*UStG|[Rr]everse.[Cc]harge/;
    add(
      "§ 14 Abs. 4 Nr. 8",
      "Hinweis auf die Steuerbefreiung statt Steuerausweis",
      anchor.test(invoice.raw) && invoice.tax === 0,
      invoice.tax !== 0
        ? "es ist trotz Steuerbefreiung ein Steuerbetrag ausgewiesen"
        : `im Text des Belegs fehlt der Hinweis: "${text}"`
    );
  }

  add(
    "Zahlungsziel",
    "Faelligkeit steht auf dem Beleg",
    isDate(f.due_date) && new RegExp(f.due_date || "\\0").test(invoice.raw),
    isDate(f.due_date)
      ? `das Faelligkeitsdatum ${f.due_date} steht nicht im Text des Belegs`
      : "due_date fehlt im Kopf des Belegs"
  );

  const open = placeholders(invoice.raw);
  add(
    "Vor dem Druck",
    "Kein ungefuellter Platzhalter im Text",
    open.length === 0,
    open.length ? `noch offen: ${open.slice(0, 4).join(", ")}` : ""
  );

  return checks;
}
