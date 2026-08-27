#!/usr/bin/env node
/**
 * Technikcheck für das Onboarding.
 *
 * Stellt fest, was der Rechner kann, und meldet es lesbar. Ändert nichts.
 *
 *   node .ara/tools/check-environment.mjs
 *   node .ara/tools/check-environment.mjs --json
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir, platform, arch, release, totalmem } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hasSecret } from "./lib/secrets.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function vorhanden(befehl) {
  try {
    const pfad = execFileSync(platform() === "win32" ? "where" : "which", [befehl], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return pfad.trim().split(/\r?\n/)[0] || null;
  } catch {
    return null;
  }
}

function version(befehl, args = ["--version"]) {
  // Manche Werkzeuge (ssh) melden ihre Version auf der Fehlerausgabe und mit
  // einem Rückgabecode ungleich null. Beide Ströme zählen.
  const lauf = spawnSync(befehl, args, { encoding: "utf8" });
  const text = `${lauf.stdout || ""}${lauf.stderr || ""}`.trim();
  return text ? text.split(/\r?\n/)[0] : null;
}

function betriebssystem() {
  const p = platform();
  if (p === "darwin") {
    const name = version("sw_vers", ["-productVersion"]);
    return { kennung: "macos", anzeige: `macOS ${name ?? release()}` };
  }
  if (p === "linux") {
    let name = "Linux";
    try {
      const os = readFileSync("/etc/os-release", "utf8");
      const treffer = os.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
      if (treffer) name = treffer[1];
    } catch {
      /* ohne os-release bleibt es beim generischen Namen */
    }
    return { kennung: "linux", anzeige: name };
  }
  if (p === "win32") return { kennung: "windows", anzeige: `Windows ${release()}` };
  return { kennung: p, anzeige: `${p} ${release()}` };
}

function sshSchluessel() {
  const ordner = join(homedir(), ".ssh");
  if (!existsSync(ordner)) return [];
  try {
    return readdirSync(ordner)
      .filter((datei) => /^id_\w+\.pub$/.test(datei))
      .map((datei) => datei.replace(/\.pub$/, ""));
  } catch {
    return [];
  }
}

function freierSpeicher() {
  if (platform() === "win32") return null;
  try {
    const aus = execFileSync("df", ["-k", ROOT], { encoding: "utf8" });
    const zeile = aus.trim().split(/\r?\n/).pop();
    const spalten = zeile.trim().split(/\s+/);
    const frei = Number(spalten[3]);
    return Number.isFinite(frei) ? Math.round(frei / 1024 / 1024) : null;
  } catch {
    return null;
  }
}

function tokenHinterlegt() {
  // Prüft nur, OB ein Token gesetzt ist, in beiden Ablagen. Der Wert wird nie ausgegeben.
  return { datei: existsSync(join(ROOT, ".env")), token: hasSecret("ARASUL_TOKEN") };
}

const os = betriebssystem();
const nodeMajor = Number(process.versions.node.split(".")[0]);
const schluessel = sshSchluessel();
const speicher = freierSpeicher();
const zugang = tokenHinterlegt();

const befund = {
  betriebssystem: os.anzeige,
  plattform: os.kennung,
  architektur: arch(),
  arbeitsspeicher_gb: Math.round(totalmem() / 1024 ** 3),
  freier_speicher_gb: speicher,
  node: process.versions.node,
  node_ausreichend: nodeMajor >= 20,
  git: vorhanden("git") ? version("git") : null,
  ssh: vorhanden("ssh") ? version("ssh", ["-V"]) : null,
  tar: Boolean(vorhanden("tar")),
  ssh_schluessel: schluessel,
  env_datei: zugang.datei,
  token_hinterlegt: zugang.token,
  // Nur eingebettete Ziele (z. B. Jetson Thor) müssen über Kabel von einem
  // x86-Linux-Rechner geflasht werden. DGX Spark, RTX-Workstation, DGX Station
  // und x86-Server brauchen keinen Flash-Rechner (Werk-OS oder USB-Stick).
  flash_host_geeignet: os.kennung === "linux" && arch() === "x64",
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(befund, null, 2));
  process.exit(0);
}

const ja = (wert) => (wert ? "ja" : "nein");
const zeilen = [
  "# Technikcheck",
  "",
  `- Betriebssystem: ${befund.betriebssystem} (${befund.architektur})`,
  `- Arbeitsspeicher: ${befund.arbeitsspeicher_gb} GB` +
    (befund.freier_speicher_gb !== null
      ? `, freier Plattenplatz hier: ${befund.freier_speicher_gb} GB`
      : ""),
  `- Node: ${befund.node}${befund.node_ausreichend ? "" : "  ← zu alt, ab Version 20 nötig"}`,
  `- git: ${befund.git ?? "fehlt"}`,
  `- ssh: ${befund.ssh ?? "fehlt"}`,
  `- tar: ${ja(befund.tar)}`,
  `- SSH-Schlüssel: ${schluessel.length ? schluessel.join(", ") : "keiner gefunden"}`,
  `- Zugangsdatei .env: ${ja(befund.env_datei)}, Download-Token hinterlegt: ${ja(befund.token_hinterlegt)}` +
    (befund.token_hinterlegt ? "" : "  (erst nötig, wenn auf einem Gerät Arasul installiert wird)"),
  `- Als Flash-Rechner für eingebettete Ziele (z. B. Jetson Thor) geeignet: ${ja(befund.flash_host_geeignet)}` +
    (befund.flash_host_geeignet ? "" : "  (dafür braucht es x86-Linux; nur für Thor nötig)"),
];

const offen = [];
if (!befund.node_ausreichend) offen.push("Node auf Version 20 oder neuer bringen");
if (!befund.git) offen.push("git installieren");
if (!befund.ssh) offen.push("ssh installieren");
if (!befund.tar) offen.push("tar installieren");
if (!schluessel.length) offen.push("SSH-Schlüssel anlegen");

if (offen.length) {
  zeilen.push("", "## Offen", ...offen.map((punkt) => `- ${punkt}`));
} else {
  zeilen.push("", "Alles vorhanden.");
}

console.log(zeilen.join("\n"));
