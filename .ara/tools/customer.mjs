#!/usr/bin/env node
/**
 * Customer file: create one and read the picture.
 *
 * A customer is not just a sheet with contact details. Their devices, their
 * paperwork and their history hang off them, and the question when opening the
 * file is always the same: where does that stand, and what is the next step. The
 * tool collects it in one place, so that Ara can give a picture instead of reading
 * the file out.
 *
 *   node .ara/tools/customer.mjs                          all customers, one line each
 *   node .ara/tools/customer.mjs --customer mueller       the picture of one customer
 *   node .ara/tools/customer.mjs --customer mueller --json
 *   node .ara/tools/customer.mjs --customer mueller --new --legal-name "Mueller GmbH"
 *
 * **It only reads, except with --new.** It passes no judgement on the customer and
 * writes nothing into their file: what was discussed Ara writes into the history,
 * and the status moves into the frontmatter by hand.
 *
 * About a device it says only what stands in its file. Whether the platform runs on
 * it today, the device says itself, and `maintain.mjs` asks it.
 *
 * === deutsch ===
 *
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
import { localized, t } from "./lib/i18n.mjs";
import { arasulRunning } from "./lib/device.mjs";
import { hasSecret } from "./lib/secrets.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();
const str = (v) => (typeof v === "string" ? v : null);

/** Die Stände aus .ara/knowledge/crm.md, in Worten. */
const STATUS = t(
  {
    lead: "interest, nothing concrete",
    quoted: "offer is out",
    won: "ordered",
    installed: "runs, handover done",
    maintenance: "under care",
    inactive: "over or lost",
  },
  {
    lead: "Interesse, nichts Konkretes",
    quoted: "Angebot ist draußen",
    won: "beauftragt",
    installed: "läuft, Abnahme erfolgt",
    maintenance: "in Betreuung",
    inactive: "vorbei oder verloren",
  }
);

/** Die Stände einer Geräteakte, aus .ara/templates/device.md. */
const DEVICE_STATUS = t(
  {
    planned: "planned",
    delivered: "delivered",
    installing: "being set up",
    live: "in operation",
    retired: "retired",
  },
  {
    planned: "geplant",
    delivered: "geliefert",
    installing: "in Einrichtung",
    live: "im Betrieb",
    retired: "ausgemustert",
  }
);

const VERDICT = t(
  { supported: "supported", soon: "soon", unsupported: "not supported" },
  { supported: "unterstützt", soon: "bald", unsupported: "nicht unterstützt" }
);

const RUNSHEET_STATE = t(
  { open: "open", running: "running", paused: "interrupted", done: "done" },
  { open: "offen", running: "läuft", paused: "unterbrochen", done: "fertig" }
);

/** "in 12 Tagen", "vor 3 Tagen", "heute". Ohne Datum: null. */
function when(date) {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days === 0) return t("today", "heute");
  return days > 0 ? t(`in ${days} days`, `in ${days} Tagen`) : t(`${-days} days ago`, `vor ${-days} Tagen`);
}

// --- Anlegen -----------------------------------------------------------------

if (arg.new) {
  const name = str(arg.customer);
  if (!name) fail(t("To create one I need --customer <folder name>.", "Zum Anlegen brauche ich --customer <ordnername>."));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    fail(
      t(
        `"${name}" does not work as a folder name. Speaking, lower case, with hyphens, without ` +
          'the legal form: mueller-metallbau, not "Müller Metallbau GmbH" and not kunde-01.',
        `"${name}" passt nicht als Ordnername. Sprechend, klein, mit Bindestrichen, ohne ` +
          'Rechtsform: mueller-metallbau, nicht "Müller Metallbau GmbH" und nicht kunde-01.'
      )
    );
  }
  const dir = customerPath(name);
  const file = join(dir, "customer.md");
  if (existsSync(file)) {
    fail(
      t(
        `The file already exists: ${relative(ROOT, file)}. To open it, call without --new.`,
        `Die Akte gibt es schon: ${relative(ROOT, file)}. Zum Öffnen ohne --new aufrufen.`
      )
    );
  }
  // Ähnliche Namen sind der häufigste Weg zu zwei Akten desselben Kunden.
  const similar = listCustomers().filter(
    (other) => other.startsWith(name.slice(0, 5)) || name.startsWith(other.slice(0, 5))
  );
  if (similar.length && !arg.force) {
    fail(
      t(
        `There is already a file with a similar name: ${similar.join(", ")}.\n` +
          "If that really is a different customer: once more with --force.",
        `Es gibt schon eine Akte mit ähnlichem Namen: ${similar.join(", ")}.\n` +
          "Wenn das wirklich ein anderer Kunde ist: noch einmal mit --force."
      )
    );
  }

  ensureDir(dir);
  ensureDir(join(dir, "history"));
  ensureDir(join(dir, "documents"));
  writeFileSync(file, readFileSync(localized(join(ROOT, ".ara", "templates", "customer.md")), "utf8"));
  writeFrontmatter(file, {
    id: name,
    legal_name: str(arg["legal-name"]) || "",
    status: str(arg.status) || "lead",
    created: today(),
    last_contact: today(),
  });
  const fehlt = [
    ...(str(arg["legal-name"]) ? [] : [t("the full legal name", "die vollständige Firmierung")]),
    t("the contact", "der Ansprechpartner"),
    t("what they intend", "was sie vorhaben"),
    t("a follow-up", "eine Wiedervorlage"),
  ];
  console.log(
    [
      t(`File created: ${relative(ROOT, file)}`, `Akte angelegt: ${relative(ROOT, file)}`),
      "",
      t(`Still empty and therefore next: ${fehlt.join(", ")}.`, `Noch leer und darum als Nächstes dran: ${fehlt.join(", ")}.`),
      t("The first entry belongs into history/.", "Der erste Eintrag gehört nach history/."),
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
      t(`There is no customer "${customer}".`, `Den Kunden "${customer}" gibt es nicht.`) +
        (known.length
          ? t(` Known: ${known.join(", ")}.`, ` Vorhanden: ${known.join(", ")}.`)
          : t(" No customer has been created yet.", " Es ist noch kein Kunde angelegt.")) +
        t("\nCreate one with: ", "\nAnlegen mit: ") +
        `node .ara/tools/customer.mjs --customer ${customer} --new`
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

  if (!fields.legal_name) {
    next.push(
      t(
        "The full legal name is missing from the frontmatter (`legal_name`).",
        "Die vollständige Firmierung fehlt im Frontmatter (`legal_name`)."
      )
    );
  }
  if (!fields.contact_person) {
    next.push(t("There is no contact in the file.", "Es steht kein Ansprechpartner in der Akte."));
  }

  const follow = daysUntil(fields.follow_up);
  if (follow === null) {
    if (!["installed", "maintenance", "inactive"].includes(fields.status)) {
      next.push(
        t(
          "No follow-up set. A conversation without a next date is a forgotten customer.",
          "Keine Wiedervorlage gesetzt. Ein Gespräch ohne nächsten Termin ist ein vergessener Kunde."
        )
      );
    }
  } else if (follow <= 0) {
    next.push(
      t(
        `Follow-up ${follow === 0 ? "today" : `due for ${-follow} days`}`,
        `Wiedervorlage ${follow === 0 ? "heute" : `seit ${-follow} Tagen fällig`}`
      ) + (fields.follow_up_note ? `: ${fields.follow_up_note}` : ".")
    );
  }

  if (!devices.length) {
    next.push(
      t(
        `No device in the file. Create one with /device ${state.customer}/<device>.`,
        `Kein Gerät in der Akte. Anlegen mit /device ${state.customer}/<gerät>.`
      )
    );
  }
  for (const device of devices) {
    if (device.runsheet?.state === "paused") {
      next.push(
        t(
          `The setup of ${device.name} is interrupted, phase ${device.runsheet.phase}.`,
          `Die Einrichtung von ${device.name} ist unterbrochen, Phase ${device.runsheet.phase}.`
        )
      );
    }
    if (device.status === "live" && !device.maintenance_until) {
      next.push(
        t(
          `${device.name} runs, but no maintenance term is stored.`,
          `${device.name} läuft, aber es ist keine Wartungslaufzeit hinterlegt.`
        )
      );
    }
    const until = daysUntil(device.maintenance_until);
    if (until !== null && until <= 60) {
      next.push(
        until < 0
          ? t(
              `The maintenance for ${device.name} expired ${-until} days ago.`,
              `Die Wartung für ${device.name} ist seit ${-until} Tagen abgelaufen.`
            )
          : t(
              `The maintenance for ${device.name} expires in ${until} days.`,
              `Die Wartung für ${device.name} läuft in ${until} Tagen aus.`
            )
      );
    }
    if (arasulRunning(device.arasul) && !device.key_ref) {
      next.push(
        t(
          `No kit key is stored for ${device.name}, and without it no deploy works. Create one with: `,
          `Für ${device.name} ist kein Kit-Schlüssel hinterlegt, ohne ihn geht kein Deploy. Anlegen mit: `
        ) + `node .ara/tools/device.mjs --customer ${state.customer} --name ${device.name} --deploy-key`
      );
    } else if (device.key_ref && !device.key_present) {
      next.push(
        t(
          `The file of ${device.name} names the entry ${device.key_ref}, it does not stand in the secret store.`,
          `Die Akte von ${device.name} nennt den Eintrag ${device.key_ref}, in der Geheimnis-Ablage steht er nicht.`
        )
      );
    }
  }

  if (fields.status === "lead" && !documents.some((d) => /angebot/.test(d.file))) {
    next.push(t("No offer filed yet. Produce one with /offer.", "Noch kein Angebot abgelegt. Erstellen mit /offer."));
  }
  const ohnePdf = documents.filter((d) => !d.pdf);
  if (ohnePdf.length) {
    next.push(
      t(
        `Without a PDF next to it: ${ohnePdf.map((d) => d.file).join(", ")}. ` +
          "A customer gets the PDF, the Markdown stays the source.",
        `Ohne PDF daneben: ${ohnePdf.map((d) => d.file).join(", ")}. ` +
          "Ein Kunde bekommt das PDF, das Markdown bleibt die Quelle."
      )
    );
  }
  if (!history.length) {
    next.push(t("The history is empty. The first entry sets the frame.", "Der Verlauf ist leer. Der erste Eintrag setzt den Rahmen."));
  }

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
        ? t(
            "No customer has been created yet. Create one with /customer <name>.",
            "Es ist noch kein Kunde angelegt. Anlegen mit /customer <name>."
          )
        : t(
            "There is no customers/ folder yet. The first customer creates it: /customer <name>.",
            "Es gibt noch keinen Ordner customers/. Der erste Kunde legt ihn an: /customer <name>."
          )
    );
    process.exit(0);
  }
  const width = Math.max(...all.map((c) => c.customer.length));
  for (const c of all) {
    const parts = [
      `${c.status || t("without a status", "ohne Stand")}${STATUS[c.status] ? ` (${STATUS[c.status]})` : ""}`,
      t(`${c.devices} device${c.devices === 1 ? "" : "s"}`, `${c.devices} Gerät${c.devices === 1 ? "" : "e"}`),
    ];
    const contact = when(c.last_contact);
    if (contact) parts.push(t(`contact ${contact}`, `Kontakt ${contact}`));
    const follow = when(c.follow_up);
    if (follow) {
      parts.push(
        t(`follow-up ${follow}`, `Wiedervorlage ${follow}`) + (c.follow_up_note ? `: ${c.follow_up_note}` : "")
      );
    }
    console.log(`${c.customer.padEnd(width)}  ${parts.join(", ")}`);
  }
  console.log(
    t(
      `\n${all.length} customer${all.length === 1 ? "" : "s"}. Open one: /customer <name>.`,
      `\n${all.length} Kunde${all.length === 1 ? "" : "n"}. Einen öffnen: /customer <name>.`
    )
  );
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
  t(
    `- Status: ${fields.status || "not set"}`,
    `- Stand: ${fields.status || "nicht gesetzt"}`
  ) + (STATUS[fields.status] ? `, ${STATUS[fields.status]}` : "")
);
const contact = when(fields.last_contact);
out.push(
  t(
    `- Last contact: ${fields.last_contact || "unknown"}`,
    `- Letzter Kontakt: ${fields.last_contact || "unbekannt"}`
  ) + (contact ? `, ${contact}` : "")
);
const follow = when(fields.follow_up);
if (follow) {
  out.push(
    t(`- Follow-up: ${fields.follow_up}, ${follow}`, `- Wiedervorlage: ${fields.follow_up}, ${follow}`) +
      (fields.follow_up_note ? `: ${fields.follow_up_note}` : "")
  );
}
if (fields.contact_person) {
  out.push(
    t(`- Contact: ${fields.contact_person}`, `- Ansprechpartner: ${fields.contact_person}`) +
      (fields.contact ? `, ${fields.contact}` : "")
  );
}
if (fields.industry || fields.region) {
  out.push(`- ${[fields.industry, fields.region].filter(Boolean).join(", ")}`);
}

out.push("", t("## Devices", "## Geräte"), "");
if (!devices.length) {
  out.push(t("None in the file.", "Keines in der Akte."));
} else {
  for (const d of devices) {
    const head = [
      DEVICE_STATUS[d.status] || d.status || t("without a status", "ohne Stand"),
      VERDICT[d.verdict] || d.verdict,
      d.model,
    ].filter(Boolean);
    out.push(`- **${d.name}**: ${head.join(", ")}`);

    const reach = [];
    if (d.address) reach.push(t(`SSH over ${d.address}`, `SSH über ${d.address}`) + (d.ssh ? ` (${d.ssh})` : ""));
    if (d.api_base) reach.push(t(`interface ${d.api_base}`, `Schnittstelle ${d.api_base}`));
    else if (d.address) reach.push(t("interface at the same address", "Schnittstelle unter derselben Adresse"));
    if (d.tls) reach.push(t(`certificate ${d.tls}`, `Zertifikat ${d.tls}`));
    if (reach.length) out.push(`  ${reach.join(", ")}`);

    const platform = [];
    if (d.arasul) {
      platform.push(
        t(
          `Arasul: ${arasulRunning(d.arasul) ? "runs according to the file" : d.arasul === "traces" ? "traces there, nothing runs" : "no traces"}`,
          `Arasul: ${arasulRunning(d.arasul) ? "läuft laut Akte" : d.arasul === "traces" ? "Reste da, nichts läuft" : "keine Hinweise"}`
        )
      );
    }
    if (d.key_ref) {
      platform.push(
        t(`kit key ${d.key_ref}`, `Kit-Schlüssel ${d.key_ref}`) +
          (d.key_present ? "" : t(", not in the store", ", nicht in der Ablage"))
      );
    } else {
      platform.push(t("no kit key stored", "kein Kit-Schlüssel hinterlegt"));
    }
    out.push(`  ${platform.join(", ")}`);

    if (d.maintenance_until) {
      out.push(
        t(
          `  maintenance until ${d.maintenance_until}, ${when(d.maintenance_until)}`,
          `  Wartung bis ${d.maintenance_until}, ${when(d.maintenance_until)}`
        )
      );
    }
    if (d.runsheet) {
      out.push(
        t(
          `  runsheet: phase ${d.runsheet.phase}, ${RUNSHEET_STATE[d.runsheet.state] || d.runsheet.state}`,
          `  Laufzettel: Phase ${d.runsheet.phase}, ${RUNSHEET_STATE[d.runsheet.state] || d.runsheet.state}`
        ) + (d.runsheet.updated ? t(`, last ${d.runsheet.updated}`, `, zuletzt ${d.runsheet.updated}`) : "")
      );
    }
    if (d.checked) out.push(t(`  last checked: ${d.checked}`, `  Zuletzt geprüft: ${d.checked}`));
  }
}

out.push("", t("## Paperwork", "## Papier"), "");
if (!documents.length) out.push(t("Nothing in documents/ yet.", "Noch nichts in documents/."));
else {
  for (const doc of documents.slice(0, 8)) {
    out.push(
      `- ${doc.file}` + (doc.pdf ? t(", PDF next to it", ", PDF daneben") : t(", **no PDF**", ", **kein PDF**"))
    );
  }
  if (documents.length > 8) {
    out.push(t(`... and ${documents.length - 8} more.`, `... und ${documents.length - 8} weitere.`));
  }
}

out.push("", t("## History", "## Verlauf"), "");
if (!history.length) out.push(t("No entry yet.", "Noch kein Eintrag."));
else {
  for (const entry of history.slice(0, 5)) {
    out.push(`- ${entry.date} ${entry.heading}${entry.type ? ` (${entry.type})` : ""}`);
  }
  const archiviert = history.filter((e) => e.archived).length;
  out.push(
    t(
      `${history.length} ${history.length === 1 ? "entry" : "entries"} in total`,
      `${history.length} ${history.length === 1 ? "Eintrag" : "Einträge"} insgesamt`
    ) + (archiviert ? t(`, ${archiviert} of them archived`, `, davon ${archiviert} im Archiv`) : "") + "."
  );
}

if (next.length) out.push("", t("## What is due", "## Was ansteht"), "", ...next.map((line) => `- ${line}`));

console.log(out.join("\n"));
