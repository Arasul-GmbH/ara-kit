#!/usr/bin/env node
/**
 * Spiegel: holt das Installationsartefakt und hält es als lokalen Stand.
 *
 * Das Kit liefert bewusst keine Produktwerte mit (siehe .ara/knowledge/live-knowledge.md).
 * Stattdessen liegt hier, was das Portal ausgeliefert hat: der Installer, mit dem
 * /device ein Gerät aufsetzt, und der Stand, aus dem Geräteprofile und Abläufe gelesen
 * werden. Gerufen wird das im Regelfall von device.mjs, beim --install arasul.
 *
 *   node .ara/tools/mirror.mjs             holen, wenn er fehlt oder zu alt ist
 *   node .ara/tools/mirror.mjs --show      nur nachsehen, nichts holen
 *   node .ara/tools/mirror.mjs --refresh   in jedem Fall neu holen
 *
 * Das Token kommt aus der gewählten Geheimnis-Ablage und wird niemals ausgegeben
 * oder als Argument an einen anderen Prozess übergeben.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { ROOT, parseArgs } from "./lib/kit.mjs";
import { getSecret } from "./lib/secrets.mjs";

// ARA_MIRROR weicht vom Standardort ab. Wird vom Selbsttest genutzt, damit er
// einen echten Spiegel nicht überschreibt.
const MIRROR = process.env.ARA_MIRROR || join(ROOT, ".ara", "mirror");
const STATE_FILE = join(MIRROR, "STATE.json");
const MAX_AGE_HOURS = 24;

function readState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function ageHours(state) {
  if (!state?.fetched) return Infinity;
  return (Date.now() - new Date(state.fetched).getTime()) / 3_600_000;
}

async function fetchMirror(base, token) {
  const url = new URL("/api/download", base);
  url.searchParams.set("token", token);

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    // Das Portal begründet Ablehnungen im Klartext, etwa ein beendetes
    // Wartungs-Abo. Diese Begründung ist wertvoller als eine Statusnummer.
    let reason = "";
    try {
      reason = (await response.text()).trim();
    } catch {
      /* ohne Text bleibt die Statusnummer */
    }
    if (reason) throw new Error(reason);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Das Portal hat den Token abgelehnt. Sieh im Partnerportal nach, ob er noch gültig ist."
      );
    }
    throw new Error(`Das Portal antwortet mit Status ${response.status}.`);
  }
  if (!response.body) throw new Error("Die Antwort des Portals war leer.");

  // Frisch auspacken, damit gelöschte Dateien nicht als Leichen zurückbleiben.
  rmSync(MIRROR, { recursive: true, force: true });
  mkdirSync(MIRROR, { recursive: true });

  await new Promise((done, failed) => {
    const tar = spawn("tar", ["-xzf", "-", "-C", MIRROR, "--strip-components=1"], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let message = "";
    tar.stderr.on("data", (chunk) => (message += chunk.toString()));
    tar.on("error", failed);
    tar.on("close", (code) =>
      code === 0
        ? done()
        : failed(new Error(`Das Auspacken ist fehlgeschlagen: ${message.trim() || `Code ${code}`}`))
    );
    Readable.fromWeb(response.body).pipe(tar.stdin);
  });

  let version = null;
  const versionFile = join(MIRROR, "VERSION");
  if (existsSync(versionFile)) version = readFileSync(versionFile, "utf8").trim();

  const state = { fetched: new Date().toISOString(), source: String(base), version };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  return state;
}

const arg = parseArgs();
const token = getSecret("ARASUL_TOKEN");
const base = getSecret("ARASUL_BASIS") || "https://arasul.de";
const state = readState();

if (arg.show) {
  const lines = ["# Spiegel"];
  if (!state) {
    lines.push("- Stand: nicht vorhanden");
  } else {
    const age = ageHours(state);
    lines.push(
      `- Geholt: ${state.fetched} (vor ${age < 1 ? "weniger als einer Stunde" : `${Math.round(age)} Stunden`})`,
      `- Produktversion: ${state.version ?? "unbekannt"}`,
      `- Frisch genug: ${age <= MAX_AGE_HOURS ? "ja" : "nein, neu holen"}`
    );
  }
  lines.push(`- Download-Token hinterlegt: ${token ? "ja" : "nein"}`);
  console.log(lines.join("\n"));
  process.exit(0);
}

if (!token) {
  console.log(
    "Kein Token hinterlegt. Ohne eines liefert das Portal den Installer nicht aus.\n" +
      "Jeder Partner bekommt im Portal fünf Download-Token kostenlos, weitere auf Nachfrage.\n" +
      "Es ist eine Schranke vor dem Download, keine Lizenzprüfung.\n" +
      "Hinterlegen mit: node .ara/tools/secrets.mjs --set ARASUL_TOKEN\n" +
      "Ohne Artefakt funktioniert alles außer der Installation und Aussagen über das Produkt."
  );
  process.exit(1);
}

const needsFetch = arg.refresh || !state || ageHours(state) > MAX_AGE_HOURS;

if (!needsFetch) {
  console.log(
    `Spiegel ist aktuell (geholt ${state.fetched}, Produktversion ${state.version ?? "unbekannt"}).`
  );
  process.exit(0);
}

try {
  const fresh = await fetchMirror(base, token);
  console.log(
    `Spiegel geholt. Produktversion ${fresh.version ?? "unbekannt"}, Stand ${fresh.fetched}, ` +
      `Quelle ${fresh.source}.\n` +
      "Was mitgeliefert wurde, liegt unter .ara/mirror/, der Stand dazu in .ara/mirror/STATE.json."
  );
} catch (error) {
  console.log(`Spiegel konnte nicht geholt werden.\n${error.message}`);
  process.exit(1);
}
