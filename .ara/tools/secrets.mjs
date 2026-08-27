#!/usr/bin/env node
/**
 * Geheimnisse verwalten.
 *
 *   node .ara/tools/secrets.mjs --show                 wo liegen sie, was ist gesetzt
 *   node .ara/tools/secrets.mjs --set ARASUL_TOKEN     Wert wird abgefragt, nicht angezeigt
 *   node .ara/tools/secrets.mjs --store keychain       Ablage wechseln
 *
 * Der Wert wird nie als Argument übergeben: sonst stünde er in der Prozessliste
 * und im Verlauf der Kommandozeile.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  ROOT,
  devicePath,
  fail,
  listCustomers,
  listDevices,
  parseArgs,
  readFrontmatter,
  writeFrontmatter,
} from "./lib/kit.mjs";
import {
  activeStore,
  getSecret,
  hasSecret,
  keychainAvailable,
  keychainHint,
  setSecret,
} from "./lib/secrets.mjs";

const KNOWN = [
  {
    name: "ARASUL_TOKEN",
    info: "Download-Token aus dem Partnerportal, fünf je Partner kostenlos. Erst für die Installation nötig",
  },
  { name: "ARASUL_BASIS", info: "Adresse des Portals (nur bei abweichender Installation)" },
];

/**
 * Die Kit-Schlüssel der Geräte heißen je Gerät anders. Sie stehen nicht in der
 * Liste oben, sondern in den Geräteakten: dort steht der Name des Eintrags,
 * hier steht, ob dazu wirklich etwas hinterlegt ist. Der Wert bleibt unsichtbar.
 */
function deviceKeys() {
  const found = [];
  for (const customer of [null, ...listCustomers()]) {
    for (const device of listDevices(customer)) {
      const { fields } = readFrontmatter(join(devicePath(customer, device), "device.md"));
      if (!fields.api_key_ref) continue;
      found.push({
        place: customer ? `${customer}/${device}` : device,
        ref: fields.api_key_ref,
        set: hasSecret(fields.api_key_ref),
      });
    }
  }
  return found;
}

const arg = parseArgs();
const PROFILE = join(ROOT, "business", "profile.md");

function storeLabel(store) {
  return store === "keychain" ? `Schlüsselbund (${keychainHint()})` : ".env-Datei im Kit";
}

// Ablage wechseln
if (typeof arg.store === "string") {
  const wanted = arg.store.toLowerCase();
  if (!["env", "keychain"].includes(wanted)) fail("--store nimmt env oder keychain.");
  if (wanted === "keychain" && !keychainAvailable()) {
    fail(
      `Der Schlüsselbund ist hier nicht nutzbar: ${keychainHint()}.\n` +
        "Bleib bei der .env oder installier das fehlende Werkzeug."
    );
  }
  if (!existsSync(PROFILE)) {
    fail("business/profile.md gibt es noch nicht. Lauf zuerst durch /init.");
  }
  writeFrontmatter(PROFILE, { secrets_store: wanted });
  console.log(
    `Ablage umgestellt auf: ${storeLabel(wanted)}.\n` +
      "Bereits hinterlegte Geheimnisse bleiben, wo sie sind, sie werden weiterhin gefunden.\n" +
      "Wenn du sie umziehen willst, setz sie einmal neu."
  );
  process.exit(0);
}

// Setzen
if (typeof arg.set === "string") {
  const name = arg.set;
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) fail("Der Name darf nur Großbuchstaben und _ enthalten.");

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const question = `Wert für ${name} (wird nicht angezeigt): `;

  // Eingabe verdecken, solange ein Terminal vorhanden ist.
  const hide = process.stdin.isTTY;
  if (hide) {
    rl._writeToOutput = function (text) {
      if (text.includes(question)) rl.output.write(question);
    };
  }

  rl.question(question, (value) => {
    rl.close();
    process.stdout.write("\n");
    try {
      const used = setSecret(name, value.trim());
      console.log(`${name} hinterlegt in: ${storeLabel(used)}.`);
    } catch (error) {
      console.error(`Konnte ${name} nicht speichern: ${error.message}`);
      process.exit(1);
    }
  });
} else if (typeof arg.get === "string") {
  // Für Skripte. Gibt den Wert aus, im Gespräch nicht verwenden.
  const value = getSecret(arg.get);
  if (!value) process.exit(1);
  process.stdout.write(value);
} else {
  const store = activeStore();
  const lines = [
    "# Geheimnisse",
    "",
    `- Ablage: ${storeLabel(store)}`,
    `- Schlüsselbund verfügbar: ${keychainAvailable() ? "ja" : `nein (${keychainHint()})`}`,
    "",
  ];
  for (const entry of KNOWN) {
    lines.push(`- ${entry.name}: ${hasSecret(entry.name) ? "hinterlegt" : "fehlt"}: ${entry.info}`);
  }
  const devices = deviceKeys();
  if (devices.length) {
    lines.push("", "Kit-Schlüssel der Geräte (app:deploy), Name aus der jeweiligen Akte:");
    for (const entry of devices) {
      lines.push(`- ${entry.ref}: ${entry.set ? "hinterlegt" : "fehlt"}: Gerät ${entry.place}`);
    }
  }
  lines.push(
    "",
    "Werte werden nie angezeigt. Setzen mit:",
    "  node .ara/tools/secrets.mjs --set ARASUL_TOKEN"
  );
  console.log(lines.join("\n"));
}
