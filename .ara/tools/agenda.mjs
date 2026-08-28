#!/usr/bin/env node
/**
 * Agenda: what is due.
 *
 * Collects dates from all customer files and devices, including the ones without
 * a customer under devices/: follow-ups, expiring maintenance contracts,
 * interrupted setups, contacts gone quiet.
 *
 * None of it runs automatically. The tool answers when asked, deliberately not a
 * watchman that sends messages by itself.
 *
 *   node .ara/tools/agenda.mjs                 everything that is due
 *   node .ara/tools/agenda.mjs --days 30       only the next 30 days
 *   node .ara/tools/agenda.mjs --json          machine readable
 *
 * === deutsch ===
 *
 * Agenda: was steht an.
 *
 * Sammelt Termine aus allen Kundenakten und Geräten, auch denen ohne Kunden unter
 * devices/: Wiedervorlagen, auslaufende Wartungsverträge, unterbrochene
 * Einrichtungen, eingeschlafene Kontakte.
 *
 * Nichts davon läuft automatisch. Das Werkzeug antwortet, wenn gefragt wird,
 * bewusst kein Wächter, der von selbst Nachrichten schickt.
 *
 *   node .ara/tools/agenda.mjs                 alles, was ansteht
 *   node .ara/tools/agenda.mjs --days 30       nur die nächsten 30 Tage
 *   node .ara/tools/agenda.mjs --json          maschinenlesbar
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { t } from "./lib/i18n.mjs";
import {
  customerPath,
  daysUntil,
  devicePath,
  helpOnly,
  listCustomers,
  listDevices,
  parseArgs,
  readFrontmatter,
} from "./lib/kit.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();
const horizon = arg.days !== undefined ? Number(arg.days) : 90;

// Wartungsverträge brauchen Vorlauf: eine Verlängerung will besprochen sein,
// bevor sie ausläuft.
const MAINTENANCE_LEAD_DAYS = 60;
const STALE_CONTACT_DAYS = 90;

const OPEN_STATES = ["lead", "quoted", "won"];
const items = [];

function add(entry) {
  items.push(entry);
}

for (const customer of listCustomers()) {
  const file = join(customerPath(customer), "customer.md");
  const { fields } = readFrontmatter(file);
  const label = fields.legal_name || customer;

  // Wiedervorlage
  const follow = daysUntil(fields.follow_up);
  if (follow !== null && follow <= horizon) {
    add({
      days: follow,
      type: "follow_up",
      customer,
      text:
        t(`Follow-up ${label}`, `Wiedervorlage ${label}`) +
        (fields.follow_up_note ? `: ${fields.follow_up_note}` : ""),
    });
  }

  // Eingeschlafener Kontakt bei laufenden Verkaufsvorgängen
  const lastContact = daysUntil(fields.last_contact);
  if (
    lastContact !== null &&
    OPEN_STATES.includes(fields.status) &&
    -lastContact >= STALE_CONTACT_DAYS &&
    follow === null
  ) {
    add({
      days: 0,
      type: "stale",
      customer,
      text: t(
        `${label}, no contact for ${-lastContact} days, status "${fields.status}"`,
        `${label}, seit ${-lastContact} Tagen kein Kontakt, Stand "${fields.status}"`
      ),
    });
  }

  collectDevices(customer, label);
}

/** Termine eines Geräts. Ohne Kunden ist customer null und das Gerät liegt unter devices/. */
function collectDevices(customer, label) {
  for (const device of listDevices(customer)) {
    const place = customer ? `${label} / ${device}` : device;
    const dir = devicePath(customer, device);
    const { fields: dev } = readFrontmatter(join(dir, "device.md"));

    // Wartungsvertrag
    const until = daysUntil(dev.maintenance_until);
    if (until !== null && until <= Math.max(horizon, MAINTENANCE_LEAD_DAYS)) {
      add({
        days: until,
        type: "maintenance",
        customer,
        device,
        text:
          until < 0
            ? t(
                `Maintenance ${place} expired ${-until} days ago`,
                `Wartung ${place} ist seit ${-until} Tagen abgelaufen`
              )
            : t(`Maintenance ${place} expires in ${until} days`, `Wartung ${place} läuft in ${until} Tagen aus`),
      });
    }

    // Unterbrochene Einrichtung
    const runsheet = join(dir, "runsheet.md");
    if (existsSync(runsheet)) {
      const { fields: run } = readFrontmatter(runsheet);
      if (run.state === "paused") {
        add({
          days: 0,
          type: "paused",
          customer,
          device,
          text: t(
            `Setup ${place} interrupted in phase ${run.phase ?? "?"} (since ${run.updated || "unknown"})`,
            `Einrichtung ${place} unterbrochen in Phase ${run.phase ?? "?"} (seit ${run.updated || "unbekannt"})`
          ),
        });
      }
    }

    // Gerät im Betrieb ohne hinterlegte Wartung
    if (dev.status === "live" && !dev.maintenance_until) {
      add({
        days: horizon + 1,
        type: "gap",
        customer,
        device,
        text: t(
          `${place} runs, but no maintenance term is stored`,
          `${place} läuft, aber es ist keine Wartungslaufzeit hinterlegt`
        ),
      });
    }
  }
}

collectDevices(null, null);

items.sort((a, b) => a.days - b.days);

if (arg.json) {
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
}

if (!items.length) {
  const count = listCustomers().length;
  const own = listDevices(null).length;
  console.log(
    count || own
      ? t(
          `Nothing is due. ${count} customer${count === 1 ? "" : "s"}, ${own} device${own === 1 ? "" : "s"} without a customer, ` +
            `no dates in the next ${horizon} days.`,
          `Nichts steht an. ${count} Kunde${count === 1 ? "" : "n"}, ${own} Gerät${own === 1 ? "" : "e"} ohne Kunden, ` +
            `keine Termine in den nächsten ${horizon} Tagen.`
        )
      : t(
          "No customer and no device created yet. Create one with /customer <name> or /device <name>.",
          "Noch kein Kunde und kein Gerät angelegt. Anlegen mit /customer <name> oder /device <name>."
        )
  );
  process.exit(0);
}

const overdue = items.filter((i) => i.days < 0);
const now = items.filter((i) => i.days >= 0 && i.days <= 14);
const later = items.filter((i) => i.days > 14);

const out = [t("# What is due", "# Was ansteht"), ""];
if (overdue.length) {
  out.push(t("## Overdue", "## Überfällig"), ...overdue.map((i) => `- ${i.text}`), "");
}
if (now.length) {
  out.push(t("## Next two weeks", "## Nächste zwei Wochen"), ...now.map((i) => `- ${i.text}`), "");
}
if (later.length) {
  out.push(t("## Later", "## Später"), ...later.map((i) => `- ${i.text}`), "");
}
console.log(out.join("\n").trimEnd());
