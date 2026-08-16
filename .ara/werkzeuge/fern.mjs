#!/usr/bin/env node
/**
 * Fern — einen Befehl auf einem Kundengerät ausführen und mitschreiben.
 *
 * Die Verbindungsdaten stehen in der Geräteakte, nicht im Befehl. Damit kann kein
 * Gerät versehentlich mit den Daten eines anderen Kunden angesprochen werden, und
 * jede Ausführung landet im Laufzettel.
 *
 *   node .ara/werkzeuge/fern.mjs --kunde mueller --pruefen
 *   node .ara/werkzeuge/fern.mjs --kunde mueller --befehl "uptime"
 *   node .ara/werkzeuge/fern.mjs --kunde mueller --geraet werk2 --befehl "df -h" --protokoll
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { WURZEL, abbruch, argumente, geraetLesen } from "./lib/kit.mjs";

const arg = argumente();

if (!arg.kunde) {
  console.log(
    [
      "Fern — Befehl auf einem Kundengerät ausführen",
      "",
      "  --kunde <name>        welcher Kunde (Pflicht)",
      "  --geraet <name>       welches Gerät (nur nötig, wenn es mehrere gibt)",
      "  --pruefen             nur die Verbindung testen",
      '  --befehl "<befehl>"   auf dem Gerät ausführen',
      "  --protokoll           Ergebnis in den Laufzettel schreiben",
    ].join("\n")
  );
  process.exit(0);
}

let geraet;
try {
  geraet = geraetLesen(arg.kunde, typeof arg.geraet === "string" ? arg.geraet : null);
} catch (fehler) {
  abbruch(fehler.message);
}

const felder = geraet.felder;
const ziel = felder.adresse || felder.hostname;
if (!ziel) {
  abbruch(
    `In ${geraet.akte} steht keine Adresse.\n` +
      "Trag adresse (oder hostname) ein, sobald das Gerät im Netz erreichbar ist."
  );
}

const benutzer = felder.ssh_benutzer || "arasul";
const port = felder.ssh_port || "22";
const schluessel = felder.ssh_schluessel;

const sshArgs = [
  "-o",
  "ConnectTimeout=8",
  "-o",
  "StrictHostKeyChecking=accept-new",
  "-p",
  String(port),
];

if (schluessel) {
  const pfad = schluessel.startsWith("/") ? schluessel : join(homedir(), ".ssh", schluessel);
  if (!existsSync(pfad)) {
    abbruch(
      `Der Schlüssel ${schluessel} liegt nicht unter ${pfad}.\n` +
        "Prüf den Namen in der Geräteakte — im Kit steht nur der Name, der Schlüssel selbst bleibt in ~/.ssh."
    );
  }
  sshArgs.push("-i", pfad);
}

sshArgs.push(`${benutzer}@${ziel}`);

const beschreibung = `${benutzer}@${ziel}:${port}`;

if (arg.pruefen || !arg.befehl) {
  const probe = spawnSync("ssh", [...sshArgs, "-o", "BatchMode=yes", "echo bereit"], {
    encoding: "utf8",
  });
  if (probe.status === 0 && /bereit/.test(probe.stdout || "")) {
    console.log(`Verbindung steht: ${beschreibung} (${geraet.kunde}/${geraet.geraet})`);
    process.exit(0);
  }
  const meldung = (probe.stderr || "").trim().split("\n").slice(0, 4).join("\n");
  console.log(
    [
      `Keine Verbindung zu ${beschreibung} (${geraet.kunde}/${geraet.geraet}).`,
      meldung ? `\nMeldung:\n${meldung}` : "",
      "",
      "Häufige Gründe: Gerät nicht erreichbar, falscher Port nach der Härtung,",
      "Schlüssel noch nicht ausgerollt, oder der Schlüssel hat eine Passphrase und ist",
      "nicht im Agenten geladen (ssh-add).",
    ].join("\n")
  );
  process.exit(1);
}

const befehl = String(arg.befehl);
const lauf = spawnSync("ssh", [...sshArgs, befehl], { encoding: "utf8" });

const ausgabe = `${lauf.stdout || ""}${lauf.stderr || ""}`.trimEnd();
if (ausgabe) console.log(ausgabe);
console.log(`\n[${beschreibung}] Rückgabecode ${lauf.status}`);

if (arg.protokoll) {
  const kurz = ausgabe.split("\n").slice(0, 8).join("\n");
  const eintrag =
    `Befehl auf ${beschreibung}:\n\n    ${befehl}\n\n` +
    `Rückgabecode ${lauf.status}.` +
    (kurz ? `\n\nAusgabe (Anfang):\n\n\`\`\`\n${kurz}\n\`\`\`` : "");

  const protokoll = spawnSync(
    "node",
    [
      join(WURZEL, ".ara", "werkzeuge", "laufzettel.mjs"),
      "--kunde",
      geraet.kunde,
      "--geraet",
      geraet.geraet,
      "--eintrag",
      eintrag,
    ],
    { encoding: "utf8" }
  );
  if (protokoll.status !== 0) {
    console.log(
      "Hinweis: Der Eintrag im Laufzettel hat nicht geklappt " +
        `(${(protokoll.stderr || "").trim() || "kein Laufzettel vorhanden"}).`
    );
  }
}

process.exit(lauf.status ?? 1);
