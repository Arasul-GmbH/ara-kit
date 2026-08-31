/**
 * ZUGFeRD: aus einem Rechnungsbeleg wird die maschinenlesbare Fassung.
 *
 * Das Format heisst Cross Industry Invoice (CII) der UN/CEFACT und traegt die
 * Geschaeftsregeln der EN 16931. Es steckt spaeter als Anhang im PDF, damit die
 * Buchhaltung des Kunden die Rechnung einlesen kann, ohne sie abzutippen.
 *
 * **Erzeugt wird nur aus dem, was auf dem Blatt steht.** Es gibt keinen zweiten
 * Datensatz neben dem Papier: die Positionen kommen aus der gedruckten Tabelle,
 * die Summen werden daraus gerechnet. Ein XML, das etwas anderes sagt als das
 * Papier daneben, waere schlimmer als gar keines.
 *
 * Was hier geprueft wird und was nicht, steht unter "Was ungeprueft bleibt" in
 * `.ara/knowledge/invoicing.md`. Kurz: die Ordnung der Elemente wird gegen ein
 * Modell im Kit geprueft, die Werte gegen die Geschaeftsregeln der EN 16931.
 * Ein amtliches XSD und die Schematron-Regeln der KoSIT liegen dem Kit nicht
 * bei, also wird auch nicht behauptet, dagegen geprueft zu haben.
 */

/** Die Fassung des Profils, die das Kit schreibt. */
import { t } from "./i18n.mjs";

export const PROFILE = {
  id: "urn:cen.eu:en16931:2017",
  name: "EN 16931",
  attachment: "factur-x.xml",
  version: "1.0",
};

/** Rechnungsart 380: kaufmaennische Rechnung, UNTDID 1001. */
const TYPE_CODE = "380";

/** Mengeneinheiten aus dem Papier in Codes nach UN/ECE Empfehlung 20. */
const UNITS = {
  "": "C62",
  stueck: "C62",
  stück: "C62",
  stk: "C62",
  st: "C62",
  pauschale: "C62",
  einheit: "C62",
  stunde: "HUR",
  stunden: "HUR",
  std: "HUR",
  h: "HUR",
  tag: "DAY",
  tage: "DAY",
  monat: "MON",
  monate: "MON",
  jahr: "ANN",
  jahre: "ANN",
  km: "KMT",
  kg: "KGM",
  liter: "LTR",
  l: "LTR",
  meter: "MTR",
  m: "MTR",
};

/** Der Code zu einer Einheit. Unbekanntes wird nicht geraten, es wird gemeldet. */
export function unitCode(unit) {
  const clean = String(unit || "").trim().toLowerCase().replace(/\.$/, "");
  return UNITS[clean] || null;
}

const escape = (text) =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Cent als Betrag im XML: immer Punkt, immer zwei Stellen. */
const amount = (cents) => (cents / 100).toFixed(2);

/** JJJJ-MM-TT wird zu JJJJMMTT, das ist das Format 102 der UN/CEFACT. */
const day = (date) => String(date || "").slice(0, 10).replace(/-/g, "");

// --- Schreiben ---------------------------------------------------------------

/**
 * Ein Element mit Kindern. Leere Kinder fallen weg, damit kein Element mit
 * leerem Inhalt entsteht: das waere im Schema gueltig und fachlich falsch.
 */
function element(name, children, attrs = {}) {
  const inner = children.filter(Boolean);
  if (!inner.length) return "";
  const attributes = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ` ${key}="${escape(value)}"`)
    .join("");
  return [`<${name}${attributes}>`, ...inner.map((line) => `  ${line.split("\n").join("\n  ")}`), `</${name}>`].join(
    "\n"
  );
}

/** Ein Element mit Text. Ein leerer Text erzeugt gar kein Element. */
function leaf(name, value, attrs = {}) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const attributes = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, v]) => ` ${key}="${escape(v)}"`)
    .join("");
  return `<${name}${attributes}>${escape(text)}</${name}>`;
}

/** Eine Partei: Name, Anschrift, Steuernummern. */
function party(tag, data) {
  return element(tag, [
    leaf("ram:Name", data.name),
    data.contact
      ? element("ram:DefinedTradeContact", [
          leaf("ram:PersonName", data.contact),
          data.phone ? element("ram:TelephoneUniversalCommunication", [leaf("ram:CompleteNumber", data.phone)]) : "",
          data.email ? element("ram:EmailURIUniversalCommunication", [leaf("ram:URIID", data.email)]) : "",
        ])
      : "",
    element("ram:PostalTradeAddress", [
      leaf("ram:PostcodeCode", data.postcode),
      leaf("ram:LineOne", data.street),
      leaf("ram:CityName", data.city),
      leaf("ram:CountryID", data.country),
    ]),
    data.vat_id ? element("ram:SpecifiedTaxRegistration", [leaf("ram:ID", data.vat_id, { schemeID: "VA" })]) : "",
    data.tax_number
      ? element("ram:SpecifiedTaxRegistration", [leaf("ram:ID", data.tax_number, { schemeID: "FC" })])
      : "",
  ]);
}

/**
 * Das XML zu einer gelesenen Rechnung.
 *
 * `invoice` ist das Ergebnis von `readInvoice()`, `seller` das von
 * `readSeller()`. Beide werden nur gelesen.
 */
export function buildXml(invoice, seller) {
  const f = invoice.fields;
  const notes = [];
  if (invoice.mode !== "standard") notes.push(f.exemption_note || "");
  if (f.note) notes.push(f.note);

  const lines = invoice.positions.filter((position) => position.ok).map((position) =>
    element("ram:IncludedSupplyChainTradeLineItem", [
      element("ram:AssociatedDocumentLineDocument", [leaf("ram:LineID", String(position.line))]),
      element("ram:SpecifiedTradeProduct", [leaf("ram:Name", position.text)]),
      element("ram:SpecifiedLineTradeAgreement", [
        element("ram:NetPriceProductTradePrice", [leaf("ram:ChargeAmount", amount(position.price))]),
      ]),
      element("ram:SpecifiedLineTradeDelivery", [
        leaf("ram:BilledQuantity", String(position.quantity), {
          unitCode: unitCode(position.unit) || "C62",
        }),
      ]),
      element("ram:SpecifiedLineTradeSettlement", [
        element("ram:ApplicableTradeTax", [
          leaf("ram:TypeCode", "VAT"),
          leaf("ram:CategoryCode", categoryOf(invoice.mode, position.rate)),
          leaf("ram:RateApplicablePercent", rateText(invoice.mode === "standard" ? position.rate : 0)),
        ]),
        element("ram:SpecifiedTradeSettlementLineMonetarySummation", [
          leaf("ram:LineTotalAmount", amount(position.total)),
        ]),
      ]),
    ])
  );

  const taxes = invoice.taxes.map((group) =>
    element("ram:ApplicableTradeTax", [
      leaf("ram:CalculatedAmount", amount(group.tax)),
      leaf("ram:TypeCode", "VAT"),
      leaf("ram:ExemptionReason", group.reason),
      leaf("ram:BasisAmount", amount(group.basis)),
      leaf("ram:CategoryCode", group.category),
      leaf("ram:RateApplicablePercent", rateText(group.rate)),
    ])
  );

  const period =
    f.service_from && f.service_to
      ? element("ram:BillingSpecifiedPeriod", [
          element("ram:StartDateTime", [dateTime(f.service_from)]),
          element("ram:EndDateTime", [dateTime(f.service_to)]),
        ])
      : "";

  const body = element("rsm:CrossIndustryInvoice", [
    element("rsm:ExchangedDocumentContext", [
      element("ram:GuidelineSpecifiedDocumentContextParameter", [leaf("ram:ID", PROFILE.id)]),
    ]),
    element("rsm:ExchangedDocument", [
      leaf("ram:ID", f.invoice_number),
      leaf("ram:TypeCode", TYPE_CODE),
      element("ram:IssueDateTime", [dateTime(f.invoice_date)]),
      ...notes.filter(Boolean).map((text) => element("ram:IncludedNote", [leaf("ram:Content", text)])),
    ]),
    element("rsm:SupplyChainTradeTransaction", [
      ...lines,
      element("ram:ApplicableHeaderTradeAgreement", [
        party("ram:SellerTradeParty", {
          name: seller.legal_name,
          contact: f.seller_contact || "",
          phone: seller.phone,
          email: seller.email,
          street: seller.street,
          postcode: seller.postcode,
          city: seller.city,
          country: seller.country,
          vat_id: seller.vat_id,
          tax_number: seller.vat_id ? "" : seller.tax_number,
        }),
        party("ram:BuyerTradeParty", {
          name: f.buyer_name,
          contact: f.buyer_contact || "",
          street: f.buyer_street,
          postcode: f.buyer_postcode,
          city: f.buyer_city,
          country: (f.buyer_country || "DE").toUpperCase(),
          vat_id: f.buyer_vat_id,
        }),
        f.order_reference
          ? element("ram:BuyerOrderReferencedDocument", [leaf("ram:IssuerAssignedID", f.order_reference)])
          : "",
      ]),
      // Das Schema verlangt das Element auch dann, wenn nichts darin steht.
      f.service_date
        ? element("ram:ApplicableHeaderTradeDelivery", [
            element("ram:ActualDeliverySupplyChainEvent", [
              element("ram:OccurrenceDateTime", [dateTime(f.service_date)]),
            ]),
          ])
        : "<ram:ApplicableHeaderTradeDelivery/>",
      element("ram:ApplicableHeaderTradeSettlement", [
        leaf("ram:InvoiceCurrencyCode", f.currency || "EUR"),
        seller.iban
          ? element("ram:SpecifiedTradeSettlementPaymentMeans", [
              leaf("ram:TypeCode", "58"),
              element("ram:PayeePartyCreditorFinancialAccount", [leaf("ram:IBANID", seller.iban)]),
            ])
          : "",
        ...taxes,
        period,
        element("ram:SpecifiedTradePaymentTerms", [
          leaf("ram:Description", f.payment_note || ""),
          f.due_date ? element("ram:DueDateDateTime", [dateTime(f.due_date)]) : "",
        ]),
        element("ram:SpecifiedTradeSettlementHeaderMonetarySummation", [
          leaf("ram:LineTotalAmount", amount(invoice.net)),
          leaf("ram:TaxBasisTotalAmount", amount(invoice.net)),
          leaf("ram:TaxTotalAmount", amount(invoice.tax), { currencyID: f.currency || "EUR" }),
          leaf("ram:GrandTotalAmount", amount(invoice.gross)),
          leaf("ram:DuePayableAmount", amount(invoice.gross)),
        ]),
      ]),
    ]),
  ]);

  const root = body.replace(
    "<rsm:CrossIndustryInvoice>",
    '<rsm:CrossIndustryInvoice\n' +
      '  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"\n' +
      '  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"\n' +
      '  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">'
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n${root}\n`;
}

/** Ein Datum als udt:DateTimeString im Format 102. */
function dateTime(date) {
  return leaf("udt:DateTimeString", day(date), { format: "102" });
}

/** Der Steuerkategorie-Code einer Zeile. */
function categoryOf(mode, rate) {
  if (mode === "kleinunternehmer") return "E";
  if (mode === "reverse_charge") return "AE";
  return rate > 0 ? "S" : "Z";
}

/** Ein Steuersatz im XML. Immer mit Punkt, nie mit Komma. */
function rateText(rate) {
  return String(Number(rate || 0));
}

// --- Ein kleiner XML-Leser ---------------------------------------------------

/**
 * Liest XML zu einem Baum. Genug fuer eine Rechnung: Elemente, Attribute, Text.
 *
 * Absichtlich klein und streng. Was hier nicht durchgeht, ist entweder kaputt
 * oder benutzt etwas, das in einer Rechnung nichts zu suchen hat.
 */
export function parseXml(text) {
  let i = 0;
  const source = String(text);
  const fail = (message) => {
    const line = source.slice(0, i).split("\n").length;
    throw new Error(t(`XML not readable, line ${line}: ${message}`, `XML nicht lesbar, Zeile ${line}: ${message}`));
  };

  const skip = (marker) => {
    const end = source.indexOf(marker, i);
    if (end < 0) fail(`"${marker}" fehlt`);
    i = end + marker.length;
  };

  const stack = [];
  let root = null;
  while (i < source.length) {
    const open = source.indexOf("<", i);
    if (open < 0) break;
    const between = source.slice(i, open);
    if (between.trim() && stack.length) stack[stack.length - 1].text += between;
    i = open;

    if (source.startsWith("<?", i)) {
      skip("?>");
      continue;
    }
    if (source.startsWith("<!--", i)) {
      skip("-->");
      continue;
    }
    if (source.startsWith("<!", i)) {
      skip(">");
      continue;
    }
    const close = source.indexOf(">", i);
    if (close < 0) fail(t("an element is not closed", "ein Element wird nicht geschlossen"));
    const raw = source.slice(i + 1, close);
    i = close + 1;

    if (raw.startsWith("/")) {
      const name = raw.slice(1).trim();
      const node = stack.pop();
      if (!node) fail(t(`</${name}> without an opening element`, `</${name}> ohne öffnendes Element`));
      if (node.name !== name) fail(t(`</${name}> closes <${node.name}>`, `</${name}> schließt <${node.name}>`));
      continue;
    }

    const selfClosing = raw.endsWith("/");
    const inner = selfClosing ? raw.slice(0, -1) : raw;
    const nameMatch = inner.match(/^([A-Za-z_][\w.:-]*)/);
    if (!nameMatch) {
      fail(t(`"<${inner.slice(0, 20)}" is not an element name`, `"<${inner.slice(0, 20)}" ist kein Elementname`));
    }
    const node = { name: nameMatch[1], attrs: {}, children: [], text: "" };
    for (const attr of inner.slice(nameMatch[1].length).matchAll(/([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g)) {
      node.attrs[attr[1]] = attr[2];
    }
    if (stack.length) stack[stack.length - 1].children.push(node);
    else if (root) fail(t("two root elements", "zwei Wurzelelemente"));
    else root = node;
    if (!selfClosing) stack.push(node);
  }
  if (stack.length) {
    fail(t(`<${stack[stack.length - 1].name}> is not closed`, `<${stack[stack.length - 1].name}> wird nicht geschlossen`));
  }
  if (!root) fail(t("no element found", "kein Element gefunden"));
  return root;
}

/** Ein Kind mit diesem Namen, oder null. */
const child = (node, name) => node?.children.find((c) => c.name === name) || null;

/** Alle Kinder mit diesem Namen. */
const children = (node, name) => node?.children.filter((c) => c.name === name) || [];

/** Der Text unter einem Pfad, oder "". */
export function pick(node, ...path) {
  let current = node;
  for (const name of path) {
    current = child(current, name);
    if (!current) return "";
  }
  return current.text.trim();
}

// --- Das Modell der Schemaordnung -------------------------------------------

/**
 * Die Ordnung, in der die Elemente stehen muessen.
 *
 * **Das ist eine Abschrift, kein amtliches Schema.** Sie deckt genau die
 * Elemente ab, die das Kit schreibt. Sie faengt damit die eine Sorte Fehler ab,
 * die beim Schreiben entsteht: ein Element an der falschen Stelle, eines zu
 * viel, eines vergessen. Ein Original-XSD wuerde mehr finden, es liegt dem Kit
 * aber nicht bei, und darum wird auch nicht behauptet, dagegen geprueft zu
 * haben. Was sonst ungeprueft bleibt: `.ara/knowledge/invoicing.md`.
 *
 * Aufbau je Eintrag: [Name, Mindestzahl, Hoechstzahl, Kinder oder Typ].
 * "n" heisst beliebig oft.
 */
const MODEL = [
  "rsm:CrossIndustryInvoice",
  1,
  1,
  [
    ["rsm:ExchangedDocumentContext", 1, 1, [
      ["ram:BusinessProcessSpecifiedDocumentContextParameter", 0, 1, [["ram:ID", 1, 1, "text"]]],
      ["ram:GuidelineSpecifiedDocumentContextParameter", 1, 1, [["ram:ID", 1, 1, "text"]]],
    ]],
    ["rsm:ExchangedDocument", 1, 1, [
      ["ram:ID", 1, 1, "text"],
      ["ram:TypeCode", 1, 1, "code"],
      ["ram:IssueDateTime", 1, 1, [["udt:DateTimeString", 1, 1, "day"]]],
      ["ram:IncludedNote", 0, "n", [["ram:Content", 1, 1, "text"], ["ram:SubjectCode", 0, 1, "code"]]],
    ]],
    ["rsm:SupplyChainTradeTransaction", 1, 1, [
      ["ram:IncludedSupplyChainTradeLineItem", 1, "n", [
        ["ram:AssociatedDocumentLineDocument", 1, 1, [["ram:LineID", 1, 1, "text"]]],
        ["ram:SpecifiedTradeProduct", 1, 1, [["ram:Name", 1, 1, "text"], ["ram:Description", 0, 1, "text"]]],
        ["ram:SpecifiedLineTradeAgreement", 1, 1, [
          ["ram:NetPriceProductTradePrice", 1, 1, [["ram:ChargeAmount", 1, 1, "amount"]]],
        ]],
        ["ram:SpecifiedLineTradeDelivery", 1, 1, [["ram:BilledQuantity", 1, 1, "quantity"]]],
        ["ram:SpecifiedLineTradeSettlement", 1, 1, [
          ["ram:ApplicableTradeTax", 1, 1, [
            ["ram:TypeCode", 1, 1, "code"],
            ["ram:CategoryCode", 1, 1, "code"],
            ["ram:RateApplicablePercent", 1, 1, "decimal"],
          ]],
          ["ram:SpecifiedTradeSettlementLineMonetarySummation", 1, 1, [["ram:LineTotalAmount", 1, 1, "amount"]]],
        ]],
      ]],
      ["ram:ApplicableHeaderTradeAgreement", 1, 1, [
        ["ram:SellerTradeParty", 1, 1, "party"],
        ["ram:BuyerTradeParty", 1, 1, "party"],
        ["ram:BuyerOrderReferencedDocument", 0, 1, [["ram:IssuerAssignedID", 1, 1, "text"]]],
      ]],
      ["ram:ApplicableHeaderTradeDelivery", 1, 1, [
        ["ram:ActualDeliverySupplyChainEvent", 0, 1, [
          ["ram:OccurrenceDateTime", 1, 1, [["udt:DateTimeString", 1, 1, "day"]]],
        ]],
      ]],
      ["ram:ApplicableHeaderTradeSettlement", 1, 1, [
        ["ram:PaymentReference", 0, 1, "text"],
        ["ram:InvoiceCurrencyCode", 1, 1, "code"],
        ["ram:SpecifiedTradeSettlementPaymentMeans", 0, "n", [
          ["ram:TypeCode", 1, 1, "code"],
          ["ram:PayeePartyCreditorFinancialAccount", 0, 1, [["ram:IBANID", 1, 1, "text"]]],
        ]],
        ["ram:ApplicableTradeTax", 1, "n", [
          ["ram:CalculatedAmount", 1, 1, "amount"],
          ["ram:TypeCode", 1, 1, "code"],
          ["ram:ExemptionReason", 0, 1, "text"],
          ["ram:BasisAmount", 1, 1, "amount"],
          ["ram:CategoryCode", 1, 1, "code"],
          ["ram:RateApplicablePercent", 1, 1, "decimal"],
        ]],
        ["ram:BillingSpecifiedPeriod", 0, 1, [
          ["ram:StartDateTime", 0, 1, [["udt:DateTimeString", 1, 1, "day"]]],
          ["ram:EndDateTime", 0, 1, [["udt:DateTimeString", 1, 1, "day"]]],
        ]],
        ["ram:SpecifiedTradePaymentTerms", 0, "n", [
          ["ram:Description", 0, 1, "text"],
          ["ram:DueDateDateTime", 0, 1, [["udt:DateTimeString", 1, 1, "day"]]],
        ]],
        ["ram:SpecifiedTradeSettlementHeaderMonetarySummation", 1, 1, [
          ["ram:LineTotalAmount", 1, 1, "amount"],
          ["ram:ChargeTotalAmount", 0, 1, "amount"],
          ["ram:AllowanceTotalAmount", 0, 1, "amount"],
          ["ram:TaxBasisTotalAmount", 1, 1, "amount"],
          ["ram:TaxTotalAmount", 1, 1, "amount"],
          ["ram:GrandTotalAmount", 1, 1, "amount"],
          ["ram:TotalPrepaidAmount", 0, 1, "amount"],
          ["ram:DuePayableAmount", 1, 1, "amount"],
        ]],
      ]],
    ]],
  ],
];

/** Die Ordnung innerhalb einer Partei, fuer Verkaeufer und Kaeufer gleich. */
const PARTY = [
  ["ram:ID", 0, "n", "text"],
  ["ram:GlobalID", 0, "n", "text"],
  ["ram:Name", 1, 1, "text"],
  ["ram:SpecifiedLegalOrganization", 0, 1, [["ram:ID", 0, 1, "text"], ["ram:TradingBusinessName", 0, 1, "text"]]],
  ["ram:DefinedTradeContact", 0, "n", [
    ["ram:PersonName", 0, 1, "text"],
    ["ram:TelephoneUniversalCommunication", 0, 1, [["ram:CompleteNumber", 1, 1, "text"]]],
    ["ram:EmailURIUniversalCommunication", 0, 1, [["ram:URIID", 1, 1, "text"]]],
  ]],
  ["ram:PostalTradeAddress", 1, 1, [
    ["ram:PostcodeCode", 0, 1, "text"],
    ["ram:LineOne", 0, 1, "text"],
    ["ram:LineTwo", 0, 1, "text"],
    ["ram:CityName", 0, 1, "text"],
    ["ram:CountryID", 1, 1, "code"],
  ]],
  ["ram:URIUniversalCommunication", 0, 1, [["ram:URIID", 1, 1, "text"]]],
  ["ram:SpecifiedTaxRegistration", 0, "n", [["ram:ID", 1, 1, "text"]]],
];

const TYPES = {
  text: () => null,
  code: (value) => (/^[A-Za-z0-9_.-]+$/.test(value) ? null : "ist kein Code"),
  day: (value) => (/^\d{8}$/.test(value) ? null : "ist kein Datum im Format 102 (JJJJMMTT)"),
  amount: (value) => (/^-?\d+\.\d{2}$/.test(value) ? null : "ist kein Betrag mit genau zwei Nachkommastellen"),
  decimal: (value) => (/^-?\d+(\.\d+)?$/.test(value) ? null : "ist keine Dezimalzahl"),
  quantity: (value) => (/^-?\d+(\.\d+)?$/.test(value) ? null : "ist keine Menge"),
};

/** Prueft einen Knoten gegen seinen Modelleintrag. Sammelt Meldungen. */
function checkNode(node, spec, path, problems) {
  const [, , , shape] = spec;
  const model = shape === "party" ? PARTY : shape;
  const here = `${path}/${node.name}`;

  if (typeof model === "string") {
    const problem = TYPES[model]?.(node.text.trim());
    if (problem) problems.push(`${here}: "${node.text.trim()}" ${problem}`);
    if (node.children.length) problems.push(`${here} hat Kinder, erwartet wird nur Text`);
    return;
  }

  const order = model.map(([name]) => name);
  let position = 0;
  const counts = new Map();
  for (const kid of node.children) {
    const index = order.indexOf(kid.name);
    if (index < 0) {
      problems.push(`${here}: <${kid.name}> ist hier nicht vorgesehen`);
      continue;
    }
    if (index < position) {
      problems.push(`${here}: <${kid.name}> steht nach <${order[position]}>, die Reihenfolge ist vertauscht`);
    }
    position = Math.max(position, index);
    counts.set(kid.name, (counts.get(kid.name) || 0) + 1);
    checkNode(kid, model[index], here, problems);
  }
  for (const entry of model) {
    const [name, min, max] = entry;
    const count = counts.get(name) || 0;
    if (count < min) problems.push(`${here}: <${name}> fehlt`);
    if (max !== "n" && count > max) problems.push(`${here}: <${name}> steht ${count} mal, erlaubt ist ${max} mal`);
  }
}

/** Die Ordnung des Dokuments gegen das Modell im Kit. */
export function checkStructure(root) {
  const problems = [];
  if (root.name !== MODEL[0]) {
    return [`Das Wurzelelement heisst <${root.name}>, erwartet wird <${MODEL[0]}>.`];
  }
  checkNode(root, MODEL, "", problems);
  return problems;
}

// --- Die Geschaeftsregeln der EN 16931 ---------------------------------------

const cents = (text) => (/^-?\d+\.\d{2}$/.test(text) ? Math.round(Number(text) * 100) : null);

/**
 * Die Geschaeftsregeln, die sich am Dokument selbst pruefen lassen.
 *
 * Jede Zeile nennt ihre Regelnummer aus der EN 16931, damit nachlesbar ist,
 * woher sie kommt. Was hier nicht steht, ist damit auch nicht geprueft.
 */
export function checkRules(root) {
  const problems = [];
  const say = (rule, message) => problems.push(`${rule}: ${message}`);

  const context = child(root, "rsm:ExchangedDocumentContext");
  const head = child(root, "rsm:ExchangedDocument");
  const trade = child(root, "rsm:SupplyChainTradeTransaction");
  const agreement = child(trade, "ram:ApplicableHeaderTradeAgreement");
  const settlement = child(trade, "ram:ApplicableHeaderTradeSettlement");
  const sums = child(settlement, "ram:SpecifiedTradeSettlementHeaderMonetarySummation");
  const lines = children(trade, "ram:IncludedSupplyChainTradeLineItem");

  const spec = pick(context, "ram:GuidelineSpecifiedDocumentContextParameter", "ram:ID");
  if (!spec) say("BR-01", "die Kennung der Spezifikation fehlt");
  else if (!spec.startsWith(PROFILE.id)) say("BR-01", `die Kennung "${spec}" gehoert nicht zur EN 16931`);
  if (!pick(head, "ram:ID")) say("BR-02", "die Rechnungsnummer fehlt");
  if (!pick(head, "ram:IssueDateTime", "udt:DateTimeString")) say("BR-03", "das Rechnungsdatum fehlt");
  const type = pick(head, "ram:TypeCode");
  if (!type) say("BR-04", "der Rechnungstyp fehlt");
  else if (type !== TYPE_CODE) say("BR-CL-01", `der Typcode ${type} ist fuer eine Rechnung nicht ${TYPE_CODE}`);
  const currency = pick(settlement, "ram:InvoiceCurrencyCode");
  if (!/^[A-Z]{3}$/.test(currency)) say("BR-05", `"${currency}" ist kein Waehrungscode nach ISO 4217`);

  const seller = child(agreement, "ram:SellerTradeParty");
  const buyer = child(agreement, "ram:BuyerTradeParty");
  if (!pick(seller, "ram:Name")) say("BR-06", "der Name des Verkaeufers fehlt");
  if (!pick(buyer, "ram:Name")) say("BR-07", "der Name des Kaeufers fehlt");
  if (!child(seller, "ram:PostalTradeAddress")) say("BR-08", "die Anschrift des Verkaeufers fehlt");
  if (!/^[A-Z]{2}$/.test(pick(seller, "ram:PostalTradeAddress", "ram:CountryID"))) {
    say("BR-09", "das Land des Verkaeufers fehlt oder ist kein Code nach ISO 3166");
  }
  if (!child(buyer, "ram:PostalTradeAddress")) say("BR-10", "die Anschrift des Kaeufers fehlt");
  if (!/^[A-Z]{2}$/.test(pick(buyer, "ram:PostalTradeAddress", "ram:CountryID"))) {
    say("BR-11", "das Land des Kaeufers fehlt oder ist kein Code nach ISO 3166");
  }
  if (!lines.length) say("BR-16", "die Rechnung hat keine Position");

  const lineTotal = cents(pick(sums, "ram:LineTotalAmount"));
  const basisTotal = cents(pick(sums, "ram:TaxBasisTotalAmount"));
  const taxTotal = cents(pick(sums, "ram:TaxTotalAmount"));
  const grandTotal = cents(pick(sums, "ram:GrandTotalAmount"));
  const duePayable = cents(pick(sums, "ram:DuePayableAmount"));
  const prepaid = cents(pick(sums, "ram:TotalPrepaidAmount")) ?? 0;
  if (lineTotal === null) say("BR-12", "die Summe der Positionen fehlt");
  if (basisTotal === null) say("BR-13", "der Gesamtbetrag ohne Steuer fehlt");
  if (grandTotal === null) say("BR-14", "der Gesamtbetrag mit Steuer fehlt");
  if (duePayable === null) say("BR-15", "der Zahlbetrag fehlt");

  let sumOfLines = 0;
  lines.forEach((line, index) => {
    const nr = pick(line, "ram:AssociatedDocumentLineDocument", "ram:LineID") || String(index + 1);
    const value = cents(
      pick(line, "ram:SpecifiedLineTradeSettlement", "ram:SpecifiedTradeSettlementLineMonetarySummation", "ram:LineTotalAmount")
    );
    if (value === null) {
      say("BR-24", `Position ${nr} hat keinen Nettobetrag`);
      return;
    }
    sumOfLines += value;
    if (!pick(line, "ram:SpecifiedTradeProduct", "ram:Name")) say("BR-25", `Position ${nr} hat keine Bezeichnung`);
    const quantity = child(child(line, "ram:SpecifiedLineTradeDelivery"), "ram:BilledQuantity");
    if (!quantity) say("BR-22", `Position ${nr} hat keine Menge`);
    else if (!quantity.attrs.unitCode) say("BR-23", `Position ${nr} hat keine Mengeneinheit`);
    if (
      cents(
        pick(line, "ram:SpecifiedLineTradeAgreement", "ram:NetPriceProductTradePrice", "ram:ChargeAmount")
      ) === null
    ) {
      say("BR-26", `Position ${nr} hat keinen Einzelpreis`);
    }
  });
  if (lineTotal !== null && lineTotal !== sumOfLines) {
    say("BR-CO-10", `die Summe der Positionen ist ${money(lineTotal)}, die Positionen ergeben ${money(sumOfLines)}`);
  }
  if (lineTotal !== null && basisTotal !== null && basisTotal !== lineTotal) {
    say("BR-CO-13", `der Betrag ohne Steuer ist ${money(basisTotal)}, die Positionen ergeben ${money(lineTotal)}`);
  }

  let sumOfTax = 0;
  for (const group of children(settlement, "ram:ApplicableTradeTax")) {
    const category = pick(group, "ram:CategoryCode");
    const rate = Number(pick(group, "ram:RateApplicablePercent") || "0");
    const basis = cents(pick(group, "ram:BasisAmount"));
    const calculated = cents(pick(group, "ram:CalculatedAmount"));
    if (basis === null || calculated === null) {
      say("BR-45", `die Steuergruppe ${category} hat keinen vollstaendigen Betrag`);
      continue;
    }
    sumOfTax += calculated;
    const expected = Math.sign(basis) * Math.round((Math.abs(basis) * rate) / 100);
    if (calculated !== expected) {
      say("BR-CO-17", `die Steuergruppe ${category} weist ${money(calculated)} aus, ${rate} Prozent auf ${money(basis)} sind ${money(expected)}`);
    }
    if (category === "S" && !(rate > 0)) say("BR-S-05", "eine Gruppe mit Kategorie S hat den Steuersatz null");
    if (category !== "S" && category !== "Z" && rate !== 0) {
      say("BR-E-05", `die Gruppe ${category} ist steuerfrei und traegt trotzdem den Satz ${rate}`);
    }
    if ((category === "E" || category === "AE" || category === "O") && !pick(group, "ram:ExemptionReason")) {
      say("BR-E-10", `die Gruppe ${category} nennt keinen Grund fuer die Steuerbefreiung`);
    }
  }
  if (taxTotal !== null && taxTotal !== sumOfTax) {
    say("BR-CO-14", `die Steuersumme ist ${money(taxTotal)}, die Gruppen ergeben ${money(sumOfTax)}`);
  }
  const taxNode = child(sums, "ram:TaxTotalAmount");
  if (taxNode && !taxNode.attrs.currencyID) say("BR-53", "der Steuersumme fehlt die Waehrung");
  if (basisTotal !== null && taxTotal !== null && grandTotal !== null && grandTotal !== basisTotal + taxTotal) {
    say("BR-CO-15", `der Bruttobetrag ist ${money(grandTotal)}, Netto plus Steuer ergibt ${money(basisTotal + taxTotal)}`);
  }
  if (grandTotal !== null && duePayable !== null && duePayable !== grandTotal - prepaid) {
    say("BR-CO-16", `der Zahlbetrag ist ${money(duePayable)}, erwartet werden ${money(grandTotal - prepaid)}`);
  }
  return problems;
}

const money = (value) => `${(value / 100).toFixed(2)}`;

/**
 * Alles auf einmal: lesbar, geordnet, rechnerisch stimmig.
 *
 * Zurueck kommt, was geprueft wurde und was nicht. Der zweite Teil ist der
 * wichtigere: er sagt, worauf sich niemand berufen darf.
 */
export function validateXml(text) {
  const problems = [];
  let root = null;
  try {
    root = parseXml(text);
  } catch (error) {
    return { ok: false, problems: [error.message], checked: [], unchecked: UNCHECKED };
  }
  problems.push(...checkStructure(root));
  problems.push(...checkRules(root));
  return {
    ok: problems.length === 0,
    problems,
    root,
    checked: t(
      [
        "readable as XML",
        `order of the elements against the model in the kit (${PROFILE.name})`,
        "business rules of EN 16931, as far as they are checkable on the document",
      ],
      [
        "lesbar als XML",
        `Ordnung der Elemente gegen das Modell im Kit (${PROFILE.name})`,
        "Geschäftsregeln der EN 16931, soweit sie am Dokument prüfbar sind",
      ]
    ),
    unchecked: UNCHECKED,
  };
}

/**
 * Was dieses Werkzeug **nicht** prueft.
 *
 * Steht hier, damit niemand aus einem gruenen Lauf mehr liest, als er sagt.
 */
export const UNCHECKED = t(
  [
    "the official XSD of UN/CEFACT. It is not shipped with the kit, and nothing gets fetched at runtime",
    "the Schematron rules of KoSIT and the German additional rules BR-DE-*",
    "the code lists in full length, only the form of the codes gets checked",
    "the conformity of the PDF to PDF/A-3. That needs a validator like veraPDF",
  ],
  [
    "das amtliche XSD der UN/CEFACT. Es liegt dem Kit nicht bei, und geholt wird zur Laufzeit nichts",
    "die Schematron-Regeln der KoSIT und die deutschen Zusatzregeln BR-DE-*",
    "die Codelisten in voller Länge, geprüft wird nur die Form der Codes",
    "die Konformität des PDF zu PDF/A-3. Dafür braucht es einen Prüfer wie veraPDF",
  ]
);
