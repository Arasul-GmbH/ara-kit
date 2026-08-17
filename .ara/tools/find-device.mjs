#!/usr/bin/env node
/**
 * Gerät finden: ist da etwas, und antwortet es?
 *
 * Nach dem ersten Start eines Geräts ist die häufigste Frage: unter welcher Adresse
 * ist es erreichbar, und läuft dort schon ein SSH-Dienst. Dieses Werkzeug rät nicht,
 * es probiert.
 *
 *   node .ara/tools/find-device.mjs --host 192.168.10.44
 *   node .ara/tools/find-device.mjs --host arasul.local --ports 22,2222,443
 *   node .ara/tools/find-device.mjs --neighbors
 */

import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { connect } from "node:net";
import { parseArgs } from "./lib/kit.mjs";

const arg = parseArgs();
const STANDARD_PORTS = [22, 2222, 443, 80, 3001];

function tcpPruefen(host, port, frist = 2000) {
  return new Promise((fertig) => {
    const verbindung = connect({ host, port });
    const schliessen = (ergebnis) => {
      verbindung.destroy();
      fertig(ergebnis);
    };
    verbindung.setTimeout(frist);
    verbindung.on("connect", () => schliessen(true));
    verbindung.on("timeout", () => schliessen(false));
    verbindung.on("error", () => schliessen(false));
  });
}

/** Liest die Kennung des SSH-Dienstes, ohne sich anzumelden. */
function sshKennung(host, port) {
  return new Promise((fertig) => {
    const verbindung = connect({ host, port });
    let text = "";
    const schliessen = () => {
      verbindung.destroy();
      fertig(text.trim() || null);
    };
    verbindung.setTimeout(2500);
    verbindung.on("data", (stueck) => {
      text += stueck.toString();
      if (text.includes("\n")) schliessen();
    });
    verbindung.on("timeout", schliessen);
    verbindung.on("error", () => fertig(null));
  });
}

function ping(host) {
  const args = process.platform === "win32" ? ["-n", "1", "-w", "1500", host] : ["-c", "1", "-W", "2", host];
  const lauf = spawnSync("ping", args, { encoding: "utf8" });
  return lauf.status === 0;
}

function nachbarn() {
  const lauf = spawnSync("arp", ["-a"], { encoding: "utf8" });
  if (lauf.status !== 0 || !lauf.stdout) {
    console.log("Die Nachbarschaftstabelle ließ sich nicht lesen.");
    return;
  }
  const zeilen = lauf.stdout
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter((z) => z && !/incomplete/i.test(z));

  console.log("# Geräte, mit denen dieser Rechner zuletzt gesprochen hat\n");
  for (const zeile of zeilen) console.log(`- ${zeile}`);
  console.log(
    "\nDas ist nur die Nachbarschaftstabelle, keine vollständige Netzübersicht." +
      "\nWenn das gesuchte Gerät fehlt, sprich es einmal direkt an, etwa über den Namen, den es sich gibt."
  );
}

if (arg.neighbors) {
  nachbarn();
  process.exit(0);
}

if (typeof arg.host !== "string") {
  console.log(
    [
      "Gerät finden",
      "",
      "  --host <name oder adresse>   prüft Erreichbarkeit und offene Dienste",
      "  --ports 22,2222              eigene Portauswahl",
      "  --neighbors                   zeigt die Nachbarschaftstabelle dieses Rechners",
    ].join("\n")
  );
  process.exit(0);
}

const host = arg.host;
const ports = typeof arg.ports === "string" ? arg.ports.split(",").map((p) => Number(p.trim())) : STANDARD_PORTS;

let adresse = null;
try {
  const auflösung = await lookup(host);
  adresse = auflösung.address;
} catch {
  adresse = null;
}

const erreichbar = ping(host);
const offen = [];
for (const port of ports) {
  if (await tcpPruefen(host, port)) offen.push(port);
}

const zeilen = [`# ${host}`, ""];
zeilen.push(`- Name löst auf: ${adresse ? `ja, ${adresse}` : "nein"}`);
zeilen.push(`- Antwortet auf ping: ${erreichbar ? "ja" : "nein"}`);
zeilen.push(`- Offene Dienste: ${offen.length ? offen.join(", ") : "keiner der geprüften"}`);

for (const port of offen.filter((p) => p === 22 || p === 2222)) {
  const kennung = await sshKennung(host, port);
  if (kennung) zeilen.push(`- SSH auf ${port}: ${kennung}`);
}

if (!adresse && !erreichbar && !offen.length) {
  zeilen.push(
    "",
    "Unter diesem Namen ist nichts erreichbar. Häufige Gründe: das Gerät hängt in einem anderen",
    "Netzsegment, es ist noch nicht fertig gestartet, oder der Name wird im Kundennetz nicht aufgelöst.",
    "Probier die Adresse statt des Namens, und schau mit --neighbors, was überhaupt antwortet."
  );
} else if (!offen.includes(22) && !offen.includes(2222)) {
  zeilen.push(
    "",
    "Erreichbar, aber kein SSH-Dienst auf den üblichen Ports. Entweder läuft er noch nicht,",
    "oder er hört auf einem anderen Port. Nach der Härtung ist das erwartbar, dann gilt der neue Port."
  );
}

console.log(zeilen.join("\n"));
