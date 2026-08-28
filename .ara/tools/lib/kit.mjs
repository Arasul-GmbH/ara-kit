/**
 * Gemeinsame Grundlagen der Kit-Werkzeuge.
 * Bezeichner englisch, Ausgaben in der Sprache des Profils. Keine Abhängigkeiten
 * außer Node.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { language, t } from "./i18n.mjs";

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

/** Eine Frontmatter-Zeile. Ein leerer Wert lässt kein Leerzeichen am Zeilenende zurück. */
function field(key, value) {
  const text = value === undefined || value === null ? "" : String(value);
  return text === "" ? `${key}:` : `${key}: ${text}`;
}

/** Schreibt Frontmatter-Felder zurück, ohne Reihenfolge oder Rumpf zu verlieren. */
export function writeFrontmatter(path, changes) {
  const content = readFileSync(path, "utf8");
  const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  if (!match) throw new Error(t(`${path} has no frontmatter block.`, `${path} hat keinen Frontmatter-Block.`));

  const pending = new Set(Object.keys(changes));
  const lines = match[2].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!pair || !pending.has(pair[1])) return line;
    pending.delete(pair[1]);
    return field(pair[1], changes[pair[1]]);
  });
  for (const key of pending) lines.push(field(key, changes[key]));

  writeFileSync(path, match[1] + lines.join("\n") + match[3] + match[4]);
}

/**
 * Geräte ohne Kunden liegen unter devices/<gerät>/, in beiden Zweigen: beim
 * Unternehmen ist das der Normalfall, beim Partner sind es die eigenen Geräte
 * (Vorführung, Übung). Kundengeräte liegen unter customers/<kunde>/devices/<gerät>/.
 * Überall dort, wo ein Kunde stehen kann, heißt "kein Kunde" darum: devices/.
 */
export const DEVICES = join(ROOT, "devices");

/** Pfad zum Kundenordner. Prüft nicht, ob er existiert. */
export function customerPath(customer) {
  return join(CUSTOMERS, customer);
}

/** Ordner eines Geräts, mit oder ohne Kunden. Prüft nicht, ob er existiert. */
export function devicePath(customer, device) {
  return customer ? join(customerPath(customer), "devices", device) : join(DEVICES, device);
}

/** Alle angelegten Kunden. */
export function listCustomers() {
  if (!existsSync(CUSTOMERS)) return [];
  return readdirSync(CUSTOMERS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/** Alle Geräte eines Kunden, oder ohne Kunden die unter devices/. */
export function listDevices(customer) {
  const dir = customer ? join(customerPath(customer), "devices") : DEVICES;
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/**
 * Löst Kunde und Gerät auf. Ohne Kunden wird unter devices/ gesucht. Fehlt die
 * Gerätebezeichnung und es gibt genau eines, wird dieses genommen: bei mehreren
 * ist Raten nicht erlaubt.
 */
export function resolveDevice(customer, device) {
  customer = customer || null;
  const where = customer
    ? t(`Under "${customer}"`, `Bei "${customer}"`)
    : t("Under devices/", "Unter devices/");

  if (customer && !existsSync(customerPath(customer))) {
    const known = listCustomers();
    throw new Error(
      t(`There is no customer "${customer}".`, `Den Kunden "${customer}" gibt es nicht.`) +
        (known.length
          ? t(` Known: ${known.join(", ")}`, ` Vorhanden: ${known.join(", ")}`)
          : t(" No customer has been created yet.", " Es ist noch kein Kunde angelegt."))
    );
  }

  const devices = listDevices(customer);
  if (device) {
    if (!devices.includes(device)) {
      throw new Error(
        t(`${where} there is no device "${device}".`, `${where} gibt es kein Gerät "${device}".`) +
          (devices.length
            ? t(` Known: ${devices.join(", ")}`, ` Vorhanden: ${devices.join(", ")}`)
            : t(" No device has been created yet.", " Es ist noch kein Gerät angelegt."))
      );
    }
    return { customer, device, path: devicePath(customer, device) };
  }

  if (devices.length === 0) {
    throw new Error(
      customer
        ? t(`"${customer}" has no device yet.`, `Bei "${customer}" ist noch kein Gerät angelegt.`)
        : t(
            "There is no device under devices/ yet. Create one with /device <name>.",
            "Unter devices/ ist noch kein Gerät angelegt. Anlegen mit /device <name>."
          )
    );
  }
  if (devices.length > 1) {
    throw new Error(
      t(
        `${customer ? `"${customer}" has` : "There are"} several devices (${devices.join(", ")}). Say which one you mean.`,
        `${customer ? `"${customer}" hat` : "Es gibt"} mehrere Geräte (${devices.join(", ")}). Sag, um welches es geht.`
      )
    );
  }
  return { customer, device: devices[0], path: devicePath(customer, devices[0]) };
}

/** Liest die Gerätedaten und ergänzt die Pfade der Nachbardateien. */
export function readDevice(customer, device) {
  const target = resolveDevice(customer, device);
  const file = join(target.path, "device.md");
  const { fields } = readFrontmatter(file);
  return { ...target, file, runsheet: join(target.path, "runsheet.md"), fields };
}

/**
 * Die Aufrufzeile für `ssh` aus einer Geräteakte.
 *
 * Die Verbindungsdaten stehen in der Akte und nicht im Befehl: damit kann kein
 * Gerät mit den Daten eines anderen Kunden angesprochen werden. Der private
 * Schlüssel bleibt in `~/.ssh`, im Kit steht nur sein Name.
 *
 * `batch` heißt: keine Passwortfrage. Für eine Prüfung, die niemand beobachtet,
 * ist eine Eingabeaufforderung, die auf niemanden trifft, nur eine Wartezeit.
 */
export function sshArgs(fields, { batch = false } = {}) {
  const host = fields.address || fields.hostname;
  if (!host) throw new Error(t("The device file names no address.", "In der Geräteakte steht keine Adresse."));
  const user = fields.ssh_user || "arasul";
  const port = fields.ssh_port || "22";
  const args = [
    "-o",
    "ConnectTimeout=8",
    ...(batch ? ["-o", "BatchMode=yes"] : []),
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-p",
    String(port),
  ];
  if (fields.ssh_key) {
    const path = fields.ssh_key.startsWith("/")
      ? fields.ssh_key
      : join(homedir(), ".ssh", fields.ssh_key);
    if (!existsSync(path)) {
      throw new Error(
        t(
          `The key ${fields.ssh_key} is not at ${path}.\n` +
            "Check the name in the device file: the kit only stores the name, the key itself stays in ~/.ssh.",
          `Der Schlüssel ${fields.ssh_key} liegt nicht unter ${path}.\n` +
            "Prüf den Namen in der Geräteakte, im Kit steht nur der Name, der Schlüssel selbst bleibt in ~/.ssh."
        )
      );
    }
    args.push("-i", path);
  }
  args.push(`${user}@${host}`);
  return { args, label: `${user}@${host}:${port}` };
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

/**
 * Die Trennlinie im Kopf eines Werkzeugs. Darüber steht die englische Hilfe,
 * darunter dieselbe auf Deutsch.
 */
export const HELP_SPLIT = "=== deutsch ===";

/**
 * Die Kopfhilfe eines Werkzeugs: der Kommentarblock am Anfang seiner Datei.
 *
 * Gelesen wird die Datei selbst und keine zweite Fassung daneben. Damit können
 * Hilfe und Erklärung nicht auseinanderlaufen: wer den Kopf ändert, ändert die
 * Hilfe. Aus demselben Grund stehen beide Sprachen in demselben Kopf, getrennt
 * durch `=== deutsch ===`, und nicht in zwei Dateien nebeneinander.
 *
 * Fehlt der deutsche Teil, gibt es den englischen. Ein Werkzeug ohne Hilfe wäre
 * schlimmer als eines mit Hilfe in der falschen Sprache. Dass keiner fehlt,
 * prüft der Selbsttest.
 */
export function headerHelp(url, lang = language()) {
  const path = fileURLToPath(url);
  const block = readFileSync(path, "utf8").match(/^(?:#![^\n]*\r?\n)?\s*\/\*\*([\s\S]*?)\*\//);
  if (!block) {
    return t(
      `${basename(path)} has no header that could become a help text.`,
      `${basename(path)} hat keinen Kopf, aus dem eine Hilfe entstehen könnte.`
    );
  }
  const text = block[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\* ?/, ""))
    .join("\n");
  const parts = text.split(new RegExp(`^${HELP_SPLIT}$`, "m"));
  return (lang === "de" ? parts[1] ?? parts[0] : parts[0]).trim();
}

/**
 * `--help` beantwortet jedes Werkzeug mit seiner Kopfhilfe, und dann ist Schluss.
 *
 * Der Fremdtest am 28.08.2026 rief `device.mjs --help` auf und bekam eine
 * Geräteprüfung, `mirror.mjs --help` lud den Spiegel. Ein Hilfeflag, das
 * arbeitet, ist eine Falle: wer wissen will, was ein Werkzeug tut, hat sich
 * gerade nicht dafür entschieden, dass es etwas tut. Darum steht der Aufruf in
 * jedem Werkzeug vor der ersten Zeile Arbeit, und er sieht in `process.argv`
 * nach statt in `parseArgs`: `--help` mit etwas dahinter bliebe dort ein Wert.
 */
export function helpOnly(url, argv = process.argv.slice(2)) {
  if (!argv.some((part) => part === "--help" || part === "-h")) return;
  console.log(headerHelp(url));
  process.exit(0);
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
