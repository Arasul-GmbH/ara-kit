#!/usr/bin/env node
/**
 * Die Rechnung: Nummer vergeben, Beleg anlegen, Pflichtangaben pruefen, drucken.
 *
 * Was am Ende beim Kunden liegt, ist ein PDF mit der Rechnung als Blatt fuer den
 * Menschen und denselben Zahlen als angehaengte Datei fuer seine Buchhaltung.
 * Das ist ZUGFeRD, und seit 2025 muss jedes Unternehmen in Deutschland eine
 * solche Rechnung empfangen koennen.
 *
 *   node .ara/tools/invoice.mjs                              Nummernkreis und offene Belege
 *   node .ara/tools/invoice.mjs --customer <kunde>           die Rechnungen eines Kunden
 *   node .ara/tools/invoice.mjs --customer <kunde> --new     Beleg anlegen, Nummer vergeben
 *       --from-offer <datei>     Positionen aus einem Angebot uebernehmen
 *       --position "Text|Menge|Einheit|Einzelpreis"   eine Position, mehrfach erlaubt
 *       --empty                  ohne Positionen, eine Zeile zum Ausfuellen
 *       --date --service-date --service-from --service-to --due --terms
 *       --tax-rate --tax-mode <standard|kleinunternehmer|reverse_charge>
 *   node .ara/tools/invoice.mjs --check <beleg.md>           Pflichtangaben nach § 14 UStG
 *   node .ara/tools/invoice.mjs --xml <beleg.md>             nur die Rechnungsdaten schreiben
 *   node .ara/tools/invoice.mjs --pdf <beleg.md>             drucken, XML anhaengen, eintragen
 *   node .ara/tools/invoice.mjs --validate <datei.pdf|.xml>  eine fertige Rechnung pruefen
 *   node .ara/tools/invoice.mjs --void <nummer> --reason "…" eine Nummer stornieren
 *
 * **Die Nummer wird beim Anlegen vergeben, nicht beim Drucken.** Ein verworfener
 * Entwurf hinterlaesst damit eine Spur, und genau deshalb bekommt der Kreis
 * keine Luecke. Wer einen Beleg verwirft, storniert seine Nummer, statt sie zu
 * loeschen.
 *
 * Es geht nichts nach draussen: kein Dienst, kein Portal, kein Versand. Was
 * verschickt wird, entscheidet der Mensch.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import {
  ROOT,
  customerPath,
  ensureDir,
  fail,
  listCustomers,
  parseArgs,
  readFrontmatter,
  today,
} from "./lib/kit.mjs";
import {
  EXEMPTION,
  LEDGER,
  STATES,
  TAX_MODES,
  addDays,
  auditLedger,
  checkVat14,
  claimNumber,
  computePositions,
  findEntry,
  formatAmount,
  formatQuantity,
  formatRate,
  isDate,
  parsePositions,
  peekNumber,
  readInvoice,
  readLedger,
  readSeller,
  splitNumber,
  totals,
  updateEntry,
} from "./lib/invoice.mjs";
import { PROFILE, UNCHECKED, buildXml, validateXml } from "./lib/zugferd.mjs";
import { embed, inspect } from "./lib/pdfa.mjs";

const arg = parseArgs();

// Schalter, hinter denen eine Datei steht. Steht die Datei woanders in der
// Zeile, landet sie sonst als Wert am falschen Schalter.
for (const flag of ["check", "xml", "pdf", "validate"]) {
  if (arg[flag] === true && arg._.length) arg[flag] = arg._.shift();
}

const str = (value) => (typeof value === "string" ? value : null);

/** parseArgs behaelt nur den letzten Wert. Positionen kommen aber mehrfach. */
const positionArgs = process.argv
  .slice(2)
  .filter((value, index, all) => index > 0 && all[index - 1] === "--position" && !value.startsWith("--"));

// --- Eine Nummer stornieren --------------------------------------------------

if (arg.void) {
  const number = str(arg.void);
  if (!number || !splitNumber(number)) fail(`"${arg.void}" ist keine Rechnungsnummer in der Form JJJJ-NNNN.`);
  const entry = findEntry(number);
  if (!entry) fail(`Die Nummer ${number} steht nicht im Nummernkreis.`);
  const reason = str(arg.reason);
  if (!reason) fail('Zum Stornieren gehoert ein Grund: --reason "…".');
  updateEntry(number, { Stand: "storniert", Grund: reason });
  console.log(
    `${number} steht jetzt als storniert im Nummernkreis. Die Nummer bleibt vergeben, ` +
      "sonst haette der Kreis eine Luecke." +
      (entry.Stand === "gestellt"
        ? "\n\nAchtung: dieser Beleg war schon gedruckt. War er beim Kunden, genuegt der " +
          "Vermerk hier nicht. Dann braucht es eine Stornorechnung mit eigener Nummer, und die " +
          "schreibt das Kit nicht. Das laeuft ueber die Buchhaltung."
        : "")
  );
  process.exit(0);
}

// --- Einen Beleg anlegen -----------------------------------------------------

if (arg.new) {
  const customer = str(arg.customer);
  if (!customer) fail("Zum Anlegen brauche ich --customer <kunde>.");
  const dir = customerPath(customer);
  if (!existsSync(join(dir, "customer.md"))) {
    const known = listCustomers();
    fail(
      `Den Kunden "${customer}" gibt es nicht.` +
        (known.length ? ` Vorhanden: ${known.join(", ")}.` : " Es ist noch kein Kunde angelegt.")
    );
  }

  const seller = readSeller();
  if (!seller.exists) {
    fail(
      "business/company.md fehlt. Ohne Firmenkopf gibt es keinen Absender und ohne Absender " +
        "keine Rechnung. Anlegen mit /init."
    );
  }

  const date = str(arg.date) || today();
  if (!isDate(date)) fail(`--date "${arg.date}" ist kein Datum in der Form JJJJ-MM-TT.`);
  const mode = str(arg["tax-mode"]) || "standard";
  if (!TAX_MODES[mode]) fail(`--tax-mode kennt nur ${Object.keys(TAX_MODES).join(", ")}.`);
  const rate = mode === "standard" ? Number(str(arg["tax-rate"]) ?? "19") : 0;
  if (!Number.isFinite(rate)) fail(`--tax-rate "${arg["tax-rate"]}" ist keine Zahl.`);
  const terms = Number(str(arg.terms) ?? seller.payment_terms ?? "14");
  const due = str(arg.due) || (Number.isFinite(terms) ? addDays(date, terms) : "");
  const period = servicePeriod(date);

  const source = positionSource(dir);
  const computed = computePositions(source.rows, rate);
  const sums = totals(computed.positions, mode);
  const buyer = readFrontmatter(join(dir, "customer.md")).fields;

  let number;
  try {
    number = claimNumber({ date, customer, file: "" });
  } catch (error) {
    fail(error.message);
  }
  // Eine von Hand angelegte Akte hat den Ordner nicht immer.
  const file = join(ensureDir(join(dir, "documents")), `${date}-rechnung-${number}.md`);
  writeFileSync(
    file,
    render({ number, date, due, period, mode, rate, seller, buyer, customer, positions: computed.positions, sums })
  );
  // Ab hier zaehlt der geschriebene Beleg, nicht die Rechnung von eben. Der
  // Nummernkreis fuehrt damit dieselben Betraege, die im Papier stehen.
  const written = readInvoice(file);
  updateEntry(number, {
    Netto: formatAmount(written.net),
    Brutto: formatAmount(written.gross),
    Datei: relative(ROOT, file),
  });

  const checks = checkVat14(written, seller);
  const open = checks.filter((check) => !check.ok);
  const lines = [
    `Rechnung ${number} angelegt: ${relative(ROOT, file)}`,
    `${written.positions.length} Position${written.positions.length === 1 ? "" : "en"} aus ${source.origin}, ` +
      `netto ${formatAmount(written.net)} Euro, brutto ${formatAmount(written.gross)} Euro.`,
    `Die Nummer steht im Nummernkreis unter ${relative(ROOT, LEDGER)}, Stand entwurf.`,
  ];
  if (computed.problems.length) {
    lines.push("", "An den Positionen nicht lesbar:", ...computed.problems.map((problem) => `  ${problem}`));
  }
  if (open.length) {
    lines.push(
      "",
      `${open.length} von ${checks.length} Pflichtangaben fehlen noch:`,
      ...open.map((check) => `  ${check.label}: ${check.hint}`),
      "",
      `Fuellen, dann: node .ara/tools/invoice.mjs --check ${relative(ROOT, file)}`
    );
  } else {
    lines.push("", `Alle Pflichtangaben stehen. Drucken mit: node .ara/tools/invoice.mjs --pdf ${relative(ROOT, file)}`);
  }
  console.log(lines.join("\n"));
  process.exit(0);
}

// --- Eine fertige Rechnung pruefen -------------------------------------------

if (str(arg.validate)) {
  const path = resolve(str(arg.validate));
  if (!existsSync(path)) fail(`${arg.validate} gibt es nicht.`);
  const content = readFileSync(path);
  let xml;
  if (content.subarray(0, 5).toString("latin1") === "%PDF-") {
    const state = inspect(content);
    if (!state.attachment) fail(`In ${basename(path)} steckt keine angehaengte Rechnungsdatei.`);
    xml = state.attachment.xml;
    console.log(
      `Anhang: ${state.attachment.name}, Beziehung ${state.attachment.relationship || "nicht gesetzt"}, ` +
        `${Buffer.byteLength(xml)} Byte.\n` +
        `Kennzeichnung: ${state.header}, PDF/A-3B ${state.pdfa ? "gesetzt" : "fehlt"}, ` +
        `Ausgabeprofil ${state.outputIntent ? "vorhanden" : "fehlt"}, ` +
        `Verweis /AF ${state.associated ? "vorhanden" : "fehlt"}, ` +
        `Factur-X-Metadaten ${state.facturx ? "vorhanden" : "fehlen"}.`
    );
  } else {
    xml = content.toString("utf8");
  }
  const result = validateXml(xml);
  report(result, Boolean(arg.json));
  process.exit(result.ok ? 0 : 1);
}

// --- Uebersicht --------------------------------------------------------------

const target = str(arg.check) || str(arg.xml) || str(arg.pdf);
if (!target) {
  survey();
  process.exit(0);
}

// --- Einen Beleg lesen -------------------------------------------------------

const path = resolve(target);
if (!existsSync(path)) fail(`${target} gibt es nicht.`);

const seller = readSeller();
let invoice;
try {
  invoice = readInvoice(path);
} catch (error) {
  fail(error.message);
}
const checks = checkVat14(invoice, seller);
const failed = checks.filter((check) => !check.ok);

if (str(arg.check)) {
  if (arg.json) {
    console.log(
      JSON.stringify(
        { file: invoice.file, checks, positions: invoice.positions, net: invoice.net, tax: invoice.tax, gross: invoice.gross },
        null,
        2
      )
    );
    process.exit(failed.length ? 1 : 0);
  }
  console.log(`# Pflichtangaben nach § 14 UStG: ${basename(path)}\n`);
  for (const check of checks) {
    console.log(
      `${check.ok ? "ok  " : "FEHL"} ${check.nr}  ${check.label}` +
        (check.ok || !check.hint ? "" : `\n     ${check.hint}`)
    );
  }
  console.log(
    `\nNetto ${formatAmount(invoice.net)} Euro, Steuer ${formatAmount(invoice.tax)} Euro, ` +
      `brutto ${formatAmount(invoice.gross)} Euro. ${TAX_MODES[invoice.mode]}.`
  );
  if (failed.length) {
    console.log(
      `\n${failed.length} von ${checks.length} Angaben fehlen. Solange eine fehlt, berechtigt die ` +
        "Rechnung den Kunden nicht zum Vorsteuerabzug. Gedruckt wird so nicht."
    );
    process.exit(1);
  }
  const result = validateXml(buildXml(invoice, seller));
  report(result, false);
  process.exit(result.ok ? 0 : 1);
}

const xml = buildXml(invoice, seller);

if (str(arg.xml)) {
  const out = resolve(str(arg.out) || path.replace(/\.md$/, ".xml"));
  writeFileSync(out, xml);
  console.log(`Rechnungsdaten geschrieben: ${relative(ROOT, out)}`);
  report(validateXml(xml), Boolean(arg.json));
  process.exit(0);
}

// --- Drucken -----------------------------------------------------------------

if (failed.length && !arg.force) {
  console.error(`# Pflichtangaben nach § 14 UStG: ${basename(path)}\n`);
  for (const check of failed) console.error(`FEHL ${check.nr}  ${check.label}\n     ${check.hint}`);
  console.error(
    `\n${failed.length} von ${checks.length} Angaben fehlen, darum wird nicht gedruckt. Eine Rechnung ` +
      "ohne sie berechtigt den Kunden nicht zum Vorsteuerabzug.\n" +
      "Wer es trotzdem will und die Folge kennt: --force."
  );
  process.exit(1);
}
if (failed.length) {
  console.error(`--force gesetzt, es wird trotz ${failed.length} fehlender Pflichtangaben gedruckt.\n`);
}

const validation = validateXml(xml);
if (!validation.ok) {
  console.error("Die Rechnungsdaten sind nicht in Ordnung, es wird nicht gedruckt:");
  for (const problem of validation.problems) console.error(`  ${problem}`);
  process.exit(1);
}

const out = resolve(str(arg.out) || path.replace(/\.md$/, ".pdf"));
const print = spawnSync(
  "node",
  [
    join(ROOT, ".ara", "tools", "pdf.mjs"),
    path,
    "--out",
    out,
    "--title",
    `Rechnung ${invoice.fields.invoice_number || ""}`.trim(),
  ],
  { encoding: "utf8" }
);
if (print.status !== 0) {
  console.error(print.stdout || "");
  console.error(print.stderr || "Das Drucken ist fehlgeschlagen.");
  process.exit(1);
}

writeFileSync(
  out,
  embed(readFileSync(out), {
    xml,
    attachment: PROFILE.attachment,
    profile: PROFILE.name,
    description: `Rechnung ${invoice.fields.invoice_number} als Datensatz nach EN 16931`,
    author: seller.legal_name,
  })
);

// Der Erzeugung wird nicht geglaubt: das XML wird aus dem fertigen PDF wieder
// herausgeholt und noch einmal geprueft.
const state = inspect(readFileSync(out));
if (!state.attachment || state.attachment.xml.trim() !== xml.trim()) {
  fail(`Das PDF ist geschrieben, aber der Anhang liest sich nicht zurueck: ${relative(ROOT, out)}`);
}
const again = validateXml(state.attachment.xml);
if (!again.ok) {
  console.error("Der Anhang im fertigen PDF ist nicht in Ordnung:");
  for (const problem of again.problems) console.error(`  ${problem}`);
  process.exit(1);
}

const number = invoice.fields.invoice_number;
if (number && findEntry(number)) {
  updateEntry(number, {
    Stand: "gestellt",
    Netto: formatAmount(invoice.net),
    Brutto: formatAmount(invoice.gross),
    Datei: relative(ROOT, path),
  });
}

console.log(
  [
    `PDF geschrieben: ${relative(ROOT, out)}`,
    `Angehaengt: ${state.attachment.name}, ${Buffer.byteLength(state.attachment.xml)} Byte, ` +
      `Profil ${PROFILE.name}, zurueckgelesen und geprueft.`,
    `Kennzeichnung: ${state.header}, PDF/A-3B ${state.pdfa ? "gesetzt" : "fehlt"}, ` +
      `Ausgabeprofil ${state.outputIntent ? "vorhanden" : "fehlt"}.`,
    ...(number && findEntry(number) ? [`Im Nummernkreis steht ${number} jetzt als gestellt.`] : []),
    "",
    "Ungeprueft bleibt:",
    ...UNCHECKED.map((line) => `  ${line}`),
    "",
    "Verschickt wird nichts. Das entscheidet der Mensch.",
  ].join("\n")
);
process.exit(0);

// --- Bausteine ---------------------------------------------------------------

/** Was in der Uebersicht steht: Nummernkreis, Belege, was ansteht. */
function survey() {
  const customer = str(arg.customer);
  const ledger = readLedger();
  const problems = auditLedger(ledger);
  const rows = customer ? ledger.rows.filter((row) => row.Kunde.startsWith(customer)) : ledger.rows;

  if (arg.json) {
    console.log(JSON.stringify({ ...ledger, rows, problems }, null, 2));
    return;
  }
  if (!ledger.exists) {
    console.log(
      "Es gibt noch keinen Nummernkreis. Die erste Rechnung legt ihn an:\n" +
        "    node .ara/tools/invoice.mjs --customer <kunde> --new"
    );
    return;
  }
  console.log(
    `Nummernkreis ${ledger.format}, Jahr ${ledger.year || "noch keins"}, zuletzt vergeben ` +
      `${ledger.last || "keine"}. Naechste waere ${nextNumber(ledger)}.`
  );
  if (!rows.length) {
    console.log(customer ? `Fuer "${customer}" ist noch keine Nummer vergeben.` : "Noch keine Nummer vergeben.");
  }
  for (const row of rows.slice(-20)) {
    console.log(
      `${row.Nummer}  ${row.Datum}  ${row.Kunde.padEnd(24)} ${String(row.Brutto).padStart(12)} Euro  ` +
        `${row.Stand}${STATES[row.Stand] ? ` (${STATES[row.Stand]})` : ""}`
    );
  }
  if (problems.length) {
    console.log("\nAm Nummernkreis stimmt etwas nicht:");
    for (const problem of problems) console.log(`  ${problem}`);
  }
  const drafts = rows.filter((row) => row.Stand === "entwurf");
  if (drafts.length) {
    console.log(
      `\n${drafts.length} Beleg${drafts.length === 1 ? "" : "e"} noch nicht gedruckt: ` +
        drafts.map((row) => row.Nummer).join(", ")
    );
  }
}

/** Die naechste Nummer, oder warum es keine gibt. */
function nextNumber(ledger) {
  try {
    return peekNumber(today(), ledger).number;
  } catch {
    return "nicht bestimmbar";
  }
}

/** Woher die Positionen kommen: Angebot, Kommandozeile, oder gar nicht. */
function positionSource(dir) {
  if (positionArgs.length) {
    return {
      origin: "der Kommandozeile",
      rows: positionArgs.map((text) => {
        const [name, quantity, unit, price, rate] = text.split("|").map((part) => part.trim());
        return { text: name, quantity: quantity || "1", unit: unit || "", price: price || "", rate: rate ?? "" };
      }),
    };
  }
  const explicit = str(arg["from-offer"]);
  let offer = explicit ? resolve(explicit) : null;
  if (!offer && !arg.empty) {
    const documents = join(dir, "documents");
    const candidates = existsSync(documents)
      ? readdirSync(documents).filter((name) => /angebot.*\.md$/i.test(name)).sort()
      : [];
    if (candidates.length) offer = join(documents, candidates[candidates.length - 1]);
  }
  if (offer) {
    if (!existsSync(offer)) fail(`${explicit} gibt es nicht.`);
    const found = parsePositions(readFileSync(offer, "utf8"));
    if (!found.found) {
      fail(
        `In ${relative(ROOT, offer)} steht keine Tabelle unter "Leistungen". Positionen dann einzeln ` +
          'angeben: --position "Text|Menge|Einheit|Einzelpreis".'
      );
    }
    return { origin: relative(ROOT, offer), rows: found.rows };
  }
  return {
    origin: "keiner Quelle, eine Zeile zum Ausfuellen",
    rows: [{ text: "{Was geleistet wurde}", quantity: "1", unit: "", price: "{Betrag}", rate: "" }],
  };
}

/** Der Leistungszeitpunkt aus den Argumenten: ein Tag oder ein Zeitraum. */
function servicePeriod(date) {
  const from = str(arg["service-from"]) || "";
  const to = str(arg["service-to"]) || "";
  const single = str(arg["service-date"]) || (from || to ? "" : date);
  for (const [name, value] of [["--service-date", single], ["--service-from", from], ["--service-to", to]]) {
    if (value && !isDate(value)) fail(`${name} "${value}" ist kein Datum in der Form JJJJ-MM-TT.`);
  }
  if (from && to) return { date: "", from, to, text: `${from} bis ${to}` };
  return { date: single, from: "", to: "", text: single };
}

/** Aus der Vorlage wird der Beleg. Was fehlt, bleibt als Platzhalter stehen. */
function render({ number, date, due, period, mode, rate, seller, buyer, customer, positions, sums }) {
  const template = readFileSync(join(ROOT, ".ara", "vorlagen", "rechnung.md"), "utf8");

  // Die Spalte Steuersatz steht nur da, wo es mehr als einen gibt. Sie muss dann
  // stehen: gelesen wird spaeter dieselbe Tabelle, und ohne die Spalte fiele
  // jede Zeile auf den Satz aus dem Kopf zurueck. Dann rechnete der Beleg etwas
  // anderes als das, was beim Anlegen gerechnet wurde.
  const rates = [...new Set(positions.filter((position) => position.ok).map((position) => position.rate))];
  const withRate = mode === "standard" && rates.length > 1;
  const head = [
    "Pos",
    "Leistung",
    "Menge",
    "Einheit",
    "Einzelpreis netto",
    ...(withRate ? ["Steuersatz"] : []),
    "Gesamt netto",
  ];
  const row = (cells) => `| ${cells.join(" | ")} |`;
  const table = [
    row(head),
    row(head.map(() => "---")),
    ...positions.map((position) =>
      position.ok
        ? row([
            position.line,
            position.text,
            formatQuantity(position.quantity),
            position.unit || "Stueck",
            `${formatAmount(position.price)} Euro`,
            ...(withRate ? [`${formatRate(position.rate)} Prozent`] : []),
            `${formatAmount(position.total)} Euro`,
          ])
        : row([
            position.line,
            position.text,
            position.raw.quantity ?? "",
            position.raw.unit || "Stueck",
            position.raw.price ?? "",
            ...(withRate ? [position.raw.rate ?? ""] : []),
            position.raw.total ?? "",
          ])
    ),
    row(["", "**Summe netto**", ...head.slice(2, -1).map(() => ""), `**${formatAmount(sums.net)} Euro**`]),
  ].join("\n");

  const values = {
    invoice_number: number,
    invoice_date: date,
    due_date: due,
    service_period: period.text,
    seller_legal_name: seller.legal_name,
    seller_address: seller.address,
    seller_contact_line: [seller.phone, seller.email, seller.website].filter(Boolean).join(" · "),
    seller_tax_line: seller.vat_id
      ? `USt-IdNr. ${seller.vat_id}`
      : seller.tax_number
        ? `Steuernummer ${seller.tax_number}`
        : "",
    seller_iban: seller.iban,
    buyer_name: buyer.legal_name || "",
    buyer_contact: buyer.contact_person || "",
    buyer_street: buyer.street || "",
    buyer_place: [buyer.postcode, buyer.city].filter(Boolean).join(" "),
    positions: table,
    tax_lines:
      mode === "standard"
        ? sums.taxes
            .map(
              (group) =>
                `Umsatzsteuer ${formatRate(group.rate)} Prozent auf ${formatAmount(group.basis)} Euro: ` +
                `**${formatAmount(group.tax)} Euro**`
            )
            .join("\\\n")
        : "",
    total_line: `**Rechnungsbetrag: ${formatAmount(sums.gross)} Euro**`,
    tax_note: mode === "standard" ? "" : EXEMPTION[mode],
    payment_note: due ? `Zahlbar ohne Abzug bis zum ${due}.` : "",
    closing: seller.legal_name,
  };

  // Was leer bleiben darf, verschwindet mit seiner Zeile. Was fehlen wuerde,
  // bleibt als Platzhalter stehen: dann haelt pdf.mjs den Druck an, und die
  // Pruefliste sagt, was fehlt. Jeder dieser Namen steht in der Vorlage allein
  // auf seiner Zeile, sonst risse das Loeschen den Nachbarn mit.
  const optional = new Set(["seller_contact_line", "seller_iban", "buyer_contact", "tax_lines", "tax_note"]);
  const DROP = "<!-- weggefallen -->";
  // Der Hinweisblock der Vorlage richtet sich an den, der sie benutzt, nicht
  // an den Kunden. Im fertigen Beleg hat er nichts zu suchen.
  let body = template.replace(/^(?:>[^\n]*\n|[ \t]*\n)*---[ \t]*\n/, "");
  for (const [token, value] of Object.entries(values)) {
    if (value) {
      // Ersetzt wird ueber eine Funktion: ein Dollarzeichen im Text einer
      // Position waere sonst eine Ersetzungsanweisung und nicht der Text.
      body = body.replaceAll(`{${token}}`, () => value);
    } else if (optional.has(token)) {
      body = body.replace(new RegExp(`^.*\\{${token}\\}.*$`, "gm"), DROP);
    }
  }
  body = body
    .split("\n")
    .filter((line) => line !== DROP)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const frontmatter = [
    "---",
    `invoice_number: ${number}`,
    `invoice_date: ${date}`,
    `due_date: ${due}`,
    `customer: ${customer}`,
    `service_date: ${period.date}`,
    `service_from: ${period.from}`,
    `service_to: ${period.to}`,
    `buyer_name: ${buyer.legal_name || ""}`,
    `buyer_contact: ${buyer.contact_person || ""}`,
    `buyer_street: ${buyer.street || ""}`,
    `buyer_postcode: ${buyer.postcode || ""}`,
    `buyer_city: ${buyer.city || ""}`,
    `buyer_country: ${buyer.country || "DE"}`,
    `buyer_vat_id: ${buyer.vat_id || ""}`,
    "currency: EUR",
    `tax_mode: ${mode}`,
    `tax_rate: ${mode === "standard" ? formatRate(rate) : 0}`,
    `payment_note: ${values.payment_note}`,
    `exemption_note: ${values.tax_note}`,
    "state: entwurf",
    "---",
    "",
  ].join("\n");

  return frontmatter + body.replace(/^\s*\n+/, "");
}

/** Das Ergebnis einer Pruefung ausgeben, mit dem, was ungeprueft blieb. */
function report(result, asJson) {
  if (asJson) {
    console.log(JSON.stringify(result, (key, value) => (key === "root" ? undefined : value), 2));
    return;
  }
  if (result.ok) {
    console.log(`\nRechnungsdaten in Ordnung, Profil ${PROFILE.name}.`);
  } else {
    console.log(`\nRechnungsdaten nicht in Ordnung, ${result.problems.length} Beanstandungen:`);
    for (const problem of result.problems) console.log(`  ${problem}`);
  }
  console.log("Geprueft:");
  for (const line of result.checked) console.log(`  ${line}`);
  console.log("Ungeprueft:");
  for (const line of result.unchecked) console.log(`  ${line}`);
}
