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
 *   node .ara/tools/mirror.mjs --docs      welche Anleitungen liegen im Artefakt
 *   node .ara/tools/mirror.mjs --refresh   in jedem Fall neu holen
 *
 * `--docs` ist der Weg zu allem, was das Kit selbst nicht weiß: Admin-Handbuch,
 * API-Referenz, Auslieferung. Das Kit schreibt daraus nichts ab, es sagt, wo es
 * steht.
 *
 * Das Token kommt aus der gewählten Geheimnis-Ablage und wird niemals ausgegeben
 * oder als Argument an einen anderen Prozess übergeben.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { Readable } from "node:stream";
import { ROOT, helpOnly, parseArgs } from "./lib/kit.mjs";
import { APPLEDOUBLE, packEnv, releaseVersion } from "./lib/install.mjs";
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
    // --exclude hält die ._-Beiwerkdateien von macOS aus dem Spiegel heraus.
    // Was hier nicht ankommt, kann später auch nicht an ein Gerät weitergehen,
    // und genau das ist am 28.08.2026 passiert: 1124 solcher Dateien gingen mit
    // dem Artefakt an den Orin, und Traefik stieg an einer davon aus.
    const tar = spawn("tar", ["-xzf", "-", "--exclude", APPLEDOUBLE, "-C", MIRROR, "--strip-components=1"], {
      stdio: ["pipe", "ignore", "pipe"],
      env: packEnv(),
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

  // .gitkeep hält den Ordner im Repository. Das Auspacken räumt ihn mit weg, und
  // danach meldet `git status` im Klon eine gelöschte Datei, die niemand
  // angefasst hat: am 28.08.2026 war der Klon nach der ersten Installation
  // schmutzig. Er wird darum wieder gelegt.
  writeFileSync(join(MIRROR, ".gitkeep"), "");

  // Die Fassung sagt das Artefakt selbst. Eine Datei VERSION bringt es nicht
  // mit, seine Angabe steht in arasul-release.json, und ohne diesen zweiten Weg
  // stand überall „unbekannt": im Spiegel, in der Geräteakte und im Ordnernamen
  // am Gerät.
  let version = null;
  const versionFile = join(MIRROR, "VERSION");
  if (existsSync(versionFile)) version = readFileSync(versionFile, "utf8").trim();
  if (!version) version = releaseVersion(MIRROR);

  const state = { fetched: new Date().toISOString(), source: String(base), version };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  return state;
}

helpOnly(import.meta.url);
const arg = parseArgs();
const token = getSecret("ARASUL_TOKEN");
const base = getSecret("ARASUL_BASIS") || "https://arasul.de";
const state = readState();

/**
 * Die Fassung des Spiegels, und woher sie kommt.
 *
 * Ein Spiegel, der vor dieser Fassung des Kits geholt wurde, trägt in seinem
 * STATE.json keine Zahl. Sie steht deshalb nicht weniger im Artefakt: das Kit
 * liest sie dann direkt aus `arasul-release.json`, statt „unbekannt" zu sagen,
 * obwohl die Datei danebenliegt.
 */
function versionOf(entry) {
  if (entry?.version) return { version: entry.version, source: "STATE.json" };
  const named = releaseVersion(MIRROR);
  return named ? { version: named, source: "arasul-release.json" } : { version: null, source: null };
}

if (arg.show) {
  const lines = ["# Spiegel"];
  if (!state) {
    lines.push("- Stand: nicht vorhanden");
  } else {
    const age = ageHours(state);
    const fassung = versionOf(state);
    lines.push(
      `- Geholt: ${state.fetched} (vor ${age < 1 ? "weniger als einer Stunde" : `${Math.round(age)} Stunden`})`,
      `- Produktversion: ${fassung.version ?? "unbekannt"}${fassung.source ? `, laut ${fassung.source}` : ""}`,
      `- Frisch genug: ${age <= MAX_AGE_HOURS ? "ja" : "nein, neu holen"}`
    );
  }
  lines.push(`- Download-Token hinterlegt: ${token ? "ja" : "nein"}`);
  if (state) lines.push("", "Welche Anleitungen mitkamen: node .ara/tools/mirror.mjs --docs");
  console.log(lines.join("\n"));
  process.exit(0);
}

/**
 * Die Anleitungen im Artefakt.
 *
 * Das Kit kennt weder ihre Namen noch ihren Inhalt, und es soll sie auch nicht
 * kennen: was in ihnen steht, ändert sich mit dem Produkt. Es sagt nur, welche
 * es gibt und wo sie liegen. Alles, wofür das Kit keinen Weg hat (den ersten
 * Mitarbeiter anlegen, eine App freigeben), steht dort und nicht hier.
 */
function docs(dir, depth = 0) {
  if (depth > 4 || !existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...docs(path, depth + 1));
    else if (/\.(md|pdf|html?|txt|adoc|rst)$/i.test(entry.name)) found.push(path);
  }
  return found;
}

if (arg.docs) {
  if (!state) {
    console.log(
      "Es gibt keinen Spiegel, also auch keine Anleitungen. Er entsteht bei der Installation:\n" +
        "  node .ara/tools/device.mjs --name <gerät> --install arasul\n" +
        "Nur zum Nachlesen reicht: node .ara/tools/mirror.mjs --refresh"
    );
    process.exit(1);
  }
  const found = docs(MIRROR).sort();
  console.log(
    [
      `# Anleitungen im Artefakt (Fassung ${versionOf(state).version ?? "unbekannt"}, geholt ${state.fetched})`,
      "",
      ...(found.length
        ? found.map((path) => `- ${join(relative(ROOT, MIRROR), relative(MIRROR, path))}`)
        : ["Keine gefunden. Das Artefakt bringt auf diesem Stand keine Anleitung mit."]),
      "",
      "Das Kit schreibt daraus nichts ab. Was ein Partner dort nachschlägt, gilt für diese Fassung.",
    ].join("\n")
  );
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
    `Spiegel ist aktuell (geholt ${state.fetched}, Produktversion ${versionOf(state).version ?? "unbekannt"}).`
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
