#!/usr/bin/env node
/**
 * Geheimnisse verwalten.
 *
 *   node .ara/tools/secrets.mjs --show                 wo liegen sie, welche Namen, was ist gesetzt
 *   node .ara/tools/secrets.mjs --set ARASUL_TOKEN     Wert wird abgefragt, nicht angezeigt
 *   node .ara/tools/secrets.mjs --store keychain       Ablage wechseln
 *
 * `--show` zählt jeden Namen auf, den das Kit vergibt: die bekannten Zugänge und
 * jeden Eintrag, auf den eine Geräteakte zeigt, also auch das Startpasswort des
 * Administrators. Namen, keine Werte.
 *
 * Der Wert wird nie als Argument übergeben: sonst stünde er in der Prozessliste
 * und im Verlauf der Kommandozeile. Am Terminal wird er gefragt und dabei
 * verdeckt; hängt keines dran, wird er von der Standardeingabe gelesen:
 *
 *   printf '%s' "$WERT" | node .ara/tools/secrets.mjs --set ARASUL_TOKEN
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  ROOT,
  devicePath,
  fail,
  helpOnly,
  listCustomers,
  listDevices,
  parseArgs,
  readFrontmatter,
  writeFrontmatter,
} from "./lib/kit.mjs";
import {
  activeStore,
  envNames,
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
 * Die Geheimnisse der Geräte heißen je Gerät anders. Sie stehen nicht in der
 * Liste oben, sondern in den Geräteakten: dort steht der Name des Eintrags,
 * hier steht, ob dazu wirklich etwas hinterlegt ist. Der Wert bleibt unsichtbar.
 *
 * Aufgezählt wird **jedes** Feld, das auf einen Eintrag zeigt, und nicht nur der
 * Kit-Schlüssel. Am 28.08.2026 legte die Installation das Startpasswort des
 * Administrators unter `ARASUL_START_<gerät>` ab, und dieses Blatt nannte den
 * Namen nicht: das Geheimnis lag da, und niemand kam an es heran.
 */
const REF_FIELDS = [
  { field: "api_key_ref", info: "Kit-Schlüssel für den Deploy (app:deploy)" },
  { field: "start_password_ref", info: "Startpasswort des Administrators aus der Installation" },
  { field: "secret_ref", info: "Geheimnis dieser Akte" },
];

function deviceSecrets() {
  const found = [];
  for (const customer of [null, ...listCustomers()]) {
    for (const device of listDevices(customer)) {
      const { fields } = readFrontmatter(join(devicePath(customer, device), "device.md"));
      for (const entry of REF_FIELDS) {
        const ref = fields[entry.field];
        if (!ref) continue;
        found.push({
          place: customer ? `${customer}/${device}` : device,
          customer,
          device,
          field: entry.field,
          info: entry.info,
          ref,
          set: hasSecret(ref),
        });
      }
    }
  }
  return found;
}

helpOnly(import.meta.url);
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

  /** Ein Wert ist die erste Zeile. Was danach kommt, war Beiwerk der Eingabe. */
  const store = (raw) => {
    const value = String(raw).split(/\r?\n/)[0].trim();
    if (!value) fail(`Für ${name} kam kein Wert an. Es ist nichts hinterlegt worden.`);
    try {
      const used = setSecret(name, value);
      console.log(`${name} hinterlegt in: ${storeLabel(used)}.`);
    } catch (error) {
      console.error(`Konnte ${name} nicht speichern: ${error.message}`);
      process.exit(1);
    }
  };

  if (process.stdin.isTTY) {
    // Am Terminal wird gefragt, und die Eingabe bleibt verdeckt.
    const question = `Wert für ${name} (wird nicht angezeigt): `;
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = function (text) {
      if (text.includes(question)) rl.output.write(question);
    };
    rl.question(question, (value) => {
      rl.close();
      process.stdout.write("\n");
      store(value);
    });
  } else {
    // Ohne Terminal ist niemand da, den man fragen könnte. Der Fremdtest am
    // 28.08.2026 lief so, und das Token blieb "fehlt": das Werkzeug fragte in
    // eine Leitung hinein, an deren Ende kein Mensch saß. Dann gilt, was auf
    // der Standardeingabe steht. Das ist kein Rückschritt bei der Sicherheit:
    // ein Wert in einer Leitung steht nicht in der Prozessliste, ein Wert als
    // Argument stünde dort.
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => store(raw));
  }
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
  const named = new Set();
  for (const entry of KNOWN) {
    named.add(entry.name);
    lines.push(`- ${entry.name}: ${hasSecret(entry.name) ? "hinterlegt" : "fehlt"}: ${entry.info}`);
  }

  const devices = deviceSecrets();
  if (devices.length) {
    lines.push("", "Geheimnisse der Geräte, Namen aus der jeweiligen Akte:");
    for (const entry of devices) {
      named.add(entry.ref);
      lines.push(`- ${entry.ref}: ${entry.set ? "hinterlegt" : "fehlt"}: Gerät ${entry.place}, ${entry.info}`);
      // Das Startpasswort ist kein Wert zum Ansehen, sondern einer zum Benutzen.
      // Darum steht hier der Handgriff und nicht nur der Name.
      if (entry.field === "start_password_ref" && entry.set) {
        lines.push(
          "  Erste Anmeldung als Administrator, gibt eine Sitzung und zeigt das Passwort nicht:",
          `    node .ara/tools/device.mjs ${entry.customer ? `--customer ${entry.customer} ` : ""}` +
            `--name ${entry.device} --admin-login`
        );
      }
    }
  }

  // Was sonst noch in der Ablage steht. Die .env lässt sich auflisten, der
  // Schlüsselbund nicht: dort geht nur die gezielte Frage nach einem Eintrag.
  const rest = store === "env" ? envNames().filter((name) => !named.has(name)) : [];
  if (rest.length) {
    lines.push(
      "",
      "Weitere Namen in der Ablage, die zu keiner Akte und zu keinem bekannten Eintrag gehören:",
      ...rest.map((name) => `- ${name}`)
    );
  }
  if (store === "keychain") {
    lines.push(
      "",
      "Der Schlüsselbund lässt sich nicht auflisten. Aufgezählt ist, was das Kit selbst vergibt;",
      "ob ein Name dort einen Wert hat, steht oben."
    );
  }

  lines.push(
    "",
    "Werte werden nie angezeigt. Setzen mit:",
    "  node .ara/tools/secrets.mjs --set ARASUL_TOKEN",
    "Ohne Terminal kommt der Wert von der Standardeingabe:",
    "  printf '%s' \"$WERT\" | node .ara/tools/secrets.mjs --set ARASUL_TOKEN"
  );
  console.log(lines.join("\n"));
}
