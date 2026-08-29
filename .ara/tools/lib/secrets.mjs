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
import { t } from "./i18n.mjs";

/**
 * ARA_ENV_FILE lenkt die .env um, und dann zählt nur sie: kein Schlüsselbund, keine
 * Prozessumgebung. Das ist für den Selbsttest da, der „kein Token" prüfen muss,
 * ohne den echten Ablagen etwas zu tun.
 */
const ENV_ONLY = Boolean(process.env.ARA_ENV_FILE);
const ENV_FILE = process.env.ARA_ENV_FILE || join(ROOT, ".env");
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
  if (system === "darwin") return t("macOS keychain", "macOS-Schlüsselbund");
  if (system === "linux") {
    return keychainAvailable()
      ? "Secret Service (secret-tool)"
      : t(
          "Secret Service, but secret-tool is missing (package libsecret-tools)",
          "Secret Service, dafür fehlt secret-tool (Paket libsecret-tools)"
        );
  }
  return t("not available on this operating system", "auf diesem Betriebssystem nicht verfügbar");
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
  if (/[\r\n]/.test(value)) {
    throw new Error(
      t(
        "A value with a line break does not go into the keychain.",
        "Ein Wert mit Zeilenumbruch geht nicht in den Schlüsselbund."
      )
    );
  }
  if (system === "darwin") {
    // Der Wert geht über die Standardeingabe, damit er nicht in der Prozessliste steht.
    //
    // `-w` ohne Argument fragt zweimal, einmal zur Bestätigung. Wer den Wert nur
    // einmal über die Leitung schickt, bekommt „passwords don't match", einen
    // leeren Eintrag und trotzdem Status 0. Der Eintrag existiert dann, und
    // gemerkt wird das erst, wenn das Geheimnis gebraucht wird und weg ist.
    // Deshalb zweimal hinein, und unten wird zurückgelesen.
    const run = spawnSync(
      "security",
      ["add-generic-password", "-U", "-a", name, "-s", SERVICE, "-w"],
      { input: `${value}\n${value}\n`, encoding: "utf8" }
    );
    if (run.status !== 0) {
      throw new Error((run.stderr || "").trim() || t("The keychain refuses.", "Schlüsselbund lehnt ab."));
    }
  } else if (system === "linux") {
    const run = spawnSync(
      "secret-tool",
      ["store", "--label", `${SERVICE} ${name}`, "service", SERVICE, "account", name],
      { input: value, encoding: "utf8" }
    );
    if (run.status !== 0) {
      throw new Error((run.stderr || "").trim() || t("secret-tool refuses.", "secret-tool lehnt ab."));
    }
  } else {
    throw new Error(
      t(
        "There is no supported keychain store on this operating system.",
        "Auf diesem Betriebssystem gibt es keine unterstützte Schlüsselbund-Ablage."
      )
    );
  }
  // Ein Eintrag, der existiert, ist kein Eintrag, der stimmt.
  if (keychainGet(name) !== value) {
    throw new Error(
      t(
        `The entry ${name} reads back differently than it went in. What lies there now is wrong.`,
        `Der Eintrag ${name} liest sich anders zurück, als er hineingegangen ist. Was dort liegt, stimmt nicht.`
      )
    );
  }
}

// --- Schnittstelle ------------------------------------------------------

/** Was in einer der beiden Ablagen unter diesem Namen steht. */
function fromStore(store, name) {
  return (store === "env" ? readEnvFile()[name] : keychainGet(name)) || null;
}

/**
 * Liest ein Geheimnis. **Nur aus der gewählten Ablage**, dann aus der
 * Prozessumgebung.
 *
 * Bis zum 29.08.2026 sah es danach noch in der jeweils anderen nach, damit ein
 * Kit direkt nach einem Wechsel der Ablage weiterläuft. Der Fremdtest hat
 * gezeigt, was das kostet: auf einem Rechner, auf dem schon einmal ein anderer
 * Klon gearbeitet hat, stand bei `secrets_store: env` ein fremder Eintrag aus
 * dem Schlüsselbund als „hinterlegt" da. Ein Kit, das ein Geheimnis findet, das
 * ihm nicht gehört, arbeitet mit dem Zugang eines anderen, und niemand sieht
 * es. Der Fall „gerade umgestellt" bleibt beantwortbar: `otherStore` sagt, wo
 * der Name sonst noch liegt, und `secrets.mjs --show` schreibt es hin.
 *
 * Die Prozessumgebung bleibt am Ende stehen: sie gehört diesem einen Lauf und
 * steht nicht auf der Platte.
 */
export function getSecret(name) {
  if (ENV_ONLY) return readEnvFile()[name] || null;
  return fromStore(activeStore(), name) || process.env[name] || null;
}

/**
 * Liegt der Name in der ANDEREN Ablage? Dann gilt er nicht, und das ist eine
 * Auskunft und kein Fehler: nach einem Wechsel liegt dort alles, was vorher
 * hinterlegt war, und `--set` holt es herüber.
 */
export function otherStore(name) {
  if (ENV_ONLY) return null;
  const other = activeStore() === "keychain" ? "env" : "keychain";
  return fromStore(other, name) ? other : null;
}

/** Legt ein Geheimnis in der gewählten Ablage ab. */
export function setSecret(name, value) {
  if (!value) throw new Error(t("An empty value is not saved.", "Ein leerer Wert wird nicht gespeichert."));
  if (!ENV_ONLY && activeStore() === "keychain") {
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

/**
 * Welche Namen in der `.env` stehen. Nur die Namen, nie die Werte.
 *
 * Der Schlüsselbund lässt sich nicht nach Namen durchsuchen, dort geht nur die
 * gezielte Frage nach einem Eintrag. Was `--show` daraus macht, ist deshalb eine
 * Ergänzung und keine vollständige Liste, und es sagt das auch.
 */
export function envNames() {
  return Object.keys(readEnvFile()).sort();
}
