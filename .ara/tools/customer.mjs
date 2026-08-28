#!/usr/bin/env node
/**
 * Kundenakte: anlegen und das Lagebild lesen.
 *
 * Ein Kunde ist nicht nur ein Blatt mit Kontaktdaten. An ihm hängen seine
 * Geräte, sein Papier und sein Verlauf, und die Frage beim Öffnen der Akte ist
 * immer dieselbe: wo steht das, und was ist der nächste Schritt. Das Werkzeug
 * sammelt es an einer Stelle, damit Ara ein Lagebild geben kann, statt die Akte
 * vorzulesen.
 *
 *   node .ara/tools/customer.mjs                          alle Kunden, je eine Zeile
 *   node .ara/tools/customer.mjs --customer mueller       Lagebild eines Kunden
 *   node .ara/tools/customer.mjs --customer mueller --json
 *   node .ara/tools/customer.mjs --customer mueller --new --legal-name "Mueller GmbH"
 *
 * **Es liest nur, außer bei --new.** Es urteilt nicht über den Kunden und es
 * schreibt nichts in seine Akte: was besprochen wurde, schreibt Ara in den
 * Verlauf, und der Stand wandert von Hand ins Frontmatter.
 *
 * Über ein Gerät sagt es nur, was in dessen Akte steht. Ob die Plattform darauf
 * heute läuft, sagt das Gerät selbst, und danach fragt `maintain.mjs`.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  CUSTOMERS,
  ROOT,
  customerPath,
  daysUntil,
  devicePath,
  ensureDir,
  fail,
  helpOnly,
  listCustomers,
  listDevices,
  parseArgs,
  readFrontmatter,
  today,
  writeFrontmatter,
} from "./lib/kit.mjs";
import { arasulRunning } from "./lib/device.mjs";
import { hasSecret } from "./lib/secrets.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);

/** Die Stände aus .ara/knowledge/crm.md, in Worten. */
const STATUS = {
  lead: "Interesse, nichts Konkretes",
  quoted: "Angebot ist draußen",
  won: "beauftragt",
  installed: "läuft, Abnahme erfolgt",
  maintenance: "in Betreuung",
  inactive: "vorbei oder verloren",
};

/** Die Stände einer Geräteakte, aus .ara/templates/device.md. */
const DEVICE_STATUS = {
  planned: "geplant",
  delivered: "geliefert",
  installing: "in Einrichtung",
  live: "im Betrieb",
  retired: "ausgemustert",
};

const VERDICT = {
  supported: "unterstützt",
  soon: "bald",
  unsupported: "nicht unterstützt",
};

const RUNSHEET_STATE = { open: "offen", running: "läuft", paused: "unterbrochen", done: "fertig" };

/** "in 12 Tagen", "vor 3 Tagen", "heute". Ohne Datum: null. */
function when(date) {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days === 0) return "heute";
  return days > 0 ? `in ${days} Tagen` : `vor ${-days} Tagen`;
}

// --- Anlegen -----------------------------------------------------------------

if (arg.new) {
  const name = str(arg.customer);
  if (!name) fail("Zum Anlegen brauche ich --customer <ordnername>.");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    fail(
      `"${name}" passt nicht als Ordnername. Sprechend, klein, mit Bindestrichen, ohne ` +
        "Rechtsform: mueller-metallbau, nicht \"Müller Metallbau GmbH\" und nicht kunde-01."
    );
  }
  const dir = customerPath(name);
  const file = join(dir, "customer.md");
  if (existsSync(file)) {
    fail(`Die Akte gibt es schon: ${relative(ROOT, file)}. Zum Öffnen ohne --new aufrufen.`);
  }
  // Ähnliche Namen sind der häufigste Weg zu zwei Akten desselben Kunden.
  const similar = listCustomers().filter(
    (other) => other.startsWith(name.slice(0, 5)) || name.startsWith(other.slice(0, 5))
  );
  if (similar.length && !arg.force) {
    fail(
      `Es gibt schon eine Akte mit ähnlichem Namen: ${similar.join(", ")}.\n` +
        "Wenn das wirklich ein anderer Kunde ist: noch einmal mit --force."
    );
  }

  ensureDir(dir);
  ensureDir(join(dir, "history"));
  ensureDir(join(dir, "documents"));
  writeFileSync(file, readFileSync(join(ROOT, ".ara", "templates", "customer.md"), "utf8"));
  writeFrontmatter(file, {
    id: name,
    legal_name: str(arg["legal-name"]) || "",
    status: str(arg.status) || "lead",
    created: today(),
    last_contact: today(),
  });
  const fehlt = [
    ...(str(arg["legal-name"]) ? [] : ["die vollständige Firmierung"]),
    "der Ansprechpartner",
    "was sie vorhaben",
    "eine Wiedervorlage",
  ];
  console.log(
    [
      `Akte angelegt: ${relative(ROOT, file)}`,
      "",
      `Noch leer und darum als Nächstes dran: ${fehlt.join(", ")}.`,
      "Der erste Eintrag gehört nach history/.",
    ].join("\n")
  );
  process.exit(0);
}

// --- Ein Gerät des Kunden ----------------------------------------------------

/**
 * Was in der Geräteakte steht, mehr nicht.
 *
 * Seit die Schnittstelle in der Akte steht (`api_base`, `api_key_ref`, `tls`),
 * ist hier ablesbar, ob das Kit dieses Gerät überhaupt ansprechen kann. Das ist
 * eine Aussage über die Akte und keine über das Gerät: ob es antwortet, sagt
 * `maintain.mjs`, und ob die Plattform läuft, sagt das Gerät selbst.
 */
function readDeviceFile(customer, device) {
  const dir = devicePath(customer, device);
  const { fields } = readFrontmatter(join(dir, "device.md"));
  const runsheetFile = join(dir, "runsheet.md");
  const runsheet = existsSync(runsheetFile) ? readFrontmatter(runsheetFile).fields : null;

  const keyRef = fields.api_key_ref || "";
  return {
    name: device,
    model: fields.model || fields.hardware || "",
    status: fields.status || "",
    verdict: fields.verdict || "",
    address: fields.address || fields.hostname || "",
    api_base: fields.api_base || "",
    tls: fields.tls || "",
    arasul: fields.arasul || "",
    ssh: fields.ssh || "",
    key_ref: keyRef,
    // Ob der Eintrag in der Ablage steht, nicht sein Wert. Ein Name in der Akte
    // ohne Eintrag dahinter ist der Fall, der beim ersten Deploy auffällt.
    key_present: keyRef ? hasSecret(keyRef) : false,
    maintenance_until: fields.maintenance_until || "",
    checked: fields.checked || "",
    runsheet: runsheet
      ? {
          phase: runsheet.phase ?? "",
          state: runsheet.state || "",
          updated: runsheet.updated || "",
        }
      : null,
  };
}

/** Das Papier des Kunden: was in documents/ liegt, mit und ohne PDF daneben. */
function readDocuments(customer) {
  const dir = join(customerPath(customer), "documents");
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((n) => !n.startsWith("."));
  const pdfs = new Set(files.filter((n) => n.endsWith(".pdf")).map((n) => n.replace(/\.pdf$/, "")));
  return files
    .filter((n) => n.endsWith(".md"))
    .sort()
    .reverse()
    .map((n) => ({ file: n, pdf: pdfs.has(n.replace(/\.md$/, "")) }));
}

/**
 * Der Verlauf, das Neueste zuerst. Gelesen werden Kopf und Überschrift, nicht
 * der Text: das Lagebild nennt die letzten Einträge und zählt den Rest.
 *
 * Wer alte Jahrgänge nach `history/archive/<jahr>/` legt, verliert sie damit
 * nicht: von dort wird mitgelesen, nur als `archived` gekennzeichnet. Verschoben
 * wird nichts von selbst, das ist eine Entscheidung über Kundendaten.
 */
function readHistory(customer) {
  const base = join(customerPath(customer), "history");
  if (!existsSync(base)) return [];

  const read = (dir, archived) =>
    readdirSync(dir)
      .filter((n) => n.endsWith(".md"))
      .map((n) => {
        const { fields, body } = readFrontmatter(join(dir, n));
        const heading = (body.match(/^#\s+(.+)$/m) || [])[1] || n.replace(/\.md$/, "");
        return {
          file: n,
          date: fields.date || n.slice(0, 10),
          type: fields.type || "",
          heading: heading.trim(),
          archived,
        };
      });

  const entries = read(base, false);
  const archive = join(base, "archive");
  if (existsSync(archive)) {
    for (const year of readdirSync(archive, { withFileTypes: true })) {
      if (year.isDirectory()) entries.push(...read(join(archive, year.name), true));
    }
  }
  return entries.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** Alles zu einem Kunden an einer Stelle. */
function survey(customer) {
  const file = join(customerPath(customer), "customer.md");
  if (!existsSync(file)) {
    const known = listCustomers();
    fail(
      `Den Kunden "${customer}" gibt es nicht.` +
        (known.length ? ` Vorhanden: ${known.join(", ")}.` : " Es ist noch kein Kunde angelegt.") +
        `\nAnlegen mit: node .ara/tools/customer.mjs --customer ${customer} --new`
    );
  }
  const { fields } = readFrontmatter(file);
  return {
    customer,
    file: relative(ROOT, file),
    fields,
    devices: listDevices(customer).map((d) => readDeviceFile(customer, d)),
    documents: readDocuments(customer),
    history: readHistory(customer),
  };
}

/**
 * Was ansteht, aus dem, was in der Akte steht.
 *
 * Kein Vorschlagskatalog: nur Punkte, die aus einer Lücke in der Akte folgen.
 * Wo etwas fehlt, steht der Aufruf dabei, mit dem es entsteht.
 */
function open(state) {
  const { fields, devices, documents, history } = state;
  const next = [];

  if (!fields.legal_name) next.push("Die vollständige Firmierung fehlt im Frontmatter (`legal_name`).");
  if (!fields.contact_person) next.push("Es steht kein Ansprechpartner in der Akte.");

  const follow = daysUntil(fields.follow_up);
  if (follow === null) {
    if (!["installed", "maintenance", "inactive"].includes(fields.status)) {
      next.push("Keine Wiedervorlage gesetzt. Ein Gespräch ohne nächsten Termin ist ein vergessener Kunde.");
    }
  } else if (follow <= 0) {
    next.push(
      `Wiedervorlage ${follow === 0 ? "heute" : `seit ${-follow} Tagen fällig`}` +
        (fields.follow_up_note ? `: ${fields.follow_up_note}` : ".")
    );
  }

  if (!devices.length) {
    next.push(`Kein Gerät in der Akte. Anlegen mit /device ${state.customer}/<gerät>.`);
  }
  for (const device of devices) {
    if (device.runsheet?.state === "paused") {
      next.push(`Die Einrichtung von ${device.name} ist unterbrochen, Phase ${device.runsheet.phase}.`);
    }
    if (device.status === "live" && !device.maintenance_until) {
      next.push(`${device.name} läuft, aber es ist keine Wartungslaufzeit hinterlegt.`);
    }
    const until = daysUntil(device.maintenance_until);
    if (until !== null && until <= 60) {
      next.push(
        until < 0
          ? `Die Wartung für ${device.name} ist seit ${-until} Tagen abgelaufen.`
          : `Die Wartung für ${device.name} läuft in ${until} Tagen aus.`
      );
    }
    if (arasulRunning(device.arasul) && !device.key_ref) {
      next.push(
        `Für ${device.name} ist kein Kit-Schlüssel hinterlegt, ohne ihn geht kein Deploy. ` +
          `Anlegen mit: node .ara/tools/device.mjs --customer ${state.customer} --name ${device.name} --deploy-key`
      );
    } else if (device.key_ref && !device.key_present) {
      next.push(
        `Die Akte von ${device.name} nennt den Eintrag ${device.key_ref}, in der Geheimnis-Ablage steht er nicht.`
      );
    }
  }

  if (fields.status === "lead" && !documents.some((d) => /angebot/.test(d.file))) {
    next.push("Noch kein Angebot abgelegt. Erstellen mit /offer.");
  }
  const ohnePdf = documents.filter((d) => !d.pdf);
  if (ohnePdf.length) {
    next.push(
      `Ohne PDF daneben: ${ohnePdf.map((d) => d.file).join(", ")}. ` +
        "Ein Kunde bekommt das PDF, das Markdown bleibt die Quelle."
    );
  }
  if (!history.length) next.push("Der Verlauf ist leer. Der erste Eintrag setzt den Rahmen.");

  return next;
}

// --- Übersicht ---------------------------------------------------------------

if (!str(arg.customer)) {
  const all = listCustomers().map((c) => {
    const { fields } = readFrontmatter(join(customerPath(c), "customer.md"));
    return {
      customer: c,
      legal_name: fields.legal_name || "",
      status: fields.status || "",
      devices: listDevices(c).length,
      last_contact: fields.last_contact || "",
      follow_up: fields.follow_up || "",
      follow_up_note: fields.follow_up_note || "",
    };
  });

  if (arg.json) {
    console.log(JSON.stringify({ customers: all }, null, 2));
    process.exit(0);
  }
  if (!all.length) {
    console.log(
      existsSync(CUSTOMERS)
        ? "Es ist noch kein Kunde angelegt. Anlegen mit /customer <name>."
        : "Es gibt noch keinen Ordner customers/. Der erste Kunde legt ihn an: /customer <name>."
    );
    process.exit(0);
  }
  const width = Math.max(...all.map((c) => c.customer.length));
  for (const c of all) {
    const parts = [
      `${c.status || "ohne Stand"}${STATUS[c.status] ? ` (${STATUS[c.status]})` : ""}`,
      `${c.devices} Gerät${c.devices === 1 ? "" : "e"}`,
    ];
    const contact = when(c.last_contact);
    if (contact) parts.push(`Kontakt ${contact}`);
    const follow = when(c.follow_up);
    if (follow) parts.push(`Wiedervorlage ${follow}${c.follow_up_note ? `: ${c.follow_up_note}` : ""}`);
    console.log(`${c.customer.padEnd(width)}  ${parts.join(", ")}`);
  }
  console.log(`\n${all.length} Kunde${all.length === 1 ? "" : "n"}. Einen öffnen: /customer <name>.`);
  process.exit(0);
}

// --- Lagebild eines Kunden ---------------------------------------------------

const state = survey(str(arg.customer));
const next = open(state);

if (arg.json) {
  console.log(JSON.stringify({ ...state, open: next }, null, 2));
  process.exit(0);
}

const { fields, devices, documents, history } = state;
const out = [`# ${fields.legal_name || state.customer} (${state.customer})`, ""];

out.push(
  `- Stand: ${fields.status || "nicht gesetzt"}${STATUS[fields.status] ? `, ${STATUS[fields.status]}` : ""}`
);
const contact = when(fields.last_contact);
out.push(`- Letzter Kontakt: ${fields.last_contact || "unbekannt"}${contact ? `, ${contact}` : ""}`);
const follow = when(fields.follow_up);
if (follow) {
  out.push(`- Wiedervorlage: ${fields.follow_up}, ${follow}${fields.follow_up_note ? `: ${fields.follow_up_note}` : ""}`);
}
if (fields.contact_person) {
  out.push(`- Ansprechpartner: ${fields.contact_person}${fields.contact ? `, ${fields.contact}` : ""}`);
}
if (fields.industry || fields.region) {
  out.push(`- ${[fields.industry, fields.region].filter(Boolean).join(", ")}`);
}

out.push("", "## Geräte", "");
if (!devices.length) {
  out.push("Keines in der Akte.");
} else {
  for (const d of devices) {
    const head = [
      DEVICE_STATUS[d.status] || d.status || "ohne Stand",
      VERDICT[d.verdict] || d.verdict,
      d.model,
    ].filter(Boolean);
    out.push(`- **${d.name}**: ${head.join(", ")}`);

    const reach = [];
    if (d.address) reach.push(`SSH über ${d.address}${d.ssh ? ` (${d.ssh})` : ""}`);
    if (d.api_base) reach.push(`Schnittstelle ${d.api_base}`);
    else if (d.address) reach.push("Schnittstelle unter derselben Adresse");
    if (d.tls) reach.push(`Zertifikat ${d.tls}`);
    if (reach.length) out.push(`  ${reach.join(", ")}`);

    const platform = [];
    if (d.arasul) {
      platform.push(
        `Arasul: ${arasulRunning(d.arasul) ? "läuft laut Akte" : d.arasul === "traces" ? "Reste da, nichts läuft" : "keine Hinweise"}`
      );
    }
    if (d.key_ref) platform.push(`Kit-Schlüssel ${d.key_ref}${d.key_present ? "" : ", nicht in der Ablage"}`);
    else platform.push("kein Kit-Schlüssel hinterlegt");
    out.push(`  ${platform.join(", ")}`);

    if (d.maintenance_until) out.push(`  Wartung bis ${d.maintenance_until}, ${when(d.maintenance_until)}`);
    if (d.runsheet) {
      out.push(
        `  Laufzettel: Phase ${d.runsheet.phase}, ${RUNSHEET_STATE[d.runsheet.state] || d.runsheet.state}` +
          `${d.runsheet.updated ? `, zuletzt ${d.runsheet.updated}` : ""}`
      );
    }
    if (d.checked) out.push(`  Zuletzt geprüft: ${d.checked}`);
  }
}

out.push("", "## Papier", "");
if (!documents.length) out.push("Noch nichts in documents/.");
else {
  for (const doc of documents.slice(0, 8)) {
    out.push(`- ${doc.file}${doc.pdf ? ", PDF daneben" : ", **kein PDF**"}`);
  }
  if (documents.length > 8) out.push(`... und ${documents.length - 8} weitere.`);
}

out.push("", "## Verlauf", "");
if (!history.length) out.push("Noch kein Eintrag.");
else {
  for (const entry of history.slice(0, 5)) {
    out.push(`- ${entry.date} ${entry.heading}${entry.type ? ` (${entry.type})` : ""}`);
  }
  const archiviert = history.filter((e) => e.archived).length;
  out.push(
    `${history.length} ${history.length === 1 ? "Eintrag" : "Einträge"} insgesamt` +
      `${archiviert ? `, davon ${archiviert} im Archiv` : ""}.`
  );
}

if (next.length) out.push("", "## Was ansteht", "", ...next.map((line) => `- ${line}`));

console.log(out.join("\n"));
