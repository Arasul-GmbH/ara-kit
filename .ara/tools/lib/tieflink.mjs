/**
 * Das Feld `zeigt_freigaben` (Kontrakt 12): eine App sagt, dass sie ihre Freigaben selbst zeigt.
 *
 * **Was das Gerät damit tut, steht in seinem Kontrakt** (`--contract`, Regel zu `zeigt_freigaben`),
 * nicht hier: mit dem Feld öffnet ein Klick in „Für Sie“ die App mit `?freigabe=<nummer>` in der
 * Adresse, ohne es öffnet das Gerät die Freigabe selbst. Dieses Modul schreibt das Feld ins
 * Manifest, wenn die Vorlage eine Seite Freigaben hat, und prüft zwei Dinge, die kein Schema trägt:
 * ein Gerät vor Kontrakt 12 kennt das Feld nicht, und eine App mit eigener Freigabe-Seite ohne das
 * Feld bekommt den Tieflink nicht.
 *
 * Das Manifest ist beim Gerät streng: ein Feld, das es nicht kennt, weist es ab. Deshalb hält
 * `--check` das Feld an einem Gerät vor Kontrakt 12 an, statt es still durchzureichen.
 */

import { readFileSync } from "node:fs";
import { FELD_SEIT, geraetZuAlt } from "./felder.mjs";
import { walkFiles } from "./files.mjs";
import { t } from "./i18n.mjs";

/** Ab welchem Kontrakt das Gerät das Feld kennt, aus der Tabelle in `felder.mjs`. */
const KONTRAKT_ZEIGT_FREIGABEN = FELD_SEIT.zeigt_freigaben;

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

/**
 * Woran eine eigene Seite für Freigaben zu erkennen ist, im Quelltext und im Bau: der Weg zu den Anfragen
 * (`freigabe-anfragen`, er übersteht den Bau als Zeichenkette), der Baustein als JSX (`<Freigabe`, nur im
 * Quelltext) und der Baustein als Import im gebauten Bündel (`,Freigabe as v,`). `--check` und `--deploy`
 * sehen den Bau, `--new` und der Selbsttest den Quelltext.
 */
const FREIGABE_SEITE = /freigabe-anfragen|<Freigabe[\s>]|[{,]\s*Freigabe(?:\s+as\s+[\w$]+)?\s*[,}]/;

/** Hat die App eine eigene Seite für Freigaben? Sie liegt in der Oberfläche, nicht in der Bibliothek. */
export function hatFreigabeSeite(frontendDir) {
  return walkFiles(frontendDir, { match: /\.(tsx?|jsx?|mjs|html)$/, skip: ["node_modules", "marken"], maxBytes: 2_000_000 }).some((path) =>
    FREIGABE_SEITE.test(readFileSync(path, "utf8"))
  );
}

/** Was `--check` anhält: das Feld an einem Gerät vor Kontrakt 12. */
export function zeigtFreigabenFindings(manifest, deviceContract) {
  if (manifest?.zeigt_freigaben === undefined) return [];
  if (!geraetZuAlt("zeigt_freigaben", deviceContract)) return [];
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
  if (geraetZuAlt("zeigt_freigaben", deviceContract)) return [];
  if (!hatFreigabeSeite(frontendDir)) return [];
  return [
    t(
      "Hint: this app shows approvals itself, and `zeigt_freigaben` is missing in app.json. Without it a click in \"For you\" opens the approval in Arasul, not in the app. If the page opens the approval named in `?freigabe=<number>`, write `\"zeigt_freigaben\": true`.",
      "Hinweis: diese App zeigt Freigaben selbst, und `zeigt_freigaben` fehlt in app.json. Ohne das Feld öffnet ein Klick in „Für Sie“ die Freigabe in Arasul und nicht in der App. Öffnet die Seite die Freigabe aus `?freigabe=<nummer>`, steht `\"zeigt_freigaben\": true` dazu."
    ),
  ];
}
