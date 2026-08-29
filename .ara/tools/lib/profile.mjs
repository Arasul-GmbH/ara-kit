/**
 * Der Wertevorrat des Profils: welche Felder nur bestimmte Werte kennen.
 *
 * `business/profile.md` traegt zwei Sorten Feld. Die meisten nehmen freien
 * Text: ein Name, eine Region, was das Haus benutzt. Ein paar nehmen genau
 * eine Handvoll Werte, und ein anderer ist keine Nachlaessigkeit, sondern ein
 * Feld, mit dem danach kein Werkzeug etwas anfangen kann.
 *
 * **Diese Liste ist die eine Quelle dafuer.** `init.mjs` prueft die
 * Antwortdatei daran, die vier Beispieldateien unter `.ara/templates/`
 * schreiben sie unter `_values` beziehungsweise `_werte` aus, und der
 * Selbsttest haelt beides aneinander. Sie steht hier und nicht in `init.mjs`,
 * weil eine Datei, die man nur durch Ausfuehren lesen kann, keine Quelle ist,
 * die ein zweiter Leser benutzen koennte.
 *
 * Der Fund des Fremdtests am 29.08.2026 lief genau hier auf: die
 * Beispieldatei nannte `first_device_state: ordered`, und was sonst noch
 * erlaubt ist, stand nirgends, wo jemand es beim Ausfuellen sieht. Abgewiesen
 * wurde er trotzdem, mit der richtigen Liste in der Meldung, also erst beim
 * dritten Versuch.
 */

import { LANGUAGES } from "./i18n.mjs";
import { t } from "./i18n.mjs";

/** Die zwei Zweige des Kits. Ein Partner hat Kunden, ein Betrieb nicht. */
export const ROLES = Object.freeze(["partner", "company"]);

/** Jedes Feld des Profils, das nur bestimmte Werte kennt, mit diesen Werten. */
export const CLOSED_FIELDS = Object.freeze({
  role: ROLES,
  language: LANGUAGES,
  detail_level: Object.freeze(["low", "medium", "high"]),
  security_level: Object.freeze(["standard", "relaxed"]),
  secrets_store: Object.freeze(["env", "keychain"]),
  browser: Object.freeze(["yes", "no"]),
  invoice: Object.freeze(["yes", "no", "later"]),
  first_device_state: Object.freeze(["present", "ordered", "none"]),
});

/** Der Satz, der in einer Antwortdatei ueber dem Wertevorrat steht. */
export function vocabularyNote(language) {
  return t(
    "The fields below only know these values. Everything else is refused by --answers, with the list in the message.",
    "Die Felder darunter kennen nur diese Werte. Alles andere weist --answers ab, samt Liste in der Meldung.",
    language
  );
}
