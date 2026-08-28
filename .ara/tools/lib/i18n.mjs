/**
 * Die Sprache des Kits.
 *
 * Englisch ist die Hauptsprache, Deutsch ist gleichwertig. Welche gilt, steht in
 * `business/profile.md` als `language: de|en`. Gibt es noch kein Profil, also im
 * frischen Klon vor `/init`, gilt Englisch.
 *
 * Ausgaben stehen als Paar an der Stelle, an der sie entstehen:
 *
 *   console.log(t("Nothing to do.", "Nichts zu tun."));
 *
 * Kein Katalog daneben, kein Schluessel dazwischen. Ein Katalog waere eine zweite
 * Liste, die von der ersten wegdriftet, und ein Schluessel verdeckt beim Lesen
 * genau das, worauf es ankommt: was da eigentlich steht. Der deutsche Zweig
 * traegt den Wortlaut, den das Kit vorher hatte. Abnahmen, die auf eine deutsche
 * Zeile greifen, greifen sie weiter.
 *
 * `ARA_LANGUAGE=de` ueberstimmt das Profil. Das braucht der Selbsttest, der beide
 * Fassungen desselben Werkzeugs sehen will, ohne ein Profil zu schreiben.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const LANGUAGES = ["en", "de"];
export const DEFAULT_LANGUAGE = "en";

// Eigener Wurzelpfad statt der aus kit.mjs: kit.mjs gibt selbst Text aus und
// laedt darum dieses Modul. Zwei Module, die sich gegenseitig laden, sind eine
// Schleife, und Node loest sie zur Ladezeit nicht auf.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PROFILE = join(ROOT, "business", "profile.md");

let cached = null;

/** Liest `language:` aus dem Frontmatter, ohne kit.mjs dafuer zu laden. */
function fromProfile() {
  if (!existsSync(PROFILE)) return null;
  const head = readFileSync(PROFILE, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!head) return null;
  const line = head[1].match(/^language\s*:\s*(.*)$/m);
  if (!line) return null;
  const value = line[1].trim().replace(/(^|\s+)#.*$/, "").trim().replace(/^["']|["']$/g, "");
  return LANGUAGES.includes(value) ? value : null;
}

/**
 * Die geltende Sprache, einmal je Lauf ermittelt.
 *
 * Ein Werkzeug laeuft kurz und schreibt das Profil hoechstens am Ende. Innerhalb
 * eines Laufs die Sprache zu wechseln waere eine Ausgabe in zwei Sprachen.
 */
export function language() {
  if (cached) return cached;
  const forced = String(process.env.ARA_LANGUAGE || "").trim();
  cached = LANGUAGES.includes(forced) ? forced : fromProfile() || DEFAULT_LANGUAGE;
  return cached;
}

/**
 * Legt die Sprache dieses Laufs fest, nachtraeglich.
 *
 * Das braucht genau eine Stelle: `/init` schreibt das Profil und weiss erst dabei,
 * welche Sprache gilt. Alles, was es danach ausgibt, soll die neue sein und nicht
 * die des frischen Klons. Was vorher schon ausgegeben wurde, bleibt, wie es war.
 */
export function setLanguage(lang) {
  if (LANGUAGES.includes(lang)) cached = lang;
  return cached;
}

/**
 * Waehlt zwischen englisch und deutsch.
 *
 * `lang` gibt die Sprache vor, statt sie zu ermitteln. Das braucht `/init`: es
 * schreibt das Profil, in dem die Sprache erst stehen wird, und muss dabei schon
 * in ihr schreiben.
 */
export function t(en, de, lang = language()) {
  return lang === "de" ? de : en;
}

/**
 * Der Name einer Datei in der geltenden Sprache.
 *
 * Englisch ist `x.md`, Deutsch ist `x.de.md`. Fehlt die deutsche Fassung, bleibt
 * es bei der englischen: ein Verweis ins Leere waere schlimmer als ein Absatz in
 * der falschen Sprache. Dass keine fehlt, prueft der Selbsttest.
 */
export function localized(path, lang = language()) {
  if (lang === DEFAULT_LANGUAGE) return path;
  const variant = variantOf(path, lang);
  return existsSync(variant) ? variant : path;
}

/** Zu `x.md` die deutsche Fassung `x.de.md`, ohne zu pruefen, ob es sie gibt. */
export function variantOf(path, lang) {
  return lang === DEFAULT_LANGUAGE ? path : path.replace(/\.([a-z]+)$/, `.${lang}.$1`);
}

/** Ist das die uebersetzte Fassung einer anderen Datei? */
export function isVariant(name) {
  return LANGUAGES.some(
    (lang) => lang !== DEFAULT_LANGUAGE && new RegExp(`\\.${lang}\\.[a-z]+$`).test(name)
  );
}
