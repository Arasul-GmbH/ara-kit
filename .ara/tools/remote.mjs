#!/usr/bin/env node
/**
 * Fernzugriff: einen Befehl auf einem Kundengerät ausführen und mitschreiben.
 *
 * Die Verbindungsdaten stehen in der Geräteakte, nicht im Befehl. Damit kann kein
 * Gerät versehentlich mit den Daten eines anderen Kunden angesprochen werden, und
 * jede Ausführung landet im Laufzettel.
 *
 *   node .ara/tools/remote.mjs --customer mueller --check
 *   node .ara/tools/remote.mjs --customer mueller --command "uptime"
 *   node .ara/tools/remote.mjs --customer mueller --device werk2 --command "df -h" --log
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ROOT, fail, parseArgs, readDevice } from "./lib/kit.mjs";

const arg = parseArgs();

if (!arg.customer) {
  console.log(
    [
      "Fernzugriff. Befehl auf einem Kundengerät ausführen",
      "",
      "  --customer <name>      welcher Kunde (Pflicht)",
      "  --device <name>        welches Gerät (nur nötig, wenn es mehrere gibt)",
      "  --check                nur die Verbindung testen",
      '  --command "<befehl>"   auf dem Gerät ausführen',
      "  --log                  Ergebnis in den Laufzettel schreiben",
    ].join("\n")
  );
  process.exit(0);
}

let device;
try {
  device = readDevice(arg.customer, typeof arg.device === "string" ? arg.device : null);
} catch (error) {
  fail(error.message);
}

const fields = device.fields;
const host = fields.address || fields.hostname;
if (!host) {
  fail(
    `In ${device.file} steht keine Adresse.\n` +
      "Trag address (oder hostname) ein, sobald das Gerät im Netz erreichbar ist."
  );
}

const user = fields.ssh_user || "arasul";
const port = fields.ssh_port || "22";
const key = fields.ssh_key;

const sshArgs = ["-o", "ConnectTimeout=8", "-o", "StrictHostKeyChecking=accept-new", "-p", String(port)];

if (key) {
  const keyPath = key.startsWith("/") ? key : join(homedir(), ".ssh", key);
  if (!existsSync(keyPath)) {
    fail(
      `Der Schlüssel ${key} liegt nicht unter ${keyPath}.\n` +
        "Prüf den Namen in der Geräteakte, im Kit steht nur der Name, der Schlüssel selbst bleibt in ~/.ssh."
    );
  }
  sshArgs.push("-i", keyPath);
}

sshArgs.push(`${user}@${host}`);
const label = `${user}@${host}:${port}`;

if (arg.check || !arg.command) {
  const probe = spawnSync("ssh", [...sshArgs, "-o", "BatchMode=yes", "echo bereit"], {
    encoding: "utf8",
  });
  if (probe.status === 0 && /bereit/.test(probe.stdout || "")) {
    console.log(`Verbindung steht: ${label} (${device.customer}/${device.device})`);
    process.exit(0);
  }
  const message = (probe.stderr || "").trim().split("\n").slice(0, 4).join("\n");
  console.log(
    [
      `Keine Verbindung zu ${label} (${device.customer}/${device.device}).`,
      message ? `\nMeldung:\n${message}` : "",
      "",
      "Häufige Gründe: Gerät nicht erreichbar, falscher Port nach der Härtung,",
      "Schlüssel noch nicht ausgerollt, oder der Schlüssel hat eine Passphrase und ist",
      "nicht im Agenten geladen (ssh-add).",
    ].join("\n")
  );
  process.exit(1);
}

const command = String(arg.command);
const run = spawnSync("ssh", [...sshArgs, command], { encoding: "utf8" });

const output = `${run.stdout || ""}${run.stderr || ""}`.trimEnd();
if (output) console.log(output);
console.log(`\n[${label}] Rückgabecode ${run.status}`);

if (arg.log) {
  const excerpt = output.split("\n").slice(0, 8).join("\n");
  const entry =
    `Befehl auf ${label}:\n\n    ${command}\n\n` +
    `Rückgabecode ${run.status}.` +
    (excerpt ? `\n\nAusgabe (Anfang):\n\n\`\`\`\n${excerpt}\n\`\`\`` : "");

  const logged = spawnSync(
    "node",
    [
      join(ROOT, ".ara", "tools", "runsheet.mjs"),
      "--customer",
      device.customer,
      "--device",
      device.device,
      "--entry",
      entry,
    ],
    { encoding: "utf8" }
  );
  if (logged.status !== 0) {
    console.log(
      "Hinweis: Der Eintrag im Laufzettel hat nicht geklappt " +
        `(${(logged.stderr || "").trim() || "kein Laufzettel vorhanden"}).`
    );
  }
}

process.exit(run.status ?? 1);
