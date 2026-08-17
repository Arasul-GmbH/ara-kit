/**
 * Gemeinsame Grundlagen der Kit-Werkzeuge.
 * Bezeichner englisch, Ausgaben deutsch. Keine Abhängigkeiten außer Node.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const CUSTOMERS = join(ROOT, "customers");
export const BUSINESS = join(ROOT, "business");

/** Zeitstempel in lesbarer lokaler Form: 2026-08-16 15:42 */
export function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Datum allein: 2026-08-16 */
export function today() {
  return now().slice(0, 10);
}

/** Tage bis zu einem Datum. Negativ heißt überfällig. */
export function daysUntil(dateString) {
  if (!dateString) return null;
  const target = new Date(`${String(dateString).trim().slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(`${today()}T00:00:00`);
  return Math.round((target - start) / 86_400_000);
}

/**
 * Zerlegt eine Markdown-Datei mit Frontmatter.
 * Flache Schlüssel-Wert-Paare, keine Listen, genau das nutzen die Vorlagen.
 */
export function readFrontmatter(path) {
  if (!existsSync(path)) return { fields: {}, body: "", exists: false };
  const content = readFileSync(path, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fields: {}, body: content, exists: true };

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!pair) continue;
    // Erläuternde Kommentare abschneiden, auch wenn das Feld leer ist und der
    // Kommentar direkt hinter dem Doppelpunkt steht. Sonst wird der Erklärtext
    // der Vorlage als Wert gelesen.
    let value = pair[2].trim().replace(/(^|\s+)#.*$/, "").trim();
    value = value.replace(/^["']|["']$/g, "");
    fields[pair[1]] = value;
  }
  return { fields, body: match[2], exists: true };
}

/** Schreibt Frontmatter-Felder zurück, ohne Reihenfolge oder Rumpf zu verlieren. */
export function writeFrontmatter(path, changes) {
  const content = readFileSync(path, "utf8");
  const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  if (!match) throw new Error(`${path} hat keinen Frontmatter-Block.`);

  const pending = new Set(Object.keys(changes));
  const lines = match[2].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!pair || !pending.has(pair[1])) return line;
    pending.delete(pair[1]);
    return `${pair[1]}: ${changes[pair[1]]}`;
  });
  for (const key of pending) lines.push(`${key}: ${changes[key]}`);

  writeFileSync(path, match[1] + lines.join("\n") + match[3] + match[4]);
}

/** Pfad zum Kundenordner. Prüft nicht, ob er existiert. */
export function customerPath(customer) {
  return join(CUSTOMERS, customer);
}

/** Alle angelegten Kunden. */
export function listCustomers() {
  if (!existsSync(CUSTOMERS)) return [];
  return readdirSync(CUSTOMERS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/** Alle Geräte eines Kunden. */
export function listDevices(customer) {
  const dir = join(customerPath(customer), "devices");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/**
 * Löst Kunde und Gerät auf. Fehlt die Gerätebezeichnung und es gibt genau eines,
 * wird dieses genommen: bei mehreren ist Raten nicht erlaubt.
 */
export function resolveDevice(customer, device) {
  if (!customer) throw new Error("Es fehlt die Angabe, um welchen Kunden es geht.");
  if (!existsSync(customerPath(customer))) {
    const known = listCustomers();
    throw new Error(
      `Den Kunden "${customer}" gibt es nicht.` +
        (known.length ? ` Vorhanden: ${known.join(", ")}` : " Es ist noch kein Kunde angelegt.")
    );
  }

  const devices = listDevices(customer);
  if (device) {
    if (!devices.includes(device)) {
      throw new Error(
        `Bei "${customer}" gibt es kein Gerät "${device}".` +
          (devices.length ? ` Vorhanden: ${devices.join(", ")}` : " Es ist noch kein Gerät angelegt.")
      );
    }
    return { customer, device, path: join(customerPath(customer), "devices", device) };
  }

  if (devices.length === 0) throw new Error(`Bei "${customer}" ist noch kein Gerät angelegt.`);
  if (devices.length > 1) {
    throw new Error(
      `"${customer}" hat mehrere Geräte (${devices.join(", ")}). Sag, um welches es geht.`
    );
  }
  return { customer, device: devices[0], path: join(customerPath(customer), "devices", devices[0]) };
}

/** Liest die Gerätedaten und ergänzt die Pfade der Nachbardateien. */
export function readDevice(customer, device) {
  const target = resolveDevice(customer, device);
  const file = join(target.path, "device.md");
  const { fields } = readFrontmatter(file);
  return { ...target, file, runsheet: join(target.path, "runsheet.md"), fields };
}

/** Einfache Auswertung von --key value und --flag. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const part = argv[i];
    if (!part.startsWith("--")) {
      out._.push(part);
      continue;
    }
    const name = part.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[name] = true;
    } else {
      out[name] = next;
      i++;
    }
  }
  return out;
}

/** Legt einen Ordner an, falls er fehlt. */
export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
  return path;
}

/** Bricht mit einer verständlichen Meldung ab. */
export function fail(message) {
  console.error(message);
  process.exit(1);
}
