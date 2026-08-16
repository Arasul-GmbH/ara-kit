#!/usr/bin/env node
/**
 * Laufzettel — das Gedächtnis einer Geräteeinrichtung.
 *
 * Eine Einrichtung dauert Stunden, wird unterbrochen und überlebt mehrere Sitzungen.
 * Der Laufzettel hält fest, was erledigt ist und was als Nächstes kommt. Er wird
 * angehängt, nie umgeschrieben.
 *
 *   node .ara/werkzeuge/laufzettel.mjs --anlegen --kunde mueller --geraet zentrale
 *   node .ara/werkzeuge/laufzettel.mjs --stand --kunde mueller
 *   node .ara/werkzeuge/laufzettel.mjs --kunde mueller --phase 3 --status fertig \
 *        --eintrag "Installation gelaufen. Nachweis: alle Dienste gesund."
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  WURZEL,
  abbruch,
  argumente,
  frontmatterLesen,
  frontmatterSchreiben,
  geraetAufloesen,
  jetzt,
  ordnerSichern,
} from "./lib/kit.mjs";

const PHASEN = [
  "Vorbereitung am Schreibtisch",
  "Betriebssystem",
  "Erstkontakt über das Netz",
  "Ara OS installieren",
  "Nachbereitung",
  "Nachweis",
  "Abnahme",
];

const STATUS = ["offen", "laeuft", "unterbrochen", "fertig"];

const arg = argumente();

function pfadeErmitteln() {
  const ziel = geraetAufloesen(arg.kunde, arg.geraet);
  return { ...ziel, datei: join(ziel.pfad, "laufzettel.md") };
}

if (arg.anlegen) {
  if (!arg.kunde || !arg.geraet) {
    abbruch("Zum Anlegen brauche ich --kunde und --geraet.");
  }
  const ordner = ordnerSichern(join(WURZEL, "kunden", arg.kunde, "geraete", arg.geraet));
  const datei = join(ordner, "laufzettel.md");
  if (existsSync(datei)) abbruch(`Es gibt schon einen Laufzettel: ${datei}`);

  const vorlage = readFileSync(join(WURZEL, ".ara", "vorlagen", "laufzettel.md"), "utf8");
  writeFileSync(datei, vorlage);
  frontmatterSchreiben(datei, {
    kunde: arg.kunde,
    geraet: arg.geraet,
    profil: typeof arg.profil === "string" ? arg.profil : "",
    phase: 0,
    stand: "laeuft",
    begonnen: jetzt(),
    zuletzt: jetzt(),
  });
  console.log(`Laufzettel angelegt: kunden/${arg.kunde}/geraete/${arg.geraet}/laufzettel.md`);
  process.exit(0);
}

let ziel;
try {
  ziel = pfadeErmitteln();
} catch (fehler) {
  abbruch(fehler.message);
}

if (!existsSync(ziel.datei)) {
  abbruch(
    `Für ${ziel.kunde}/${ziel.geraet} gibt es noch keinen Laufzettel.\n` +
      `Anlegen mit: node .ara/werkzeuge/laufzettel.mjs --anlegen --kunde ${ziel.kunde} --geraet ${ziel.geraet}`
  );
}

if (arg.stand || (!arg.eintrag && !arg.phase && !arg.status)) {
  const { felder } = frontmatterLesen(ziel.datei);
  const nummer = Number(felder.phase ?? 0);
  const name = PHASEN[nummer] ?? "unbekannt";
  const inhalt = readFileSync(ziel.datei, "utf8");
  const eintraege = inhalt.split(/\r?\n/).filter((z) => z.startsWith("### "));

  console.log(
    [
      `# Stand: ${ziel.kunde} / ${ziel.geraet}`,
      "",
      `- Phase ${nummer} von 6 — ${name}`,
      `- Zustand: ${felder.stand || "unbekannt"}`,
      `- Plattformprofil: ${felder.profil || "noch nicht bestätigt"}`,
      `- Begonnen: ${felder.begonnen || "unbekannt"}, zuletzt: ${felder.zuletzt || "unbekannt"}`,
      "",
      eintraege.length ? "## Bisherige Schritte" : "Noch keine Schritte protokolliert.",
      ...eintraege.slice(-12).map((z) => `- ${z.replace(/^###\s*/, "")}`),
    ].join("\n")
  );
  process.exit(0);
}

// Eintrag anhängen
const phase = arg.phase !== undefined ? Number(arg.phase) : null;
if (phase !== null && (!Number.isInteger(phase) || phase < 0 || phase > 6)) {
  abbruch("--phase muss eine Zahl von 0 bis 6 sein.");
}
const status = typeof arg.status === "string" ? arg.status : null;
if (status && !STATUS.includes(status)) {
  abbruch(`--status muss eines von ${STATUS.join(", ")} sein.`);
}
if (typeof arg.eintrag !== "string" || !arg.eintrag.trim()) {
  abbruch('--eintrag braucht Text. Beispiel: --eintrag "SSH gehärtet, Zugang gegengeprüft."');
}

const { felder } = frontmatterLesen(ziel.datei);
const nummer = phase ?? Number(felder.phase ?? 0);
const kopf = `### Phase ${nummer} — ${PHASEN[nummer] ?? "unbekannt"} · ${status ?? felder.stand ?? "laeuft"} · ${jetzt()}`;

appendFileSync(ziel.datei, `\n${kopf}\n${arg.eintrag.trim()}\n`);
frontmatterSchreiben(ziel.datei, {
  phase: nummer,
  stand: status ?? felder.stand ?? "laeuft",
  zuletzt: jetzt(),
});

console.log(`Eingetragen bei ${ziel.kunde}/${ziel.geraet}: Phase ${nummer}, ${status ?? felder.stand}.`);
