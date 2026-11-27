import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Alles, was in einer Flaeche den Fokus annehmen kann, in Dokumentreihenfolge. */
export function haltestellen(flaeche: HTMLElement | null): HTMLElement[] {
  if (!flaeche) return [];
  return [
    ...flaeche.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    ),
  ];
}

/**
 * Eine Flaeche ueber der Seite haelt den Fokus: Escape schliesst, Tab bleibt
 * darin, beim Oeffnen springt der Fokus hinein (auf `ersterFokus` oder die
 * erste Haltestelle) und beim Schliessen dorthin zurueck, wo er herkam.
 *
 * Von Hand und ohne Radix, weil die Bausteine auch in einer App ohne Bau
 * laufen, die nichts installieren kann.
 */
export function useFokusfalle(
  offen: boolean,
  flaeche: RefObject<HTMLElement | null>,
  onSchliessen: () => void,
  ersterFokus?: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!offen) return undefined;
    const vorher = document.activeElement as HTMLElement | null;
    const aufTaste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onSchliessen();
        return;
      }
      if (e.key !== 'Tab') return;
      const halte = haltestellen(flaeche.current);
      if (halte.length === 0) return;
      const erster = halte[0] as HTMLElement;
      const letzter = halte[halte.length - 1] as HTMLElement;
      const jetzt = document.activeElement;
      if (e.shiftKey && (jetzt === erster || !flaeche.current?.contains(jetzt))) {
        e.preventDefault();
        letzter.focus();
      } else if (!e.shiftKey && (jetzt === letzter || !flaeche.current?.contains(jetzt))) {
        e.preventDefault();
        erster.focus();
      }
    };
    document.addEventListener('keydown', aufTaste);
    (ersterFokus?.current ?? haltestellen(flaeche.current)[0])?.focus();
    return () => {
      document.removeEventListener('keydown', aufTaste);
      vorher?.focus?.();
    };
  }, [offen, onSchliessen, flaeche, ersterFokus]);
}
