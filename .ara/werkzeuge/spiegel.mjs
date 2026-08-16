#!/usr/bin/env node
/**
 * Spiegel — holt den aktuellen Produktstand als lokalen Zwischenspeicher.
 *
 * Das Kit liefert bewusst keine Produktwerte mit (siehe .ara/wissen/live-wissen.md).
 * Stattdessen liegt hier der echte Stand, aus dem Modelle, Geräteprofile, Abläufe und
 * Befehle gelesen werden.
 *
 *   node .ara/werkzeuge/spiegel.mjs            holen, wenn er fehlt oder zu alt ist
 *   node .ara/werkzeuge/spiegel.mjs --status   nur nachsehen, nichts holen
 *   node .ara/werkzeuge/spiegel.mjs --neu      in jedem Fall neu holen
 *
 * Das Token wird aus der .env gelesen und niemals ausgegeben oder als Argument an einen
 * anderen Prozess übergeben.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// ARA_SPIEGEL weicht vom Standardort ab. Wird vom Selbsttest genutzt, damit er
// einen echten Spiegel nicht überschreibt.
const SPIEGEL = process.env.ARA_SPIEGEL || join(WURZEL, ".ara", "spiegel");
const STAND = join(SPIEGEL, "STAND.json");
const HALTBAR_STUNDEN = 24;

function umgebung() {
  // Die .env hat Vorrang; die Prozessumgebung dient als Rückfallebene
  // (nützlich für den Selbsttest und für automatisierte Läufe).
  const werte = {
    ARASUL_TOKEN: process.env.ARASUL_TOKEN,
    ARASUL_BASIS: process.env.ARASUL_BASIS,
  };
  const pfad = join(WURZEL, ".env");
  if (existsSync(pfad)) {
    for (const zeile of readFileSync(pfad, "utf8").split(/\r?\n/)) {
      const treffer = zeile.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!treffer) continue;
      const wert = treffer[2].trim().replace(/^["']|["']$/g, "");
      if (wert) werte[treffer[1]] = wert;
    }
  }
  return werte;
}

function stand() {
  if (!existsSync(STAND)) return null;
  try {
    return JSON.parse(readFileSync(STAND, "utf8"));
  } catch {
    return null;
  }
}

function alterStunden(eintrag) {
  if (!eintrag?.geholt) return Infinity;
  return (Date.now() - new Date(eintrag.geholt).getTime()) / 3_600_000;
}

function melde(text) {
  console.log(text);
}

async function holen(basis, token) {
  const ziel = new URL("/api/download", basis);
  ziel.searchParams.set("token", token);

  const antwort = await fetch(ziel, { redirect: "follow" });
  if (!antwort.ok) {
    // Das Portal begründet Ablehnungen im Klartext — etwa ein beendetes
    // Wartungs-Abo. Diese Begründung ist für den Menschen wertvoller als
    // eine Statusnummer, also reich sie durch.
    let begruendung = "";
    try {
      begruendung = (await antwort.text()).trim();
    } catch {
      /* ohne Text bleibt die Statusnummer */
    }
    if (begruendung) throw new Error(begruendung);
    if (antwort.status === 401 || antwort.status === 403) {
      throw new Error(
        "Das Portal hat den Token abgelehnt. Prüf im Partnerportal unter Lizenzen, ob er noch gültig ist."
      );
    }
    throw new Error(`Das Portal antwortet mit Status ${antwort.status}.`);
  }
  if (!antwort.body) throw new Error("Die Antwort des Portals war leer.");

  // Frisch auspacken, damit gelöschte Dateien nicht als Leichen zurückbleiben.
  rmSync(SPIEGEL, { recursive: true, force: true });
  mkdirSync(SPIEGEL, { recursive: true });

  await new Promise((fertig, fehler) => {
    const tar = spawn("tar", ["-xzf", "-", "-C", SPIEGEL, "--strip-components=1"], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let meldung = "";
    tar.stderr.on("data", (stueck) => (meldung += stueck.toString()));
    tar.on("error", fehler);
    tar.on("close", (code) =>
      code === 0
        ? fertig()
        : fehler(new Error(`Das Auspacken ist fehlgeschlagen: ${meldung.trim() || `Code ${code}`}`))
    );
    Readable.fromWeb(antwort.body).pipe(tar.stdin);
  });

  let version = null;
  const versionsdatei = join(SPIEGEL, "VERSION");
  if (existsSync(versionsdatei)) version = readFileSync(versionsdatei, "utf8").trim();

  const eintrag = { geholt: new Date().toISOString(), quelle: String(basis), version };
  writeFileSync(STAND, JSON.stringify(eintrag, null, 2) + "\n");
  return eintrag;
}

const argumente = new Set(process.argv.slice(2));
const werte = umgebung();
const token = werte.ARASUL_TOKEN;
const basis = werte.ARASUL_BASIS || "https://arasul.de";
const vorhanden = stand();

if (argumente.has("--status")) {
  const zeilen = ["# Spiegel"];
  if (!vorhanden) {
    zeilen.push("- Stand: nicht vorhanden");
  } else {
    const alter = alterStunden(vorhanden);
    zeilen.push(
      `- Geholt: ${vorhanden.geholt} (vor ${alter < 1 ? "weniger als einer Stunde" : `${Math.round(alter)} Stunden`})`,
      `- Produktversion: ${vorhanden.version ?? "unbekannt"}`,
      `- Frisch genug: ${alter <= HALTBAR_STUNDEN ? "ja" : "nein, neu holen"}`
    );
  }
  zeilen.push(`- Lizenztoken hinterlegt: ${token ? "ja" : "nein"}`);
  melde(zeilen.join("\n"));
  process.exit(0);
}

if (!token) {
  melde(
    "Kein Lizenztoken hinterlegt. Ohne ihn kann der Produktstand nicht geholt werden.\n" +
      "Trag ihn in die .env ein (Feld ARASUL_TOKEN). Du findest ihn im Partnerportal unter Lizenzen.\n" +
      "Ohne Spiegel funktioniert alles außer Aussagen über das Produkt und die Installation."
  );
  process.exit(1);
}

const brauchtNeu = argumente.has("--neu") || !vorhanden || alterStunden(vorhanden) > HALTBAR_STUNDEN;

if (!brauchtNeu) {
  melde(
    `Spiegel ist aktuell (geholt ${vorhanden.geholt}, Produktversion ${vorhanden.version ?? "unbekannt"}).`
  );
  process.exit(0);
}

try {
  const eintrag = await holen(basis, token);
  melde(
    `Spiegel geholt. Produktversion ${eintrag.version ?? "unbekannt"}, Stand ${eintrag.geholt}.\n` +
      "Geräteprofile stehen unter .ara/spiegel/config/platforms/."
  );
} catch (fehler) {
  melde(`Spiegel konnte nicht geholt werden.\n${fehler.message}`);
  process.exit(1);
}
