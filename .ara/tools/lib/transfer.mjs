/**
 * Die Übergabe des Kits an den Kunden, ohne Netz und ohne Gerät.
 *
 * Kolja richtet das Kit für einen Kunden ein, macht daraus ein Repository und
 * teilt es. Der Übernehmende klont es und arbeitet mit eigenen Schlüsseln
 * weiter. Was dafür gesagt, geprüft und geschrieben werden muss, steht hier als
 * reine Funktionen, damit der Selbsttest es mit erfundenem Text prüfen kann.
 * Was am Gerät passiert, macht `transfer.mjs`.
 *
 * **Hier steht kein Wert des Produkts.** Welcher Schlüssel am Gerät gilt, sagt
 * das Gerät. Das Übergabeblatt nennt nur, was das Kit selbst festhält: den
 * Namen eines Eintrags, den Anfang (Präfix) eines Kit-Schlüssels, den
 * Fingerabdruck eines öffentlichen SSH-Schlüssels. Alle drei sind keine
 * Geheimnisse, das Gerät zeigt sie in seinen Listen selbst.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { t } from "./i18n.mjs";
import { secretSlug } from "./device.mjs";
import { BUSINESS, devicePath, listDevices, readFrontmatter } from "./kit.mjs";
import { hasSecret } from "./secrets.mjs";

/** Die Datei der Übergabe, im Ordner des Betriebs, damit sie mit dem Klon kommt. */
export const HANDOVER_FILE = "handover.md";

/** Die Ordner, die ein übergebener Klon verfolgen muss. */
export const FOLDERS = Object.freeze(["business", "devices", "apps"]);

/** Der Schlüsselname einer Zeile in der Übergabedatei: kleingeschrieben, ohne Sonderzeichen. */
export const slugOf = (customer, device) => secretSlug(customer, device).toLowerCase();

/**
 * Was nach einem Geheimnis aussieht.
 *
 * Gesucht wird in Dateien, die mit dem Repository an einen anderen gehen. Ein
 * Treffer ist kein Beweis, aber jeder ist es wert, dass ein Mensch hinsieht.
 * Namen von Einträgen (`api_key_ref: ARASUL_KEY_ORIN`) sind keine Geheimnisse
 * und lösen nichts aus: sie zeigen auf die Ablage, sie enthalten nichts.
 */
const PATTERNS = Object.freeze([
  {
    id: "kit-key",
    re: /\baras_[A-Za-z0-9_-]{16,}/,
    en: "a kit key in plain text",
    de: "ein Kit-Schlüssel im Klartext",
  },
  {
    id: "private-key",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    en: "a private key",
    de: "ein privater Schlüssel",
  },
  {
    id: "token",
    re: /\b(?:ghp|gho|github_pat|sk|xox[abp])[_-][A-Za-z0-9_-]{16,}/,
    en: "an access token",
    de: "ein Zugangstoken",
  },
  {
    id: "password",
    re: /^\s*[-*]?\s*["']?(?:password|passwort|kennwort|passwd|pw)["']?\s*[:=]\s*["']?(?!\s*$)(?![<(\[]|ref|name|none|leer|empty|-)[^\s"'#]{4,}/im,
    en: "a password",
    de: "ein Passwort",
  },
]);

/** Dateinamen, die nie mit dem Repository gehen sollten. */
export const FORBIDDEN_NAMES = Object.freeze([/^\.env(\..+)?$/, /^id_(rsa|ed25519|ecdsa)$/, /\.pem$/, /\.key$/]);

/**
 * Die Funde in einem Text, je Muster höchstens einer, mit der Zeilennummer.
 * Der Fund trägt nie den Wert, nur die Art und die Stelle.
 */
export function secretFindings(text) {
  const found = [];
  const lines = String(text).split(/\r?\n/);
  for (const pattern of PATTERNS) {
    const at = lines.findIndex((line) => pattern.re.test(line));
    if (at >= 0) found.push({ id: pattern.id, line: at + 1, en: pattern.en, de: pattern.de });
  }
  return found;
}

/** Ist dieser Dateiname einer, der nicht ins Repository gehört? */
export function forbiddenName(name) {
  return FORBIDDEN_NAMES.some((re) => re.test(name));
}

/**
 * Die Zeilen, die `.gitignore` bekommt, damit die drei Ordner verfolgt werden.
 *
 * Die letzte passende Zeile gewinnt, darum reicht das Anhängen. Ein Ordner, der
 * schon eine Ausnahme hat, bekommt keine zweite, und der Aufruf ist wiederholbar.
 * Darunter bleiben die Dinge ausgeschlossen, die in diesen Ordnern entstehen
 * und kein Eigentum des Repositories sind.
 */
export function ignoreAddition(current, folders = FOLDERS) {
  const have = new Set(String(current).split(/\r?\n/).map((line) => line.trim()));
  const lines = [];
  for (const folder of folders) {
    if (!have.has(`!/${folder}/`)) lines.push(`!/${folder}/`);
  }
  const guards = ["/apps/**/node_modules/", "/apps/**/.env", "/apps/**/.env.*", "/devices/**/*.pem", "/devices/**/*.key"];
  const missingGuards = guards.filter((line) => !have.has(line));
  if (!lines.length && !missingGuards.length) return "";
  return (
    "\n# Übergabe: diese Ordner gehen mit dem Repository an den Übernehmenden.\n" +
    "# Geheimnisse liegen nicht darin, nur die Namen ihrer Einträge.\n" +
    [...lines, ...missingGuards].join("\n") +
    "\n"
  );
}

// --- Am Gerät: die Zeilen in authorized_keys -----------------------------------

/** Ein öffentlicher Schlüssel, in einem Wort: Art, Schlüssel, optional ein Kommentar. */
export function validPublicKey(line) {
  return /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+|sk-ssh-ed25519@openssh\.com)\s+[A-Za-z0-9+/=]{20,}(\s+[^\r\n]*)?$/.test(
    String(line).trim()
  );
}

const quote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

/** Fügt einen öffentlichen Schlüssel hinzu, wenn er noch nicht dort steht. */
export function addKeyCommand(publicKey) {
  const line = String(publicKey).trim();
  return (
    `set -e; umask 077; mkdir -p "$HOME/.ssh"; touch "$HOME/.ssh/authorized_keys"; ` +
    `grep -qxF ${quote(line)} "$HOME/.ssh/authorized_keys" || printf '%s\\n' ${quote(line)} >> "$HOME/.ssh/authorized_keys"; ` +
    `chmod 700 "$HOME/.ssh"; chmod 600 "$HOME/.ssh/authorized_keys"; echo ok`
  );
}

/** Die Fingerabdrücke aller Schlüssel in authorized_keys, einer je Zeile. */
export function listKeysCommand() {
  return `ssh-keygen -lf "$HOME/.ssh/authorized_keys" 2>/dev/null || true`;
}

/**
 * Nimmt die Zeile heraus, deren Fingerabdruck passt, und keine andere.
 *
 * Verglichen wird der Fingerabdruck, den das Gerät selbst errechnet. Eine
 * Zeile, die er nicht lesen kann (Kommentar, Leerzeile), bleibt stehen.
 */
export function removeKeyCommand(fingerprint) {
  return (
    `set -e; f="$HOME/.ssh/authorized_keys"; [ -f "$f" ] || { echo none; exit 0; }; tmp=$(mktemp); n=0; ` +
    `while IFS= read -r l || [ -n "$l" ]; do ` +
    `fp=$(printf '%s\\n' "$l" | ssh-keygen -lf - 2>/dev/null | awk '{print $2}'); ` +
    `if [ -n "$fp" ] && [ "$fp" = ${quote(fingerprint)} ]; then n=$((n+1)); else printf '%s\\n' "$l" >> "$tmp"; fi; ` +
    `done < "$f"; cat "$tmp" > "$f"; rm -f "$tmp"; echo "removed $n"`
  );
}

/** Aus der Ausgabe von `ssh-keygen -lf`: die Fingerabdrücke samt Kommentar. */
export function parseFingerprints(output) {
  return String(output)
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*\d+\s+(SHA256:[A-Za-z0-9+/=]+)\s*(.*?)\s*(?:\(([A-Z0-9-]+)\))?\s*$/))
    .filter(Boolean)
    .map((m) => ({ fingerprint: m[1], comment: m[2] || "" }));
}

// --- Die Übergabedatei -------------------------------------------------------------

/** Eine Zahl in Worten für den, der nicht zählt: "ein Gerät", "zwei Geräte". */
const countWord = (n) => t(n === 1 ? "one device" : `${n} devices`, n === 1 ? "ein Gerät" : `${n} Geräte`);

/**
 * Das Übergabeblatt: der Text für den, der übernimmt, in einfacher Sprache.
 *
 * Er sagt, was er in der Hand hat, was er tun muss und was danach nicht mehr
 * geht. Fachwörter stehen beim ersten Auftreten in einem Satz erklärt.
 */
export function sheetBody({ from, to, devices, date, repo = "" }) {
  const names = devices.map((d) => d.place);
  const list = names.length ? names.map((n) => `- ${n}`).join("\n") : t("- (none yet)", "- (noch keines)");
  return [
    t(`# Handover of the kit from ${from}${to ? ` to ${to}` : ""}`, `# Übergabe des Kits von ${from}${to ? ` an ${to}` : ""}`),
    "",
    t(
      `Prepared on ${date}. This sheet is meant for the person who takes over. It says what you get, what you do first and what no longer works afterwards.`,
      `Vorbereitet am ${date}. Dieses Blatt ist für den, der übernimmt. Es sagt, was du bekommst, was du zuerst tust und was danach nicht mehr geht.`
    ),
    "",
    t("## What you get", "## Was du bekommst"),
    "",
    t(
      `This repository holds the kit with everything that was set up for you: your company profile, your apps and the files of ${countWord(names.length)}.`,
      `Dieses Repository enthält das Kit mit allem, was für dich eingerichtet wurde: dein Firmenprofil, deine Apps und die Akten von ${countWord(names.length)}.`
    ),
    "",
    list,
    "",
    t(
      "No password and no key is in it. The files only name the place where a secret is kept (for example ARASUL_KEY_ORIN). The secrets themselves stay on the computer of whoever uses them.",
      "Kein Passwort und kein Schlüssel steht darin. Die Akten nennen nur den Ort, an dem ein Geheimnis liegt (zum Beispiel ARASUL_KEY_ORIN). Die Geheimnisse selbst bleiben auf dem Rechner dessen, der sie benutzt."
    ),
    "",
    t("## What you do first", "## Was du zuerst tust"),
    "",
    t(
      `1. Clone the repository${repo ? ` (${repo})` : ""} and open it with Claude Code or Codex.`,
      `1. Das Repository klonen${repo ? ` (${repo})` : ""} und mit Claude Code oder Codex öffnen.`
    ),
    t(
      "2. Type /init. The kit notices that this is a handover and asks you the few things it needs.",
      "2. /init eingeben. Das Kit merkt, dass es eine Übergabe ist, und fragt dich das Wenige, was es braucht."
    ),
    t(
      "3. For every device the kit makes two new keys that belong to you alone: one for logging in on the device (an SSH key) and one for rolling out apps (a kit key). It puts them on the device and then revokes the old ones.",
      "3. Für jedes Gerät macht das Kit zwei neue Schlüssel, die nur dir gehören: einen zum Anmelden am Gerät (einen SSH-Schlüssel) und einen zum Einspielen von Apps (einen Kit-Schlüssel). Es legt sie am Gerät ab und widerruft danach die alten."
    ),
    "",
    t(
      "To put the new SSH key on the device, the kit needs one way in that still works today: the password of the login on the device, which you get from the person handing over, not through this repository.",
      "Um den neuen SSH-Schlüssel auf das Gerät zu legen, braucht das Kit einen Weg hinein, der heute noch geht: das Passwort der Anmeldung am Gerät, das du von dem bekommst, der übergibt, und nicht über dieses Repository."
    ),
    "",
    t("## What no longer works afterwards", "## Was danach nicht mehr geht"),
    "",
    t(
      "The key of the person who handed over, both the login key and the kit key, is revoked. From then on they cannot reach the device or roll out anything. The kit checks that on the device and says so.",
      "Der Schlüssel dessen, der übergeben hat, der zum Anmelden wie der zum Einspielen, ist widerrufen. Danach kommt er weder aufs Gerät noch kann er etwas einspielen. Das Kit prüft das am Gerät und sagt es dir."
    ),
    "",
    t(
      "If other keys are still valid on the device, for instance from the installation, the kit lists them. You decide whether they go too.",
      "Sind am Gerät noch andere Schlüssel gültig, etwa von der Installation, listet das Kit sie auf. Du entscheidest, ob sie auch gehen."
    ),
    "",
    t("## Who hands over, who takes over", "## Wer übergibt, wer übernimmt"),
    "",
    `- ${t("Hands over", "Übergibt")}: ${from}`,
    `- ${t("Takes over", "Übernimmt")}: ${to || t("(not named yet)", "(noch nicht benannt)")}`,
    "",
  ].join("\n");
}

// --- Wo steht diese Kopie? ------------------------------------------------------

/**
 * Der Stand der Übergabe, wie ihn diese Kopie des Kits sieht.
 *
 * `none`: es gibt keine Übergabedatei. `prepared`: sie liegt da, und mindestens
 * ein Gerät ist hier noch nicht übernommen. `accepted`: jedes Gerät ist
 * übernommen.
 *
 * **Wer übergibt und wer übernimmt, sagt die Ablage.** Beide haben dieselbe
 * Datei, denn sie kommt mit dem Repository. Der Übergebende hat den Kit-Schlüssel
 * des Geräts in seiner Ablage und den privaten SSH-Schlüssel in `~/.ssh`; der
 * Übernehmende hat beides nicht. Ein Gerät, für das hier beides fehlt, wartet
 * auf die Übernahme (`pending`). Hat die Kopie beides, gehört das Gerät ihr
 * schon: dem Übergebenden vor der Übergabe, dem Übernehmenden danach.
 */
export function handoverState() {
  const file = join(BUSINESS, HANDOVER_FILE);
  if (!existsSync(file)) return { state: "none", file, devices: [] };
  const { fields } = readFrontmatter(file);
  const devices = listDevices(null).map((device) => {
    const slug = slugOf(null, device);
    const own = readFrontmatter(join(devicePath(null, device), "device.md")).fields;
    const kitHere = Boolean(own.api_key_ref) && hasSecret(own.api_key_ref);
    const sshHere =
      Boolean(own.ssh_key) && existsSync(own.ssh_key.startsWith("/") ? own.ssh_key : join(homedir(), ".ssh", own.ssh_key));
    return {
      device,
      slug,
      done: fields[`done_${slug}`] || "",
      oldSsh: fields[`old_ssh_${slug}`] || "",
      oldKit: fields[`old_kit_${slug}`] || "",
      kitHere,
      sshHere,
      pending: !fields[`done_${slug}`] && !kitHere && !sshHere,
    };
  });
  const open = devices.filter((d) => !d.done);
  return {
    state: open.length === 0 && devices.length ? "accepted" : "prepared",
    file,
    from: fields.from || "",
    to: fields.to || "",
    prepared: fields.prepared || "",
    status: fields.status || "",
    devices,
    pending: devices.filter((d) => d.pending),
  };
}
