#!/usr/bin/env node
/**
 * Manage secrets.
 *
 *   node .ara/tools/secrets.mjs --show                 where they lie, which names, what is set
 *   node .ara/tools/secrets.mjs --set ARASUL_TOKEN     the value is asked for, not displayed
 *   node .ara/tools/secrets.mjs --store keychain       change the store
 *
 * `--show` lists every name the kit assigns: the known credentials and every entry
 * a device file points at, so the administrator's start password too. Names, not
 * values.
 *
 * The value is never passed as an argument: otherwise it would stand in the process
 * list and in the shell history. At a terminal it gets asked for and hidden while
 * typed; if there is no terminal, it gets read from standard input:
 *
 *   printf '%s' "$VALUE" | node .ara/tools/secrets.mjs --set ARASUL_TOKEN
 *
 * === deutsch ===
 *
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
import { t } from "./lib/i18n.mjs";
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
  otherStore,
  setSecret,
} from "./lib/secrets.mjs";

const KNOWN = [
  {
    name: "ARASUL_TOKEN",
    info: t(
      "device token from https://www.arasul.de/kaufen, one free per account for personal use. Only needed for the installation, /device shows the way",
      "Geräte-Token von https://www.arasul.de/kaufen, einer je Konto kostenlos für den persönlichen Gebrauch. Erst für die Installation nötig, /device zeigt den Weg"
    ),
  },
  {
    name: "ARASUL_BASIS",
    info: t(
      "address of the portal (only for a deviating installation)",
      "Adresse des Portals (nur bei abweichender Installation)"
    ),
  },
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
  { field: "api_key_ref", info: t("kit key for the deploy (app:deploy)", "Kit-Schlüssel für den Deploy (app:deploy)") },
  {
    field: "start_password_ref",
    info: t(
      "the administrator's start password from the installation",
      "Startpasswort des Administrators aus der Installation"
    ),
  },
  { field: "secret_ref", info: t("secret of this file", "Geheimnis dieser Akte") },
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
  return store === "keychain"
    ? t(`keychain (${keychainHint()})`, `Schlüsselbund (${keychainHint()})`)
    : t(".env file in the kit", ".env-Datei im Kit");
}

// Ablage wechseln
if (typeof arg.store === "string") {
  const wanted = arg.store.toLowerCase();
  if (!["env", "keychain"].includes(wanted)) fail(t("--store takes env or keychain.", "--store nimmt env oder keychain."));
  if (wanted === "keychain" && !keychainAvailable()) {
    fail(
      t(
        `The keychain is not usable here: ${keychainHint()}.\n` +
          "Stay with the .env or install the missing tool.",
        `Der Schlüsselbund ist hier nicht nutzbar: ${keychainHint()}.\n` +
          "Bleib bei der .env oder installier das fehlende Werkzeug."
      )
    );
  }
  if (!existsSync(PROFILE)) {
    fail(t("business/profile.md does not exist yet. Run /init first.", "business/profile.md gibt es noch nicht. Lauf zuerst durch /init."));
  }
  writeFrontmatter(PROFILE, { secrets_store: wanted });
  console.log(
    t(
      `Store changed to: ${storeLabel(wanted)}.\n` +
        "Secrets already stored stay where they lie, and from now on they no longer apply:\n" +
        "what counts is the chosen store and nothing else. Set them once again to move them.\n" +
        "  node .ara/tools/secrets.mjs --show   says which names lie in the other one",
      `Ablage umgestellt auf: ${storeLabel(wanted)}.\n` +
        "Bereits hinterlegte Geheimnisse bleiben liegen, wo sie liegen, und gelten von jetzt an nicht mehr:\n" +
        "es zählt die gewählte Ablage und sonst keine. Setz sie einmal neu, dann ziehen sie um.\n" +
        "  node .ara/tools/secrets.mjs --show   sagt, welche Namen in der anderen liegen"
    )
  );
  process.exit(0);
}

// Setzen
if (typeof arg.set === "string") {
  const name = arg.set;
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
    fail(t("The name may only contain capital letters and _.", "Der Name darf nur Großbuchstaben und _ enthalten."));
  }

  /** Ein Wert ist die erste Zeile. Was danach kommt, war Beiwerk der Eingabe. */
  const store = (raw) => {
    const value = String(raw).split(/\r?\n/)[0].trim();
    if (!value) {
      fail(t(`No value arrived for ${name}. Nothing has been stored.`, `Für ${name} kam kein Wert an. Es ist nichts hinterlegt worden.`));
    }
    try {
      const used = setSecret(name, value);
      console.log(t(`${name} stored in: ${storeLabel(used)}.`, `${name} hinterlegt in: ${storeLabel(used)}.`));
    } catch (error) {
      console.error(t(`Could not save ${name}: ${error.message}`, `Konnte ${name} nicht speichern: ${error.message}`));
      process.exit(1);
    }
  };

  if (process.stdin.isTTY) {
    // Am Terminal wird gefragt, und die Eingabe bleibt verdeckt.
    const question = t(`Value for ${name} (not displayed): `, `Wert für ${name} (wird nicht angezeigt): `);
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
    t("# Secrets", "# Geheimnisse"),
    "",
    t(`- Store: ${storeLabel(store)}`, `- Ablage: ${storeLabel(store)}`),
    t(
      `- Keychain available: ${keychainAvailable() ? "yes" : `no (${keychainHint()})`}`,
      `- Schlüsselbund verfügbar: ${keychainAvailable() ? "ja" : `nein (${keychainHint()})`}`
    ),
    "",
  ];
  const named = new Set();
  const anderswo = [];

  /**
   * Ein Name liegt nicht in der gewählten Ablage, aber in der anderen. Das
   * gilt nicht als hinterlegt, und es wird trotzdem gesagt: sonst sucht
   * jemand nach einem Wechsel der Ablage einen Wert, der zwei Zeilen weiter
   * liegt.
   */
  const merkeAnderswo = (name) => {
    const wo = hasSecret(name) ? null : otherStore(name);
    if (wo) anderswo.push({ name, wo });
  };

  for (const entry of KNOWN) {
    named.add(entry.name);
    merkeAnderswo(entry.name);
    lines.push(
      `- ${entry.name}: ${hasSecret(entry.name) ? t("stored", "hinterlegt") : t("missing", "fehlt")}: ${entry.info}`
    );
  }

  const devices = deviceSecrets();
  if (devices.length) {
    lines.push("", t("Secrets of the devices, names from their files:", "Geheimnisse der Geräte, Namen aus der jeweiligen Akte:"));
    for (const entry of devices) {
      named.add(entry.ref);
      merkeAnderswo(entry.ref);
      lines.push(
        t(
          `- ${entry.ref}: ${entry.set ? "stored" : "missing"}: device ${entry.place}, ${entry.info}`,
          `- ${entry.ref}: ${entry.set ? "hinterlegt" : "fehlt"}: Gerät ${entry.place}, ${entry.info}`
        )
      );
      // Das Startpasswort ist kein Wert zum Ansehen, sondern einer zum Benutzen.
      // Darum steht hier der Handgriff und nicht nur der Name.
      if (entry.field === "start_password_ref" && entry.set) {
        lines.push(
          t(
            "  First login as administrator, gives a session and does not display the password:",
            "  Erste Anmeldung als Administrator, gibt eine Sitzung und zeigt das Passwort nicht:"
          ),
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
      t(
        "Further names in the store that belong to no file and to no known entry:",
        "Weitere Namen in der Ablage, die zu keiner Akte und zu keinem bekannten Eintrag gehören:"
      ),
      ...rest.map((name) => `- ${name}`)
    );
  }
  if (anderswo.length) {
    lines.push(
      "",
      t(
        `These names do not lie in the chosen store, but in the other one. They do not apply:`,
        `Diese Namen liegen nicht in der gewählten Ablage, sondern in der anderen. Sie gelten nicht:`
      ),
      ...anderswo.map((entry) =>
        t(
          `- ${entry.name}: lies in the ${entry.wo === "env" ? ".env" : "keychain"}. --set fetches it over.`,
          `- ${entry.name}: liegt in ${entry.wo === "env" ? "der .env" : "dem Schlüsselbund"}. --set holt es herüber.`
        )
      )
    );
  }
  if (store === "keychain") {
    lines.push(
      "",
      ...t(
        [
          "The keychain cannot be listed. What is listed is what the kit assigns itself;",
          "whether a name has a value there stands above.",
        ],
        [
          "Der Schlüsselbund lässt sich nicht auflisten. Aufgezählt ist, was das Kit selbst vergibt;",
          "ob ein Name dort einen Wert hat, steht oben.",
        ]
      )
    );
  }

  lines.push(
    "",
    ...t(
      [
        "Values are never displayed. Set them with:",
        "  node .ara/tools/secrets.mjs --set ARASUL_TOKEN",
        "Without a terminal the value comes from standard input:",
        "  printf '%s' \"$VALUE\" | node .ara/tools/secrets.mjs --set ARASUL_TOKEN",
      ],
      [
        "Werte werden nie angezeigt. Setzen mit:",
        "  node .ara/tools/secrets.mjs --set ARASUL_TOKEN",
        "Ohne Terminal kommt der Wert von der Standardeingabe:",
        "  printf '%s' \"$WERT\" | node .ara/tools/secrets.mjs --set ARASUL_TOKEN",
      ]
    )
  );
  console.log(lines.join("\n"));
}
