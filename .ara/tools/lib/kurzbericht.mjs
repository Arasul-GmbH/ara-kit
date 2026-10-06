/**
 * Der kurze Bericht von `app.mjs --check` und `--deploy`: das Ergebnis, die Befunde, der nächste
 * Schritt, und das Ergebnis noch einmal.
 *
 * Bis 0.77.0 druckten beide das halbe Handbuch, mehrere hundert Zeilen: die Regeln des Kontrakts,
 * die Vereinbarung, die Lage der Modelle. Das Ergebnis stand in vier Zeilen ganz oben, und wer die
 * Ausgabe von hinten las, wie man es mit einer langen Ausgabe tut, sah es nicht (Fremdtest vom
 * 06.10.2026). Jetzt steht es oben und unten, dazwischen nur, was anhält oder auffällt, jeder
 * Befund in einer Zeile, und alles zusammen in höchstens `KURZ_GRENZE` Zeilen. Den ganzen Bericht
 * gibt `--verbose`.
 */

import { t } from "./i18n.mjs";

export const KURZ_GRENZE = 30;
const ZEICHEN = 240;

/** Ein Befund in einer Zeile: die erste Zeile, ohne Aufzählungszeichen, gekürzt. */
function eineZeile(text) {
  const erste = String(text ?? "")
    .split("\n")
    .map((zeile) => zeile.trim())
    .find(Boolean) ?? "";
  const ohne = erste.replace(/^[-*]\s+/, "");
  return ohne.length > ZEICHEN ? `${ohne.slice(0, ZEICHEN - 1)}…` : ohne;
}

/**
 * `ergebnis` ist ein Satz, `halte` was anhält, `hinweise` was auffällt und nichts anhält, `weiter`
 * die nächsten Schritte, je eine Zeile. Zurück kommen die Zeilen, höchstens `KURZ_GRENZE`.
 */
export function kurzbericht({ ergebnis, halte = [], hinweise = [], weiter = [], ganz = null }) {
  const h = halte.map(eineZeile).filter(Boolean);
  const w = hinweise.map(eineZeile).filter(Boolean);
  const nach = weiter.slice(0, 4);
  // Fest: Ergebnis oben und unten, je eine Überschrift, die Leerzeilen, die nächsten Schritte.
  const fest = 2 + (h.length ? 2 : 0) + (w.length ? 2 : 0) + 1 + nach.length;
  let platz = KURZ_GRENZE - fest;
  const nimm = (liste) => {
    if (liste.length <= platz) {
      platz -= liste.length;
      return liste;
    }
    const zeigen = Math.max(0, platz - 1);
    platz = 0;
    return [...liste.slice(0, zeigen), t(`… and ${liste.length - zeigen} more${ganz ? `: ${ganz}` : ""}`, `… und ${liste.length - zeigen} weitere${ganz ? `: ${ganz}` : ""}`)];
  };
  const mitte = [];
  // Was anhält, kommt zuerst, lässt aber den Hinweisen ein paar Zeilen.
  const fuerHinweise = Math.min(w.length, 3);
  platz -= fuerHinweise;
  const gehalten = nimm(h);
  platz += fuerHinweise;
  if (h.length) mitte.push("", t(`Stops (${h.length}):`, `Hält an (${h.length}):`), ...gehalten.map((z) => (z.startsWith("…") ? z : `- ${z}`)));
  if (w.length) mitte.push("", t(`Hints, nothing stops (${w.length}):`, `Hinweise, nichts hält an (${w.length}):`), ...nimm(w).map((z) => (z.startsWith("…") ? z : `- ${z}`)));
  const ende = ["", ...nach, ergebnis];
  // Das Ergebnis steht immer am Ende: wird es eng, kürzt sich die Mitte, nie der Schluss.
  return [ergebnis, ...mitte.slice(0, KURZ_GRENZE - 1 - ende.length), ...ende];
}
