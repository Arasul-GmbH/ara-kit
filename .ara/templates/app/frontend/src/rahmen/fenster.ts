/**
 * Die eine Schwelle: schmal oder nicht.
 *
 * Sie steht bei 900 Pixeln, und das ist keine Zahl dieser App, sondern die des
 * Geraets: `marken.css` teilt dort dieselbe Grenze (`--ara-schmal-bis: 899px`),
 * und die Oberflaeche von Arasul rechnet mit derselben. Darunter gibt es eine
 * Spalte und ein Menue ueber der Seite, darueber die Seitenleiste daneben.
 *
 * **Ein geschrumpfter Bildschirm ist kein Telefon-Aufbau.** Wer hier zwei
 * Zahlen einfuehrt, hat einen Zustand mehr, in dem die App neben der
 * Oberflaeche steht, in der sie haengt.
 *
 * Warum nicht `useSyncExternalStore` und warum kein Beobachter je Baustein:
 * eine Medienabfrage sagt schon selbst Bescheid, wenn sie umschlaegt, und
 * dieser Haken haengt genau einmal im Rahmen der App.
 */

import { useEffect, useState } from "react";

/** Darunter eine Spalte. Dieselbe Zahl wie in `marken.css`. */
export const SCHMAL_BIS = 899;

const abfrage = () => window.matchMedia(`(max-width: ${SCHMAL_BIS}px)`);

/** Ist das Fenster schmal? Faellt ohne `matchMedia` auf "nein" zurueck. */
export function useSchmalesFenster(): boolean {
  const [schmal, setSchmal] = useState(() => window.matchMedia?.(`(max-width: ${SCHMAL_BIS}px)`).matches ?? false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const medien = abfrage();
    const nachziehen = () => setSchmal(medien.matches);
    medien.addEventListener("change", nachziehen);
    nachziehen();
    return () => medien.removeEventListener("change", nachziehen);
  }, []);

  return schmal;
}
