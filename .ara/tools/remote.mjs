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
 *
 * Ein Gerät ohne Kunden liegt unter devices/<gerät>/, dann fällt --customer weg:
 *
 *   node .ara/tools/remote.mjs --device zentrale --check
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, fail, helpOnly, parseArgs, readDevice, sshArgs as sshArgsFrom } from "./lib/kit.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();

if (typeof arg.customer !== "string" && typeof arg.device !== "string") {
  console.log(
    [
      "Fernzugriff. Befehl auf einem Gerät ausführen",
      "",
      "  --customer <name>      welcher Kunde. Ohne Kunden gilt devices/",
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
  device = readDevice(
    typeof arg.customer === "string" ? arg.customer : null,
    typeof arg.device === "string" ? arg.device : null
  );
} catch (error) {
  fail(error.message);
}

let sshArgs;
let label;
try {
  ({ args: sshArgs, label } = sshArgsFrom(device.fields));
} catch (error) {
  fail(
    `${error.message}\n` +
      `Nachsehen in ${device.file}: address (oder hostname) gehört dort hinein, ` +
      "sobald das Gerät im Netz erreichbar ist."
  );
}
const place = device.customer ? `${device.customer}/${device.device}` : device.device;

if (arg.check || !arg.command) {
  const probe = spawnSync("ssh", [...sshArgs, "-o", "BatchMode=yes", "echo bereit"], {
    encoding: "utf8",
  });
  if (probe.status === 0 && /bereit/.test(probe.stdout || "")) {
    console.log(`Verbindung steht: ${label} (${place})`);
    process.exit(0);
  }
  const message = (probe.stderr || "").trim().split("\n").slice(0, 4).join("\n");
  console.log(
    [
      `Keine Verbindung zu ${label} (${place}).`,
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
      ...(device.customer ? ["--customer", device.customer] : []),
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
