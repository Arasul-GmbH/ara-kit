/**
 * Geheimnisse: zwei Ablagen, eine Schnittstelle.
 *
 * Der Partner entscheidet im Onboarding, wo seine Geheimnisse liegen:
 *
 *   env       eine .env-Datei im Kit. Einfach, sichtbar, leicht zu sichern.
 *             Wer sein Kit sichert, muss sie mitdenken.
 *   keychain  der Schlüsselbund des Betriebssystems. Verschlüsselt abgelegt,
 *             kann nicht versehentlich mitkopiert werden. Nicht überall verfügbar.
 *
 * Die Wahl steht in business/profile.md, Feld `secrets_store`. Ohne Eintrag gilt env.
 *
 * SSH-Schlüssel sind hier bewusst nicht enthalten: sie sind Dateien, die ssh selbst
 * verwaltet, liegen in ~/.ssh und werden im Kit nur namentlich referenziert.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";
import { ROOT, readFrontmatter } from "./kit.mjs";

const ENV_FILE = join(ROOT, ".env");
const SERVICE = "ara-kit";

/** Welche Ablage gilt? */
export function activeStore() {
  const profile = join(ROOT, "business", "profile.md");
  const { fields } = readFrontmatter(profile);
  const chosen = (fields.secrets_store || "").toLowerCase();
  return chosen === "keychain" ? "keychain" : "env";
}

/** Ist der Schlüsselbund auf diesem System nutzbar? */
export function keychainAvailable() {
  const system = platform();
  if (system === "darwin") return true;
  if (system === "linux") {
    return spawnSync("which", ["secret-tool"], { encoding: "utf8" }).status === 0;
  }
  return false;
}

export function keychainHint() {
  const system = platform();
  if (system === "darwin") return "macOS-Schlüsselbund";
  if (system === "linux") {
    return keychainAvailable()
      ? "Secret Service (secret-tool)"
      : "Secret Service, dafür fehlt secret-tool (Paket libsecret-tools)";
  }
  return "auf diesem Betriebssystem nicht verfügbar";
}

// --- .env ---------------------------------------------------------------

function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const values = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

function writeEnvValue(name, value) {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
  let replaced = false;
  const next = lines.map((line) => {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
    if (!match || match[1] !== name) return line;
    replaced = true;
    return `${name}=${value}`;
  });
  if (!replaced) next.push(`${name}=${value}`);
  writeFileSync(ENV_FILE, next.join("\n").replace(/\n+$/, "") + "\n");
  // Nur der Eigentümer darf lesen.
  try {
    chmodSync(ENV_FILE, 0o600);
  } catch {
    /* auf manchen Dateisystemen nicht möglich */
  }
}

// --- Schlüsselbund ------------------------------------------------------

function keychainGet(name) {
  const system = platform();
  if (system === "darwin") {
    const run = spawnSync("security", ["find-generic-password", "-a", name, "-s", SERVICE, "-w"], {
      encoding: "utf8",
    });
    return run.status === 0 ? (run.stdout || "").trim() : null;
  }
  if (system === "linux") {
    const run = spawnSync("secret-tool", ["lookup", "service", SERVICE, "account", name], {
      encoding: "utf8",
    });
    return run.status === 0 && run.stdout ? run.stdout.trim() : null;
  }
  return null;
}

function keychainSet(name, value) {
  const system = platform();
  if (system === "darwin") {
    // Der Wert geht über die Standardeingabe, damit er nicht in der Prozessliste steht.
    const run = spawnSync(
      "security",
      ["add-generic-password", "-U", "-a", name, "-s", SERVICE, "-w"],
      { input: value, encoding: "utf8" }
    );
    if (run.status !== 0) throw new Error((run.stderr || "").trim() || "Schlüsselbund lehnt ab.");
    return;
  }
  if (system === "linux") {
    const run = spawnSync(
      "secret-tool",
      ["store", "--label", `${SERVICE} ${name}`, "service", SERVICE, "account", name],
      { input: value, encoding: "utf8" }
    );
    if (run.status !== 0) throw new Error((run.stderr || "").trim() || "secret-tool lehnt ab.");
    return;
  }
  throw new Error("Auf diesem Betriebssystem gibt es keine unterstützte Schlüsselbund-Ablage.");
}

// --- Schnittstelle ------------------------------------------------------

/**
 * Liest ein Geheimnis. Reihenfolge: gewählte Ablage, dann die jeweils andere,
 * dann die Prozessumgebung. So funktioniert ein Kit auch direkt nach einem
 * Wechsel der Ablage und in automatisierten Läufen.
 */
export function getSecret(name) {
  const store = activeStore();
  const order = store === "keychain" ? ["keychain", "env"] : ["env", "keychain"];
  for (const source of order) {
    const value = source === "env" ? readEnvFile()[name] : keychainGet(name);
    if (value) return value;
  }
  return process.env[name] || null;
}

/** Legt ein Geheimnis in der gewählten Ablage ab. */
export function setSecret(name, value) {
  if (!value) throw new Error("Ein leerer Wert wird nicht gespeichert.");
  if (activeStore() === "keychain") {
    keychainSet(name, value);
    return "keychain";
  }
  writeEnvValue(name, value);
  return "env";
}

/** Ist gesetzt? Ohne den Wert preiszugeben. */
export function hasSecret(name) {
  return Boolean(getSecret(name));
}
