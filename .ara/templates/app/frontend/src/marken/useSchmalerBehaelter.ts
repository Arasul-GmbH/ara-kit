/**
 * Ist der BEHAELTER zu schmal? (Auftrag marken-misst-den-behaelter, J35)
 *
 * `useSchmalesFenster` fragt das Fenster, und das ist fuer die Shell richtig:
 * ihre drei Spalten teilen sich das Fenster. Eine App im Rahmen des Geraets
 * teilt sich ihr Fenster (das iframe) aber selbst noch einmal -- mit ihrer
 * Seitenleiste, mit einer Detailspalte. Am Orin gemessen (26.09.2026, Faktum
 * bei 1440 px ohne Notizen): Rahmen 1052 px, also „breit", die Datenliste
 * zeigte ihre Tabelle, und neben der Seitenleiste der App blieben ihr knapp
 * 800 px. `scrollWidth` 1152 -- hundert Pixel abgeschnitten. Jede Schwelle,
 * die das Fenster misst, rechnet mit Platz, den ein anderer schon belegt.
 *
 * Deshalb misst dieser Hook das Element, an dem sein `ref` haengt, mit einem
 * `ResizeObserver`. Solange es kein Mass gibt -- vor dem ersten Einhaengen,
 * ohne `ResizeObserver`, oder bei einer Breite von null (ein Kasten, der gar
 * nicht gelegt ist, etwa in jsdom oder in einem zugeklappten Blatt) --, gilt
 * das Fenster. Null Pixel sind keine Auskunft ueber den Platz, und „schmal"
 * aus Unwissen hiesse, dass jede Liste im ersten Bild als Karten erscheint.
 */
import { useCallback, useLayoutEffect, useEffect, useState } from 'react';
import { useSchmalesFenster } from './useSchmalesFenster';

// `useLayoutEffect` misst vor dem ersten Bild; auf dem Server gibt es ihn
// nicht, und React warnt dort bei jedem Aufruf.
const useVorDemBild = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * @param grenze Breite des Behaelters in Pixeln, unterhalb derer „schmal" gilt
 * @returns `[ref, schmal, breite]` -- den `ref` an den Kasten haengen, dessen
 *   Breite zaehlt; `breite` ist das Mass in Pixeln oder `null` ohne Mass
 */
export function useSchmalerBehaelter<E extends HTMLElement = HTMLDivElement>(
  grenze: number
): [(element: E | null) => void, boolean, number | null] {
  const fensterSchmal = useSchmalesFenster(grenze);
  const [element, setElement] = useState<E | null>(null);
  const [breite, setBreite] = useState<number | null>(null);

  const ref = useCallback((neu: E | null) => setElement(neu), []);

  useVorDemBild(() => {
    if (!element) {
      setBreite(null);
      return undefined;
    }
    const lesen = () => {
      const gemessen = element.getBoundingClientRect().width;
      setBreite(gemessen > 0 ? gemessen : null);
    };
    lesen();
    if (typeof ResizeObserver !== 'function') return undefined;
    const beobachter = new ResizeObserver(lesen);
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, [element]);

  return [ref, breite === null ? fensterSchmal : breite < grenze, breite];
}
