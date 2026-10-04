/**
 * Das Feld `zeigt_freigaben` (Kontrakt 12): eine App sagt, dass sie ihre Freigaben selbst zeigt.
 *
 * **Was das Gerät damit tut, steht in seinem Kontrakt** (`--contract`, Regel zu `zeigt_freigaben`),
 * nicht hier: mit dem Feld öffnet ein Klick in „Für Sie" die App mit `?freigabe=<nummer>` in der
 * Adresse, ohne es öffnet das Gerät die Freigabe selbst. Dieses Modul schreibt das Feld ins
 * Manifest, wenn die Vorlage eine Seite Freigaben hat, und prüft zwei Dinge, die kein Schema trägt:
 * ein Gerät vor Kontrakt 12 kennt das Feld nicht, und eine App mit eigener Freigabe-Seite ohne das
 * Feld bekommt den Tieflink nicht.
 *
 * Das Manifest ist beim Gerät streng: ein Feld, das es nicht kennt, weist es ab. Deshalb hält
 * `--check` das Feld an einem Gerät vor Kontrakt 12 an, statt es still durchzureichen.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { t } from "./i18n.mjs";

/** Ab welchem Kontrakt das Gerät das Feld kennt. */
export const KONTRAKT_ZEIGT_FREIGABEN = 12;

/** Das Feld in app.json, hinter `beschreibung` und `symbol`, sonst am Ende. */
export function setZeigtFreigaben(manifest) {
  const out = {};
  for (const [key, value] of Object.entries(manifest)) {
    out[key] = value;
    if (key === "symbol" || (key === "beschreibung" && !("symbol" in manifest))) out.zeigt_freigaben = true;
  }
  if (!("zeigt_freigaben" in out)) out.zeigt_freigaben = true;
  return out;
}

/** Hat die App eine eigene Seite für Freigaben? Sie liegt im Quelltext der Oberfläche, nicht in der Bibliothek. */
export function hatFreigabeSeite(frontendDir) {
  if (!frontendDir || !existsSync(frontendDir)) return false;
  const walk = (path) =>
    readdirSync(path, { withFileTypes: true }).some((entry) => {
      if (entry.name === "node_modules" || entry.name === "marken" || entry.name.startsWith(".")) return false;
      const full = join(path, entry.name);
      if (entry.isDirectory()) return walk(full);
      if (!/\.(tsx?|jsx?|mjs|html)$/.test(entry.name) || statSync(full).size > 2_000_000) return false;
      return /freigabe-anfragen|<Freigabe[\s>]/.test(readFileSync(full, "utf8"));
    });
  return walk(frontendDir);
}

/** Was `--check` anhält: das Feld an einem Gerät vor Kontrakt 12. */
export function zeigtFreigabenFindings(manifest, deviceContract) {
  if (manifest?.zeigt_freigaben === undefined) return [];
  if (!Number.isFinite(deviceContract) || deviceContract >= KONTRAKT_ZEIGT_FREIGABEN) return [];
  return [
    t(
      `The manifest names \`zeigt_freigaben\`, and this device carries contract ${deviceContract}: the field came with contract ${KONTRAKT_ZEIGT_FREIGABEN}, and the manifest is strict, an older device refuses the package. Take the field out, or bring the device up to date.`,
      `Das Manifest nennt \`zeigt_freigaben\`, und dieses Gerät trägt Kontrakt ${deviceContract}: das Feld kam mit Kontrakt ${KONTRAKT_ZEIGT_FREIGABEN}, und das Manifest ist streng, ein älteres Gerät weist das Paket ab. Das Feld herausnehmen, oder das Gerät auf den neuen Stand bringen.`
    ),
  ];
}

/** Ein Hinweis, kein Halt: eine App mit eigener Freigabe-Seite, die dem Gerät nichts davon sagt. */
export function zeigtFreigabenHints(manifest, frontendDir, deviceContract) {
  if (manifest?.zeigt_freigaben !== undefined) return [];
  if (Number.isFinite(deviceContract) && deviceContract < KONTRAKT_ZEIGT_FREIGABEN) return [];
  if (!hatFreigabeSeite(frontendDir)) return [];
  return [
    t(
      "Hint: this app shows approvals itself, and `zeigt_freigaben` is missing in app.json. Without it a click in \"For you\" opens the approval in Arasul, not in the app. If the page opens the approval named in `?freigabe=<number>`, write `\"zeigt_freigaben\": true`.",
      "Hinweis: diese App zeigt Freigaben selbst, und `zeigt_freigaben` fehlt in app.json. Ohne das Feld öffnet ein Klick in „Für Sie\" die Freigabe in Arasul und nicht in der App. Öffnet die Seite die Freigabe aus `?freigabe=<nummer>`, steht `\"zeigt_freigaben\": true` dazu."
    ),
  ];
}
