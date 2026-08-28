#!/usr/bin/env node
/**
 * Remote access: run a command on a customer device and write it down.
 *
 * The connection details stand in the device file, not in the command. That way no
 * device can be addressed with another customer's details by accident, and every
 * execution lands in the runsheet.
 *
 *   node .ara/tools/remote.mjs --customer mueller --check
 *   node .ara/tools/remote.mjs --customer mueller --command "uptime"
 *   node .ara/tools/remote.mjs --customer mueller --device werk2 --command "df -h" --log
 *
 * A device without a customer lies under devices/<device>/, and then --customer
 * falls away:
 *
 *   node .ara/tools/remote.mjs --device zentrale --check
 *
 * === deutsch ===
 *
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
import { t } from "./lib/i18n.mjs";
import { ROOT, fail, helpOnly, parseArgs, readDevice, sshArgs as sshArgsFrom } from "./lib/kit.mjs";

helpOnly(import.meta.url);
const arg = parseArgs();

if (typeof arg.customer !== "string" && typeof arg.device !== "string") {
  console.log(
    t(
      [
        "Remote access. Run a command on a device",
        "",
        "  --customer <name>      which customer. Without a customer devices/ applies",
        "  --device <name>        which device (only needed when there are several)",
        "  --check                only test the connection",
        '  --command "<command>"  run it on the device',
        "  --log                  write the result into the runsheet",
      ].join("\n"),
      [
        "Fernzugriff. Befehl auf einem Gerät ausführen",
        "",
        "  --customer <name>      welcher Kunde. Ohne Kunden gilt devices/",
        "  --device <name>        welches Gerät (nur nötig, wenn es mehrere gibt)",
        "  --check                nur die Verbindung testen",
        '  --command "<befehl>"   auf dem Gerät ausführen',
        "  --log                  Ergebnis in den Laufzettel schreiben",
      ].join("\n")
    )
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
      t(
        `Look in ${device.file}: address (or hostname) belongs there ` +
          "as soon as the device is reachable on the network.",
        `Nachsehen in ${device.file}: address (oder hostname) gehört dort hinein, ` +
          "sobald das Gerät im Netz erreichbar ist."
      )
  );
}
const place = device.customer ? `${device.customer}/${device.device}` : device.device;

if (arg.check || !arg.command) {
  const probe = spawnSync("ssh", [...sshArgs, "-o", "BatchMode=yes", "echo bereit"], {
    encoding: "utf8",
  });
  if (probe.status === 0 && /bereit/.test(probe.stdout || "")) {
    console.log(t(`Connection stands: ${label} (${place})`, `Verbindung steht: ${label} (${place})`));
    process.exit(0);
  }
  const message = (probe.stderr || "").trim().split("\n").slice(0, 4).join("\n");
  console.log(
    [
      t(`No connection to ${label} (${place}).`, `Keine Verbindung zu ${label} (${place}).`),
      message ? t(`\nMessage:\n${message}`, `\nMeldung:\n${message}`) : "",
      "",
      ...t(
        [
          "Frequent reasons: device not reachable, wrong port after the hardening,",
          "key not rolled out yet, or the key has a passphrase and is",
          "not loaded in the agent (ssh-add).",
        ],
        [
          "Häufige Gründe: Gerät nicht erreichbar, falscher Port nach der Härtung,",
          "Schlüssel noch nicht ausgerollt, oder der Schlüssel hat eine Passphrase und ist",
          "nicht im Agenten geladen (ssh-add).",
        ]
      ),
    ].join("\n")
  );
  process.exit(1);
}

const command = String(arg.command);
const run = spawnSync("ssh", [...sshArgs, command], { encoding: "utf8" });

const output = `${run.stdout || ""}${run.stderr || ""}`.trimEnd();
if (output) console.log(output);
console.log(t(`\n[${label}] return code ${run.status}`, `\n[${label}] Rückgabecode ${run.status}`));

if (arg.log) {
  const excerpt = output.split("\n").slice(0, 8).join("\n");
  const entry = t(
    `Command on ${label}:\n\n    ${command}\n\nReturn code ${run.status}.` +
      (excerpt ? `\n\nOutput (beginning):\n\n\`\`\`\n${excerpt}\n\`\`\`` : ""),
    `Befehl auf ${label}:\n\n    ${command}\n\nRückgabecode ${run.status}.` +
      (excerpt ? `\n\nAusgabe (Anfang):\n\n\`\`\`\n${excerpt}\n\`\`\`` : "")
  );

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
      t(
        "Note: the entry in the runsheet did not work " +
          `(${(logged.stderr || "").trim() || "no runsheet present"}).`,
        "Hinweis: Der Eintrag im Laufzettel hat nicht geklappt " +
          `(${(logged.stderr || "").trim() || "kein Laufzettel vorhanden"}).`
      )
    );
  }
}

process.exit(run.status ?? 1);
