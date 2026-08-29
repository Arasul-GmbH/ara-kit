/**
 * Ist das Fenster zu schmal für drei Spalten? (Plan 023 F5)
 *
 * Am 22.08.2026 am Gerät gemessen. Die Arbeitsfläche verlangt nebeneinander:
 *
 *   Aktivitätsleiste   rund 48 px, immer sichtbar
 *   Dateibaum          mindestens 160 px
 *   Mitte              mindestens 30 Prozent
 *   rechtes Panel      höchstens 45 Prozent
 *
 * Bei 400 px Fenster sind das zusammen über 500 px. Die Aufteilung lässt sich
 * dann nicht mehr einhalten, und das rechte Panel bekommt, was übrig bleibt:
 * **142 px**, davon 118 px für das Terminal. Bei 14 px Schriftgröße sind das
 * rund dreizehn Spalten, und ein Pfad mit 120 Zeichen bricht zehnmal um.
 *
 * Gemessen, bei jeweils sichtbarem Terminal:
 *
 *   400 px Fenster  ->  142 px Panel, 118 px Terminal
 *   600 px          ->  223 px, 202 px
 *   800 px          ->  304 px, 287 px
 *  1000 px          ->  386 px, 362 px
 *
 * Die Grenze liegt deshalb bei 900 px: darunter ist eine dritte Spalte nicht
 * mehr sinnvoll unterzubringen, darüber schon.
 */
import { useEffect, useState } from 'react';

/** Unter dieser Fensterbreite gibt es keine drei Spalten mehr. */
export const SCHMAL_AB_PX = 900;

/**
 * @param grenze Fensterbreite in Pixeln, unterhalb derer „schmal" gilt
 * @returns true, solange das Fenster schmaler ist
 */
export function useSchmalesFenster(grenze: number = SCHMAL_AB_PX): boolean {
  const [schmal, setSchmal] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(`(max-width: ${grenze - 1}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const abfrage = window.matchMedia(`(max-width: ${grenze - 1}px)`);
    const merken = () => setSchmal(abfrage.matches);
    merken();
    // `addEventListener` gibt es erst seit Safari 14; der ältere Weg bleibt als
    // Rückfall, sonst wechselt die Aufteilung dort nie mit.
    if (typeof abfrage.addEventListener === 'function') {
      abfrage.addEventListener('change', merken);
      return () => abfrage.removeEventListener('change', merken);
    }
    abfrage.addListener?.(merken);
    return () => abfrage.removeListener?.(merken);
  }, [grenze]);

  return schmal;
}
